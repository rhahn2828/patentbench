/**
 * Create PatentBench test cases from real USPTO data.
 * Generates Tier 1-3 benchmark cases.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'real_oa');
const INPUT_FILE = path.join(DATA_DIR, 'uspto_peds_sample.jsonl');
const OUTPUT_FILE = path.join(DATA_DIR, 'benchmark_cases.jsonl');

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function createTier1Deadline(record, event) {
  const isFinal = ['CTFR', 'MCTFR'].includes(event.code);
  const deadline = addMonths(event.date, 3);
  if (!deadline) return null;

  return {
    case_id: `T1-DL-${record.application_number}-${event.code}-${event.date}`,
    tier: 1,
    task_type: 'deadline_computation',
    domain: 'administration',
    application_number: record.application_number,
    technology_center: record.technology_center,
    art_unit: record.art_unit,
    input: {
      instruction: 'What is the statutory response deadline for this Office Action? Include the maximum extension period.',
      office_action_type: isFinal ? 'Final' : 'Non-Final',
      mail_date: event.date,
      entity_status: record.entity_status || 'UNDISCOUNTED',
    },
    expected_output: {
      statutory_deadline: deadline,
      is_final: isFinal,
      extension_available: true,
      max_extension_months: 3,
      absolute_deadline: addMonths(event.date, 6),
    },
    evaluation: { type: 'deterministic', scoring: 'exact_match' },
  };
}

function createTier2Parse(record) {
  const oaCodes = new Set(['CTNF', 'CTFR', 'CTFP', 'CTEQ', 'FOJR', 'MCTNF', 'MCTFR']);
  const oaEvents = record.prosecution_events.filter(e => oaCodes.has(e.code));
  if (oaEvents.length === 0) return null;

  return {
    case_id: `T2-PARSE-${record.application_number}`,
    tier: 2,
    task_type: 'prosecution_history_parsing',
    domain: 'prosecution',
    application_number: record.application_number,
    technology_center: record.technology_center,
    art_unit: record.art_unit,
    input: {
      instruction: 'Parse this prosecution history. List all Office Actions with type (Non-Final/Final), date, and event code. Identify the current status.',
      prosecution_events: record.prosecution_events,
      patent_title: record.patent_title,
    },
    expected_output: {
      total_office_actions: oaEvents.length,
      office_actions: oaEvents.map(e => ({
        type: ['CTFR', 'MCTFR'].includes(e.code) ? 'Final' : 'Non-Final',
        code: e.code,
        date: e.date,
      })),
      has_allowance: record.has_allowance,
      final_status: record.status,
    },
    evaluation: { type: 'deterministic', scoring: 'f1_events' },
  };
}

function createTier2Examiner(record) {
  if (!record.examiner_name) return null;

  return {
    case_id: `T2-EXAM-${record.application_number}`,
    tier: 2,
    task_type: 'examiner_extraction',
    domain: 'analytics',
    application_number: record.application_number,
    technology_center: record.technology_center,
    art_unit: record.art_unit,
    input: {
      instruction: 'Identify the examiner, art unit, and technology center for this patent application.',
      application_number: record.application_number,
      patent_title: record.patent_title,
    },
    expected_output: {
      examiner_name: record.examiner_name,
      art_unit: record.art_unit,
      technology_center: record.technology_center,
    },
    evaluation: { type: 'deterministic', scoring: 'exact_match_fields' },
  };
}

function createTier3Strategy(record) {
  if (!record.has_office_action) return null;
  const events = record.prosecution_events;
  const oaCount = events.filter(e => ['CTNF', 'CTFR', 'MCTNF', 'MCTFR'].includes(e.code)).length;
  const hasFinal = events.some(e => ['CTFR', 'MCTFR'].includes(e.code));

  return {
    case_id: `T3-STRAT-${record.application_number}`,
    tier: 3,
    task_type: 'prosecution_strategy',
    domain: 'prosecution',
    application_number: record.application_number,
    technology_center: record.technology_center,
    art_unit: record.art_unit,
    input: {
      instruction: 'Based on this prosecution history, what is the current stage of prosecution? What are the available response options? Recommend next steps.',
      patent_title: record.patent_title,
      prosecution_events: events,
      has_final_rejection: hasFinal,
      total_oa_count: oaCount,
      current_status: record.status,
      was_allowed: record.has_allowance,
    },
    expected_output: {
      prosecution_stage: record.has_allowance ? 'Allowed' : (hasFinal ? 'Post-Final' : 'Active'),
      available_options: hasFinal
        ? ['After-Final Amendment', 'RCE', 'Appeal', 'Abandon']
        : ['Amend Claims', 'Argue Rejections', 'Interview Examiner', 'Abandon'],
      outcome: record.has_allowance ? 'Patent Granted' : 'Pending',
    },
    evaluation: { type: 'hybrid', deterministic_fields: ['prosecution_stage'], llm_judge_fields: ['strategy_quality'] },
  };
}

function createTier1EntityFee(record) {
  if (!record.entity_status) return null;

  const fees = {
    'UNDISCOUNTED': { issue: 1200, search: 700, examination: 800, total: 2700 },
    'SMALL': { issue: 600, search: 350, examination: 400, total: 1350 },
    'MICRO': { issue: 300, search: 175, examination: 200, total: 675 },
  };
  const entity = record.entity_status.toUpperCase().includes('MICRO') ? 'MICRO'
    : record.entity_status.toUpperCase().includes('SMALL') ? 'SMALL' : 'UNDISCOUNTED';

  return {
    case_id: `T1-FEE-${record.application_number}`,
    tier: 1,
    task_type: 'fee_computation',
    domain: 'administration',
    application_number: record.application_number,
    technology_center: record.technology_center,
    art_unit: record.art_unit,
    input: {
      instruction: 'Calculate the standard USPTO filing fees for this application based on its entity status.',
      entity_status: record.entity_status,
      app_type: record.app_type,
    },
    expected_output: {
      entity_category: entity,
      fee_schedule: fees[entity],
    },
    evaluation: { type: 'deterministic', scoring: 'exact_match' },
  };
}

function main() {
  const lines = fs.readFileSync(INPUT_FILE, 'utf-8').trim().split('\n');
  const records = lines.map(l => JSON.parse(l));
  console.log(`Loaded ${records.length} records`);

  const cases = [];

  for (const record of records) {
    // Tier 1: Deadline per OA event
    for (const event of record.prosecution_events) {
      if (['CTNF', 'CTFR', 'MCTNF', 'MCTFR', 'FOJR'].includes(event.code)) {
        const c = createTier1Deadline(record, event);
        if (c) cases.push(c);
      }
    }

    // Tier 1: Fee computation
    const fee = createTier1EntityFee(record);
    if (fee) cases.push(fee);

    // Tier 2: Prosecution history parsing
    const parse = createTier2Parse(record);
    if (parse) cases.push(parse);

    // Tier 2: Examiner extraction
    const exam = createTier2Examiner(record);
    if (exam) cases.push(exam);

    // Tier 3: Strategy
    const strat = createTier3Strategy(record);
    if (strat) cases.push(strat);
  }

  // Write
  fs.writeFileSync(OUTPUT_FILE, cases.map(c => JSON.stringify(c)).join('\n') + '\n', 'utf-8');

  // Summary
  const tierCounts = {};
  const typeCounts = {};
  const tcCounts = {};
  for (const c of cases) {
    tierCounts[c.tier] = (tierCounts[c.tier] || 0) + 1;
    typeCounts[c.task_type] = (typeCounts[c.task_type] || 0) + 1;
    tcCounts[c.technology_center] = (tcCounts[c.technology_center] || 0) + 1;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`BENCHMARK CASES GENERATED: ${cases.length}`);
  console.log('='.repeat(60));
  console.log('\nBy Tier:');
  Object.entries(tierCounts).sort().forEach(([t, c]) => console.log(`  Tier ${t}: ${c}`));
  console.log('\nBy Task Type:');
  Object.entries(typeCounts).sort().forEach(([t, c]) => console.log(`  ${t}: ${c}`));
  console.log('\nBy Technology Center:');
  Object.entries(tcCounts).sort((a,b) => b[1]-a[1]).forEach(([t, c]) => console.log(`  ${t}: ${c}`));
  console.log(`\nOutput: ${OUTPUT_FILE}`);
}

main();
