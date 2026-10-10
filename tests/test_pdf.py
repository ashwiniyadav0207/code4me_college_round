"""PDF and pasted-text source handling tests — offline, no API calls."""

import pymupdf
import pytest

from evidence_guard import SourceIndex, validate_quote
from pdf_utils import (
    SourceError,
    build_source_from_pdf,
    build_source_from_text,
)


def make_pdf(page_texts) -> bytes:
    doc = pymupdf.open()
    for text in page_texts:
        page = doc.new_page()
        if text:
            page.insert_text((72, 72), text, fontsize=11)
    data = doc.tobytes()
    doc.close()
    return data


def test_pdf_extracts_text_page_by_page():
    data = make_pdf(
        [
            "Page one of the policy. Employees may work remotely up to three days per week.",
            "Page two of the policy. The stipend is 400 USD per year.",
        ]
    )
    source = build_source_from_pdf(data, "policy.pdf")
    assert source.origin == "pdf"
    assert source.page_count == 2
    assert "Page one" in source.pages[0]
    assert "Page two" in source.pages[1]
    assert source.info() == {
        "origin": "pdf",
        "file_name": "policy.pdf",
        "file_size": len(data),
        "pages": 2,
        "chars": source.chars,
    }


def test_evidence_page_number_comes_from_the_pdf():
    data = make_pdf(
        [
            "First page content about remote work.",
            "Second page content about equipment.",
            "Third page content about reviews and records.",
        ]
    )
    source = build_source_from_pdf(data, "policy.pdf")
    index = SourceIndex(source.pages)
    check = validate_quote(index, "Second page content about equipment", model_page=1)
    assert check.verified is True
    assert check.page == 2


def test_scanned_pdf_is_detected_and_explained():
    data = make_pdf([""])  # a page with no extractable text
    with pytest.raises(SourceError) as exc:
        build_source_from_pdf(data, "scan.pdf")
    assert exc.value.code == "pdf_no_text"
    assert "OCR is not supported" in exc.value.message


def test_oversized_document_is_rejected():
    data = make_pdf(["A" * 100] * 6)  # 600 characters total
    with pytest.raises(SourceError) as exc:
        build_source_from_pdf(data, "big.pdf", max_chars=250)
    assert exc.value.code == "source_too_long"


def test_unreadable_file_is_rejected():
    with pytest.raises(SourceError) as exc:
        build_source_from_pdf(b"this is definitely not a pdf", "notes.pdf")
    assert exc.value.code == "unreadable_pdf"


def test_empty_upload_is_rejected():
    with pytest.raises(SourceError) as exc:
        build_source_from_pdf(b"", "empty.pdf")
    assert exc.value.code == "empty_file"


def test_pasted_text_with_form_feeds_becomes_pages(policy_text):
    source = build_source_from_text(policy_text)
    assert source.page_count == 3
    assert source.chars > 0


def test_plain_pasted_text_is_one_page():
    source = build_source_from_text("Just one paragraph of source text.")
    assert source.page_count == 1
    assert source.origin == "text"


def test_empty_pasted_text_is_rejected():
    with pytest.raises(SourceError) as exc:
        build_source_from_text("   \n  ")
    assert exc.value.code == "empty_source"


def test_oversized_pasted_text_is_rejected():
    with pytest.raises(SourceError) as exc:
        build_source_from_text("word " * 100, max_chars=50)
    assert exc.value.code == "source_too_long"
