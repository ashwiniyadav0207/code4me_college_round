"""Evidence Guard tests — fully offline, no API calls.

Covers: normalization, page computation, fabricated quotations, and the
review rules that keep unverified evidence from being presented as proof.
"""

import pytest

from evidence_guard import (
    AMBIGUOUS,
    CONTRADICTED,
    NOT_STATED,
    SUPPORTED,
    SourceIndex,
    guard_claim,
    normalize,
    validate_quote,
)


# --------------------------------------------------------------------------- #
# Normalization
# --------------------------------------------------------------------------- #
def test_normalize_curly_quotes_and_dashes():
    assert normalize("the \u201cmanager\u201d\u2019s \u2014 approval\u201d") == (
        'the "manager"\'s - approval"'
    )


def test_normalize_non_breaking_space_and_ligature():
    assert normalize("three\u00a0days\u00a0per week") == "three days per week"
    assert normalize("ef\uFB01cient review") == "efficient review"


def test_normalize_hyphenated_line_break():
    # PDF line-break artefact: "inter-\nnational"
    assert normalize("a inter-\nnational dispute") == "a international dispute"


def test_normalize_collapsed_whitespace():
    assert normalize("line one\n\nline   two\ttabbed") == "line one line two tabbed"


# --------------------------------------------------------------------------- #
# Quote validation and page computation
# --------------------------------------------------------------------------- #
def test_valid_quote_resolves_real_page(policy_pages):
    index = SourceIndex(policy_pages)
    quote = "review every remote working arrangement at least once per quarter"
    check = validate_quote(index, quote, model_page=1)  # model lies about the page
    assert check.verified is True
    assert check.page == 3  # computed from the source, not from the model
    assert check.model_page == 1


def test_quote_from_page_two(policy_pages):
    index = SourceIndex(policy_pages)
    check = validate_quote(index, "stipend of 400 USD per year")
    assert check.verified is True
    assert check.page == 2


def test_quote_with_pdf_line_wrapping_still_matches(policy_pages):
    # Same sentence but re-wrapped and with curly quotes, as extracted by a PDF.
    index = SourceIndex(policy_pages)
    wrapped = "\n".join(
        [
            "Employees may work remotely up to three days per week",
            "with written approval from their line manager.",
        ]
    )
    check = validate_quote(index, wrapped)
    assert check.verified is True
    assert check.page == 1


def test_fabricated_quote_is_rejected(policy_pages):
    index = SourceIndex(policy_pages)
    check = validate_quote(index, "Employees may work remotely five days per week.")
    assert check.verified is False
    assert check.status == "unverified"
    assert check.page is None


def test_too_short_quote_is_not_treated_as_evidence(policy_pages):
    index = SourceIndex(policy_pages)
    check = validate_quote(index, "three days")
    assert check.verified is False
    assert check.status == "too_short"


def test_ellipsis_quote_matches_by_segments(policy_pages):
    index = SourceIndex(policy_pages)
    quote = "Employees may work remotely up to three days per week ... their line manager"
    check = validate_quote(index, quote)
    assert check.verified is True
    assert check.page == 1


# --------------------------------------------------------------------------- #
# Claim-level rules
# --------------------------------------------------------------------------- #
def _claim(**overrides):
    base = {
        "id": "c1",
        "claim_text": "Employees may work remotely up to three days per week.",
        "claim_type": "fact",
        "span_start": 0,
        "span_end": 55,
        "verdict": SUPPORTED,
        "explanation": "The source says exactly this.",
        "evidence": [{"quote": "up to three days per week", "page": 1}],
        "needs_review": False,
        "review_reason": None,
    }
    base.update(overrides)
    return base


def test_supported_claim_with_valid_quote(policy_pages):
    result = guard_claim(_claim(), SourceIndex(policy_pages))
    assert result["evidence_status"] == "verified"
    assert result["evidence"][0]["page"] == 1
    assert result["needs_review"] is False


def test_fabricated_quote_flags_claim_for_review(policy_pages):
    claim = _claim(evidence=[{"quote": "Employees may work remotely five days per week.", "page": 1}])
    result = guard_claim(claim, SourceIndex(policy_pages))
    assert result["evidence_status"] == "unverified"
    assert result["evidence"][0]["verified"] is False
    assert result["needs_review"] is True
    assert "could not be found" in result["review_reason"]


def test_definitive_verdict_without_quote_is_missing_evidence(policy_pages):
    result = guard_claim(_claim(evidence=[]), SourceIndex(policy_pages))
    assert result["evidence_status"] == "missing"
    assert result["needs_review"] is True


def test_not_stated_needs_no_evidence_and_keeps_none(policy_pages):
    claim = _claim(
        verdict=NOT_STATED,
        explanation="The source does not mention rent savings.",
        evidence=[{"quote": "a fabricated line that is not in the document", "page": 1}],
    )
    result = guard_claim(claim, SourceIndex(policy_pages))
    assert result["evidence_status"] == "not_required"
    assert result["evidence"] == []
    assert "does not address this claim" in result["evidence_note"]


def test_ambiguous_verdict_with_quotes_is_verified(policy_pages):
    claim = _claim(
        verdict=AMBIGUOUS,
        claim_text="Equipment reimbursement happens every two years.",
        explanation="Section 4 says annually while section 5 says every two years.",
        evidence=[
            {"quote": "stipend of 400 USD per year", "page": 2},
            {"quote": "reimbursed once every two years", "page": 2},
        ],
    )
    result = guard_claim(claim, SourceIndex(policy_pages))
    assert result["evidence_status"] == "verified"
    assert len(result["evidence"]) == 2
    assert result["evidence"][1]["page"] == 2


def test_partial_evidence_forces_review(policy_pages):
    claim = _claim(
        verdict=CONTRADICTED,
        evidence=[
            {"quote": "stipend of 400 USD per year", "page": 2},
            {"quote": "the stipend is cancelled for everyone", "page": 2},
        ],
    )
    result = guard_claim(claim, SourceIndex(policy_pages))
    assert result["evidence_status"] == "partial"
    assert result["needs_review"] is True


@pytest.mark.parametrize("claim_type", ["inference", "recommendation"])
def test_interpretive_claims_are_flagged_for_review(policy_pages, claim_type):
    claim = _claim(
        claim_type=claim_type,
        claim_text="You should ask for an extra review before switching teams.",
        verdict=AMBIGUOUS,
    )
    result = guard_claim(claim, SourceIndex(policy_pages))
    assert result["needs_review"] is True
    assert "assumptions" in result["review_reason"]


def test_guard_never_rewrites_a_model_verdict(policy_pages):
    result = guard_claim(_claim(verdict="Maybe"), SourceIndex(policy_pages))
    assert result["verdict"] == "Maybe"
    # evidence is still validated even for an unusual verdict label
    assert result["evidence"][0]["verified"] is True
