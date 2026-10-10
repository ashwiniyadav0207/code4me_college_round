"""Shared pytest setup: backend imports plus the fictional policy fixtures."""

import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

FIXTURES = Path(__file__).resolve().parent / "fixtures"

# Load backend/.env so the optional live-API tests can run when configured.
# Tests that must run without a key clear it themselves via monkeypatch.
try:
    from dotenv import load_dotenv

    load_dotenv(BACKEND / ".env", override=False)
except ImportError:  # pragma: no cover - dotenv always present with requirements
    pass


def load_policy_pages() -> list[str]:
    """Three-page fictional source used across the offline test suite."""
    return [
        (FIXTURES / f"policy_page{i}.txt").read_text(encoding="utf-8").strip()
        for i in (1, 2, 3)
    ]


def load_policy_text() -> str:
    """The same document as pasted text (form-feed page breaks)."""
    return "\f".join(load_policy_pages())


@pytest.fixture
def policy_pages() -> list[str]:
    return load_policy_pages()


@pytest.fixture
def policy_text() -> str:
    return load_policy_text()
