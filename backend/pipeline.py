"""Claim extraction + verification pipeline.

Flow (exactly two model calls):
  1. extract claims from the user's answer        -> Gemini
  2. verify those claims against the source       -> Gemini
  3. Evidence Guard: validate every quotation and compute real page numbers

The Gemini client is wrapped behind ``complete_json`` so the whole pipeline can
be exercised offline with a fake client in the test suite.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Optional

from evidence_guard import (
    AMBIGUOUS,
    CONTRADICTED,
    NOT_STATED,
    SUPPORTED,
    VERDICTS,
    SourceIndex,
    guard_claim,
)
from pdf_utils import SourceDoc
from prompts import VERIFY_SYSTEM, extraction_user, verify_user, EXTRACTION_SYSTEM

logger = logging.getLogger("second-opinion.pipeline")

DEFAULT_MODEL = "gemini-3.8-flash"
MAX_CLAIMS = 40
_KEY_PATTERN = re.compile(r"AIza[0-9A-Za-z_-]{30,}")


class PipelineError(Exception):
    """Safe, user-facing pipeline failure."""

    def __init__(self, code: str, message: str, status_code: int = 502):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


# --------------------------------------------------------------------------- #
# JSON handling
# --------------------------------------------------------------------------- #
def parse_json(text: Any) -> Any:
    """Parse model output into JSON, tolerating fences and stray prose."""
    if isinstance(text, (dict, list)):
        return text
    if not isinstance(text, str) or not text.strip():
        raise PipelineError(
            "bad_model_response",
            "The model returned an empty response. Please run the analysis again.",
        )
    t = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", t, flags=re.S)
    if fence:
        t = fence.group(1).strip()

    candidates = [t]
    for opener, closer in (("{", "}"), ("[", "]")):
        i, j = t.find(opener), t.rfind(closer)
        if i != -1 and j > i:
            candidates.append(t[i : j + 1])

    for candidate in candidates:
        try:
            return json.loads(candidate)
        except (json.JSONDecodeError, ValueError):
            continue
    raise PipelineError(
        "bad_model_response",
        "The model returned a response that could not be read as JSON. Please run the analysis again.",
    )


def _clean_key(text: str) -> str:
    """Strip anything that looks like an API key from an error message."""
    return _KEY_PATTERN.sub("[redacted]", text)


# --------------------------------------------------------------------------- #
# Model client
# --------------------------------------------------------------------------- #
class GeminiJSONClient:
    """Thin wrapper over google-genai that returns parsed JSON."""

    def __init__(self, api_key: str, model: Optional[str] = None):
        try:
            from google import genai
            from google.genai import types
        except ImportError as exc:  # pragma: no cover - dependency problem
            raise PipelineError(
                "missing_dependency",
                "The Google GenAI SDK is not installed on the server.",
                status_code=500,
            ) from exc

        self._types = types
        self.model = model or os.getenv("GEMINI_MODEL", DEFAULT_MODEL)
        try:
            self._client = genai.Client(api_key=api_key)
        except Exception as exc:  # noqa: BLE001
            raise PipelineError(
                "client_error",
                "The Gemini client could not be initialised on the server.",
                status_code=500,
            ) from exc

    def complete_json(self, system: str, user: str) -> Any:
        config = self._types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.1,
            max_output_tokens=32768,
            response_mime_type="application/json",
        )
        try:
            response = self._client.models.generate_content(
                model=self.model,
                contents=user,
                config=config,
            )
        except Exception as exc:  # noqa: BLE001 - never leak credentials
            detail = _clean_key(str(exc))[:240]
            logger.warning("Gemini request failed: %s", detail)
            if "api key" in str(exc).lower() or "API_KEY_INVALID" in str(exc):
                raise PipelineError(
                    "auth_failed",
                    "The server's Gemini API key was rejected. Check GEMINI_API_KEY in backend/.env.",
                    status_code=502,
                ) from exc
            raise PipelineError(
                "model_unavailable",
                f"The Gemini request failed: {detail}",
                status_code=502,
            ) from exc

        try:
            text = getattr(response, "text", None)
        except Exception:  # noqa: BLE001 - blocked or empty candidate
            text = None
        if not text:
            raise PipelineError(
                "empty_model_response",
                "The model returned no content. Please run the analysis again.",
            )
        return parse_json(text)


# --------------------------------------------------------------------------- #
# Call 1: claim extraction
# --------------------------------------------------------------------------- #
def _clean_claim(raw: Any, position: int) -> Optional[dict]:
    if not isinstance(raw, dict):
        return None
    text = raw.get("claim_text")
    if not isinstance(text, str) or not text.strip():
        return None
    text = text.strip()
    claim_type = raw.get("claim_type")
    if claim_type not in ("fact", "inference", "recommendation"):
        claim_type = "fact"
    start = raw.get("span_start")
    end = raw.get("span_end")
    if not isinstance(start, int) or not isinstance(end, int) or start < 0 or end <= start:
        start, end = None, None
    return {
        "id": str(raw.get("id") or f"c{position + 1}"),
        "claim_text": text,
        "claim_type": claim_type,
        "span_start": start,
        "span_end": end,
    }


def extract_claims(client: Any, answer: str) -> list[dict]:
    raw = client.complete_json(EXTRACTION_SYSTEM, extraction_user(answer))
    items: Any
    if isinstance(raw, dict):
        items = raw.get("claims")
    else:
        items = raw
    if not isinstance(items, list):
        raise PipelineError(
            "bad_model_response",
            "The model did not return a claim list. Please run the analysis again.",
        )

    claims: list[dict] = []
    seen: set[str] = set()
    for i, item in enumerate(items):
        claim = _clean_claim(item, i)
        if claim is None:
            continue
        if claim["id"] in seen:
            claim["id"] = f"{claim['id']}-{i + 1}"
        seen.add(claim["id"])
        claims.append(claim)
        if len(claims) >= MAX_CLAIMS:
            break
    return claims


# --------------------------------------------------------------------------- #
# Claim <-> answer span mapping
# --------------------------------------------------------------------------- #
def _span_matches(answer: str, start: int, end: int, claim_text: str) -> bool:
    from evidence_guard import normalize

    if not (0 <= start < end <= len(answer)):
        return False
    return normalize(answer[start:end]).lower() == normalize(claim_text).lower()


def _find_span(answer: str, claim_text: str) -> Optional[tuple[int, int]]:
    """Locate the claim's exact text in the answer, whitespace-insensitively."""
    m = re.search(re.escape(claim_text), answer, flags=re.I)
    if m:
        return m.start(), m.end()
    parts = [re.escape(p) for p in claim_text.split() if p]
    if not parts:
        return None
    m = re.search(r"\s+".join(parts), answer, flags=re.I)
    if m:
        return m.start(), m.end()
    return None


def validate_spans(answer: str, claims: list[dict]) -> list[dict]:
    """Keep only spans that verifiably point at the claim's own words."""
    for claim in claims:
        s, e = claim.get("span_start"), claim.get("span_end")
        if isinstance(s, int) and isinstance(e, int) and _span_matches(answer, s, e, claim["claim_text"]):
            continue
        found = _find_span(answer, claim["claim_text"])
        if found:
            claim["span_start"], claim["span_end"] = found
        else:
            claim["span_start"] = None
            claim["span_end"] = None
    return claims


# --------------------------------------------------------------------------- #
# Call 2: verification
# --------------------------------------------------------------------------- #
_VERDICT_ALIASES = {
    "supported": SUPPORTED,
    "supported by source": SUPPORTED,
    "contradicted": CONTRADICTED,
    "contradicted by source": CONTRADICTED,
    "false": CONTRADICTED,
    "not stated in source": NOT_STATED,
    "not stated": NOT_STATED,
    "not in source": NOT_STATED,
    "not mentioned": NOT_STATED,
    "no evidence in source": NOT_STATED,
    "ambiguous/conflicting": AMBIGUOUS,
    "ambiguous": AMBIGUOUS,
    "conflicting": AMBIGUOUS,
    "ambiguous or conflicting": AMBIGUOUS,
    "unclear": AMBIGUOUS,
}


def _clean_verdict(value: Any) -> tuple[str, bool]:
    """Return (verdict, was_unrecognised). Unknown verdicts are never forced."""
    if isinstance(value, str):
        key = value.strip().lower().rstrip(".")
        if key in _VERDICT_ALIASES:
            return _VERDICT_ALIASES[key], False
    return AMBIGUOUS, True


def _clean_result(raw: Any) -> Optional[dict]:
    if not isinstance(raw, dict):
        return None
    claim_id = raw.get("claim_id")
    if not isinstance(claim_id, str) or not claim_id:
        return None
    verdict, unknown = _clean_verdict(raw.get("verdict"))
    explanation = raw.get("explanation")
    if not isinstance(explanation, str):
        explanation = ""
    evidence_raw = raw.get("evidence")
    evidence: list[dict] = []
    if isinstance(evidence_raw, list):
        for item in evidence_raw:
            if isinstance(item, dict) and isinstance(item.get("quote"), str) and item["quote"].strip():
                evidence.append({"quote": item["quote"].strip(), "page": item.get("page")})
            elif isinstance(item, str) and item.strip():
                evidence.append({"quote": item.strip(), "page": None})
    evidence = evidence[:2]
    needs_review = bool(raw.get("needs_review")) or unknown
    reason = raw.get("review_reason")
    if unknown:
        reason = "The model returned an unrecognised verdict; treat this claim with care."
    elif not isinstance(reason, str):
        reason = None
    return {
        "claim_id": claim_id,
        "verdict": verdict,
        "explanation": explanation.strip(),
        "evidence": evidence,
        "needs_review": needs_review,
        "review_reason": reason.strip() if isinstance(reason, str) and reason.strip() else None,
    }


def verify_claims(client: Any, source: SourceDoc, claims: list[dict]) -> dict[str, dict]:
    if not claims:
        return {}
    raw = client.complete_json(VERIFY_SYSTEM, verify_user(source.pages, claims))
    items = raw.get("results") if isinstance(raw, dict) else raw
    if not isinstance(items, list):
        raise PipelineError(
            "bad_model_response",
            "The model did not return verification results. Please run the analysis again.",
        )
    results: dict[str, dict] = {}
    for item in items:
        clean = _clean_result(item)
        if clean and clean["claim_id"] not in results:
            results[clean["claim_id"]] = clean
    return results


def _default_result(claim: dict) -> dict:
    return {
        "claim_id": claim["id"],
        "verdict": AMBIGUOUS,
        "explanation": "The model did not return an evaluation for this claim.",
        "evidence": [],
        "needs_review": True,
        "review_reason": "No model verdict was returned for this claim.",
    }


def _merge(claim: dict, result: Optional[dict]) -> dict:
    result = result or _default_result(claim)
    claim.update(
        {
            "verdict": result["verdict"],
            "explanation": result["explanation"],
            "evidence": result["evidence"],
            "needs_review": result["needs_review"],
            "review_reason": result["review_reason"],
        }
    )
    return claim


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #
def summarise(claims: list[dict]) -> dict:
    return {
        "total": len(claims),
        "supported": sum(1 for c in claims if c["verdict"] == SUPPORTED),
        "contradicted": sum(1 for c in claims if c["verdict"] == CONTRADICTED),
        "not_stated": sum(1 for c in claims if c["verdict"] == NOT_STATED),
        "ambiguous": sum(1 for c in claims if c["verdict"] == AMBIGUOUS),
        "needs_review": sum(1 for c in claims if c.get("needs_review")),
    }


def run_analysis(
    *,
    source: SourceDoc,
    answer: str,
    api_key: Optional[str],
    model: Optional[str] = None,
    client: Any = None,
) -> dict:
    """Run the full audit and return the JSON payload for the frontend."""
    if client is None:
        if not api_key:
            raise PipelineError(
                "missing_api_key",
                "The server has no Gemini API key configured. Add GEMINI_API_KEY to backend/.env and restart the server.",
                status_code=503,
            )
        client = GeminiJSONClient(api_key=api_key, model=model)

    used_model = getattr(client, "model", None) or model or os.getenv("GEMINI_MODEL", DEFAULT_MODEL)

    claims = extract_claims(client, answer)
    claims = validate_spans(answer, claims)
    results = verify_claims(client, source, claims)
    claims = [_merge(c, results.get(c["id"])) for c in claims]

    index = SourceIndex(source.pages)
    claims = [guard_claim(c, index) for c in claims]

    for c in claims:
        c["model_verdict"] = c["verdict"]
        if c["verdict"] == SUPPORTED and c.get("evidence_status") != "verified":
            c["verdict"] = AMBIGUOUS

    span_mapping = any(c["span_start"] is not None for c in claims)
    return {
        "claims": claims,
        "summary": summarise(claims),
        "source_info": source.info(),
        "model": used_model,
        "span_mapping_available": span_mapping,
        "evidence_note": (
            "Quotations are matched against the extracted source text by this application; "
            "a match confirms the text exists, not that it proves the claim."
        ),
    }
