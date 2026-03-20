<p align="center">
  <h1 align="center">PatentBench</h1>
  <p align="center">The First Reproducible Benchmark for Patent Prosecution AI</p>
</p>

<p align="center">
  <a href="https://arxiv.org/abs/XXXX.XXXXX"><img src="https://img.shields.io/badge/arXiv-XXXX.XXXXX-b31b1b.svg" alt="arXiv"></a>
  <a href="https://huggingface.co/datasets/salt-holdings/patentbench"><img src="https://img.shields.io/badge/%F0%9F%A4%97-HuggingFace-yellow.svg" alt="HuggingFace"></a>
  <a href="https://github.com/salt-holdings/patentbench/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License"></a>
  <a href="https://abigail.app/patentbench"><img src="https://img.shields.io/badge/Leaderboard-abigail.app-purple.svg" alt="Leaderboard"></a>
</p>

---

## Overview

**PatentBench** is the first open, reproducible benchmark for evaluating AI systems on patent prosecution tasks. Inspired by [SWE-bench](https://www.swebench.com/) for software engineering, PatentBench measures whether AI can perform the real work of patent attorneys -- from parsing USPTO Office Actions to drafting legally sound arguments under 35 U.S.C. sections 101, 102, 103, and 112.

Patent prosecution has remained one of the last untouched domains for AI benchmarking despite being a $15B+ annual market. Existing evaluations are ad hoc, non-reproducible, and disconnected from the economic reality of patent practice. PatentBench changes this.

### Why PatentBench?

- **Real tasks, not toy problems.** Every test case derives from actual USPTO proceedings
- **Economically grounded.** Tasks map to billable activities at patent law firms
- **Anti-hallucination first.** Poison-pill MPEP citations and fabricated case law detection built in
- **Glass Box Standard.** Full transparency on data provenance, evaluation methodology, and scoring

## Benchmark Structure

### 5 Domains

| Domain | Description | Example Tasks |
|--------|-------------|---------------|
| **Administration** | Deadline computation, fee calculation, entity status | Calculate response deadline from OA mailing date |
| **Drafting** | Claim drafting, specification writing, amendment preparation | Draft independent claim from invention disclosure |
| **Prosecution** | Office Action response, rejection traversal, interviews | Argue against 103 obviousness rejection |
| **Analytics** | Portfolio analysis, prior art landscape, claim mapping | Identify claim overlap across patent family |
| **Prior Art** | Search strategy, reference analysis, relevance ranking | Evaluate novelty of claims against prior art set |

### 7,200 Total Test Cases

PatentBench contains 7,200 expert-curated test cases spanning all five domains. The initial release, **PatentBench-Mini**, includes 300 representative cases for rapid evaluation.

| Subset | Cases | Purpose |
|--------|-------|---------|
| PatentBench-Full | 7,200 | Complete evaluation |
| PatentBench-Mini | 300 | Quick iteration and development |
| PatentBench-OA | 1,800 | Office Action response focus |
| PatentBench-Draft | 1,200 | Drafting focus |

### 5 Difficulty Tiers

| Tier | Level | Equivalent | Examples |
|------|-------|------------|----------|
| 1 | **Paralegal** | 0-1 years | Deadline calculation, fee lookup, form filling |
| 2 | **Junior Associate** | 1-3 years | OA parsing, straightforward 112 responses |
| 3 | **Senior Associate** | 3-6 years | 103 arguments, claim amendments, interview prep |
| 4 | **Junior Partner** | 6-10 years | Complex multi-rejection OAs, continuation strategy |
| 5 | **Senior Partner** | 10+ years | Portfolio strategy, IPR defense, prosecution history estoppel |

### 4-Layer Evaluation

PatentBench uses a rigorous 4-layer evaluation framework:

1. **Deterministic Evaluation** -- Binary correctness for objective tasks (deadlines, fees, format compliance)
2. **LLM-as-Judge** -- Calibrated rubric-based scoring for subjective quality (legal accuracy, argument strength, completeness)
3. **Comparative Evaluation** -- Blind side-by-side ranking of model outputs by domain experts
4. **Human Calibration** -- Expert attorney scores on a subset to anchor and validate automated metrics

## Quick Start

### Installation

```bash
pip install patentbench
```

Or from source:

```bash
git clone https://github.com/salt-holdings/patentbench.git
cd patentbench
pip install -e ".[dev]"
```

### Run the Benchmark

```bash
# Run PatentBench-Mini with a specific model
patentbench run --model openai:gpt-4o --subset mini

# Run a specific domain and tier
patentbench run --model anthropic:claude-sonnet-4 --domain prosecution --tier 3

# Run with ABIGAIL
patentbench run --model abigail --subset mini --api-key YOUR_KEY
```

### Python API

```python
from patentbench import BenchmarkRunner, DataLoader
from patentbench.models import OpenAIAdapter

# Load test cases
loader = DataLoader("data/mini")
cases = loader.load(domain="prosecution", tier=3)

# Configure model
model = OpenAIAdapter(model_name="gpt-4o")

# Run benchmark
runner = BenchmarkRunner(model=model, cases=cases)
results = runner.run()

# Print results
print(results.summary())
```

## Leaderboard

Results on PatentBench-Mini (300 cases). Last updated: 2026-03-19.

| Model | Admin | Drafting | Prosecution | Analytics | Prior Art | **Overall** |
|-------|-------|----------|-------------|-----------|-----------|-------------|
| ABIGAIL v3 | **92.4** | **78.1** | **81.3** | **74.2** | **76.8** | **80.6** |
| Claude Sonnet 4 | 88.1 | 71.4 | 74.6 | 69.3 | 72.1 | 75.1 |
| GPT-5 | 86.7 | 69.8 | 72.1 | 67.8 | 70.4 | 73.4 |
| Gemini 2.5 Pro | 85.2 | 68.3 | 70.9 | 66.1 | 69.2 | 71.9 |
| GPT-4o | 83.6 | 64.2 | 67.4 | 62.7 | 65.8 | 68.7 |
| Claude Haiku 3.5 | 79.4 | 58.6 | 61.2 | 57.3 | 60.1 | 63.3 |

> Scores are composite quality scores (0-100) combining deterministic accuracy, LLM-judge ratings, and comparative rankings. See [METHODOLOGY.md](METHODOLOGY.md) for details.

## Glass Box Standard

PatentBench adheres to the **Glass Box Standard** for AI evaluation transparency:

1. **Data Provenance** -- Every test case traces back to a specific USPTO application number, Office Action date, and MPEP section
2. **Evaluation Reproducibility** -- Deterministic scoring with pinned LLM-judge versions and published rubrics
3. **Contamination Prevention** -- Held-out test cases never published in training data; canary strings embedded
4. **Economic Validity** -- Tasks map to real billable activities with known market rates
5. **Human Calibration** -- Expert attorney scores anchor all automated metrics with published inter-rater reliability

## Anti-Hallucination Testing

PatentBench includes dedicated anti-hallucination checks:

- **Poison Pill MPEP Citations** -- Fabricated MPEP section numbers inserted to detect confabulation
- **Case Law Verification** -- All cited cases validated against published USPTO and Federal Circuit decisions
- **Statute Accuracy** -- 35 U.S.C. section references verified against current patent law
- **Examiner Name Verification** -- Cross-referenced against USPTO PEDS records

## Citation

```bibtex
@article{patentbench2026,
  title={PatentBench: A Reproducible Benchmark for Patent Prosecution AI},
  author={Salt Holdings LLC},
  journal={arXiv preprint arXiv:XXXX.XXXXX},
  year={2026},
  url={https://github.com/salt-holdings/patentbench}
}
```

## Links

- **Paper**: [arXiv:XXXX.XXXXX](https://arxiv.org/abs/XXXX.XXXXX)
- **Dataset**: [HuggingFace](https://huggingface.co/datasets/salt-holdings/patentbench)
- **Leaderboard**: [abigail.app/patentbench](https://abigail.app/patentbench)
- **ABIGAIL Patent AI**: [abigail.app](https://abigail.app)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing test cases, rubrics, and model adapters.

## License

Apache 2.0. See [LICENSE](LICENSE).

Copyright 2026 Salt Holdings LLC.
