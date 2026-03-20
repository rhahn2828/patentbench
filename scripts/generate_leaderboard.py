#!/usr/bin/env python3
"""Generate leaderboard markdown from PatentBench results.

Reads result JSON files from the results directory and produces a formatted
leaderboard table for the README or website.

Usage:
    python scripts/generate_leaderboard.py --results-dir results/
    python scripts/generate_leaderboard.py --results-dir results/ --format markdown
    python scripts/generate_leaderboard.py --results-dir results/ --format json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import click

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from patentbench.config import Domain


@click.command()
@click.option(
    "--results-dir", "-r",
    default="results",
    help="Directory containing result JSON files (default: results)",
)
@click.option(
    "--format", "-f",
    "output_format",
    default="markdown",
    type=click.Choice(["markdown", "json", "csv"]),
    help="Output format (default: markdown)",
)
@click.option(
    "--output", "-o",
    default=None,
    help="Output file path (default: stdout)",
)
@click.option(
    "--sort-by",
    default="overall_score",
    help="Column to sort by (default: overall_score)",
)
def main(
    results_dir: str,
    output_format: str,
    output: str | None,
    sort_by: str,
) -> None:
    """Generate a leaderboard from PatentBench result files."""
    results_path = Path(results_dir)
    if not results_path.exists():
        click.echo(f"Results directory not found: {results_path}", err=True)
        sys.exit(1)

    # Load all result files
    entries: list[dict] = []
    for result_file in sorted(results_path.glob("*.json")):
        try:
            with open(result_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            if "model_name" in data and "overall_score" in data:
                entries.append(data)
        except (json.JSONDecodeError, KeyError):
            continue

    if not entries:
        click.echo("No valid result files found.", err=True)
        sys.exit(1)

    # Sort by specified column
    entries.sort(key=lambda e: e.get(sort_by, 0), reverse=True)

    # Generate output
    if output_format == "markdown":
        content = _generate_markdown(entries)
    elif output_format == "json":
        content = _generate_json(entries)
    elif output_format == "csv":
        content = _generate_csv(entries)
    else:
        content = ""

    if output:
        Path(output).write_text(content, encoding="utf-8")
        click.echo(f"Leaderboard saved to: {output}")
    else:
        click.echo(content)


def _generate_markdown(entries: list[dict]) -> str:
    """Generate markdown leaderboard table."""
    domains = [d.value for d in Domain]
    domain_headers = [d.replace("_", " ").title() for d in domains]

    lines: list[str] = []
    lines.append("## PatentBench Leaderboard\n")
    lines.append(f"Results from {len(entries)} model evaluations.\n")

    # Header
    header = "| Rank | Model | " + " | ".join(domain_headers) + " | **Overall** |"
    separator = "|------|-------|" + "|".join(["----------" for _ in domains]) + "|-------------|"
    lines.append(header)
    lines.append(separator)

    # Rows
    for rank, entry in enumerate(entries, 1):
        model = entry.get("model_name", "Unknown")
        domain_scores = entry.get("domain_scores", {})
        overall = entry.get("overall_score", 0.0)

        scores = []
        for d in domains:
            score = domain_scores.get(d, 0.0)
            scores.append(f"{score:.1f}")

        row = f"| {rank} | {model} | " + " | ".join(scores) + f" | **{overall:.1f}** |"
        lines.append(row)

    lines.append("")
    lines.append("> Scores are composite quality scores (0-100). See METHODOLOGY.md for details.")
    return "\n".join(lines)


def _generate_json(entries: list[dict]) -> str:
    """Generate JSON leaderboard."""
    leaderboard = []
    for rank, entry in enumerate(entries, 1):
        leaderboard.append({
            "rank": rank,
            "model": entry.get("model_name", "Unknown"),
            "overall_score": entry.get("overall_score", 0.0),
            "domain_scores": entry.get("domain_scores", {}),
            "tier_scores": entry.get("tier_scores", {}),
            "total_cases": entry.get("total_cases", 0),
            "pass_rate": entry.get("pass_rate", 0.0),
            "run_id": entry.get("run_id", ""),
            "timestamp": entry.get("timestamp", ""),
        })
    return json.dumps({"leaderboard": leaderboard}, indent=2)


def _generate_csv(entries: list[dict]) -> str:
    """Generate CSV leaderboard."""
    domains = [d.value for d in Domain]
    header = "rank,model," + ",".join(domains) + ",overall_score,pass_rate"
    lines = [header]

    for rank, entry in enumerate(entries, 1):
        model = entry.get("model_name", "Unknown")
        domain_scores = entry.get("domain_scores", {})
        overall = entry.get("overall_score", 0.0)
        pass_rate = entry.get("pass_rate", 0.0)

        scores = [f"{domain_scores.get(d, 0.0):.1f}" for d in domains]
        row = f"{rank},{model}," + ",".join(scores) + f",{overall:.1f},{pass_rate:.3f}"
        lines.append(row)

    return "\n".join(lines)


if __name__ == "__main__":
    main()
