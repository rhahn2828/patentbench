# PatentBench Methodology

This document describes the evaluation methodology, scoring framework, contamination prevention measures, and economic validity analysis underlying PatentBench.

## 1. Evaluation Framework

PatentBench uses a 4-layer evaluation framework. Each layer captures different aspects of model quality, from objective correctness to subjective expert judgment.

### Layer 1: Deterministic Evaluation

**Purpose**: Measure binary correctness on tasks with objectively verifiable answers.

**Tasks covered**:
- Deadline calculation (response deadlines from OA mailing dates)
- Fee computation (USPTO fees based on entity status, filing type, extensions)
- Entity status determination (micro, small, large)
- Rejection type identification (parsing OA to extract 35 U.S.C. sections)
- Claim number extraction (identifying which claims are affected)
- Format compliance (structural requirements for patent documents)

**Scoring**: Binary (correct/incorrect) or F1 for set-valued outputs (e.g., claim lists).

**Weight in composite score**: 30%

### Layer 2: LLM-as-Judge Evaluation

**Purpose**: Score subjective quality dimensions using calibrated rubrics and an LLM judge.

**Dimensions scored**:
- **Legal accuracy**: Correctness of statutory, MPEP, and case law citations
- **Factual accuracy**: Grounding in the specific facts (claim language, prior art disclosures)
- **Argument strength**: Quality of legal reasoning and persuasiveness
- **Completeness**: Whether all rejections, claims, and required elements are addressed

**Judge model**: Claude Sonnet 4 (pinned version) at temperature 0.0 for deterministic scoring.

**Rubric format**: Each dimension scored 1-5 with detailed criteria per level. See `data/rubrics/` for published rubrics.

**Anti-hallucination integration**: Citation verification scores are factored into legal accuracy. Poison pill detection applies a 2x penalty.

**Weight in composite score**: 35%

### Layer 3: Comparative Evaluation

**Purpose**: Direct head-to-head comparison of model outputs to establish relative ranking.

**Protocol**:
1. Two model outputs are presented to the judge with randomized order (position deblinding)
2. The judge selects the better output or declares a tie
3. Confidence level is recorded (high/medium/low)
4. Win rates are computed per model pair across all test cases

**Position bias mitigation**: Output order is randomized for each comparison. Results are aggregated across both orderings.

**Weight in composite score**: 25%

### Layer 4: Human Calibration

**Purpose**: Anchor automated metrics against expert patent attorney judgment.

**Protocol**:
1. A random subset of test cases (minimum 50) is scored by at least 2 licensed patent attorneys
2. Attorneys score the same dimensions as the LLM judge (1-5 scale)
3. Cohen's Kappa is computed between each attorney pair and between attorneys and LLM judge
4. Results are used to validate and calibrate the LLM judge

**Inter-rater reliability target**: Cohen's Kappa >= 0.60 (substantial agreement)

**Calibration adjustment**: If LLM judge scores systematically diverge from human scores, a linear calibration function is applied.

**Weight in composite score**: 10%

## 2. Difficulty Tiers

PatentBench test cases are stratified into 5 difficulty tiers based on the experience level required to perform the task competently in professional practice.

| Tier | Level | Experience | Task Characteristics |
|------|-------|------------|----------------------|
| 1 | Paralegal | 0-1 years | Lookup-based, deterministic answers, no legal judgment required |
| 2 | Junior Associate | 1-3 years | Pattern recognition, straightforward legal standards |
| 3 | Senior Associate | 3-6 years | Complex legal reasoning, multiple arguments, strategic choices |
| 4 | Junior Partner | 6-10 years | Multi-rejection OAs, prosecution strategy, continuation decisions |
| 5 | Senior Partner | 10+ years | Portfolio strategy, IPR/PTAB defense, prosecution history estoppel |

**Tier assignment criteria**:
- Based on billing rate surveys (AIPLA Economic Survey)
- Validated by 3 independent patent practitioners
- Each test case's tier is the minimum experience level at which a competent practitioner would produce a high-quality response

## 3. Composite Scoring

The composite benchmark score (0-100) is computed as:

```
composite = sum(layer_weight[l] * layer_score[l] for l in layers) * 100
```

Where:
- `layer_weight` = {deterministic: 0.30, llm_judge: 0.35, comparative: 0.25, human_calibration: 0.10}
- `layer_score` = mean score across test cases for that layer (0.0 to 1.0)

Domain-specific scores use the same formula but aggregated per domain:
- Administration (10%), Drafting (25%), Prosecution (35%), Analytics (15%), Prior Art (15%)

## 4. Anti-Hallucination Framework

Patent prosecution demands zero tolerance for fabricated legal authority. PatentBench includes dedicated anti-hallucination measures.

### Poison Pill Citations

Each test case embeds fabricated MPEP sections and case law citations in the context. If a model references these fabricated citations, it receives a 2x scoring penalty.

**Examples of poison pills**:
- MPEP 2199 (does not exist)
- "Smith v. USPTO, 999 F.3d 1 (Fed. Cir. 2025)" (fabricated case)

### Citation Verification

All MPEP section references are checked against the known valid sections registry. Case law citations are checked against a database of real Federal Circuit and Supreme Court patent decisions.

### Scoring Impact

```
anti_hallucination_score = max(0, 1 - (hallucinations + 2*poison_hits) / total_citations)
```

This score is incorporated into the LLM judge layer evaluation.

## 5. Contamination Prevention

### Data Isolation

- Test cases in the held-out set are never published in training data
- PatentBench-Mini is the only publicly released subset
- The full 7,200-case benchmark is available only through the evaluation API

### Canary Strings

Select test cases contain unique canary strings that would be detectable in model training data. These serve as contamination detectors.

### Temporal Controls

- Test cases use Office Actions with mailing dates after common training data cutoffs
- Application numbers are verified against USPTO PEDS to ensure they are real but post-cutoff

### Version Rotation

- 20% of test cases are rotated each quarter to prevent benchmark overfitting
- Rotated cases are replaced with new expert-curated cases of equivalent difficulty

## 6. Economic Validity

PatentBench tasks map to real billable activities in patent prosecution practice.

### Task-to-Billing Mapping

| Task Type | Billable Activity | Typical Rate Range |
|-----------|-------------------|-------------------|
| Deadline calculation | Docketing | $50-100/task |
| OA parsing | Office Action review | $200-500/OA |
| 103 argument | OA response drafting | $2,000-8,000/response |
| Claim amendment | Amendment preparation | $1,000-3,000/set |
| Multi-rejection response | Complex OA response | $5,000-15,000/response |

### Economic Impact Calculation

For each model, we estimate the economic value of correct performance:

```
economic_value = sum(task_billing_rate * accuracy_on_task for task in tasks)
```

This provides a dollar-denominated benchmark that is directly meaningful to law firm decision-makers.

## 7. Statistical Methodology

### Confidence Intervals

All reported scores include 95% confidence intervals computed via bootstrap resampling (1,000 iterations).

### Significance Testing

Pairwise model comparisons use the Wilcoxon signed-rank test with Bonferroni correction for multiple comparisons. A difference is reported as significant at p < 0.05 (corrected).

### Effect Sizes

Cohen's d is reported for all pairwise comparisons to indicate practical significance beyond statistical significance.

---

Copyright 2026 Salt Holdings LLC. Licensed under Apache 2.0.
