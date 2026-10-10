"""API tests against the FastAPI app — offline, the model call is stubbed."""

import io

import pytest
from fastapi.testclient import TestClient

import app as app_module

FAKE_KEY = "AIzaFAKE_TEST_KEY_SHOULD_NEVER_APPEAR_IN_A_RESPONSE_1234567890"


@pytest.fixture
def client():
    return TestClient(app_module.app)


@pytest.fixture
def stub_analysis(monkeypatch):
    """Replace the Gemini pipeline with a fixed payload."""

    def fake_run_analysis(*, source, answer, api_key, model=None, client=None):
        return {
            "claims": [
                {
                    "id": "c1",
                    "claim_text": "Employees may work remotely up to three days per week.",
                    "claim_type": "fact",
                    "span_start": 0,
                    "span_end": 55,
                    "verdict": "Supported",
                    "explanation": "Stated in section 2.",
                    "evidence": [
                        {
                            "quote": "up to three days per week",
                            "verified": True,
                            "page": 1,
                            "model_page": 1,
                            "status": "verified",
                            "note": "Quotation found in the extracted source text.",
                        }
                    ],
                    "evidence_status": "verified",
                    "evidence_note": "All quotations matched.",
                    "evidence_verified": True,
                    "needs_review": False,
                    "review_reason": None,
                }
            ],
            "summary": {
                "total": 1,
                "supported": 1,
                "contradicted": 0,
                "not_stated": 0,
                "ambiguous": 0,
                "needs_review": 0,
            },
            "source_info": source.info(),
            "model": "stub-model",
            "span_mapping_available": True,
            "evidence_note": "Quotations are matched against the extracted source text.",
        }

    monkeypatch.setattr(app_module, "run_analysis", fake_run_analysis)
    return fake_run_analysis


def test_health_reports_configuration_without_leaking_key(client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", FAKE_KEY)
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["gemini_configured"] is True
    assert "limits" in body and body["limits"]["source_max_chars"] > 0
    assert FAKE_KEY not in response.text


def test_health_without_key_is_not_configured(client, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    response = client.get("/api/health")
    assert response.json()["gemini_configured"] is False


def test_pasted_text_path_works(client, stub_analysis, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", FAKE_KEY)
    response = client.post(
        "/api/analyse",
        data={"answer": "Employees may work remotely up to three days per week.", "source_text": "Policy text."},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["total"] == 1
    assert body["source_info"]["origin"] == "text"
    assert FAKE_KEY not in response.text


def test_pdf_upload_path_works(client, stub_analysis, monkeypatch):
    import pymupdf

    monkeypatch.setenv("GEMINI_API_KEY", FAKE_KEY)
    doc = pymupdf.open()
    doc.new_page().insert_text((72, 72), "Employees may work remotely up to three days per week.")
    data = doc.tobytes()
    doc.close()

    response = client.post(
        "/api/analyse",
        data={"answer": "Employees may work remotely up to three days per week."},
        files={"pdf": ("policy.pdf", io.BytesIO(data), "application/pdf")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["source_info"]["origin"] == "pdf"
    assert body["source_info"]["file_name"] == "policy.pdf"
    assert body["source_info"]["pages"] == 1
    assert FAKE_KEY not in response.text


def test_missing_source_is_rejected(client, stub_analysis, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", FAKE_KEY)
    response = client.post("/api/analyse", data={"answer": "Some claim.", "source_text": ""})
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "empty_source"


def test_missing_answer_is_rejected(client, stub_analysis, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", FAKE_KEY)
    response = client.post("/api/analyse", data={"answer": "", "source_text": "Policy text."})
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "missing_answer"


def test_unsupported_file_type_is_rejected(client, stub_analysis):
    response = client.post(
        "/api/analyse",
        data={"answer": "A claim.", "source_text": ""},
        files={"pdf": ("notes.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "unsupported_file"


def test_scanned_pdf_returns_a_helpful_error(client, stub_analysis):
    import pymupdf

    doc = pymupdf.open()
    doc.new_page()
    data = doc.tobytes()
    doc.close()
    response = client.post(
        "/api/analyse",
        data={"answer": "A claim."},
        files={"pdf": ("scan.pdf", io.BytesIO(data), "application/pdf")},
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "pdf_no_text"


def test_oversized_answer_is_rejected(client, stub_analysis, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", FAKE_KEY)
    monkeypatch.setattr(app_module, "MAX_ANSWER_CHARS", 50)
    response = client.post(
        "/api/analyse",
        data={"answer": "x" * 60, "source_text": "Policy text."},
    )
    assert response.status_code == 413
    assert response.json()["detail"]["code"] == "answer_too_long"


def test_missing_api_key_returns_safe_error(client, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    response = client.post(
        "/api/analyse",
        data={"answer": "A claim.", "source_text": "Policy text."},
    )
    assert response.status_code == 503
    detail = response.json()["detail"]
    assert detail["code"] == "missing_api_key"
    assert ".env" in detail["message"]


def test_cors_allows_local_frontend_only(client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", FAKE_KEY)
    response = client.get(
        "/api/health", headers={"Origin": app_module.ALLOWED_ORIGINS[0]}
    )
    assert response.headers.get("access-control-allow-origin") == app_module.ALLOWED_ORIGINS[0]

    denied = client.get("/api/health", headers={"Origin": "https://evil.example"})
    assert denied.headers.get("access-control-allow-origin") is None


def test_pipeline_errors_are_returned_without_tracebacks(client, monkeypatch):
    from pipeline import PipelineError

    monkeypatch.setenv("GEMINI_API_KEY", FAKE_KEY)

    def boom(*, source, answer, api_key, model=None, client=None):
        raise PipelineError("model_unavailable", "The Gemini request failed: reason.")

    monkeypatch.setattr(app_module, "run_analysis", boom)
    response = client.post(
        "/api/analyse",
        data={"answer": "A claim.", "source_text": "Policy text."},
    )
    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "model_unavailable"
    assert "Traceback" not in response.text
    assert FAKE_KEY not in response.text
