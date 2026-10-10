"""PDF and plain-text source handling.

Text is extracted page by page with PyMuPDF so page boundaries survive all the
way to the evidence guard. OCR is deliberately not supported: scanned PDFs are
detected and reported with a helpful error so the user can paste the text.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import pymupdf  # PyMuPDF

# Conservative document-length limit (characters). Configurable by the caller.
DEFAULT_MAX_SOURCE_CHARS = 160_000
# Below this many extracted characters the PDF is treated as scanned/empty.
MIN_TEXT_CHARS = 40
MAX_PAGES = 400


class SourceError(Exception):
    """A user-facing source problem with a stable code and safe message."""

    def __init__(self, code: str, message: str, status_code: int = 422):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


@dataclass
class SourceDoc:
    """Bounded, page-aware source text handed to the model and the guard."""

    pages: list[str] = field(default_factory=list)
    origin: str = "text"  # "pdf" | "text"
    file_name: Optional[str] = None
    file_size: Optional[int] = None

    @property
    def chars(self) -> int:
        return sum(len(p) for p in self.pages)

    @property
    def page_count(self) -> int:
        return len(self.pages)

    def info(self) -> dict:
        return {
            "origin": self.origin,
            "file_name": self.file_name,
            "file_size": self.file_size,
            "pages": self.page_count,
            "chars": self.chars,
        }


def build_source_from_pdf(
    data: bytes,
    file_name: str,
    max_chars: int = DEFAULT_MAX_SOURCE_CHARS,
) -> SourceDoc:
    """Extract text page by page from a text-based PDF."""
    if not data:
        raise SourceError("empty_file", "The uploaded file is empty.")
    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
    except Exception:  # noqa: BLE001 - surfaced to the user as a safe message
        raise SourceError(
            "unreadable_pdf",
            "This file could not be read as a PDF. Re-export it as a text-based PDF, or paste the text instead.",
        )

    try:
        if doc.needs_pass:
            raise SourceError(
                "locked_pdf",
                "This PDF is password-protected. Remove the password, or paste the text instead.",
            )
        if doc.page_count == 0:
            raise SourceError("empty_pdf", "This PDF contains no pages.")
        if doc.page_count > MAX_PAGES:
            raise SourceError(
                "too_many_pages",
                f"This PDF has {doc.page_count} pages; the limit is {MAX_PAGES}. Please supply a shorter document.",
            )

        pages: list[str] = []
        total = 0
        for page in doc:
            text = page.get_text("text") or ""
            pages.append(text)
            total += len(text)
            if total > max_chars:
                raise SourceError(
                    "source_too_long",
                    f"This document is larger than the {max_chars:,}-character limit. "
                    "Supply a shorter document or paste a relevant excerpt.",
                )
    finally:
        doc.close()

    if total < MIN_TEXT_CHARS:
        raise SourceError(
            "pdf_no_text",
            "No selectable text was found. This looks like a scanned or image-only PDF, "
            "and OCR is not supported. Paste the document text instead.",
        )

    # Drop trailing empty pages (common in exports) but keep real page numbering.
    while pages and not pages[-1].strip():
        pages.pop()
    if not pages:
        raise SourceError("pdf_no_text", "No text could be extracted from this PDF.")

    return SourceDoc(
        pages=pages,
        origin="pdf",
        file_name=file_name or "document.pdf",
        file_size=len(data),
    )


def build_source_from_text(
    text: str,
    max_chars: int = DEFAULT_MAX_SOURCE_CHARS,
) -> SourceDoc:
    """Wrap pasted text as a source document.

    Form feeds split the text into pages so multi-page pastes keep page
    references; otherwise the whole paste is page 1.
    """
    cleaned = (text or "").replace("\r\n", "\n").strip()
    if not cleaned:
        raise SourceError(
            "empty_source",
            "Provide a source document: upload a text-based PDF or paste the source text.",
        )
    if len(cleaned) > max_chars:
        raise SourceError(
            "source_too_long",
            f"The pasted source is {len(cleaned):,} characters; the limit is {max_chars:,}. "
            "Paste a shorter excerpt.",
        )
    pages = [p.strip("\n") for p in cleaned.split("\f")] if "\f" in cleaned else [cleaned]
    pages = [p for p in pages if p.strip()] or [cleaned]
    return SourceDoc(pages=pages, origin="text", file_name=None, file_size=None)
