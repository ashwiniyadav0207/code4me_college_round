"""Pipeline tests using a scripted model client — no network, no API key.

Covers the eight required scenarios:
  1. directly supported claim
  2. correct paraphrase
  3. contradicted claim with an incorrect number
  4. claim absent from the source
  5. ambiguous / conflicting source statements
  6. compound answer needing multiple claims
  7. fabricated quotation rejected by the Evidence Guard
  8. inference / recommendation requiring review
"""

import pytest

from pdf_utils import build_source_from_text
from pipeline import (
    PipelineError,
    extract_claims,
    parse_json,
    run_analysis,
    validate_spans,
)


class ScriptedClient:
    """Stands in for Gemini: returns pre-written extraction and verification payloads."""

    model = "fake-model-for-tests"

    def __init__(self, claims, results):
        self.claims = claims
        self.results = results
        self.calls = 0

    def complete_json(self, system, user):
        self.calls += 1
        if "extract checkable claims" in system:
            return {"claims": self.claims}
        return {"results": self.results}


ANSWER = (
    "Employees may work remotely up to three days per week with their manager's approval. "
    "The home-office stipend is 900 USD per year, so you should book an extra review. "
    "Customer files may be kept on a personal laptop for a month."
)


def span(text: str) -> tuple[int, int]:
    """Exact offsets of `text` inside ANSWER — the shape a correct model returns."""
    start = ANSWER.index(text)
    return start, start + len(text)


def claim(cid: str, text: str, claim_type: str = "fact", with_span: bool = True) -> dict:
    start, end = span(text) if with_span else (None, None)
    return {
        "id": cid,
        "claim_text": text,
        "claim_type": claim_type,
        "span_start": start,
        "span_end": end,
    }


def result(cid: str, verdict: str, explanation: str, evidence=None, needs_review=False, reason=None):
    return {
        "claim_id": cid,
        "verdict": verdict,
        "explanation": explanation,
        "evidence": evidence if evidence is not None else [],
        "needs_review": needs_review,
        "review_reason": reason,
    }


def run(pages, claims, results, answer=ANSWER):
    source = build_source_from_text("\f".join(pages))
    client = ScriptedClient(claims, results)
    out = run_analysis(source=source, answer=answer, api_key="unused", client=client)
    out["_calls"] = client.calls
    return out


def test_exactly_two_model_calls_are_made(policy_pages):
    out = run(
        policy_pages,
        [claim("c1", "The home-office stipend is 900 USD per year")],
        [result("c1", "Contradicted", "Section 4 says 400 USD.", [{"quote": "stipend of 400 USD per year"}])],
    )
    assert out["_calls"] == 2  # one extraction call + one verification call


# --------------------------------------------------------------------------- #
# 1. Directly supported claim
# --------------------------------------------------------------------------- #
def test_directly_supported_claim(policy_pages):
    text = "Employees may work remotely up to three days per week with their manager's approval."
    out = run(
        policy_pages,
        [claim("c1", text)],
        [
            result(
                "c1",
                "Supported",
                "Section 2 states this directly.",
                [{"quote": "Employees may work remotely up to three days per week", "page": 1}],
            )
        ],
    )
    c = out["claims"][0]
    assert c["verdict"] == "Supported"
    assert c["evidence_status"] == "verified"
    assert c["evidence"][0]["page"] == 1
    assert c["needs_review"] is False
    assert (c["span_start"], c["span_end"]) == span(text)
    assert out["summary"]["supported"] == 1
    assert out["span_mapping_available"] is True


# --------------------------------------------------------------------------- #
# 2. Correct paraphrase
# --------------------------------------------------------------------------- #
def test_correct_paraphrase_is_supported(policy_pages):
    answer = "Staff are allowed to telecommute three days weekly if their line manager agrees in writing."
    c1 = {
        "id": "c1",
        "claim_text": answer,
        "claim_type": "fact",
        "span_start": 0,
        "span_end": len(answer),
    }
    out = run(
        policy_pages,
        [c1],
        [
            result(
                "c1",
                "Supported",
                "A faithful paraphrase of section 2.",
                [
                    {
                        "quote": "up to three days per week with written approval from their line manager",
                        "page": 1,
                    }
                ],
            )
        ],
        answer=answer,
    )
    c = out["claims"][0]
    assert c["verdict"] == "Supported"
    assert c["evidence_status"] == "verified"
    assert c["evidence"][0]["page"] == 1
    assert c["needs_review"] is False


# --------------------------------------------------------------------------- #
# 3. Contradicted claim with an incorrect number
# --------------------------------------------------------------------------- #
def test_contradicted_wrong_number(policy_pages):
    out = run(
        policy_pages,
        [claim("c1", "The home-office stipend is 900 USD per year")],
        [
            result(
                "c1",
                "Contradicted",
                "Section 4 gives the figure as 400 USD per year, not 900.",
                [{"quote": "stipend of 400 USD per year", "page": 2}],
            )
        ],
    )
    c = out["claims"][0]
    assert c["verdict"] == "Contradicted"
    assert c["evidence_status"] == "verified"
    assert c["evidence"][0]["page"] == 2  # recomputed by Python
    assert out["summary"]["contradicted"] == 1


# --------------------------------------------------------------------------- #
# 4. Claim absent from the source
# --------------------------------------------------------------------------- #
def test_claim_not_stated_needs_no_evidence(policy_pages):
    out = run(
        policy_pages,
        [claim("c1", "The policy reduces office rent by 30 percent.", with_span=False)],
        [result("c1", "Not stated in source", "The document says nothing about rent.")],
    )
    c = out["claims"][0]
    assert c["verdict"] == "Not stated in source"
    assert c["evidence_status"] == "not_required"
    assert c["evidence"] == []
    assert out["summary"]["not_stated"] == 1


# --------------------------------------------------------------------------- #
# 5. Ambiguous / conflicting source statements
# --------------------------------------------------------------------------- #
def test_ambiguous_conflicting_source(policy_pages):
    out = run(
        policy_pages,
        [claim("c1", "Customer files may be kept on a personal laptop for a month.", with_span=False)],
        [
            result(
                "c1",
                "Ambiguous/conflicting",
                "Section 8 caps storage at seven days, but the review cycle is quarterly.",
                [
                    {"quote": "stipend of 400 USD per year", "page": 2},
                    {"quote": "reimbursed once every two years", "page": 2},
                ],
                needs_review=True,
                reason="The two sections conflict.",
            )
        ],
    )
    c = out["claims"][0]
    assert c["verdict"] == "Ambiguous/conflicting"
    assert c["evidence_status"] == "verified"
    assert [e["page"] for e in c["evidence"]] == [2, 2]
    assert c["needs_review"] is True
    assert out["summary"]["ambiguous"] == 1


def test_genuine_policy_conflict_is_ambiguous(policy_pages):
    """Section 4 says 'per year', section 5 says 'once every two years'."""
    out = run(
        policy_pages,
        [claim("c1", "The home-office stipend is 900 USD per year")],
        [
            result(
                "c1",
                "Ambiguous/conflicting",
                "Section 4 states an annual stipend while section 5 reimburses every two years.",
                [
                    {"quote": "stipend of 400 USD per year", "page": 2},
                    {"quote": "reimbursed once every two years", "page": 2},
                ],
                needs_review=True,
                reason="The source contradicts itself on frequency and amount.",
            )
        ],
    )
    assert out["claims"][0]["evidence_status"] == "verified"
    assert out["claims"][0]["needs_review"] is True


# --------------------------------------------------------------------------- #
# 6. Compound answer requiring multiple claims
# --------------------------------------------------------------------------- #
def test_compound_answer_produces_multiple_claims(policy_pages):
    texts = [
        "Employees may work remotely up to three days per week with their manager's approval.",
        "The home-office stipend is 900 USD per year",
        "Customer files may be kept on a personal laptop for a month.",
    ]
    claims = [claim(f"c{i + 1}", t) for i, t in enumerate(texts)]
    results = [
        result(
            "c1",
            "Supported",
            "Stated in section 2.",
            [{"quote": "Employees may work remotely up to three days per week", "page": 1}],
        ),
        result(
            "c2",
            "Contradicted",
            "The source says 400 USD per year.",
            [{"quote": "stipend of 400 USD per year", "page": 2}],
        ),
        result(
            "c3",
            "Contradicted",
            "Section 8 caps storage at seven days.",
            [{"quote": "must not store client files for longer than seven days", "page": 3}],
        ),
    ]
    out = run(policy_pages, claims, results)
    assert [c["verdict"] for c in out["claims"]] == ["Supported", "Contradicted", "Contradicted"]
    assert out["summary"] == {
        "total": 3,
        "supported": 1,
        "contradicted": 2,
        "not_stated": 0,
        "ambiguous": 0,
        "needs_review": 0,
    }
    # every page number was recomputed from the source, not copied from the model
    assert [c["evidence"][0]["page"] for c in out["claims"]] == [1, 2, 3]
    # spans point at the real answer text
    for c in out["claims"]:
        assert ANSWER[c["span_start"] : c["span_end"]] == c["claim_text"]


# --------------------------------------------------------------------------- #
# 7. Fabricated quotation rejected
# --------------------------------------------------------------------------- #
def test_fabricated_quotation_is_rejected_and_flagged(policy_pages):
    out = run(
        policy_pages,
        [claim("c1", "Employees may work remotely five days per week.", with_span=False)],
        [
            result(
                "c1",
                "Supported",
                "The source says five days are allowed.",
                [{"quote": "Employees may work remotely up to five days per week", "page": 1}],
            )
        ],
    )
    c = out["claims"][0]
    assert c["evidence"][0]["verified"] is False
    assert c["evidence_status"] == "unverified"
    assert c["needs_review"] is True
    assert c["evidence"][0]["page"] is None  # no fabricated page number
    assert "could not be found" in c["review_reason"]
    assert out["summary"]["needs_review"] == 1


def test_unverified_supported_claim_downgraded_to_ambiguous(policy_pages):
    out = run(
        policy_pages,
        [claim("c1", "Employees may work remotely five days per week.", with_span=False)],
        [
            result(
                "c1",
                "Supported",
                "The source says five days are allowed.",
                [{"quote": "Employees may work remotely up to five days per week", "page": 1}],
            )
        ],
    )
    c = out["claims"][0]
    assert c["model_verdict"] == "Supported"
    assert c["verdict"] == "Ambiguous/conflicting"
    assert c["needs_review"] is True
    assert c["evidence_status"] == "unverified"
    assert out["summary"]["supported"] == 0
    assert out["summary"]["ambiguous"] == 1
    assert out["summary"]["needs_review"] == 1


# --------------------------------------------------------------------------- #
# 8. Inference / recommendation requiring review
# --------------------------------------------------------------------------- #
def test_recommendation_is_flagged_for_review(policy_pages):
    out = run(
        policy_pages,
        [claim("c1", "so you should book an extra review", claim_type="recommendation")],
        [
            result(
                "c1",
                "Not stated in source",
                "The policy permits an additional review but does not recommend one.",
            )
        ],
    )
    c = out["claims"][0]
    assert c["claim_type"] == "recommendation"
    assert c["needs_review"] is True
    assert "assumptions" in c["review_reason"]
    assert out["summary"]["needs_review"] == 1


def test_inference_is_flagged_for_review(policy_pages):
    out = run(
        policy_pages,
        [claim("c1", "Customer files may be kept on a personal laptop for a month.", claim_type="inference")],
        [
            result(
                "c1",
                "Ambiguous/conflicting",
                "Seven days for storage, but the review cycle is quarterly.",
                [{"quote": "for longer than seven days", "page": 3}],
            )
        ],
    )
    assert out["claims"][0]["needs_review"] is True


# --------------------------------------------------------------------------- #
# Robustness
# --------------------------------------------------------------------------- #
def test_missing_model_result_defaults_to_review(policy_pages):
    out = run(
        policy_pages,
        [claim("c1", "Employees may work remotely up to three days per week with their manager's approval.")],
        results=[],  # the model returned no verdict for c1
    )
    c = out["claims"][0]
    assert c["verdict"] == "Ambiguous/conflicting"
    assert c["needs_review"] is True


def test_unknown_verdict_is_not_forced_to_a_definite_answer(policy_pages):
    out = run(
        policy_pages,
        [claim("c1", "The home-office stipend is 900 USD per year")],
        [result("c1", "Kind of true I suppose", "Unclear.")],
    )
    c = out["claims"][0]
    assert c["verdict"] == "Ambiguous/conflicting"
    assert c["needs_review"] is True
    assert "unrecognised verdict" in c["review_reason"]


def test_model_page_is_ignored_and_recomputed(policy_pages):
    out = run(
        policy_pages,
        [claim("c1", "Customer files may be kept on a personal laptop for a month.")],
        [
            result(
                "c1",
                "Supported",
                "Section 7.",
                [
                    {
                        "quote": "review every remote working arrangement at least once per quarter",
                        "page": 1,  # wrong on purpose
                    }
                ],
            )
        ],
    )
    evidence = out["claims"][0]["evidence"][0]
    assert evidence["page"] == 3
    assert evidence["model_page"] == 1


def test_definitive_verdict_without_evidence_is_flagged(policy_pages):
    out = run(
        policy_pages,
        [claim("c1", "The home-office stipend is 900 USD per year")],
        [result("c1", "Supported", "It says so somewhere.")],  # no quotation at all
    )
    c = out["claims"][0]
    assert c["evidence_status"] == "missing"
    assert c["needs_review"] is True


def test_parse_json_tolerates_fences_and_prose():
    assert parse_json('```json\n{"claims": []}\n```') == {"claims": []}
    assert parse_json('Here is the JSON: {"results": []} hope that helps') == {"results": []}
    with pytest.raises(PipelineError):
        parse_json("I could not do that.")


def test_span_validation_keeps_only_trustworthy_offsets():
    answer = "The pilot begins on 1 March 2026 and runs for twelve months."
    claims = [
        {"id": "c1", "claim_text": "The pilot begins on 1 March 2026", "span_start": 0, "span_end": 32},
        # offsets that do not point at the claim text -> remapped by searching
        {"id": "c2", "claim_text": "runs for twelve months", "span_start": 5, "span_end": 15},
        # claim text that is not in the answer at all -> no span, no highlighting
        {"id": "c3", "claim_text": "the office has free parking", "span_start": None, "span_end": None},
    ]
    out = validate_spans(answer, claims)
    assert (out[0]["span_start"], out[0]["span_end"]) == (0, 32)
    assert answer[out[1]["span_start"] : out[1]["span_end"]] == "runs for twelve months"
    assert out[2]["span_start"] is None and out[2]["span_end"] is None


def test_extract_claims_deduplicates_ids_and_drops_junk():
    class Once:
        model = "m"

        def complete_json(self, system, user):
            return {
                "claims": [
                    {"id": "c1", "claim_text": "First claim.", "claim_type": "fact"},
                    {"id": "c1", "claim_text": "Second claim.", "claim_type": "fact"},
                    {"id": "c2", "claim_text": "", "claim_type": "fact"},  # dropped
                    {"id": "c3", "claim_text": "Third claim.", "claim_type": "nonsense"},
                ]
            }

    claims = extract_claims(Once(), "answer")
    assert [c["id"] for c in claims] == ["c1", "c1-2", "c3"]
    assert claims[2]["claim_type"] == "fact"


def test_pasted_text_becomes_pages(policy_text):
    source = build_source_from_text(policy_text)
    assert source.page_count == 3
    assert source.origin == "text"
    assert "NORTHWIND" in source.pages[0]
    assert source.info()["pages"] == 3
