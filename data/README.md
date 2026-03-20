# PatentBench Data

This directory contains the test cases, rubrics, and supporting data for PatentBench.

## Directory Structure

```
data/
  mini/                     # PatentBench-Mini (300 test cases)
    sample_oa_parsing.jsonl # Sample OA parsing test cases
    sample_103_argument.jsonl # Sample 103 argument test cases
  rubrics/                  # Evaluation rubrics
    legal_accuracy.json     # Legal accuracy scoring rubric
    argument_strength.json  # Argument strength scoring rubric
```

## Data Format

Test cases are stored in JSONL format (one JSON object per line). Each test case contains:

- `id`: Unique identifier
- `domain`: One of `administration`, `drafting`, `prosecution`, `analytics`, `prior_art`
- `tier`: Difficulty tier (1-5)
- `task_type`: Specific task type (e.g., `oa_parsing`, `103_argument`)
- `prompt`: The task prompt given to the model
- `reference_answer`: The gold standard answer
- `rejection_types`: Applicable 35 U.S.C. rejection types
- `evaluation_layers`: Which evaluation layers apply
- `application_number`: USPTO application number (where applicable)
- `mpep_sections`: Relevant MPEP sections
- `poison_pills`: Fabricated citations for hallucination detection

## Data Provenance

All test cases derive from real USPTO proceedings accessible via the Patent Examination Data System (PEDS). Application numbers, Office Action dates, and examiner names are verifiable against public records.

## License

Apache 2.0. Copyright 2026 Salt Holdings LLC.
