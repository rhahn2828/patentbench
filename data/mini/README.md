# PatentBench-Mini

A curated subset of 300 test cases from the full PatentBench benchmark, designed for rapid evaluation and development iteration.

## Composition

| Domain | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 | Total |
|--------|--------|--------|--------|--------|--------|-------|
| Administration | 20 | 10 | - | - | - | 30 |
| Drafting | - | 20 | 30 | 15 | - | 65 |
| Prosecution | - | 25 | 40 | 25 | 10 | 100 |
| Analytics | - | - | 20 | 20 | 10 | 50 |
| Prior Art | - | 15 | 20 | 15 | 5 | 55 |
| **Total** | **20** | **70** | **110** | **75** | **25** | **300** |

## Files

- `sample_oa_parsing.jsonl` - Sample Office Action parsing test cases (Tier 2)
- `sample_103_argument.jsonl` - Sample 35 U.S.C. 103 argument drafting test cases (Tier 3)

## Usage

```python
from patentbench import DataLoader

loader = DataLoader("data/mini")
cases = loader.load(domain="prosecution", tier=3)
```
