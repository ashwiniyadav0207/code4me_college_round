"""Optional live tests against the real Gemini API.

These are skipped automatically unless GEMINI_API_KEY is configured in
backend/.env (or the environment). Everything else in the suite is offline.
"""

import os

import pytest

from pdf_utils import build_source_from_text
from pipeline import run_analysis

requires_key = pytest.mark.skipif(
    not os.getenv("GEMINI_API_KEY"),
    reason="GEMINI_API_KEY not configured (backend/.env)",
)


@requires_key
def test_live_claims_are_extracted_and_verified(policy_text):
    source = build_source_from_text(policy_text)
    answer = (
        "Employees may work remotely up to three days per week. "
        "The home-office stipend is 900 USD per year. "
        "The policy also gives everyone a free parking space."
    )
    out = run_analysis(source=source, answer=answer, api_key=os.getenv("GEMINI_API_KEY"))

    assert out["summary"]["total"] >= 3
    verdicts = {c["verdict"] for c in out["claims"]}
    assert verdicts & {"Supported", "Contradicted", "Not stated in source"}

    for claim in out["claims"]:
        assert claim["verdict"] in {
            "Supported",
            "Contradicted",
            "Not stated in source",
            "Ambiguous/conflicting",
        }
        # unverified or missing evidence must always force human review
        if claim["evidence_status"] in ("unverified", "partial", "missing"):
            assert claim["needs_review"] is True, claim
        for ev in claim["evidence"]:
            if ev["verified"]:
                assert ev["page"] is not None and 1 <= ev["page"] <= source.page_count
            else:
                assert claim["needs_review"] is True, claim


# --------------------------------------------------------------------------- #
# Live feature tests (one model call each)
# --------------------------------------------------------------------------- #
@requires_key
def test_live_repair_of_a_contradicted_claim(policy_text):
    import os as _os

    from features import run_repair

    source = build_source_from_text(policy_text)
    out = run_repair(
        source=source,
        claim_text="The home-office stipend is 900 USD per year.",
        original_verdict="Contradicted",
        api_key=_os.getenv("GEMINI_API_KEY"),
    )
    assert out["status"] in ("repaired", "insufficient_evidence")
    assert out["original_claim"] == "The home-office stipend is 900 USD per year."
    for ev in out["evidence"]:
        if ev["verified"]:
            assert ev["page"] is not None and 1 <= ev["page"] <= source.page_count
    if out["status"] == "repaired":
        assert out["suggested_replacement"]
        assert out["evidence_status"] == "verified"
        # a repair must be fully evidence-backed
        assert all(ev["verified"] for ev in out["evidence"])
    else:
        assert out["suggested_replacement"] is None
        assert out["needs_review"] is True


@requires_key
def test_live_courtroom_returns_validated_sections(policy_text):
    import os as _os

    from features import run_courtroom

    source = build_source_from_text(policy_text)
    out = run_courtroom(
        source=source,
        claim_text="The home-office stipend is 900 USD per year.",
        claim_verdict="Contradicted",
        api_key=_os.getenv("GEMINI_API_KEY"),
    )
    assert out["method"] == "single_model_call"
    assert out["judge"]["verdict"] in {
        "Supported", "Contradicted", "Not stated in source",
        "Ambiguous/conflicting", "Insufficient evidence",
    }
    for side in ("prosecutor", "defender", "judge"):
        for ev in out[side]["evidence"]:
            # nothing is ever reported verified unless it really is in the source
            if ev["verified"]:
                assert ev["page"] is not None and 1 <= ev["page"] <= source.page_count
    # a definitive judge verdict must rest on verified evidence
    if out["judge"]["verdict"] in ("Supported", "Contradicted"):
        assert any(ev["verified"] for ev in out["judge"]["evidence"])
