"""Unit tests for PatentBench data loader."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from patentbench.config import (
    Domain,
    DifficultyTier,
    EvaluationLayer,
    RejectionType,
)
from patentbench.data_loader import DataLoader, TestCase


# ---- TestCase Tests ----


class TestTestCase:
    """Tests for TestCase creation and serialization."""

    def test_from_dict_minimal(self) -> None:
        data = {
            "id": "tc-001",
            "domain": "prosecution",
            "tier": 3,
            "task_type": "103_argument",
            "prompt": "Draft arguments...",
            "reference_answer": "The response should argue...",
        }
        case = TestCase.from_dict(data)
        assert case.id == "tc-001"
        assert case.domain == Domain.PROSECUTION
        assert case.tier == DifficultyTier.SENIOR_ASSOCIATE
        assert case.task_type == "103_argument"
        assert case.rejection_types == []

    def test_from_dict_full(self) -> None:
        data = {
            "id": "tc-002",
            "domain": "prosecution",
            "tier": 2,
            "task_type": "oa_parsing",
            "prompt": "Parse this OA...",
            "reference_answer": "{}",
            "rejection_types": ["103", "112(b)"],
            "evaluation_layers": ["deterministic", "llm_judge"],
            "application_number": "16/789,012",
            "office_action_date": "2024-03-15",
            "mpep_sections": ["2141", "2173"],
            "claims_at_issue": [1, 2, 3],
            "poison_pills": {"mpep_sections": ["2199"]},
            "metadata": {"examiner": "Jane Smith"},
        }
        case = TestCase.from_dict(data)
        assert case.rejection_types == [RejectionType.SEC_103, RejectionType.SEC_112_B]
        assert case.evaluation_layers == [
            EvaluationLayer.DETERMINISTIC, EvaluationLayer.LLM_JUDGE
        ]
        assert case.application_number == "16/789,012"
        assert case.claims_at_issue == [1, 2, 3]

    def test_round_trip(self) -> None:
        data = {
            "id": "tc-003",
            "domain": "administration",
            "tier": 1,
            "task_type": "deadline_calculation",
            "prompt": "Calculate deadline...",
            "reference_answer": "2024-06-15",
            "rejection_types": [],
            "evaluation_layers": ["deterministic"],
        }
        case = TestCase.from_dict(data)
        serialized = case.to_dict()
        case2 = TestCase.from_dict(serialized)
        assert case.id == case2.id
        assert case.domain == case2.domain
        assert case.tier == case2.tier

    def test_from_dict_invalid_domain(self) -> None:
        data = {
            "id": "bad",
            "domain": "nonexistent",
            "tier": 1,
            "task_type": "test",
            "prompt": "test",
            "reference_answer": "test",
        }
        with pytest.raises(ValueError):
            TestCase.from_dict(data)


# ---- DataLoader Tests ----


class TestDataLoader:
    """Tests for the DataLoader class."""

    def _create_temp_data(self, cases: list[dict]) -> Path:
        """Create a temporary directory with test JSONL data."""
        tmpdir = Path(tempfile.mkdtemp())
        jsonl_path = tmpdir / "test_cases.jsonl"
        with open(jsonl_path, "w", encoding="utf-8") as f:
            for case in cases:
                f.write(json.dumps(case) + "\n")
        return tmpdir

    def _sample_cases(self) -> list[dict]:
        return [
            {
                "id": "tc-001",
                "domain": "administration",
                "tier": 1,
                "task_type": "deadline_calculation",
                "prompt": "Calculate deadline",
                "reference_answer": "2024-06-15",
                "evaluation_layers": ["deterministic"],
            },
            {
                "id": "tc-002",
                "domain": "prosecution",
                "tier": 2,
                "task_type": "oa_parsing",
                "prompt": "Parse this OA",
                "reference_answer": "{}",
                "rejection_types": ["103"],
                "evaluation_layers": ["deterministic", "llm_judge"],
            },
            {
                "id": "tc-003",
                "domain": "prosecution",
                "tier": 3,
                "task_type": "103_argument",
                "prompt": "Draft 103 argument",
                "reference_answer": "Argue that...",
                "rejection_types": ["103"],
                "evaluation_layers": ["deterministic", "llm_judge", "comparative"],
            },
            {
                "id": "tc-004",
                "domain": "drafting",
                "tier": 2,
                "task_type": "claim_amendment",
                "prompt": "Amend claim 1",
                "reference_answer": "Amended claim...",
                "evaluation_layers": ["llm_judge"],
            },
        ]

    def test_load_all(self) -> None:
        tmpdir = self._create_temp_data(self._sample_cases())
        loader = DataLoader(tmpdir)
        cases = loader.load_all()
        assert len(cases) == 4

    def test_filter_by_domain(self) -> None:
        tmpdir = self._create_temp_data(self._sample_cases())
        loader = DataLoader(tmpdir)
        cases = loader.load(domain=Domain.PROSECUTION)
        assert len(cases) == 2
        assert all(c.domain == Domain.PROSECUTION for c in cases)

    def test_filter_by_tier(self) -> None:
        tmpdir = self._create_temp_data(self._sample_cases())
        loader = DataLoader(tmpdir)
        cases = loader.load(tier=DifficultyTier.JUNIOR_ASSOCIATE)
        assert len(cases) == 2  # tc-002 and tc-004

    def test_filter_by_task_type(self) -> None:
        tmpdir = self._create_temp_data(self._sample_cases())
        loader = DataLoader(tmpdir)
        cases = loader.load(task_type="103_argument")
        assert len(cases) == 1
        assert cases[0].id == "tc-003"

    def test_filter_by_rejection_type(self) -> None:
        tmpdir = self._create_temp_data(self._sample_cases())
        loader = DataLoader(tmpdir)
        cases = loader.load(rejection_type=RejectionType.SEC_103)
        assert len(cases) == 2

    def test_max_cases(self) -> None:
        tmpdir = self._create_temp_data(self._sample_cases())
        loader = DataLoader(tmpdir)
        cases = loader.load(max_cases=2)
        assert len(cases) == 2

    def test_combined_filters(self) -> None:
        tmpdir = self._create_temp_data(self._sample_cases())
        loader = DataLoader(tmpdir)
        cases = loader.load(
            domain=Domain.PROSECUTION,
            tier=DifficultyTier.SENIOR_ASSOCIATE,
        )
        assert len(cases) == 1
        assert cases[0].id == "tc-003"

    def test_load_iter(self) -> None:
        tmpdir = self._create_temp_data(self._sample_cases())
        loader = DataLoader(tmpdir)
        cases = list(loader.load_iter(domain=Domain.PROSECUTION))
        assert len(cases) == 2

    def test_stats(self) -> None:
        tmpdir = self._create_temp_data(self._sample_cases())
        loader = DataLoader(tmpdir)
        stats = loader.stats()
        assert stats["total_cases"] == 4
        assert stats["by_domain"]["prosecution"] == 2
        assert stats["by_domain"]["administration"] == 1

    def test_nonexistent_directory(self) -> None:
        with pytest.raises(FileNotFoundError):
            DataLoader("/nonexistent/path/that/does/not/exist")

    def test_json_format(self) -> None:
        """Test loading from JSON array format (not JSONL)."""
        tmpdir = Path(tempfile.mkdtemp())
        json_path = tmpdir / "cases.json"
        cases = self._sample_cases()[:2]
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(cases, f)

        loader = DataLoader(tmpdir)
        loaded = loader.load_all()
        assert len(loaded) == 2

    def test_empty_lines_in_jsonl(self) -> None:
        """Test that empty lines in JSONL are skipped."""
        tmpdir = Path(tempfile.mkdtemp())
        jsonl_path = tmpdir / "cases.jsonl"
        case = self._sample_cases()[0]
        with open(jsonl_path, "w", encoding="utf-8") as f:
            f.write(json.dumps(case) + "\n")
            f.write("\n")  # Empty line
            f.write("\n")  # Another empty line

        loader = DataLoader(tmpdir)
        loaded = loader.load_all()
        assert len(loaded) == 1

    def test_discover_files_excludes_rubrics(self) -> None:
        """Test that rubric files are excluded from discovery."""
        tmpdir = Path(tempfile.mkdtemp())
        # Create a test case file
        (tmpdir / "cases.jsonl").write_text(
            json.dumps(self._sample_cases()[0]) + "\n",
            encoding="utf-8",
        )
        # Create a rubric file (should be excluded)
        (tmpdir / "rubric_legal.json").write_text("{}", encoding="utf-8")

        loader = DataLoader(tmpdir)
        files = loader.discover_files()
        assert len(files) == 1
        assert files[0].name == "cases.jsonl"
