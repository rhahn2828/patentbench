/**
 * Pull real patent prosecution data from USPTO ODP API.
 * Correct field mapping: eventDataBag, applicationMetaData.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'real_oa');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'uspto_peds_sample.jsonl');
const API_KEY = 'aqfzuzjwvqjzcrkjpklaqahuezhznl';

// Sequential app numbers that are likely to exist
const APP_RANGES = [
  { tc: 'TC_Mixed_1', desc: 'Mixed (16M series)', start: 16100000, count: 25 },
  { tc: 'TC_Mixed_2', desc: 'Mixed (16.5M series)', start: 16500000, count: 25 },
  { tc: 'TC_Mixed_3', desc: 'Mixed (17M series)', start: 17100000, count: 25 },
  { tc: 'TC_Mixed_4', desc: 'Mixed (17.5M series)', start: 17500000, count: 25 },
];

const OA_CODES = new Set(['CTNF', 'CTFR', 'CTFP', 'CTEQ', 'FOJR', 'MCTNF', 'MCTFR']);
const ALLOW_CODES = new Set(['NOA', 'CNOA', 'MCNOA']);
const ALL_RELEVANT = new Set([...OA_CODES, ...ALLOW_CODES, 'ELC', 'AMND', 'REM', 'ABN8', 'ABN9', 'N/AP', 'CTRS']);

function fetchApp(appNumber) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.uspto.gov',
      path: `/api/v1/patent/applications/${appNumber}`,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'X-API-Key': API_KEY },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) { resolve(null); return; }
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

function extractRecord(data, appNumber) {
  const bag = data?.patentFileWrapperDataBag?.[0];
  if (!bag) return null;

  const meta = bag.applicationMetaData || {};
  const events = bag.eventDataBag || [];

  const oaEvents = events
    .filter(e => ALL_RELEVANT.has(e.eventCode))
    .map(e => ({
      code: e.eventCode,
      description: e.eventDescriptionText || '',
      date: e.eventDate || '',
    }));

  const artUnit = meta.groupArtUnitNumber || '';
  let tc = 'Unknown';
  const auNum = parseInt(artUnit);
  if (auNum >= 1600 && auNum < 1700) tc = 'TC1600_Biotech';
  else if (auNum >= 1700 && auNum < 1800) tc = 'TC1700_Chemical';
  else if (auNum >= 2100 && auNum < 2200) tc = 'TC2100_Software';
  else if (auNum >= 2400 && auNum < 2500) tc = 'TC2400_Networking';
  else if (auNum >= 2600 && auNum < 2700) tc = 'TC2600_Communications';
  else if (auNum >= 2800 && auNum < 2900) tc = 'TC2800_Electrical';
  else if (auNum >= 3600 && auNum < 3700) tc = 'TC3600_Business';
  else if (auNum >= 3700 && auNum < 3800) tc = 'TC3700_Mechanical';
  else tc = `TC${Math.floor(auNum / 100) * 100}`;

  const tcDescs = {
    'TC1600_Biotech': 'Biotechnology / Organic Chemistry',
    'TC1700_Chemical': 'Chemical / Materials Engineering',
    'TC2100_Software': 'Computer Architecture / Software',
    'TC2400_Networking': 'Networking / Cryptography / Security',
    'TC2600_Communications': 'Communications',
    'TC2800_Electrical': 'Semiconductors / Electrical',
    'TC3600_Business': 'Transportation / Construction / eCommerce',
    'TC3700_Mechanical': 'Mechanical Engineering',
  };

  return {
    application_number: appNumber.toString(),
    patent_title: meta.inventionTitle || '',
    technology_center: tc,
    tc_description: tcDescs[tc] || tc,
    art_unit: artUnit,
    examiner_name: meta.examinerNameText || '',
    filing_date: meta.filingDate || '',
    status: meta.applicationStatusDescriptionText || meta.applicationStatusCode || '',
    patent_number: meta.patentNumber || '',
    app_type: meta.applicationTypeCategory || '',
    entity_status: meta.entityStatusData?.entityStatusCategory || '',
    num_prosecution_events: oaEvents.length,
    prosecution_events: oaEvents,
    has_office_action: oaEvents.some(e => OA_CODES.has(e.code)),
    has_allowance: oaEvents.some(e => ALLOW_CODES.has(e.code)),
    total_events_in_file: events.length,
    pulled_at: new Date().toISOString(),
  };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('='.repeat(60));
  console.log('PatentBench - USPTO ODP Real Data Pull (Final)');
  console.log('='.repeat(60));

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const allRecords = [];
  let queried = 0, found = 0;

  for (const range of APP_RANGES) {
    console.log(`\n--- ${range.desc} (${range.start} - ${range.start + range.count - 1}) ---`);

    for (let i = 0; i < range.count; i++) {
      const appNum = range.start + i;
      queried++;
      process.stdout.write(`  ${appNum}...`);

      const data = await fetchApp(appNum);
      if (!data || data.count === 0) {
        process.stdout.write(' skip\n');
        await sleep(250);
        continue;
      }

      const record = extractRecord(data, appNum);
      if (record) {
        allRecords.push(record);
        found++;
        const oaFlag = record.has_office_action ? ' [HAS OA]' : '';
        const allowFlag = record.has_allowance ? ' [ALLOWED]' : '';
        console.log(` ${record.art_unit} "${record.patent_title.substring(0, 40)}" ${record.num_prosecution_events}ev${oaFlag}${allowFlag}`);
      } else {
        console.log(' no data');
      }

      await sleep(350);
    }
  }

  // Write JSONL
  const lines = allRecords.map(r => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(OUTPUT_FILE, lines, 'utf-8');

  // Summary
  const withOA = allRecords.filter(r => r.has_office_action).length;
  const withAllow = allRecords.filter(r => r.has_allowance).length;

  console.log(`\n${'='.repeat(60)}`);
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Queried: ${queried} | Found: ${found}`);
  console.log(`With Office Actions: ${withOA} (${(withOA/found*100).toFixed(0)}%)`);
  console.log(`With Allowance: ${withAllow} (${(withAllow/found*100).toFixed(0)}%)`);
  console.log(`Output: ${OUTPUT_FILE}`);

  // TC breakdown
  const tcCounts = {};
  for (const r of allRecords) {
    if (!tcCounts[r.technology_center]) tcCounts[r.technology_center] = { total: 0, withOA: 0, withAllow: 0 };
    tcCounts[r.technology_center].total++;
    if (r.has_office_action) tcCounts[r.technology_center].withOA++;
    if (r.has_allowance) tcCounts[r.technology_center].withAllow++;
  }
  console.log('\nBy Technology Center:');
  for (const [tc, c] of Object.entries(tcCounts).sort((a,b) => b[1].total - a[1].total)) {
    console.log(`  ${tc}: ${c.total} apps, ${c.withOA} with OAs, ${c.withAllow} allowed`);
  }
}

main().catch(console.error);
