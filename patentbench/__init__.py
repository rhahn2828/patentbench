"""PatentBench: The first reproducible benchmark for patent prosecution AI.

Copyright 2026 Salt Holdings LLC. Licensed under Apache 2.0.
"""

from patentbench.config import (
    BENCHMARK_VERSION,
    Domain,
    DifficultyTier,
    RejectionType,
)
from patentbench.data_loader import DataLoader, TestCase
from patentbench.evaluator import (
    DeterministicEvaluator,
    LLMJudgeEvaluator,
    ComparativeEvaluator,
    HumanCalibrationCollector,
)
from patentbench.harness import BenchmarkRunner
from patentbench.metrics import MetricsCalculator

__version__ = BENCHMARK_VERSION
__author__ = "Salt Holdings LLC"

__all__ = [
    "BENCHMARK_VERSION",
    "Domain",
    "DifficultyTier",
    "RejectionType",
    "DataLoader",
    "TestCase",
    "DeterministicEvaluator",
    "LLMJudgeEvaluator",
    "ComparativeEvaluator",
    "HumanCalibrationCollector",
    "BenchmarkRunner",
    "MetricsCalculator",
]
