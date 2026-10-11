# VeriFact — Backend API Contract (v1)

Owner: backend. Frontend/UI: Antigravity. This document is the **stable contract** for the two
new features. Existing endpoints are unchanged.

Base URL: `/api` (Vite dev proxy forwards `/api` → `http://127.0.0.1:8000`).

All request bodies are **`multipart/form-data`** — identical to `/api/analyse`, so the same
`FormData` + `fetch` path already used by the frontend works unchanged.

All error responses use the existing shape: `{"detail": {"code": "...", "message": "..."}}`.

---

## Feature A — One-Click Truth Repair

`POST /api/repair`

### Request fields (form)

| field | type | required | notes |
|---|---|---|---|
| `source_text` | string | one of source_* | pasted source (form-feed `\f` = page break) |
| `pdf` | file | one of source_* | text-based PDF, ≤ 8 MB |
| `claim_text` | string | **yes** | the claim to repair, ≤ 4,000 chars |
| `answer` | string | no | surrounding answer excerpt (context only), ≤ 40,000 chars |
| `claim_type` | string | no | `fact` \| `inference` \| `recommendation` |
| `original_verdict` | string | no | verdict from the audit, echoed back |

Exactly one of `source_text` / `pdf` must be supplied.

### Success response — 200

```json
{
  "status": "repaired",
  "reason_code": null,
  "original_claim": "The home-office stipend is 900 USD per year.",
  "original_verdict": "Contradicted",
  "suggested_replacement": "The home-office equipment stipend is 400 USD per year.",
  "explanation": "Section 4 states the figure directly.",
  "evidence": [
    {
      "quote": "home-office equipment stipend of 400 USD per year",
      "verified": true,
      "page": 2,
      "model_page": 2,
      "status": "verified",
      "note": "Quotation found in the extracted source text."
    }
  ],
  "evidence_status": "verified",
  "needs_review": false,
  "source_info": { "origin": "text", "file_name": null, "file_size": null, "pages": 3, "chars": 1234 },
  "model": "gemini-3.1-flash-lite",
  "note": "The original answer and the original claim are unchanged; this is a suggestion only. Every quotation was validated against the extracted source text by this application."
}
```

### Insufficient-evidence response — 200 (not an error)

```json
{
  "status": "insufficient_evidence",
  "reason_code": "source_insufficient",
  "original_claim": "...",
  "original_verdict": null,
  "suggested_replacement": null,
  "explanation": "The source does not mention parking spaces anywhere.",
  "evidence": [],
  "evidence_status": "missing",
  "needs_review": true,
  "source_info": { "...": "..." },
  "model": "gemini-3.1-flash-lite",
  "note": "..."
}
```

Frontend rule: **render the repair only when `status === "repaired"`**. Otherwise render
`explanation` as the reason and do not offer a replacement.

### Guarantees (backend-enforced)

- `status === "repaired"` **iff** every entry in `evidence` has `verified === true` and
  `evidence_status === "verified"`. If the model proposes a repair whose quotes fail
  deterministic validation, the backend **downgrades** it to `insufficient_evidence`.
- `reason_code` (present only on declines): `source_insufficient` (model declined),
  `evidence_unverified`, `evidence_missing`, `replacement_missing`.
- `evidence[]` items use the **exact same shape** as audit claim evidence
  (`quote, verified, page, model_page, status, note`) → reuse `ClaimCard` evidence rendering.
- Page numbers are recomputed from the extracted source; `model_page` shows what the model
  claimed. `page` is `null` when the quote was not found.
- The original answer/claim are never mutated (stateless endpoint, echo in `original_claim`).

### Errors

| status | code | when |
|---|---|---|
| 422 | `missing_claim` | `claim_text` empty |
| 413 | `claim_too_long` | `claim_text` > 4,000 chars |
| 422 | `empty_source` / `unsupported_file` / `file_too_large` / `pdf_no_text` / … | same as `/api/analyse` |
| 503 | `missing_api_key` | server key not configured |
| 502 | `model_unavailable` / `bad_model_response` / `empty_model_response` | model failure |

---

## Feature B — AI Courtroom

`POST /api/courtroom`

### Request fields (form)

| field | type | required | notes |
|---|---|---|---|
| `source_text` / `pdf` | string / file | **yes** (one of) | same as above |
| `claim_text` | string | **yes** | the audited claim, ≤ 4,000 chars |
| `answer` | string | no | context only, ≤ 40,000 chars |
| `claim_verdict` | string | no | verdict from the audit, echoed back |

### Success response — 200

```json
{
  "claim_text": "The home-office stipend is 900 USD per year.",
  "claim_verdict_from_audit": "Contradicted",
  "prosecutor": {
    "argument": "Section 4 gives a different figure.",
    "evidence": [ { "quote": "...", "verified": true, "page": 2, "model_page": 2, "status": "verified", "note": "..." } ],
    "evidence_status": "verified"
  },
  "defender": {
    "argument": "The source supplies no adequate support for 900 USD.",
    "source_supports_claim": false,
    "evidence": [],
    "evidence_status": "missing"
  },
  "judge": {
    "verdict": "Contradicted",
    "reasoning": "The only figure in the source is 400 USD per year.",
    "evidence": [ { "quote": "...", "verified": true, "page": 2, "model_page": 2, "status": "verified", "note": "..." } ],
    "evidence_status": "verified",
    "needs_review": false,
    "review_reason": null
  },
  "method": "single_model_call",
  "source_info": { "origin": "text", "file_name": null, "file_size": null, "pages": 3, "chars": 1234 },
  "model": "gemini-3.1-flash-lite",
  "evidence_note": "Prosecutor, defender and judge were produced by a single model request, not by independent agents. Every quotation was matched against the extracted source text by this application; a match confirms the text exists, not that it proves the claim."
}
```

### Field semantics

- `judge.verdict` ∈ `Supported` | `Contradicted` | `Not stated in source` |
  `Ambiguous/conflicting` | **`Insufficient evidence`**.
- Backend guarantee: if the model returns a **definitive** judge verdict (`Supported` /
  `Contradicted`) whose evidence does **not** verify, the backend downgrades it to
  `Insufficient evidence` and sets `judge.review_reason`.
- `judge.needs_review` is `true` exactly when `verdict === "Insufficient evidence"`.
- `defender.source_supports_claim === false` means the defender explicitly states the source
  supplies no adequate support — render that statement, do not invent one.
- **Always display `evidence_note`** (or paraphrase it): it is the honesty disclaimer that the
  three roles come from one model call and that quotation ≠ proof.
- Evidence items are identical in shape to audit evidence → reuse existing rendering.

### Errors

Same table as `/api/repair` (`missing_claim`, `claim_too_long`, source errors, `missing_api_key`, model errors).

---

## Changed / added files (backend only — no frontend files touched)

| file | change |
|---|---|
| `backend/features.py` | **new** — `run_repair`, `run_courtroom`, deterministic quote validation |
| `backend/prompts.py` | added `REPAIR_SYSTEM/USER`, `COURTROOM_SYSTEM/USER` + builders |
| `backend/app.py` | added `POST /api/repair`, `POST /api/courtroom`, `MAX_CLAIM_CHARS`, shared `_source_from_request`/`_require_api_key` helpers (used by `/api/analyse` too), `features` list in `/api/health` |
| `tests/test_features.py` | **new** — offline tests (scripted client) |
| `tests/test_api.py` | appended endpoint contract tests |
| `tests/test_live_api.py` | appended optional live tests (skipped without key) |

`/api/analyse` is **unchanged** in behaviour and schema; its source-building was factored into a
helper with identical error codes. `/api/health` gained one additive key: `"features"`.

## Integration notes for the frontend

1. Reuse the existing `FormData` upload path (source or PDF) — the fields are named the same.
2. Both endpoints make **one** Gemini call; expect similar latency to a single verify pass.
3. Reuse `types.ts` `Evidence` as-is; both features emit that exact shape.
4. Feature-detect via `GET /api/health` → `features: ["analyse", "repair", "courtroom"]`.
