"""Feature tests for Truth Repair and the AI Courtroom — offline, scripted client.

Covers the three scenarios required for the hackathon:
  1. a genuinely contradicted claim -> a valid, evidence-backed repair
  2. a claim with insufficient source evidence -> an explicit decline
  3. evidence quotation validation (fabricated quotes are never "verified")
plus the courtroom equivalent and the single-model-call contract.
"""

import pytest

from evidence_guard import SourceIndex, validate_quote
from features import (
    INSUFFICIENT,
    INSUFFICIENT_EVIDENCE,
    REPAIRED,
    evidence_status_for,
    run_courtroom,
    run_repair,
    validate_quotes,
)
from pdf_utils import build_source_from_text
from pipeline import PipelineError


class FeatureClient:
    """Stands in for Gemini: returns one pre-written payload per feature."""

    model = "fake-model-for-tests"

    def __init__(self, payload):
        self.payload = payload
        self.calls = 0
        self.systems = []

    def complete_json(self, system, user):
        self.calls += 1
        self.systems.append(system)
        return self.payload


def run(feature, pages, payload, **kwargs):
    source = build_source_from_text("\f".join(pages))
    client = FeatureClient(payload)
    fn = run_repair if feature == "repair" else run_courtroom
    common = dict(source=source, api_key="unused", client=client)
    common.update(kwargs)
    out = fn(**common)
    out["_calls"] = client.calls
    return out


# Realistic quotes taken verbatim from the policy fixtures.
QUOTE_STIPEND = "home-office equipment stipend of 400 USD per year"
CLAIM = "The home-office stipend is 900 USD per year"


# --------------------------------------------------------------------------- #
# Feature A — Truth Repair
# --------------------------------------------------------------------------- #
def test_contradicted_claim_is_repaired_with_verified_evidence(policy_pages):
    out = run(
        "repair",
        policy_pages,
        {
            "status": "repaired",
            "replacement": "The home-office equipment stipend is 400 USD per year.",
            "explanation": "Section 4 states the figure directly.",
            "evidence": [{"quote": QUOTE_STIPEND, "page": 2}],
        },
        claim_text=CLAIM,
        original_verdict="Contradicted",
    )
    assert out["_calls"] == 1  # exactly one model call
    assert out["status"] == REPAIRED
    assert out["suggested_replacement"] == "The home-office equipment stipend is 400 USD per year."
    assert out["reason_code"] is None
    # original claim and verdict are echoed back untouched
    assert out["original_claim"] == CLAIM
    assert out["original_verdict"] == "Contradicted"
    # evidence validated deterministically, page recomputed by Python
    ev = out["evidence"][0]
    assert ev["verified"] is True
    assert ev["page"] == 2
    assert ev["status"] == "verified"
    assert out["evidence_status"] == "verified"
    assert out["needs_review"] is False


def test_repair_is_offered_once_and_never_mutates_the_source_claim(policy_pages):
    claim = "The home-office stipend is 900 USD per year"
    out = run(
        "repair",
        policy_pages,
        {
            "status": "repaired",
            "replacement": "The stipend is 400 USD per year.",
            "explanation": "Section 4.",
            "evidence": [{"quote": QUOTE_STIPEND, "page": 2}],
        },
        claim_text=claim,
    )
    # the response carries the original verbatim; no replacement sneaks into it
    assert out["original_claim"] == claim
    assert out["suggested_replacement"] is not None
    assert "suggestion only" in out["note"]


def test_insufficient_source_evidence_returns_explicit_decline(policy_pages):
    out = run(
        "repair",
        policy_pages,
        {
            "status": "insufficient_evidence",
            "reason": "The policy does not mention a free parking space anywhere.",
            "evidence": [],
        },
        claim_text="The policy gives every employee a free parking space.",
    )
    assert out["status"] == INSUFFICIENT_EVIDENCE
    assert out["suggested_replacement"] is None
    assert out["evidence"] == []
    assert out["evidence_status"] == "missing"
    assert out["needs_review"] is True
    assert "parking" in out["explanation"]


def test_fabricated_quotation_downgrades_the_repair_to_insufficient(policy_pages):
    """The safety rule: a repair whose evidence does not verify is never offered."""
    out = run(
        "repair",
        policy_pages,
        {
            "status": "repaired",
            "replacement": "The home-office stipend is 900 USD per year.",
            "explanation": "The source says 900 USD.",
            "evidence": [{"quote": "stipend of 900 USD per year", "page": 2}],
        },
        claim_text=CLAIM,
    )
    assert out["status"] == INSUFFICIENT_EVIDENCE
    assert out["reason_code"] == "evidence_unverified"
    assert out["suggested_replacement"] is None
    assert out["evidence"][0]["verified"] is False  # fabricated quote stays visible but unverified
    assert out["evidence"][0]["page"] is None  # no fabricated page number
    assert out["needs_review"] is True


def test_repair_without_any_evidence_is_downgraded(policy_pages):
    out = run(
        "repair",
        policy_pages,
        {"status": "repaired", "replacement": "Anything at all.", "explanation": "Trust me."},
        claim_text=CLAIM,
    )
    assert out["status"] == INSUFFICIENT_EVIDENCE
    assert out["reason_code"] == "evidence_missing"
    assert out["suggested_replacement"] is None


def test_unrecognised_repair_status_is_never_treated_as_a_repair(policy_pages):
    out = run(
        "repair",
        policy_pages,
        {"status": "kind of fixed I guess", "replacement": "Something."},
        claim_text=CLAIM,
    )
    assert out["status"] == INSUFFICIENT_EVIDENCE
    assert out["suggested_replacement"] is None


def test_repair_recomputes_the_page_and_ignores_the_model_page(policy_pages):
    out = run(
        "repair",
        policy_pages,
        {
            "status": "repaired",
            "replacement": "Managers must review each arrangement quarterly.",
            "explanation": "Section 7.",
            "evidence": [
                {
                    "quote": "review every remote working arrangement at least once per quarter",
                    "page": 1,  # wrong on purpose
                }
            ],
        },
        claim_text="Managers must review remote arrangements once a year.",
    )
    ev = out["evidence"][0]
    assert ev["page"] == 3
    assert ev["model_page"] == 1
    assert ev["verified"] is True


def test_missing_api_key_is_reported_safely(policy_pages):
    source = build_source_from_text("\f".join(policy_pages))
    with pytest.raises(PipelineError) as exc:
        run_repair(source=source, claim_text="x", api_key="")
    assert exc.value.code == "missing_api_key"
    assert exc.value.status_code == 503


def test_non_json_model_response_raises_a_pipeline_error(policy_pages):
    class Junk:
        model = "m"

        def complete_json(self, system, user):
            return ["not", "a", "dict"]

    source = build_source_from_text("\f".join(policy_pages))
    with pytest.raises(PipelineError) as exc:
        run_repair(source=source, claim_text="x", api_key="unused", client=Junk())
    assert exc.value.code == "bad_model_response"


# --------------------------------------------------------------------------- #
# Feature B — AI Courtroom
# --------------------------------------------------------------------------- #
COURTROOM_PAYLOAD = {
    "prosecutor": {
        "argument": "Section 4 gives a different figure than the claim states.",
        "evidence": [{"quote": QUOTE_STIPEND, "page": 2}],
    },
    "defender": {
        "argument": "The source supplies no adequate support for 900 USD.",
        "source_supports_claim": False,
        "evidence": [],
    },
    "judge": {
        "verdict": "Contradicted",
        "reasoning": "The only figure in the source is 400 USD per year.",
        "evidence": [{"quote": QUOTE_STIPEND, "page": 2}],
    },
}


def test_courtroom_returns_three_validated_sections(policy_pages):
    out = run("courtroom", policy_pages, COURTROOM_PAYLOAD, claim_text=CLAIM,
              claim_verdict="Contradicted")
    assert out["_calls"] == 1  # one request, not three agents
    assert out["method"] == "single_model_call"
    assert "single model" in out["evidence_note"]
    for side in ("prosecutor", "defender", "judge"):
        assert "argument" in out[side] or "reasoning" in out[side]
        assert isinstance(out[side]["evidence"], list)
    # every quote was validated and its page recomputed from the source
    assert out["prosecutor"]["evidence"][0]["verified"] is True
    assert out["prosecutor"]["evidence"][0]["page"] == 2
    assert out["judge"]["verdict"] == "Contradicted"
    assert out["judge"]["needs_review"] is False
    assert out["defender"]["source_supports_claim"] is False
    assert out["claim_text"] == CLAIM
    assert out["claim_verdict_from_audit"] == "Contradicted"


def test_definitive_judge_verdict_without_verified_evidence_is_downgraded(policy_pages):
    payload = {
        "prosecutor": {"argument": "Against.", "evidence": []},
        "defender": {"argument": "For.", "source_supports_claim": True, "evidence": []},
        "judge": {
            "verdict": "Supported",
            "reasoning": "It feels right.",
            "evidence": [{"quote": "a stipend that does not exist anywhere", "page": 9}],
        },
    }
    out = run("courtroom", policy_pages, payload, claim_text=CLAIM)
    assert out["judge"]["verdict"] == INSUFFICIENT
    assert out["judge"]["needs_review"] is True
    assert "could not be validated" in out["judge"]["review_reason"]
    assert out["judge"]["evidence"][0]["verified"] is False


def test_judge_can_decline_insufficient_evidence_directly(policy_pages):
    payload = {
        "prosecutor": {"argument": "Against.", "evidence": []},
        "defender": {"argument": "For.", "source_supports_claim": False, "evidence": []},
        "judge": {"verdict": "Insufficient evidence", "reasoning": "The policy is silent."},
    }
    out = run("courtroom", policy_pages, payload, claim_text="Anything.")
    assert out["judge"]["verdict"] == INSUFFICIENT
    assert out["judge"]["needs_review"] is True
    assert out["judge"]["evidence"] == []


def test_judge_not_stated_verdict_is_kept_without_evidence(policy_pages):
    payload = {
        "prosecutor": {"argument": "Against.", "evidence": []},
        "defender": {"argument": "For.", "source_supports_claim": False, "evidence": []},
        "judge": {"verdict": "Not stated in source", "reasoning": "The policy does not say."},
    }
    out = run("courtroom", policy_pages, payload, claim_text="Anything.")
    assert out["judge"]["verdict"] == "Not stated in source"


def test_unrecognised_judge_verdict_becomes_insufficient(policy_pages):
    payload = {
        "prosecutor": {"argument": "a", "evidence": []},
        "defender": {"argument": "b", "source_supports_claim": False, "evidence": []},
        "judge": {"verdict": "Absolutely guilty", "reasoning": " vibes"},
    }
    out = run("courtroom", policy_pages, payload, claim_text="Anything.")
    assert out["judge"]["verdict"] == INSUFFICIENT
    assert "unrecognised" in out["judge"]["review_reason"]


def test_courtroom_marks_missing_sections_without_crashing(policy_pages):
    out = run("courtroom", policy_pages, {}, claim_text="Anything.")
    assert out["prosecutor"]["evidence_status"] == "missing"
    assert out["defender"]["source_supports_claim"] is False
    assert out["judge"]["verdict"] == INSUFFICIENT


# --------------------------------------------------------------------------- #
# Shared quote validation helpers
# --------------------------------------------------------------------------- #
def test_validate_quotes_accepts_strings_and_drops_junk(policy_pages):
    index = SourceIndex(policy_pages)
    checks = validate_quotes(
        index,
        [
            {"quote": QUOTE_STIPEND, "page": 2},  # dict form
            QUOTE_STIPEND,  # bare string form
            {"quote": "   ", "page": 1},  # blank -> dropped
            {"page": 1},  # no quote -> dropped
            12345,  # not a quote at all -> dropped
        ],
    )
    assert len(checks) == 2
    assert all(c.verified for c in checks)


def test_validate_quotes_normalizes_curly_quotes(policy_pages):
    index = SourceIndex(policy_pages)
    # The fixture uses a straight hyphen and normal spaces; a curly-quoted,
    # double-spaced variant must still normalize onto the source text.
    checks = validate_quotes(
        index, [{"quote": f"\u201c{QUOTE_STIPEND}\u201d", "page": 2}]
    )
    assert checks[0].verified is True


def test_evidence_status_vocabulary(policy_pages):
    index = SourceIndex(policy_pages)
    good = validate_quote(index, QUOTE_STIPEND)
    bad = validate_quote(index, "a quotation that is not in the source at all")
    assert evidence_status_for([]) == "missing"
    assert evidence_status_for([good]) == "verified"
    assert evidence_status_for([bad]) == "unverified"
    assert evidence_status_for([good, bad]) == "partial"
