# Evaluation Rubrics

Rubrics define the scoring criteria for LLM-as-Judge evaluation in PatentBench. Each rubric specifies multiple dimensions with 1-5 scoring scales and detailed criteria per score level.

## Available Rubrics

- **legal_accuracy.json** - Scores correctness of legal citations, statutory references, and case law application
- **argument_strength.json** - Scores quality of patent prosecution arguments including persuasiveness, structure, and completeness

## Rubric Format

```json
{
  "name": "Rubric Name",
  "version": "1.0",
  "dimensions": [
    {
      "name": "dimension_name",
      "description": "What this dimension measures",
      "weight": 1.0,
      "scale_min": 1,
      "scale_max": 5,
      "criteria": {
        "1": "Description of score 1 (worst)",
        "3": "Description of score 3 (adequate)",
        "5": "Description of score 5 (excellent)"
      }
    }
  ]
}
```
