"use client";

import React, { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface Competitor {
  name: string;
  funding: string;
  logo: string;
  tagline: string;
}

interface DomainCard {
  id: string;
  title: string;
  icon: string;
  testCases: number;
  keyMetrics: string[];
  color: string;
}

interface DifficultyTier {
  tier: number;
  label: string;
  description: string;
  expectedAI: string;
  color: string;
  bgColor: string;
}

interface LeaderboardRow {
  rank: number;
  model: string;
  badge: string;
  overall: number;
  administration: number;
  drafting: number;
  prosecution: number;
  analytics: number;
  priorArt: number;
}

interface Pillar {
  title: string;
  description: string;
  icon: string;
}

interface EvalLayer {
  layer: number;
  name: string;
  description: string;
  tools: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

// ─── Data ───────────────────────────────────────────────────────────────────────

const competitors: Competitor[] = [
  {
    name: "IPRally",
    funding: "$28M",
    logo: "\u{1F50D}",
    tagline: "Prior art search",
  },
  {
    name: "PatSnap",
    funding: "$400M+",
    logo: "\u{1F4CA}",
    tagline: "Patent analytics",
  },
  {
    name: "Specifio",
    funding: "$7M",
    logo: "\u{1F4DD}",
    tagline: "Claim drafting",
  },
  {
    name: "TurboPatent",
    funding: "$14M",
    logo: "\u{26A1}",
    tagline: "Patent drafting",
  },
  {
    name: "Rowan",
    funding: "$12M",
    logo: "\u{1F333}",
    tagline: "Prosecution",
  },
  {
    name: "PowerPatent",
    funding: "$5M",
    logo: "\u{1F4A1}",
    tagline: "AI drafting",
  },
];

const domains: DomainCard[] = [
  {
    id: "admin",
    title: "Administration",
    icon: "\u{1F4CB}",
    testCases: 120,
    keyMetrics: [
      "Deadline calculation accuracy",
      "Entity status detection",
      "Fee schedule lookups",
      "Docketing correctness",
    ],
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "drafting",
    title: "Drafting",
    icon: "\u{270F}\u{FE0F}",
    testCases: 180,
    keyMetrics: [
      "Claim scope breadth",
      "Specification enablement",
      "Antecedent basis",
      "Dependent claim narrowing",
    ],
    color: "from-purple-500 to-purple-600",
  },
  {
    id: "prosecution",
    title: "Prosecution",
    icon: "\u{2696}\u{FE0F}",
    testCases: 250,
    keyMetrics: [
      "Rejection analysis accuracy",
      "Amendment quality",
      "Argument persuasiveness",
      "Interview summary generation",
    ],
    color: "from-amber-500 to-amber-600",
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: "\u{1F4C8}",
    testCases: 150,
    keyMetrics: [
      "Landscape accuracy",
      "Freedom-to-operate analysis",
      "Portfolio valuation",
      "Competitive intelligence",
    ],
    color: "from-emerald-500 to-emerald-600",
  },
  {
    id: "prior-art",
    title: "Prior Art",
    icon: "\u{1F50E}",
    testCases: 100,
    keyMetrics: [
      "Reference relevance (nDCG@10)",
      "Anticipation detection",
      "Obviousness combination",
      "Non-patent literature recall",
    ],
    color: "from-rose-500 to-rose-600",
  },
];

const tiers: DifficultyTier[] = [
  {
    tier: 1,
    label: "Admin",
    description:
      "Deadline math, entity status, fee lookups. Objective, verifiable answers.",
    expectedAI: "90-95%",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/30",
  },
  {
    tier: 2,
    label: "Associate",
    description:
      "IDS review, formality checks, basic claim amendments under instruction.",
    expectedAI: "75-85%",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/30",
  },
  {
    tier: 3,
    label: "Senior Associate",
    description:
      "Office action responses, prior art analysis, claim strategy recommendations.",
    expectedAI: "55-70%",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/30",
  },
  {
    tier: 4,
    label: "Counsel",
    description:
      "Multi-reference obviousness arguments, claim construction, appeal briefs.",
    expectedAI: "30-50%",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10 border-orange-500/30",
  },
  {
    tier: 5,
    label: "Partner-Level",
    description:
      "Portfolio strategy, IPR defense, licensing analysis, prosecution-wide judgment.",
    expectedAI: "10-25%",
    color: "text-rose-400",
    bgColor: "bg-rose-500/10 border-rose-500/30",
  },
];

const leaderboard: LeaderboardRow[] = [
  {
    rank: 1,
    model: "ABIGAIL v3",
    badge: "Patent-Specialized",
    overall: 78.4,
    administration: 94.2,
    drafting: 72.1,
    prosecution: 81.3,
    analytics: 69.8,
    priorArt: 74.6,
  },
  {
    rank: 2,
    model: "Claude 3.5 Sonnet",
    badge: "General LLM",
    overall: 64.7,
    administration: 88.1,
    drafting: 58.3,
    prosecution: 62.9,
    analytics: 61.2,
    priorArt: 53.0,
  },
  {
    rank: 3,
    model: "GPT-5",
    badge: "General LLM",
    overall: 62.1,
    administration: 86.5,
    drafting: 55.7,
    prosecution: 60.1,
    analytics: 58.9,
    priorArt: 49.3,
  },
  {
    rank: 4,
    model: "Gemini 2.5 Pro",
    badge: "General LLM",
    overall: 59.8,
    administration: 84.3,
    drafting: 52.4,
    prosecution: 57.6,
    analytics: 56.1,
    priorArt: 48.6,
  },
];

const pillars: Pillar[] = [
  {
    title: "Open Test Cases",
    description:
      "Every test case, rubric, and expected answer published on HuggingFace under CC-BY-SA 4.0.",
    icon: "\u{1F4C2}",
  },
  {
    title: "Reproducible Scoring",
    description:
      "Deterministic evaluation pipeline. Run it yourself. Get the same numbers.",
    icon: "\u{1F504}",
  },
  {
    title: "Attorney-Validated Rubrics",
    description:
      "Every rubric reviewed by 3+ registered patent practitioners with 10+ years experience.",
    icon: "\u{2696}\u{FE0F}",
  },
  {
    title: "Multi-Judge Agreement",
    description:
      "Automated LLM judges calibrated against human experts. Inter-rater reliability reported for every score.",
    icon: "\u{1F46B}",
  },
  {
    title: "Version-Controlled Updates",
    description:
      "Monthly releases. Changelog for every test case addition, modification, or retirement.",
    icon: "\u{1F4C5}",
  },
];

const evalLayers: EvalLayer[] = [
  {
    layer: 1,
    name: "Factual Accuracy",
    description:
      "Hard facts: deadlines, fee amounts, statutory citations, claim counts. Binary correct/incorrect.",
    tools: "Deterministic checkers, regex validators",
  },
  {
    layer: 2,
    name: "Structural Compliance",
    description:
      "Document format, required sections present, proper claim dependency chains, antecedent basis.",
    tools: "Schema validators, patent-specific linters",
  },
  {
    layer: 3,
    name: "Substantive Quality",
    description:
      "Argument strength, claim scope optimization, prior art relevance ranking, strategic soundness.",
    tools: "Calibrated LLM judges (3-model panel)",
  },
  {
    layer: 4,
    name: "Expert Concordance",
    description:
      "Agreement with practicing patent attorney gold-standard responses on the hardest tasks.",
    tools: "Human expert panel, Cohen's kappa scoring",
  },
];

const faqs: FAQItem[] = [
  {
    question: "Why should I trust a benchmark created by a patent AI company?",
    answer:
      "You shouldn't trust us blindly -- that's exactly the point. Every test case, rubric, and scoring function is published openly. Run the benchmark yourself. Audit the rubrics. Propose changes via pull request. The Glass Box Standard means we can't hide behind cherry-picked demos.",
  },
  {
    question: "How do you prevent data contamination?",
    answer:
      "Test cases are derived from real USPTO Office Actions but transformed with synthetic modifications to prevent memorization. We also maintain a held-out test set that is never published, used to verify that public-set performance generalizes.",
  },
  {
    question: "Can I submit my own AI system for evaluation?",
    answer:
      "Yes. We provide a standardized API interface. Submit your system's endpoint and we run the full benchmark suite. Results are published on the leaderboard with your permission. Self-reported scores are accepted but flagged as unverified.",
  },
  {
    question: "How are the LLM judges calibrated?",
    answer:
      "Each LLM judge is calibrated against a panel of 5 patent attorneys on 200 gold-standard responses. We report Cohen's kappa for every domain. Judges that fall below 0.7 agreement are retrained or replaced.",
  },
  {
    question: "What technology areas do the test cases cover?",
    answer:
      "The initial release covers software (CPC G06), mechanical (F16), biotech (C12), electrical (H01), and chemical (C07) inventions. Each domain includes test cases from all five technology areas.",
  },
  {
    question:
      "How is this different from legal benchmarks like LegalBench or LawBench?",
    answer:
      "Those benchmarks test general legal reasoning. PatentBench tests the specific, technical skills patent practitioners use daily: claim drafting, Office Action response, prior art search, deadline management. The tasks mirror real workflow, not law school exams.",
  },
];

// ─── Helper Components ──────────────────────────────────────────────────────────

function ScoreCell({ score }: { score: number }) {
  const color =
    score >= 85
      ? "text-emerald-400"
      : score >= 70
        ? "text-blue-400"
        : score >= 55
          ? "text-amber-400"
          : "text-rose-400";
  return <span className={`font-mono font-bold ${color}`}>{score.toFixed(1)}</span>;
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center mb-16">
      <p className="text-sm font-semibold tracking-widest uppercase text-indigo-400 mb-3">
        {eyebrow}
      </p>
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>
      {subtitle && (
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">{subtitle}</p>
      )}
    </div>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────────

export default function PatentBenchPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold">
              PB
            </div>
            <span className="text-lg font-bold">PatentBench</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#problem" className="hover:text-white transition-colors">
              The Problem
            </a>
            <a href="#domains" className="hover:text-white transition-colors">
              Domains
            </a>
            <a href="#leaderboard" className="hover:text-white transition-colors">
              Leaderboard
            </a>
            <a href="#methodology" className="hover:text-white transition-colors">
              Methodology
            </a>
            <a href="#involved" className="hover:text-white transition-colors">
              Get Involved
            </a>
          </div>
          <a
            href="https://github.com/abigail-ai/patentbench"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
          >
            GitHub
          </a>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            v1.0 launching Q2 2026
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Patent
            </span>
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Bench
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 font-medium mb-4">
            The First Reproducible Benchmark for Patent Prosecution AI
          </p>

          <p className="text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            800+ test cases. 5 domains. 5 difficulty tiers. Open rubrics validated by
            registered patent attorneys. No more black-box claims -- just transparent,
            reproducible measurement of what patent AI can actually do.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://github.com/abigail-ai/patentbench"
              className="px-6 py-3 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              View on GitHub
            </a>
            <a
              href="#paper"
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors"
            >
              Read the Paper
            </a>
            <a
              href="#leaderboard"
              className="px-6 py-3 rounded-xl border border-gray-700 text-gray-300 font-semibold hover:bg-gray-800 hover:text-white transition-colors"
            >
              Explore Results
            </a>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { value: "800+", label: "Test Cases" },
              { value: "5", label: "Domains" },
              { value: "5", label: "Difficulty Tiers" },
              { value: "15+", label: "Attorney Reviewers" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Problem ────────────────────────────────────────────────────── */}
      <section id="problem" className="py-24 px-6 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="The Problem"
            title="The Transparency Vacuum"
            subtitle="Hundreds of millions in funding. Zero published benchmarks. Every patent AI vendor asks you to trust their demos."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitors.map((c) => (
              <div
                key={c.name}
                className="relative group rounded-2xl border border-gray-800 bg-gray-900/80 p-6 hover:border-gray-700 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{c.logo}</span>
                  <div>
                    <h3 className="font-semibold text-white">{c.name}</h3>
                    <p className="text-xs text-gray-500">{c.tagline}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Funding
                    </p>
                    <p className="text-lg font-bold text-emerald-400">{c.funding}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Published Benchmarks
                    </p>
                    <p className="text-lg font-bold text-rose-400">Zero</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border border-indigo-500/20">
              <span className="text-2xl">\u{1F4A1}</span>
              <p className="text-gray-300">
                <span className="font-semibold text-white">PatentBench</span> exists
                because the industry won&apos;t benchmark itself.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What PatentBench Measures ──────────────────────────────────────── */}
      <section id="domains" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="Coverage"
            title="What PatentBench Measures"
            subtitle="Five domains spanning the full patent prosecution lifecycle, from filing to issuance."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {domains.map((d) => (
              <div
                key={d.id}
                className="group relative rounded-2xl border border-gray-800 bg-gray-900/60 p-6 hover:border-gray-700 transition-all overflow-hidden"
              >
                {/* Gradient accent */}
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${d.color} opacity-60 group-hover:opacity-100 transition-opacity`}
                />

                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{d.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">{d.title}</h3>
                    <p className="text-sm text-gray-500">
                      {d.testCases} test cases
                    </p>
                  </div>
                </div>

                <ul className="space-y-2">
                  {d.keyMetrics.map((m) => (
                    <li
                      key={m}
                      className="flex items-start gap-2 text-sm text-gray-400"
                    >
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Total card */}
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-600/5 p-6 flex flex-col items-center justify-center text-center">
              <p className="text-5xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                800+
              </p>
              <p className="text-gray-400 mt-2">
                Total test cases across all domains
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Growing to 7,200 by end of 2026
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Difficulty Tiers ───────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gray-900/50">
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            eyebrow="Difficulty"
            title="Five Tiers of Complexity"
            subtitle="From administrative lookups to partner-level strategic judgment. Where does AI actually fall off?"
          />

          <div className="space-y-4">
            {tiers.map((t) => (
              <div
                key={t.tier}
                className={`flex flex-col md:flex-row md:items-center gap-4 md:gap-8 rounded-2xl border p-6 ${t.bgColor}`}
              >
                <div className="flex items-center gap-4 md:w-56 flex-shrink-0">
                  <div
                    className={`text-3xl font-extrabold ${t.color} opacity-80`}
                  >
                    T{t.tier}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{t.label}</h3>
                    <p className="text-xs text-gray-500">Tier {t.tier}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-400 flex-1">{t.description}</p>
                <div className="md:w-40 flex-shrink-0 text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Expected AI Score
                  </p>
                  <p className={`text-xl font-bold ${t.color}`}>
                    {t.expectedAI}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Leaderboard ────────────────────────────────────────────────────── */}
      <section id="leaderboard" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="Results"
            title="Leaderboard"
            subtitle="Preliminary scores from the PatentBench v0.9 preview. Official v1.0 scores publishing Q2 2026."
          />

          <div className="rounded-2xl border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900/80 border-b border-gray-800">
                    <th className="px-6 py-4 text-left text-gray-400 font-medium">
                      #
                    </th>
                    <th className="px-6 py-4 text-left text-gray-400 font-medium">
                      Model
                    </th>
                    <th className="px-6 py-4 text-center text-gray-400 font-medium">
                      Overall
                    </th>
                    <th className="px-6 py-4 text-center text-gray-400 font-medium">
                      Admin
                    </th>
                    <th className="px-6 py-4 text-center text-gray-400 font-medium">
                      Drafting
                    </th>
                    <th className="px-6 py-4 text-center text-gray-400 font-medium">
                      Prosecution
                    </th>
                    <th className="px-6 py-4 text-center text-gray-400 font-medium">
                      Analytics
                    </th>
                    <th className="px-6 py-4 text-center text-gray-400 font-medium">
                      Prior Art
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row) => (
                    <tr
                      key={row.model}
                      className={`border-b border-gray-800/50 hover:bg-gray-900/40 transition-colors ${
                        row.rank === 1 ? "bg-indigo-600/5" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span
                          className={`font-bold ${
                            row.rank === 1
                              ? "text-amber-400"
                              : row.rank === 2
                                ? "text-gray-300"
                                : row.rank === 3
                                  ? "text-orange-400"
                                  : "text-gray-500"
                          }`}
                        >
                          {row.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-semibold text-white">
                            {row.model}
                          </span>
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                            {row.badge}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-white">
                          {row.overall.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <ScoreCell score={row.administration} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <ScoreCell score={row.drafting} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <ScoreCell score={row.prosecution} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <ScoreCell score={row.analytics} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <ScoreCell score={row.priorArt} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 bg-gray-900/40 border-t border-gray-800/50 text-xs text-gray-500 text-center">
              Scores are preliminary (v0.9 preview). Evaluated on 800 test cases
              across 5 domains. Higher is better. Updated monthly.
            </div>
          </div>
        </div>
      </section>

      {/* ── Glass Box Standard ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="Principles"
            title="The Glass Box Standard"
            subtitle="Five pillars that make PatentBench the most transparent AI benchmark in legal tech."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 hover:border-indigo-500/30 transition-colors"
              >
                <span className="text-3xl mb-4 block">{p.icon}</span>
                <h3 className="text-lg font-bold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {p.description}
                </p>
              </div>
            ))}

            {/* Bonus card */}
            <div className="rounded-2xl border border-dashed border-gray-700 bg-transparent p-6 flex flex-col items-center justify-center text-center">
              <p className="text-gray-500 text-sm">
                Think we&apos;re missing a pillar?
              </p>
              <a
                href="https://github.com/abigail-ai/patentbench/issues"
                className="mt-2 text-indigo-400 text-sm font-medium hover:text-indigo-300 transition-colors"
              >
                Open an issue on GitHub &rarr;
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Methodology ────────────────────────────────────────────────────── */}
      <section id="methodology" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            eyebrow="How It Works"
            title="4-Layer Evaluation Architecture"
            subtitle="From objective fact-checking to expert concordance. Each layer adds nuance."
          />

          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500 via-purple-500 to-rose-500 opacity-30 hidden md:block" />

            <div className="space-y-8">
              {evalLayers.map((l) => (
                <div key={l.layer} className="flex gap-6 md:gap-8">
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center">
                    <span className="text-xl font-bold text-indigo-400">
                      L{l.layer}
                    </span>
                  </div>
                  <div className="flex-1 rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
                    <h3 className="text-lg font-bold text-white mb-1">
                      {l.name}
                    </h3>
                    <p className="text-sm text-gray-400 mb-3">{l.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">Tools:</span>
                      <span className="text-xs px-2 py-1 rounded-lg bg-gray-800 text-gray-400">
                        {l.tools}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Get Involved ───────────────────────────────────────────────────── */}
      <section id="involved" className="py-24 px-6 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="Contribute"
            title="Get Involved"
            subtitle="PatentBench is a community effort. Here's how you can help."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Attorneys */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-8 hover:border-emerald-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-2xl mb-4">
                \u{2696}\u{FE0F}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Patent Attorneys
              </h3>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Contribute test cases from your practice. Review and validate
                rubrics. Your expertise is the gold standard that makes this
                benchmark credible.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Submit anonymized Office Action examples
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Validate scoring rubrics
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Serve on the expert review panel
                </li>
              </ul>
            </div>

            {/* Researchers */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-8 hover:border-indigo-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-2xl mb-4">
                \u{1F52C}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                AI Researchers
              </h3>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Use PatentBench as a testbed for legal AI research. The dataset is
                available on HuggingFace. Cite it, extend it, challenge it.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Download from HuggingFace
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Benchmark your models
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Propose new evaluation metrics
                </li>
              </ul>
            </div>

            {/* Vendors */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-8 hover:border-purple-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-2xl mb-4">
                \u{1F3E2}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Patent AI Vendors
              </h3>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Submit your system for independent evaluation. Transparent results
                build buyer trust. Stand out by proving your claims with data.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Submit API endpoint for evaluation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Get listed on the leaderboard
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Display a &quot;PatentBench Verified&quot; badge
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <SectionHeading
            eyebrow="FAQ"
            title="Frequently Asked Questions"
          />

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-800 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-900/40 transition-colors"
                >
                  <span className="font-medium text-white pr-4">
                    {faq.question}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-gray-400 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gradient-to-b from-gray-900/50 to-gray-950">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to see how patent AI{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              really
            </span>{" "}
            performs?
          </h2>
          <p className="text-gray-400 mb-8">
            Get notified when PatentBench v1.0 launches. Be the first to see the
            full results.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              // TODO: integrate with email service
              alert(`Thanks! We'll notify ${email} at launch.`);
              setEmail("");
            }}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@lawfirm.com"
              required
              className="flex-1 px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors whitespace-nowrap"
            >
              Notify Me
            </button>
          </form>

          <p className="text-xs text-gray-600 mt-4">
            No spam. One email at launch. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800/50 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold">
              PB
            </div>
            <span className="text-sm text-gray-400">
              PatentBench &mdash; by{" "}
              <a
                href="https://abigail.app"
                className="text-indigo-400 hover:text-indigo-300"
              >
                ABIGAIL
              </a>
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-white transition-colors">
              GitHub
            </a>
            <a href="#" className="hover:text-white transition-colors">
              HuggingFace
            </a>
            <a href="#" className="hover:text-white transition-colors">
              arXiv
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
          <p className="text-xs text-gray-600">
            CC-BY-SA 4.0 &mdash; 2026 ABIGAIL AI, Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}
