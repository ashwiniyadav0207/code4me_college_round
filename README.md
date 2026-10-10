
# Second Opinion (VeriFact)

**Evidence-grounded answer auditing.** Second Opinion takes an AI-generated answer and a source
document you trust, splits the answer into individual claims, and audits each claim against that
source — showing the verdict, the exact quotation, and the real page number behind every finding.

This is *source-grounded* auditing, not internet fact-checking. The only authority is the document
you supply.

---

## What it does

1. You upload a text-based PDF (or paste source text) and paste an AI answer.
2. Gemini call 1 extracts the answer's claims, preserving the original wording and answer spans.
3. Gemini call 2 evaluates each claim against the source: `Supported`, `Contradicted`,
   `Not stated in source`, or `Ambiguous/conflicting`.
4. The **Evidence Guard** (pure Python) validates every quotation against the extracted source,
   normalises PDF artefacts, and recomputes the page number itself. Unverified quotes are never
   presented as proof; they are marked and the claim is flagged for human review.
5. The React workspace shows the summary, the original answer with verified span highlights, and a
   review card per claim.

---

## Project layout

```
second-opinion/
├── backend/
│   ├── app.py             # FastAPI endpoints, CORS, limits, safe errors
│   ├── pipeline.py        # 2 model calls + span mapping + orchestration
│   ├── evidence_guard.py  # quotation validation + page recomputation
│   ├── prompts.py         # prompt templates
│   ├── pdf_utils.py       # PyMuPDF page extraction, text source handling
│   ├── requirements.txt
│   ├── .env.example       # copy to .env and add your key
│   └── .gitignore
├── frontend/              # React + Vite + TypeScript + Tailwind
│   └── src/
├── tests/                 # offline test suite (+ optional live API test)
└── README.md
```

---

## Requirements

- **Python 3.10+** (3.12 recommended)
- **Node.js 18+** (20+ recommended)
- A **Google Gemini API key** (server-side only)

Check your prerequisites in PowerShell:

```powershell
python --version
node --version
npm --version
```

---

## 1. Install the frontend dependencies

Run from the **project root**:

```powershell
cd frontend
npm install
cd ..
```

## 2. Create the Python virtual environment

Run from the **project root**:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
cd ..
```

## 3. Configure the Gemini API key

Run from the **project root**. If `backend\.env` does **not** exist yet:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Put your real key on the first line and save:

```
GEMINI_API_KEY=your-real-key-here
```

`backend\.env` is git-ignored. The key is read only by Python — it is never sent to the browser,
never embedded in the React bundle, and never returned by an API response.

Optional overrides in the same file: `GEMINI_MODEL` (default `gemini-2.5-flash`), `CORS_ORIGINS`,
`SOURCE_MAX_CHARS`, `MAX_ANSWER_CHARS`, `MAX_PDF_BYTES`.

## 4. Start the backend (Terminal 1)

From the **project root**:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

Health check (browser or another PowerShell window):

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

## 5. Start the frontend (Terminal 2)

From the **project root**:

```powershell
cd frontend
npm run dev
```

## 6. Open the app

Visit **http://localhost:5173** in your browser. The Vite dev server proxies `/api` to the FastAPI
server on port 8000, so no CORS or key configuration is needed in the browser.

---

## Running the tests

Run from the **project root** (the virtual environment holds pytest):

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest ..\tests -q
```

The suite is **offline by default** — it uses a scripted model client, so no API key or network is
required. It covers:

| # | Scenario | Test |
|---|----------|------|
| 1 | Directly supported claim | `test_pipeline.py::test_directly_supported_claim` |
| 2 | Correct paraphrase | `test_pipeline.py::test_correct_paraphrase_is_supported` |
| 3 | Contradicted claim (wrong number) | `test_pipeline.py::test_contradicted_wrong_number` |
| 4 | Claim absent from the source | `test_pipeline.py::test_claim_not_stated_needs_no_evidence` |
| 5 | Ambiguous / conflicting statements | `test_pipeline.py::test_genuine_policy_conflict_is_ambiguous` |
| 6 | Compound answer, multiple claims | `test_pipeline.py::test_compound_answer_produces_multiple_claims` |
| 7 | Fabricated quotation rejected | `test_pipeline.py::test_fabricated_quotation_is_rejected_and_flagged` |
| 8 | Inference / recommendation flagged | `test_pipeline.py::test_recommendation_is_flagged_for_review` |

Plus Evidence Guard normalisation/page tests, PDF extraction tests (including scanned-PDF
detection), and API tests for validation, CORS, size limits and key leakage.

**Optional live test:** if `GEMINI_API_KEY` is configured in `backend\.env`, the same command also
runs `tests/test_live_api.py`, which calls the real Gemini API. Otherwise it is reported as
*skipped*.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `npm : ... npm.ps1 cannot be loaded ... running scripts is disabled` | PowerShell execution policy blocks `npm.ps1`. Run `npm.cmd install` / `npm.cmd run dev` instead, or use `Set-ExecutionPolicy -Scope Process RemoteSigned`. |
| Frontend says *Could not reach the analysis server* | The backend is not running on port 8000. Start it (step 4) and check `Invoke-RestMethod http://127.0.0.1:8000/api/health`. |
| `The server has no Gemini API key configured` (HTTP 503) | Create `backend\.env` from `.env.example`, add `GEMINI_API_KEY=...`, then **restart** the backend. |
| `The server's Gemini API key was rejected` | The key is wrong, expired, or the Generative Language API is not enabled for that project. |
| `This looks like a scanned or image-only PDF` | OCR is not supported — paste the document text instead (use the *Paste text* tab). |
| `The pasted source is ... characters; the limit is ...` | Paste a shorter excerpt, or raise `SOURCE_MAX_CHARS` in `backend\.env`. |
| Port 5173 or 8000 already in use | Stop the other process, or run Vite with `npm.cmd run dev -- --port 5174` and update `CORS_ORIGINS` in `backend\.env`. |
| `ModuleNotFoundError: No module named 'app'` | You are in the wrong folder — run uvicorn from `backend\` with the `.venv` Python. |
| Tests cannot find pytest | Use `.\.venv\Scripts\python.exe -m pytest ..\tests -q` from `backend\`. |

---

## Security notes

- The Gemini key lives only in `backend\.env` (git-ignored). It never reaches React, Vite env vars,
  the browser bundle, API responses or logs.
- Upload and request sizes are validated (`MAX_PDF_BYTES`, `MAX_REQUEST_BYTES`, `SOURCE_MAX_CHARS`,
  `MAX_ANSWER_CHARS`).
- CORS is restricted to the local Vite dev origins.
- Errors returned to the browser are short and safe — no tracebacks, no credentials.
- No authentication, no database: this is a local hackathon MVP.

## Disclaimer

Second Opinion evaluates claims against the source document you supply. It does not independently
verify whether that source is true, current or authoritative. Verdicts are model proposals;
quotation matching proves only that text exists in the source, not that it proves the claim.
Anything flagged for human review should be reviewed by a person.



