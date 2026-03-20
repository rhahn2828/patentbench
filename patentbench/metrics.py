"""Metric computation for PatentBench evaluations.

Implements accuracy, F1 score, Cohen's Kappa, and composite quality scores.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np


@dataclass
class MetricResult:
    """A single metric computation result."""

    name: str
    value: float
    count: int
    details: dict[str, Any] = field(default_factory=dict)

    @property
    def percentage(self) -> float:
        return self.value * 100.0


@dataclass
class EvaluationResult:
    """Complete evaluation results for a single test case."""

    case_id: str
    model_name: str
    model_output: str
    metrics: dict[str, MetricResult] = field(default_factory=dict)
    layer_scores: dict[str, float] = field(default_factory=dict)
    composite_score: float = 0.0
    passed: bool = False
    error: str | None = None

    def add_metric(self, metric: MetricResult) -> None:
        self.metrics[metric.name] = metric


class MetricsCalculator:
    """Computes all PatentBench metrics."""

    @staticmethod
    def accuracy(predictions: list[Any], references: list[Any]) -> MetricResult:
        """Compute exact-match accuracy."""
        if not predictions:
            return MetricResult(name="accuracy", value=0.0, count=0)
        correct = sum(1 for p, r in zip(predictions, references) if p == r)
        return MetricResult(
            name="accuracy",
            value=correct / len(predictions),
            count=len(predictions),
            details={"correct": correct, "total": len(predictions)},
        )

    @staticmethod
    def f1_score(
        predictions: list[set[str]], references: list[set[str]]
    ) -> MetricResult:
        """Compute macro-averaged F1 score for set-valued predictions.

        Useful for evaluating extraction tasks like claim identification
        or rejection type classification.
        """
        if not predictions:
            return MetricResult(name="f1_score", value=0.0, count=0)

        f1_scores: list[float] = []
        for pred, ref in zip(predictions, references):
            if not ref and not pred:
                f1_scores.append(1.0)
                continue
            if not ref or not pred:
                f1_scores.append(0.0)
                continue
            tp = len(pred & ref)
            precision = tp / len(pred) if pred else 0.0
            recall = tp / len(ref) if ref else 0.0
            if precision + recall == 0:
                f1_scores.append(0.0)
            else:
                f1_scores.append(2 * precision * recall / (precision + recall))

        avg_f1 = float(np.mean(f1_scores))
        return MetricResult(
            name="f1_score",
            value=avg_f1,
            count=len(predictions),
            details={"per_case_f1": f1_scores},
        )

    @staticmethod
    def cohens_kappa(
        rater1: list[int], rater2: list[int], num_categories: int | None = None
    ) -> MetricResult:
        """Compute Cohen's Kappa for inter-rater agreement.

        Used to measure agreement between LLM-judge scores and human calibration
        scores, establishing the reliability of automated evaluation.

        Args:
            rater1: Scores from first rater (e.g., LLM judge).
            rater2: Scores from second rater (e.g., human expert).
            num_categories: Number of possible score categories. Auto-detected if None.

        Returns:
            MetricResult with Kappa value in [-1, 1].
        """
        if not rater1 or len(rater1) != len(rater2):
            return MetricResult(name="cohens_kappa", value=0.0, count=0)

        if num_categories is None:
            num_categories = max(max(rater1), max(rater2)) + 1

        n = len(rater1)

        # Build confusion matrix
        matrix = np.zeros((num_categories, num_categories), dtype=np.float64)
        for r1, r2 in zip(rater1, rater2):
            matrix[r1][r2] += 1

        # Observed agreement
        p_o = float(np.trace(matrix)) / n

        # Expected agreement
        row_sums = matrix.sum(axis=1)
        col_sums = matrix.sum(axis=0)
        p_e = float(np.sum(row_sums * col_sums)) / (n * n)

        if p_e == 1.0:
            kappa = 1.0
        else:
            kappa = (p_o - p_e) / (1.0 - p_e)

        return MetricResult(
            name="cohens_kappa",
            value=kappa,
            count=n,
            details={
                "observed_agreement": p_o,
                "expected_agreement": p_e,
                "confusion_matrix": matrix.tolist(),
            },
        )

    @staticmethod
    def quality_score(
        scores: list[float], weights: list[float] | None = None
    ) -> MetricResult:
        """Compute weighted quality score from rubric-based LLM judge scores.

        Args:
            scores: Individual dimension scores (0.0 to 1.0 each).
            weights: Optional weights for each dimension. Uniform if None.

        Returns:
            MetricResult with composite quality score.
        """
        if not scores:
            return MetricResult(name="quality_score", value=0.0, count=0)

        if weights is None:
            weights = [1.0 / len(scores)] * len(scores)
        else:
            total = sum(weights)
            weights = [w / total for w in weights]

        weighted_sum = sum(s * w for s, w in zip(scores, weights))
        return MetricResult(
            name="quality_score",
            value=weighted_sum,
            count=len(scores),
            details={"individual_scores": scores, "weights": weights},
        )

    @staticmethod
    def composite_benchmark_score(
        layer_scores: dict[str, float],
        layer_weights: dict[str, float],
    ) -> float:
        """Compute final composite benchmark score across evaluation layers.

        Args:
            layer_scores: Score per evaluation layer (0.0 to 1.0).
            layer_weights: Weight per evaluation layer.

        Returns:
            Weighted composite score (0.0 to 1.0).
        """
        total_weight = 0.0
        weighted_sum = 0.0
        for layer, score in layer_scores.items():
            weight = layer_weights.get(layer, 0.0)
            weighted_sum += score * weight
            total_weight += weight
        if total_weight == 0.0:
            return 0.0
        return weighted_sum / total_weight
