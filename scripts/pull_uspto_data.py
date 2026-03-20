#!/usr/bin/env python3
"""Pull Office Actions from the USPTO PEDS API for PatentBench test case creation.

This script downloads Office Action metadata and documents from USPTO's Patent
Examination Data System (PEDS) for use in constructing benchmark test cases.

Usage:
    python scripts/pull_uspto_data.py --app-numbers 16789012,17234567
    python scripts/pull_uspto_data.py --search "machine learning" --max-results 50
    python scripts/pull_uspto_data.py --art-unit 2489 --max-results 100
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import click

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from patentbench.uspto_loader import USPTOPedsClient, OfficeActionParser


@click.command()
@click.option(
    "--app-numbers",
    default=None,
    help="Comma-separated application numbers to fetch (e.g., '16789012,17234567')",
)
@click.option(
    "--search",
    default=None,
    help="Search query for finding applications",
)
@click.option(
    "--art-unit",
    default=None,
    help="Filter by USPTO art unit (e.g., '2489')",
)
@click.option(
    "--max-results", "-n",
    default=20,
    type=int,
    help="Maximum number of applications to fetch (default: 20)",
)
@click.option(
    "--output-dir", "-o",
    default="data/raw_oa",
    help="Output directory for downloaded data (default: data/raw_oa)",
)
@click.option(
    "--delay",
    default=1.0,
    type=float,
    help="Delay between API requests in seconds (default: 1.0)",
)
@click.option(
    "--verbose", "-v",
    is_flag=True,
    help="Verbose output",
)
def main(
    app_numbers: str | None,
    search: str | None,
    art_unit: str | None,
    max_results: int,
    output_dir: str,
    delay: float,
    verbose: bool,
) -> None:
    """Pull Office Actions from USPTO PEDS for benchmark construction.

    Downloaded data includes application metadata, document lists, and
    Office Action content where available.
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    client = USPTOPedsClient()

    try:
        applications = []

        if app_numbers:
            # Fetch specific applications
            numbers = [n.strip() for n in app_numbers.split(",")]
            for num in numbers:
                if verbose:
                    click.echo(f"Fetching application {num}...")
                results = client.search_applications(num, rows=1)
                applications.extend(results)
                time.sleep(delay)
        elif search:
            # Search by query
            if verbose:
                click.echo(f"Searching for: {search}")
            query = search
            if art_unit:
                query = f"{search} AND appGrpArtNumber:{art_unit}"
            applications = client.search_applications(query, rows=max_results)
        elif art_unit:
            # Search by art unit
            if verbose:
                click.echo(f"Searching art unit: {art_unit}")
            applications = client.search_applications(
                f"appGrpArtNumber:{art_unit}", rows=max_results
            )
        else:
            click.echo("Error: Specify --app-numbers, --search, or --art-unit", err=True)
            sys.exit(1)

        click.echo(f"Found {len(applications)} applications")

        # Fetch documents for each application
        all_data: list[dict] = []
        for i, app in enumerate(applications):
            if verbose:
                click.echo(
                    f"[{i+1}/{len(applications)}] {app.application_number}: {app.title}"
                )

            try:
                documents = client.get_documents(app.application_number)
            except Exception as exc:
                if verbose:
                    click.echo(f"  Error fetching documents: {exc}")
                documents = []

            # Filter for Office Actions
            oa_documents = [
                doc for doc in documents
                if any(
                    term in doc.get("mailRoomDate", "").lower() + doc.get("documentDescription", "").lower()
                    for term in ["office action", "rejection", "non-final", "final rejection"]
                )
            ]

            app_data = {
                "application_number": app.application_number,
                "filing_date": app.filing_date,
                "title": app.title,
                "applicant": app.applicant_name,
                "status": app.status,
                "examiner": app.examiner_name,
                "art_unit": app.art_unit,
                "entity_status": app.entity_status,
                "patent_number": app.patent_number,
                "total_documents": len(documents),
                "office_actions": len(oa_documents),
                "oa_documents": oa_documents[:10],  # Limit stored metadata
            }
            all_data.append(app_data)

            # Save individual application data
            app_file = output_path / f"{app.application_number}.json"
            with open(app_file, "w", encoding="utf-8") as f:
                json.dump(app_data, f, indent=2)

            if verbose:
                click.echo(
                    f"  Documents: {len(documents)} total, "
                    f"{len(oa_documents)} Office Actions"
                )

            time.sleep(delay)

        # Save summary
        summary_file = output_path / "pull_summary.json"
        summary = {
            "total_applications": len(all_data),
            "total_office_actions": sum(d["office_actions"] for d in all_data),
            "applications": [
                {
                    "number": d["application_number"],
                    "title": d["title"],
                    "oa_count": d["office_actions"],
                }
                for d in all_data
            ],
        }
        with open(summary_file, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)

        click.echo(f"\nSummary:")
        click.echo(f"  Applications: {len(all_data)}")
        click.echo(f"  Office Actions found: {summary['total_office_actions']}")
        click.echo(f"  Output: {output_path}")

    finally:
        client.close()


if __name__ == "__main__":
    main()
