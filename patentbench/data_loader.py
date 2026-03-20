"""Data loader for PatentBench test cases.

Loads test cases from JSON and JSONL files, supporting filtering by domain,
tier, rejection type, and other criteria.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator

from patentbench.config import (
    Domain,
    DifficultyTier,
    RejectionType,
    EvaluationLayer,
)


@dataclass
class TestCase:
    """A single PatentBench test case."""

    id: str
    domain: Domain
    tier: DifficultyTier
    task_type: str
    prompt: str
    reference_answer: str
    metadata: dict[str, Any] = field(default_factory=dict)
    rejection_types: list[RejectionType] = field(default_factory=list)
    evaluation_layers: list[EvaluationLayer] = field(default_factory=list)
    application_number: str | None = None
    office_action_date: str | None = None
    mpep_sections: list[str] = field(default_factory=list)
    prior_art_refs: list[str] = field(default_factory=list)
    claims_at_issue: list[int] = field(default_factory=list)
    poison_pills: dict[str, list[str]] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> TestCase:
        """Create a TestCase from a dictionary (parsed JSON)."""
        return cls(
            id=data["id"],
            domain=Domain(data["domain"]),
            tier=DifficultyTier(data["tier"]),
            task_type=data["task_type"],
            prompt=data["prompt"],
            reference_answer=data["reference_answer"],
            metadata=data.get("metadata", {}),
            rejection_types=[
                RejectionType(r) for r in data.get("rejection_types", [])
            ],
            evaluation_layers=[
                EvaluationLayer(e) for e in data.get("evaluation_layers", [])
            ],
            application_number=data.get("application_number"),
            office_action_date=data.get("office_action_date"),
            mpep_sections=data.get("mpep_sections", []),
            prior_art_refs=data.get("prior_art_refs", []),
            claims_at_issue=data.get("claims_at_issue", []),
            poison_pills=data.get("poison_pills", {}),
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dictionary."""
        result: dict[str, Any] = {
            "id": self.id,
            "domain": self.domain.value,
            "tier": self.tier.value,
            "task_type": self.task_type,
            "prompt": self.prompt,
            "reference_answer": self.reference_answer,
        }
        if self.metadata:
            result["metadata"] = self.metadata
        if self.rejection_types:
            result["rejection_types"] = [r.value for r in self.rejection_types]
        if self.evaluation_layers:
            result["evaluation_layers"] = [e.value for e in self.evaluation_layers]
        if self.application_number:
            result["application_number"] = self.application_number
        if self.office_action_date:
            result["office_action_date"] = self.office_action_date
        if self.mpep_sections:
            result["mpep_sections"] = self.mpep_sections
        if self.prior_art_refs:
            result["prior_art_refs"] = self.prior_art_refs
        if self.claims_at_issue:
            result["claims_at_issue"] = self.claims_at_issue
        if self.poison_pills:
            result["poison_pills"] = self.poison_pills
        return result


class DataLoader:
    """Loads and filters PatentBench test cases from disk.

    Supports both JSON (array of test cases) and JSONL (one test case per line)
    file formats.

    Usage:
        loader = DataLoader("data/mini")
        cases = loader.load(domain=Domain.PROSECUTION, tier=DifficultyTier.SENIOR_ASSOCIATE)
    """

    def __init__(self, data_dir: str | Path) -> None:
        self.data_dir = Path(data_dir)
        if not self.data_dir.exists():
            raise FileNotFoundError(f"Data directory not found: {self.data_dir}")

    def _load_jsonl(self, path: Path) -> list[TestCase]:
        """Load test cases from a JSONL file (one JSON object per line)."""
        cases: list[TestCase] = []
        with open(path, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    cases.append(TestCase.from_dict(data))
                except (json.JSONDecodeError, KeyError, ValueError) as exc:
                    raise ValueError(
                        f"Error parsing {path}:{line_num}: {exc}"
                    ) from exc
        return cases

    def _load_json(self, path: Path) -> list[TestCase]:
        """Load test cases from a JSON file (array of objects)."""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            raise ValueError(f"Expected JSON array in {path}, got {type(data).__name__}")
        return [TestCase.from_dict(item) for item in data]

    def _load_file(self, path: Path) -> list[TestCase]:
        """Load test cases from a single file (JSON or JSONL)."""
        if path.suffix == ".jsonl":
            return self._load_jsonl(path)
        elif path.suffix == ".json":
            return self._load_json(path)
        else:
            raise ValueError(f"Unsupported file format: {path.suffix} (expected .json or .jsonl)")

    def discover_files(self) -> list[Path]:
        """Find all JSON/JSONL test case files in the data directory."""
        files: list[Path] = []
        for pattern in ("*.json", "*.jsonl"):
            files.extend(sorted(self.data_dir.glob(pattern)))
        # Exclude rubric files and READMEs
        files = [
            f for f in files
            if not f.name.startswith("README") and "rubric" not in f.name.lower()
        ]
        return files

    def load_all(self) -> list[TestCase]:
        """Load all test cases from the data directory."""
        all_cases: list[TestCase] = []
        for file_path in self.discover_files():
            all_cases.extend(self._load_file(file_path))
        return all_cases

    def load(
        self,
        *,
        domain: Domain | None = None,
        tier: DifficultyTier | None = None,
        task_type: str | None = None,
        rejection_type: RejectionType | None = None,
        max_cases: int | None = None,
    ) -> list[TestCase]:
        """Load and filter test cases.

        Args:
            domain: Filter by domain (e.g., Domain.PROSECUTION).
            tier: Filter by difficulty tier.
            task_type: Filter by task type string (e.g., "103_argument").
            rejection_type: Filter by rejection type (e.g., RejectionType.SEC_103).
            max_cases: Maximum number of cases to return.

        Returns:
            Filtered list of TestCase objects.
        """
        cases = self.load_all()
        cases = self._apply_filters(cases, domain, tier, task_type, rejection_type)
        if max_cases is not None:
            cases = cases[:max_cases]
        return cases

    def load_iter(
        self,
        *,
        domain: Domain | None = None,
        tier: DifficultyTier | None = None,
        task_type: str | None = None,
        rejection_type: RejectionType | None = None,
    ) -> Iterator[TestCase]:
        """Lazily iterate over filtered test cases (memory efficient for large datasets)."""
        for file_path in self.discover_files():
            for case in self._load_file(file_path):
                if self._matches_filters(case, domain, tier, task_type, rejection_type):
                    yield case

    @staticmethod
    def _apply_filters(
        cases: list[TestCase],
        domain: Domain | None,
        tier: DifficultyTier | None,
        task_type: str | None,
        rejection_type: RejectionType | None,
    ) -> list[TestCase]:
        filtered = cases
        if domain is not None:
            filtered = [c for c in filtered if c.domain == domain]
        if tier is not None:
            filtered = [c for c in filtered if c.tier == tier]
        if task_type is not None:
            filtered = [c for c in filtered if c.task_type == task_type]
        if rejection_type is not None:
            filtered = [c for c in filtered if rejection_type in c.rejection_types]
        return filtered

    @staticmethod
    def _matches_filters(
        case: TestCase,
        domain: Domain | None,
        tier: DifficultyTier | None,
        task_type: str | None,
        rejection_type: RejectionType | None,
    ) -> bool:
        if domain is not None and case.domain != domain:
            return False
        if tier is not None and case.tier != tier:
            return False
        if task_type is not None and case.task_type != task_type:
            return False
        if rejection_type is not None and rejection_type not in case.rejection_types:
            return False
        return True

    def stats(self) -> dict[str, Any]:
        """Return summary statistics for the loaded dataset."""
        cases = self.load_all()
        domain_counts: dict[str, int] = {}
        tier_counts: dict[int, int] = {}
        task_counts: dict[str, int] = {}

        for case in cases:
            domain_counts[case.domain.value] = domain_counts.get(case.domain.value, 0) + 1
            tier_counts[case.tier.value] = tier_counts.get(case.tier.value, 0) + 1
            task_counts[case.task_type] = task_counts.get(case.task_type, 0) + 1

        return {
            "total_cases": len(cases),
            "by_domain": domain_counts,
            "by_tier": tier_counts,
            "by_task_type": task_counts,
        }
