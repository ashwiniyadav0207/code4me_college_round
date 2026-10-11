"""Second Opinion (VeriFact) - FastAPI entry point.

The Gemini key is read only from backend/.env (via python-dotenv) and never
leaves this process: no response, log line or CORS header exposes it.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env", override=False)

from pdf_utils import (  # noqa: E402  (imported after dotenv)
    DEFAULT_MAX_SOURCE_CHARS,
    SourceDoc,
    SourceError,
    build_source_from_pdf,
    build_source_from_text,
)
from features import run_courtroom, run_repair  # noqa: E402
from pipeline import DEFAULT_MODEL, PipelineError, run_analysis  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("second-opinion")

API_KEY_ENV = "GEMINI_API_KEY"


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


MAX_REQUEST_BYTES = _int_env("MAX_REQUEST_BYTES", 15 * 1024 * 1024)
MAX_PDF_BYTES = _int_env("MAX_PDF_BYTES", 8 * 1024 * 1024)
MAX_ANSWER_CHARS = _int_env("MAX_ANSWER_CHARS", 40_000)
MAX_CLAIM_CHARS = _int_env("MAX_CLAIM_CHARS", 4_000)
SOURCE_MAX_CHARS = _int_env("SOURCE_MAX_CHARS", DEFAULT_MAX_SOURCE_CHARS)
MODEL_NAME = os.getenv("GEMINI_MODEL", DEFAULT_MODEL)
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if o.strip()
]

app = FastAPI(title="Second Opinion API", version="1.0.0", docs_url="/api/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def request_size_guard(request: Request, call_next):
    header = request.headers.get("content-length")
    if header and header.isdigit() and int(header) > MAX_REQUEST_BYTES:
        return JSONResponse(
            status_code=413,
            content={
                "detail": {
                    "code": "request_too_large",
                    "message": f"The request exceeds the {MAX_REQUEST_BYTES // (1024 * 1024)} MB limit.",
                }
            },
        )
    return await call_next(request)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if not isinstance(detail, dict):
        detail = {"code": "error", "message": str(detail)}
    return JSONResponse(status_code=exc.status_code, content={"detail": detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled server error")
    return JSONResponse(
        status_code=500,
        content={
            "detail": {
                "code": "server_error",
                "message": "Something went wrong on the server. Please try again.",
            }
        },
    )


def _fail(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message})


def _source_from_request(source_text: str, pdf: Optional[UploadFile]) -> SourceDoc:
    """Build the SourceDoc from the shared multipart contract (PDF or pasted text).

    Raises SourceError with the same codes/messages the /api/analyse route
    has always returned.
    """
    if pdf is not None:
        name = pdf.filename or ""
        if Path(name).suffix.lower() != ".pdf":
            raise SourceError(
                "unsupported_file",
                "Only .pdf files are supported for upload. Paste the text instead.",
            )
        data = pdf.file.read(MAX_PDF_BYTES + 1)
        if len(data) > MAX_PDF_BYTES:
            raise SourceError(
                "file_too_large",
                f"The PDF exceeds the {MAX_PDF_BYTES // (1024 * 1024)} MB upload limit.",
            )
        return build_source_from_pdf(data, file_name=name, max_chars=SOURCE_MAX_CHARS)
    return build_source_from_text(source_text, max_chars=SOURCE_MAX_CHARS)


def _require_api_key() -> str:
    api_key = os.getenv(API_KEY_ENV, "").strip()
    if not api_key:
        raise _fail(
            503,
            "missing_api_key",
            "The server has no Gemini API key configured. Add GEMINI_API_KEY to backend/.env and restart the server.",
        )
    return api_key


def _build_source_or_fail(source_text: str, pdf: Optional[UploadFile]) -> SourceDoc:
    try:
        return _source_from_request(source_text, pdf)
    except SourceError as exc:
        raise _fail(exc.status_code, exc.code, exc.message)


@app.get("/api/health")
def health() -> dict:
    """Liveness + configuration status. Never includes the key itself."""
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "gemini_configured": bool(os.getenv(API_KEY_ENV, "").strip()),
        "limits": {
            "source_max_chars": SOURCE_MAX_CHARS,
            "answer_max_chars": MAX_ANSWER_CHARS,
            "pdf_max_bytes": MAX_PDF_BYTES,
        },
        "features": ["analyse", "repair", "courtroom"],
        "cors_origins": ALLOWED_ORIGINS,
    }


@app.post("/api/analyse")
def analyse(
    answer: str = Form(""),
    source_text: str = Form(""),
    pdf: Optional[UploadFile] = File(None),
) -> dict:
    """Audit an AI answer against the supplied source document."""
    if not answer or not answer.strip():
        raise _fail(422, "missing_answer", "Paste the AI-generated answer you want to audit.")
    if len(answer) > MAX_ANSWER_CHARS:
        raise _fail(
            413,
            "answer_too_long",
            f"The answer is {len(answer):,} characters; the limit is {MAX_ANSWER_CHARS:,}.",
        )

    # ---- source -----------------------------------------------------------
    source = _build_source_or_fail(source_text, pdf)

    api_key = _require_api_key()

    try:
        result = run_analysis(source=source, answer=answer, api_key=api_key, model=MODEL_NAME)
    except PipelineError as exc:
        raise _fail(exc.status_code, exc.code, exc.message)
    except HTTPException:
        raise
    except Exception:  # noqa: BLE001
        logger.exception("Analysis failed")
        raise _fail(500, "server_error", "Something went wrong while running the analysis. Please try again.")

    return result


def _validate_claim_field(claim_text: str) -> str:
    """Shared validation for the claim-scoped feature endpoints."""
    claim = (claim_text or "").strip()
    if not claim:
        raise _fail(422, "missing_claim", "Provide the claim text to work on.")
    if len(claim) > MAX_CLAIM_CHARS:
        raise _fail(
            413,
            "claim_too_long",
            f"The claim is {len(claim):,} characters; the limit is {MAX_CLAIM_CHARS:,}.",
        )
    return claim


@app.post("/api/repair")
def repair(
    claim_text: str = Form(""),
    answer: str = Form(""),
    claim_type: str = Form(""),
    original_verdict: str = Form(""),
    source_text: str = Form(""),
    pdf: Optional[UploadFile] = File(None),
) -> dict:
    """One-click truth repair: a source-grounded replacement, or an explicit decline."""
    claim = _validate_claim_field(claim_text)
    if len(answer) > MAX_ANSWER_CHARS:
        raise _fail(
            413,
            "answer_too_long",
            f"The answer is {len(answer):,} characters; the limit is {MAX_ANSWER_CHARS:,}.",
        )

    source = _build_source_or_fail(source_text, pdf)
    api_key = _require_api_key()

    try:
        return run_repair(
            source=source,
            claim_text=claim,
            answer=answer or None,
            claim_type=claim_type or None,
            original_verdict=original_verdict or None,
            api_key=api_key,
            model=MODEL_NAME,
        )
    except PipelineError as exc:
        raise _fail(exc.status_code, exc.code, exc.message)
    except HTTPException:
        raise
    except Exception:  # noqa: BLE001
        logger.exception("Repair failed")
        raise _fail(500, "server_error", "Something went wrong while running the repair. Please try again.")


@app.post("/api/courtroom")
def courtroom(
    claim_text: str = Form(""),
    answer: str = Form(""),
    claim_verdict: str = Form(""),
    source_text: str = Form(""),
    pdf: Optional[UploadFile] = File(None),
) -> dict:
    """AI courtroom: prosecutor, defender and judge for one audited claim."""
    claim = _validate_claim_field(claim_text)
    if len(answer) > MAX_ANSWER_CHARS:
        raise _fail(
            413,
            "answer_too_long",
            f"The answer is {len(answer):,} characters; the limit is {MAX_ANSWER_CHARS:,}.",
        )

    source = _build_source_or_fail(source_text, pdf)
    api_key = _require_api_key()

    try:
        return run_courtroom(
            source=source,
            claim_text=claim,
            answer=answer or None,
            claim_verdict=claim_verdict or None,
            api_key=api_key,
            model=MODEL_NAME,
        )
    except PipelineError as exc:
        raise _fail(exc.status_code, exc.code, exc.message)
    except HTTPException:
        raise
    except Exception:  # noqa: BLE001
        logger.exception("Courtroom failed")
        raise _fail(500, "server_error", "Something went wrong while running the courtroom. Please try again.")
