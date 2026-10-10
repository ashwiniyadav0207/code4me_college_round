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
