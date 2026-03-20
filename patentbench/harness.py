"""Main benchmark runner for PatentBench.

Orchestrates evaluation across models, domains, and tiers. Produces
structured results for leaderboard generation.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from patentbench.config import (
    BENCHMARK_NAME,
    BENCHMARK_VERSION,
    DOMAIN_WEIGHTS,
    Domain,
    DifficultyTier,
    EvaluationLayer,
    LAYER_WEIGHTS,
)
from patentbench.data_loader import DataLoader, TestCase
from patentbench.evaluator import (
    DeterministicEvaluator,
    LLMJudgeEvaluator,
    ScoringAggregator,
)
from patentbench.metrics import EvaluationResult


@dataclass
class BenchmarkConfig:
    """Configuration for a benchmark run."""

    subset: str = "mini"  # "mini", "full", "oa", "draft"
    domains: list[Domain] | None = None  # None = all domains
    tiers: list[DifficultyTier] | None = None  # None = all tiers
    max_cases: int | None = None
    output_dir: str = "results"
    run_deterministic: bool = True
    run_llm_judge: bool = True
    run_comparative: bool = False
    judge_model: str = "claude-sonnet-4-20250514"
    concurrency: int = 1
    timeout_seconds: int = 120
    save_outputs: bool = True


@dataclass
class ModelOutput:
    """A model's response to a test case."""

    case_id: str
    model_name: str
    output: str
    latency_ms: float
    tokens_used: int = 0
    error: str | None = None


@dataclass
class BenchmarkResults:
    """Complete results from a benchmark run."""

    benchmark: str = BENCHMARK_NAME
    version: str = BENCHMARK_VERSION
    model_name: str = ""
    run_id: str = ""
    timestamp: str = ""
    config: dict[str, Any] = field(default_factory=dict)
    overall_score: float = 0.0
    domain_scores: dict[str, float] = field(default_factory=dict)
    tier_scores: dict[int, float] = field(default_factory=dict)
    layer_scores: dict[str, float] = field(default_factory=dict)
    case_results: list[dict[str, Any]] = field(default_factory=list)
    total_cases: int = 0
    pass_rate: float = 0.0
    total_latency_ms: float = 0.0
    total_tokens: int = 0

    def summary(self) -> str:
        """Generate human-readable summary of results."""
        lines = [
            f"{'='*60}",
            f"  {self.benchmark} v{self.version} Results",
            f"  Model: {self.model_name}",
            f"  Run: {self.run_id}",
            f"  Timestamp: {self.timestamp}",
            f"{'='*60}",
            f"",
            f"  Overall Score: {self.overall_score:.1f}/100",
            f"  Pass Rate: {self.pass_rate:.1%}",
            f"  Total Cases: {self.total_cases}",
            f"",
            f"  Domain Scores:",
        ]
        for domain, score in sorted(self.domain_scores.items()):
            lines.append(f"    {domain:20s}: {score:.1f}")
        lines.append(f"")
        lines.append(f"  Tier Scores:")
        for tier, score in sorted(self.tier_scores.items()):
            tier_name = DifficultyTier(tier).display_name
            lines.append(f"    {tier_name:20s}: {score:.1f}")
        lines.append(f"")
        lines.append(f"  Layer Scores:")
        for layer, score in sorted(self.layer_scores.items()):
            lines.append(f"    {layer:20s}: {score:.1f}")
        lines.append(f"{'='*60}")
        return "\n".join(lines)

    def to_dict(self) -> dict[str, Any]:
        return {
            "benchmark": self.benchmark,
            "version": self.version,
            "model_name": self.model_name,
            "run_id": self.run_id,
            "timestamp": self.timestamp,
            "config": self.config,
            "overall_score": self.overall_score,
            "domain_scores": self.domain_scores,
            "tier_scores": self.tier_scores,
            "layer_scores": self.layer_scores,
            "total_cases": self.total_cases,
            "pass_rate": self.pass_rate,
            "total_latency_ms": self.total_latency_ms,
            "total_tokens": self.total_tokens,
            "case_results": self.case_results,
        }

    def save(self, path: str | Path) -> None:
        """Save results to JSON file."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2)


class BenchmarkRunner:
    """Main benchmark execution engine.

    Orchestrates test case loading, model inference, and multi-layer evaluation.

    Usage:
        from patentbench.models.openai_adapter import OpenAIAdapter

        model = OpenAIAdapter(model_name="gpt-4o")
        runner = BenchmarkRunner(model=model)
        results = runner.run(BenchmarkConfig(subset="mini"))
    """

    def __init__(
        self,
        model: Any,  # BaseModelAdapter
        data_dir: str | Path = "data",
        config: BenchmarkConfig | None = None,
        cases: list[TestCase] | None = None,
    ) -> None:
        self.model = model
        self.data_dir = Path(data_dir)
        self.config = config or BenchmarkConfig()
        self._provided_cases = cases

        # Initialize evaluators
        self.deterministic_eval = DeterministicEvaluator()
        self.aggregator = ScoringAggregator()

    def _load_cases(self) -> list[TestCase]:
        """Load test cases based on config."""
        if self._provided_cases:
            return self._provided_cases

        subset_dir = self.data_dir / self.config.subset
        if not subset_dir.exists():
            subset_dir = self.data_dir

        loader = DataLoader(subset_dir)
        cases = loader.load_all()

        # Apply domain filter
        if self.config.domains:
            cases = [c for c in cases if c.domain in self.config.domains]

        # Apply tier filter
        if self.config.tiers:
            cases = [c for c in cases if c.tier in self.config.tiers]

        # Apply max cases limit
        if self.config.max_cases:
            cases = cases[: self.config.max_cases]

        return cases

    def _get_model_output(self, case: TestCase) -> ModelOutput:
        """Get model's response for a test case."""
        start_time = time.time()
        try:
            output = self.model.generate(case.prompt)
            latency_ms = (time.time() - start_time) * 1000
            return ModelOutput(
                case_id=case.id,
                model_name=getattr(self.model, "model_name", "unknown"),
                output=output,
                latency_ms=latency_ms,
            )
        except Exception as exc:
            latency_ms = (time.time() - start_time) * 1000
            return ModelOutput(
                case_id=case.id,
                model_name=getattr(self.model, "model_name", "unknown"),
                output="",
                latency_ms=latency_ms,
                error=str(exc),
            )

    def _evaluate_case(self, case: TestCase, model_output: ModelOutput) -> EvaluationResult:
        """Evaluate a single case through applicable evaluation layers."""
        if model_output.error:
            return EvaluationResult(
                case_id=case.id,
                model_name=model_output.model_name,
                model_output="",
                error=model_output.error,
            )

        result = EvaluationResult(
            case_id=case.id,
            model_name=model_output.model_name,
            model_output=model_output.output,
        )

        # Layer 1: Deterministic evaluation
        if self.config.run_deterministic and EvaluationLayer.DETERMINISTIC in case.evaluation_layers:
            det_result = self.deterministic_eval.evaluate(case, model_output.output)
            result.metrics.update(det_result.metrics)
            result.layer_scores.update(det_result.layer_scores)

        # Compute composite score
        all_scores = list(result.layer_scores.values())
        result.composite_score = sum(all_scores) / len(all_scores) if all_scores else 0.0
        result.passed = result.composite_score >= 0.5

        return result

    def run(self, config: BenchmarkConfig | None = None) -> BenchmarkResults:
        """Execute the benchmark.

        Args:
            config: Optional override config. Uses self.config if None.

        Returns:
            BenchmarkResults with complete evaluation data.
        """
        if config:
            self.config = config

        run_id = f"run_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        cases = self._load_cases()

        if not cases:
            return BenchmarkResults(
                model_name=getattr(self.model, "model_name", "unknown"),
                run_id=run_id,
                timestamp=datetime.utcnow().isoformat(),
            )

        results: list[EvaluationResult] = []
        total_latency = 0.0
        total_tokens = 0

        for case in cases:
            model_output = self._get_model_output(case)
            total_latency += model_output.latency_ms
            total_tokens += model_output.tokens_used

            eval_result = self._evaluate_case(case, model_output)
            results.append(eval_result)

        # Aggregate by domain
        domain_scores = self._aggregate_by_domain(results, cases)

        # Aggregate by tier
        tier_scores = self._aggregate_by_tier(results, cases)

        # Aggregate by layer
        aggregate = self.aggregator.aggregate(results)

        overall = sum(domain_scores.values()) / len(domain_scores) if domain_scores else 0.0

        return BenchmarkResults(
            model_name=getattr(self.model, "model_name", "unknown"),
            run_id=run_id,
            timestamp=datetime.utcnow().isoformat(),
            config={
                "subset": self.config.subset,
                "domains": [d.value for d in self.config.domains] if self.config.domains else None,
                "tiers": [t.value for t in self.config.tiers] if self.config.tiers else None,
                "max_cases": self.config.max_cases,
            },
            overall_score=overall * 100,
            domain_scores={d: s * 100 for d, s in domain_scores.items()},
            tier_scores={t: s * 100 for t, s in tier_scores.items()},
            layer_scores={l: s * 100 for l, s in aggregate.get("layer_scores", {}).items()},
            case_results=[
                {
                    "case_id": r.case_id,
                    "composite_score": r.composite_score,
                    "passed": r.passed,
                    "error": r.error,
                }
                for r in results
            ],
            total_cases=len(cases),
            pass_rate=aggregate.get("pass_rate", 0.0),
            total_latency_ms=total_latency,
            total_tokens=total_tokens,
        )

    def _aggregate_by_domain(
        self, results: list[EvaluationResult], cases: list[TestCase]
    ) -> dict[str, float]:
        """Compute average score per domain."""
        case_map = {c.id: c for c in cases}
        domain_scores: dict[str, list[float]] = {}
        for result in results:
            case = case_map.get(result.case_id)
            if case:
                domain = case.domain.value
                if domain not in domain_scores:
                    domain_scores[domain] = []
                domain_scores[domain].append(result.composite_score)

        return {
            domain: sum(scores) / len(scores) if scores else 0.0
            for domain, scores in domain_scores.items()
        }

    def _aggregate_by_tier(
        self, results: list[EvaluationResult], cases: list[TestCase]
    ) -> dict[int, float]:
        """Compute average score per difficulty tier."""
        case_map = {c.id: c for c in cases}
        tier_scores: dict[int, list[float]] = {}
        for result in results:
            case = case_map.get(result.case_id)
            if case:
                tier = case.tier.value
                if tier not in tier_scores:
                    tier_scores[tier] = []
                tier_scores[tier].append(result.composite_score)

        return {
            tier: sum(scores) / len(scores) if scores else 0.0
            for tier, scores in tier_scores.items()
        }
