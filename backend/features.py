"""On-demand claim features: Truth Repair and the AI Courtroom.

Both features make exactly one model call and then validate every quotation
deterministically with the Evidence Guard, exactly like the main audit:

* a quotation is only ever reported as ``verified`` when the extracted source
  text really contains it, and its page number is recomputed from the source;
* Truth Repair returns a replacement only when *every* supporting quotation
  verifies. Otherwise it returns an explicit ``insufficient_evidence`` result
  instead of an invented correction;
* the original answer and the original claim are never modified - these
  functions are pure and stateless, and the response echoes the original claim
  back unchanged.

Nothing here calls the network directly; the model is reached only through the
``complete_json`` client, so the whole module is testable offline.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional, Sequence

from evidence_guard import (
    AMBIGUOUS,
    CONTRADICTED,
    EV_MISSING,
    EV_PARTIAL,
    EV_UNVERIFIED,
    EV_VERIFIED,
    NOT_STATED,
    SUPPORTED,
    QuoteCheck,
    SourceIndex,
    validate_quote,
)
from pdf_utils import SourceDoc
from pipeline import DEFAULT_MODEL, GeminiJSONClient, PipelineError, parse_json
from prompts import COURTROOM_SYSTEM, REPAIR_SYSTEM, courtroom_user, repair_user

logger = logging.getLogger("second-opinion.features")

# Repair outcomes.
REPAIRED = "repaired"
INSUFFICIENT_EVIDENCE = "insufficient_evidence"

# The judge may also decline to conclude.
INSUFFICIENT = "Insufficient evidence"
JUDGE_VERDICTS = (SUPPORTED, CONTRADICTED, NOT_STATED, AMBIGUOUS, INSUFFICIENT)

JUDGE_VERDICT_ALIASES = {
    "supported": SUPPORTED,
    "supported by source": SUPPORTED,
    "contradicted": CONTRADICTED,
    "contradicted by source": CONTRADICTED,
    "false": CONTRADICTED,
    "not stated in source": NOT_STATED,
    "not stated": NOT_STATED,
    "not mentioned": NOT_STATED,
    "ambiguous/conflicting": AMBIGUOUS,
    "ambiguous": AMBIGUOUS,
    "conflicting": AMBIGUOUS,
    "unclear": AMBIGUOUS,
    "insufficient evidence": INSUFFICIENT,
    "insufficient": INSUFFICIENT,
    "not enough evidence": INSUFFICIENT,
    "cannot determine": INSUFFICIENT,
}

METHOD_SINGLE_CALL = "single_model_call"


def _client_or_raise(
    api_key: Optional[str], model: Optional[str], client: Any
) -> tuple[Any, str]:
    """Return (client, model_name) exactly like run_analysis does."""
    if client is None:
        if not api_key:
            raise PipelineError(
                "missing_api_key",
                "The server has no Gemini API key configured. Add GEMINI_API_KEY to backend/.env and restart the server.",
                status_code=503,
            )
        client = GeminiJSONClient(api_key=api_key, model=model)
    used_model = getattr(client, "model", None) or model or os.getenv("GEMINI_MODEL", DEFAULT_MODEL)
    return client, used_model


# --------------------------------------------------------------------------- #
# Shared deterministic validation
# --------------------------------------------------------------------------- #
def validate_quotes(index: SourceIndex, raw_quotes: Any) -> list[QuoteCheck]:
    """Validate every model-supplied quotation, exactly like the audit does."""
    if not isinstance(raw_quotes, list):
        return []
    checks: list[QuoteCheck] = []
    for item in raw_quotes:
        if isinstance(item, dict):
            quote, page = item.get("quote"), item.get("page")
        else:
            quote, page = item, None
        if not isinstance(quote, str) or not quote.strip():
            continue
        checks.append(validate_quote(index, quote.strip(), page))
    return checks


def evidence_status_for(checks: Sequence[QuoteCheck]) -> str:
    """Same vocabulary as the Evidence Guard: verified / partial / unverified / missing."""
    if not checks:
        return EV_MISSING
    ok = sum(1 for c in checks if c.verified)
    if ok == len(checks):
        return EV_VERIFIED
    if ok == 0:
        return EV_UNVERIFIED
    return EV_PARTIAL


def _as_dicts(checks: Sequence[QuoteCheck]) -> list[dict]:
    return [c.as_dict() for c in checks]


# --------------------------------------------------------------------------- #
# Feature A: one-click truth repair
# --------------------------------------------------------------------------- #
def _clean_status(value: Any) -> str:
    if isinstance(value, str):
        key = value.strip().lower().replace("_", " ").rstrip(".")
        if key.startswith("insuff"):
            return INSUFFICIENT_EVIDENCE
        if key == REPAIRED.replace("_", " ") or key == "repair":
            return REPAIRED
    # Anything unrecognised is treated as insufficient: never assume a repair.
    return INSUFFICIENT_EVIDENCE


def run_repair(
    *,
    source: SourceDoc,
    claim_text: str,
    answer: Optional[str] = None,
    claim_type: Optional[str] = None,
    original_verdict: Optional[str] = None,
    api_key: Optional[str],
    model: Optional[str] = None,
    client: Any = None,
) -> dict:
    """Suggest a source-grounded replacement for one claim, or decline honestly."""
    client, used_model = _client_or_raise(api_key, model, client)
    raw = client.complete_json(
        REPAIR_SYSTEM, repair_user(source.pages, claim_text, answer, claim_type)
    )
    if not isinstance(raw, dict):
        raise PipelineError(
            "bad_model_response",
            "The model did not return a repair result. Please try again.",
        )

    index = SourceIndex(source.pages)
    checks = validate_quotes(index, raw.get("evidence"))
    status = _clean_status(raw.get("status"))
    replacement = raw.get("replacement")
    replacement = replacement.strip() if isinstance(replacement, str) else ""

    reason = raw.get("reason")
    reason = reason.strip() if isinstance(reason, str) and reason.strip() else None
    explanation = raw.get("explanation")
    explanation = explanation.strip() if isinstance(explanation, str) else ""

    reason_code: Optional[str] = None
    if status == REPAIRED:
        # Deterministic acceptance gate: a repair must be fully evidence-backed.
        if not replacement:
            status, reason_code = INSUFFICIENT_EVIDENCE, "replacement_missing"
            reason = reason or "The model returned no replacement text."
        elif not checks:
            status, reason_code = INSUFFICIENT_EVIDENCE, "evidence_missing"
            reason = reason or (
                "No supporting quotation was supplied for the proposed correction."
            )
        elif not all(c.verified for c in checks):
            status, reason_code = INSUFFICIENT_EVIDENCE, "evidence_unverified"
            reason = (
                "The proposed correction could not be validated against the "
                "supplied source, so no repair is offered."
            )

    if status == REPAIRED:
        final_explanation = explanation or (
            "The replacement is grounded in the quoted source text."
        )
        needs_review = False
    else:
        # Never repeat an unvalidated model explanation as if it were a fix.
        final_explanation = reason or (
            "The supplied source is insufficient, ambiguous or conflicting about "
            "this claim, so no correction can be grounded in it."
        )
        needs_review = True

    return {
        "status": status,
        "reason_code": reason_code,
        "original_claim": claim_text,
        "original_verdict": (original_verdict or "").strip() or None,
        "suggested_replacement": replacement if status == REPAIRED else None,
        "explanation": final_explanation,
        "evidence": _as_dicts(checks),
        "evidence_status": evidence_status_for(checks),
        "needs_review": needs_review,
        "source_info": source.info(),
        "model": used_model,
        "note": (
            "The original answer and the original claim are unchanged; this is a "
            "suggestion only. Every quotation was validated against the extracted "
            "source text by this application."
        ),
    }


# --------------------------------------------------------------------------- #
# Feature B: AI courtroom
# --------------------------------------------------------------------------- #
def _clean_judge_verdict(value: Any) -> tuple[str, bool]:
    """Return (verdict, was_unrecognised). Unknown verdicts become 'Insufficient evidence'."""
    if isinstance(value, str):
        key = value.strip().lower().rstrip(".")
        if key in JUDGE_VERDICT_ALIASES:
            return JUDGE_VERDICT_ALIASES[key], False
    return INSUFFICIENT, True


def _clean_side(raw: Any, index: SourceIndex) -> dict:
    """Validate one courtroom side (prosecutor / defender / judge evidence)."""
    raw = raw if isinstance(raw, dict) else {}
    argument = raw.get("argument")
    checks = validate_quotes(index, raw.get("evidence"))
    return {
        "argument": argument.strip() if isinstance(argument, str) else "",
        "evidence": _as_dicts(checks),
        "evidence_status": evidence_status_for(checks),
    }


def run_courtroom(
    *,
    source: SourceDoc,
    claim_text: str,
    answer: Optional[str] = None,
    claim_verdict: Optional[str] = None,
    api_key: Optional[str],
    model: Optional[str] = None,
    client: Any = None,
) -> dict:
    """Stage prosecutor / defender / judge for one claim from a single model call."""
    client, used_model = _client_or_raise(api_key, model, client)
    raw = client.complete_json(
        COURTROOM_SYSTEM, courtroom_user(source.pages, claim_text, answer, claim_verdict)
    )
    if not isinstance(raw, dict):
        raise PipelineError(
            "bad_model_response",
            "The model did not return a courtroom result. Please try again.",
        )

    index = SourceIndex(source.pages)
    raw_defender = raw.get("defender") if isinstance(raw.get("defender"), dict) else {}

    prosecutor = _clean_side(raw.get("prosecutor"), index)
    defender = _clean_side(raw_defender, index)
    defender["source_supports_claim"] = bool(raw_defender.get("source_supports_claim"))

    raw_judge = raw.get("judge") if isinstance(raw.get("judge"), dict) else {}
    judge_checks = validate_quotes(index, raw_judge.get("evidence"))
    verdict, unrecognised = _clean_judge_verdict(raw_judge.get("verdict"))
    reasoning = raw_judge.get("reasoning")
    reasoning = reasoning.strip() if isinstance(reasoning, str) else ""

    judge_note: Optional[str] = None
    # A definitive conclusion must rest on at least one verified quotation.
    if verdict in (SUPPORTED, CONTRADICTED) and not any(
        c.verified for c in judge_checks
    ):
        verdict = INSUFFICIENT
        judge_note = (
            "The judge's conclusion could not be validated against the supplied "
            "source, so no conclusion is recorded."
        )
    elif unrecognised:
        judge_note = "The model returned an unrecognised verdict; treat it with care."

    judge = {
        "verdict": verdict,
        "reasoning": reasoning,
        "evidence": _as_dicts(judge_checks),
        "evidence_status": evidence_status_for(judge_checks),
        "needs_review": verdict == INSUFFICIENT,
        "review_reason": judge_note,
    }

    return {
        "claim_text": claim_text,
        "claim_verdict_from_audit": (claim_verdict or "").strip() or None,
        "prosecutor": prosecutor,
        "defender": defender,
        "judge": judge,
        "method": METHOD_SINGLE_CALL,
        "source_info": source.info(),
        "model": used_model,
        "evidence_note": (
            "Prosecutor, defender and judge were produced by a single model "
            "request, not by independent agents. Every quotation was matched "
            "against the extracted source text by this application; a match "
            "confirms the text exists, not that it proves the claim."
        ),
    }
