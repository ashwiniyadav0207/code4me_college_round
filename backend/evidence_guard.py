"""Evidence Guard.

Validates quotations returned by the model against the text that was actually
extracted from the user's source document, and computes the real page number of
each quotation. The model's reported page number is never trusted.

Nothing here calls the network, so it is fully testable offline.
"""

from __future__ import annotations

import bisect
import re
import unicodedata
from dataclasses import dataclass, asdict
from typing import Any, Iterable, Optional

# Verdict vocabulary (exactly one primary verdict per claim).
SUPPORTED = "Supported"
CONTRADICTED = "Contradicted"
NOT_STATED = "Not stated in source"
AMBIGUOUS = "Ambiguous/conflicting"

VERDICTS = (SUPPORTED, CONTRADICTED, NOT_STATED, AMBIGUOUS)

# Claim evidence statuses produced by the guard.
EV_VERIFIED = "verified"
EV_PARTIAL = "partial"
EV_UNVERIFIED = "unverified"
EV_MISSING = "missing"
EV_NOT_REQUIRED = "not_required"

# Short quotations match too easily to count as evidence.
MIN_QUOTE_CHARS = 15

_QUOTE_SUBS = {
    "\u2018": "'",  # ‘
    "\u2019": "'",  # ’
    "\u201a": "'",
    "\u201b": "'",
    "\u201c": '"',  # “
    "\u201d": '"',  # ”
    "\u201e": '"',
    "\u201f": '"',
    "\u00ab": '"',
    "\u00bb": '"',
    "\u2039": "'",
    "\u203a": "'",
    "\u2032": "'",  # prime
    "\u2033": '"',
    "\u00a0": " ",  # non-breaking space
    "\u2007": " ",
    "\u202f": " ",  # narrow no-break space
    "\u2060": "",
    "\u00ad": "",  # soft hyphen
}

_DASHES = (
    "\u2010"  # hyphen
    "\u2011"  # non-breaking hyphen
    "\u2012"  # figure dash
    "\u2013"  # en dash
    "\u2014"  # em dash
    "\u2015"  # horizontal bar
    "\u2212"  # minus sign
    "\u2043"  # hyphen bullet
    "\ufe63"  # small hyphen-minus
    "\u02d9"  # dot above (PDF artifact for hyphenation)
)

_HYPHEN_LINEBREAK = re.compile(r"(?<=[A-Za-z])[ \t]*-\s*\r?\n[ \t]*(?=[A-Za-z])")
_WHITESPACE = re.compile(r"\s+")
_ELLIPSIS = re.compile(r"\.{3,}|\u2026")


def normalize(text: str) -> str:
    """Normalize text for evidence matching.

    Handles the usual PDF artefacts: ligatures and full-width characters (NFKC),
    curly quotes, dash variants, non-breaking spaces, hyphenated line breaks and
    collapsed/expanded whitespace.
    """
    if not text:
        return ""
    t = unicodedata.normalize("NFKC", text)
    for src, dst in _QUOTE_SUBS.items():
        t = t.replace(src, dst)
    for dash in _DASHES:
        t = t.replace(dash, "-")
    t = t.replace("\u2026", "...")
    # "inter-\nnational" -> "international"
    t = _HYPHEN_LINEBREAK.sub("", t)
    t = _WHITESPACE.sub(" ", t)
    return t.strip()


@dataclass
class QuoteCheck:
    """Result of validating one model-supplied quotation."""

    quote: str
    verified: bool
    page: Optional[int]
    model_page: Optional[int]
    status: str
    note: str

    def as_dict(self) -> dict:
        return asdict(self)


class SourceIndex:
    """Normalized view of the extracted source, page by page."""

    def __init__(self, pages: Iterable[str]):
        self.pages: list[str] = list(pages) if pages else [""]
        self.norm_pages: list[str] = [normalize(p) for p in self.pages]
        starts: list[int] = []
        buf: list[str] = []
        pos = 0
        for norm in self.norm_pages:
            starts.append(pos)
            buf.append(norm)
            pos += len(norm) + 1  # +1 for the joining space below
        self.full = " ".join(buf)
        self._starts = starts

    def find(self, quote: str) -> Optional[int]:
        """Return the index of the first case-insensitive match, else None."""
        if not quote:
            return None
        m = re.search(re.escape(quote), self.full, flags=re.IGNORECASE)
        return m.start() if m else None

    def page_of(self, index: int) -> int:
        """Map an offset in ``full`` to a 1-based page number."""
        if not self.pages:
            return 1
        page = bisect.bisect_right(self._starts, index)  # 1-based page of index
        page = max(1, min(page, len(self.pages)))
        return page

    def find_in_page(self, page_number: int, quote: str) -> bool:
        if not quote or not (1 <= page_number <= len(self.pages)):
            return False
        return re.search(re.escape(quote), self.norm_pages[page_number - 1], flags=re.I) is not None


def _strip_wrapping(text: str) -> str:
    return text.strip(" \t\"'`\u2018\u2019\u201c\u201d\u00ab\u00bb").strip()


def validate_quote(index: SourceIndex, quote: str, model_page: Any = None) -> QuoteCheck:
    """Check one quotation against the extracted source text.

    Returns a QuoteCheck; ``verified`` is True only when the exact text exists in
    the source. The reported ``page`` is computed from the source, never taken
    from the model.
    """
    claimed_page = model_page if isinstance(model_page, int) and model_page > 0 else None
    original = quote if isinstance(quote, str) else ""
    norm = normalize(original)

    if not norm:
        return QuoteCheck(original, False, None, claimed_page, "unverified", "Empty quotation.")
    if len(norm) < MIN_QUOTE_CHARS:
        return QuoteCheck(
            original,
            False,
            None,
            claimed_page,
            "too_short",
            f"Quotation is shorter than {MIN_QUOTE_CHARS} characters and is too weak to verify.",
        )

    candidates = [norm]
    stripped = _strip_wrapping(norm)
    if stripped and stripped not in candidates:
        candidates.append(stripped)
    # Ellipsis at the ends is a quoting convention, not source text.
    trimmed = stripped.strip(".")
    if trimmed and trimmed not in candidates:
        candidates.append(trimmed)

    for candidate in candidates:
        pos = index.find(candidate)
        if pos is not None:
            page = index.page_of(pos)
            note = "Quotation found in the extracted source text."
            if claimed_page and claimed_page != page:
                note += f" (page reported by the model: {claimed_page})"
            return QuoteCheck(original, True, page, claimed_page, "verified", note)

    # A quotation written with an ellipsis can be checked segment by segment.
    if "..." in norm:
        segments = [s.strip() for s in _ELLIPSIS.split(norm) if s.strip()]
        segments = [s for s in segments if len(s) >= MIN_QUOTE_CHARS]
        if segments:
            positions = [index.find(s) for s in segments]
            if all(p is not None for p in positions):
                page = index.page_of(min(p for p in positions if p is not None))
                return QuoteCheck(
                    original,
                    True,
                    page,
                    claimed_page,
                    "verified",
                    "Multi-part quotation matched the source text.",
                )

    return QuoteCheck(
        original,
        False,
        None,
        claimed_page,
        "unverified",
        "Quotation not found in the extracted source text; it is not usable as evidence.",
    )


def _add_reason(reasons: list[str], text: str) -> None:
    text = (text or "").strip()
    if text and text not in reasons:
        reasons.append(text)


def guard_claim(claim: dict, index: SourceIndex) -> dict:
    """Apply evidence rules to a single claim and return the enriched claim.

    * Every quotation is validated; unverified quotations stay visible but are
      clearly marked, and the claim is flagged for human review.
    * A definitive verdict (Supported / Contradicted) without any quotation is
      flagged as missing evidence.
    * "Not stated in source" requires no quotation and never carries invented
      evidence.
    * Inferences and recommendations are flagged for human review.
    """
    verdict = claim.get("verdict") or AMBIGUOUS
    claim_type = claim.get("claim_type") or "fact"
    raw_quotes = claim.get("evidence") or []
    if not isinstance(raw_quotes, list):
        raw_quotes = []

    reasons: list[str] = []
    needs_review = bool(claim.get("needs_review"))
    model_reason = claim.get("review_reason")
    if isinstance(model_reason, str):
        _add_reason(reasons, model_reason)

    if verdict == NOT_STATED:
        # No quotation is required and none is invented to fill the card.
        claim["evidence"] = []
        claim["evidence_status"] = EV_NOT_REQUIRED
        claim["evidence_note"] = (
            "No quotation required: the source does not address this claim. "
            "'Not stated in source' does not mean the claim is false."
        )
    else:
        checks = [
            validate_quote(index, q.get("quote") if isinstance(q, dict) else q,
                            q.get("page") if isinstance(q, dict) else None)
            for q in raw_quotes
        ]
        claim["evidence"] = [c.as_dict() for c in checks]
        ok = sum(1 for c in checks if c.verified)
        definitive = verdict in (SUPPORTED, CONTRADICTED)

        if not checks:
            if definitive:
                claim["evidence_status"] = EV_MISSING
                needs_review = True
                _add_reason(
                    reasons,
                    "No evidence quotation was supplied for a definitive verdict.",
                )
            else:
                claim["evidence_status"] = EV_NOT_REQUIRED
                claim["evidence_note"] = (
                    "No quotation supplied; this verdict does not rely on quoted evidence."
                )
        elif ok == len(checks):
            claim["evidence_status"] = EV_VERIFIED
            claim["evidence_note"] = (
                "All quotations matched the extracted source text. A match proves the "
                "text exists, not that it supports the claim."
            )
        elif ok == 0:
            claim["evidence_status"] = EV_UNVERIFIED
            needs_review = True
            _add_reason(
                reasons,
                "Evidence quotation(s) could not be found in the supplied source.",
            )
        else:
            claim["evidence_status"] = EV_PARTIAL
            needs_review = True
            _add_reason(
                reasons,
                "Some evidence quotations could not be found in the supplied source.",
            )

    if claim_type in ("inference", "recommendation"):
        needs_review = True
        _add_reason(
            reasons,
            "Interpretive claim: its reading depends on assumptions and should be "
            "checked by a person.",
        )

    # Unverified evidence always forces review, whatever the verdict.
    if claim.get("evidence_status") in (EV_UNVERIFIED, EV_PARTIAL, EV_MISSING):
        needs_review = True

    claim["needs_review"] = needs_review
    claim["review_reason"] = " ".join(reasons) if reasons else None
    claim["evidence_verified"] = claim.get("evidence_status") == EV_VERIFIED
    return claim


def validate_all(claims: list[dict], pages: list[str]) -> list[dict]:
    index = SourceIndex(pages)
    return [guard_claim(c, index) for c in claims]
