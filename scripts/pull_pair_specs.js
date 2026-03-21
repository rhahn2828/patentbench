/**
 * pull_pair_specs.js
 * Downloads published application text from USPTO for 5 patent applications.
 *
 * Strategy:
 *   1. Hit ODP API to get metadata including XML file URIs and pub numbers
 *   2. Download the actual XML full-text files from USPTO bulk data
 *   3. Parse XML to extract abstract, description, and claims
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { XMLParser } = (() => {
  try { return require('fast-xml-parser'); } catch { return { XMLParser: null }; }
})();

const APPS = [
  { number: '17100019', title: 'SYSTEM AND METHOD FOR ANALYSIS OF STRUCTURED AND UNSTRUCTURED DATA' },
  { number: '16100020', title: 'Stabilized Formulations Containing Anti-IL-6R Antibodies' },
  { number: '16100001', title: 'ROLLABLE DISPLAY DEVICE AND ELECTRONIC DEVICE' },
  { number: '16100006', title: 'SUPRAGLOTTIC AIRWAY DEVICE' },
  { number: '16100010', title: 'PROCESSES AND APPARATUSES FOR METHYLATION OF AROMATICS' },
];

const ODP_API_KEY = 'aqfzuzjwvqjzcrkjpklaqahuezhznl';
const OUTPUT_PATH = path.join('C:', 'Users', 'User', 'PatentBench', 'data', 'real_oa', 'specifications.jsonl');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const mod = parsedUrl.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'PatentBench/1.0',
        'Accept': options.accept || 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = mod.request(reqOptions, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log(`  Redirect ${res.statusCode} -> ${res.headers.location}`);
        fetch(res.headers.location, options).then(resolve).catch(reject);
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => { chunks.push(chunk); });
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(new Error('timeout')); });
    if (options.body) req.write(options.body);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Step 1: Get metadata from ODP including XML URIs and pub numbers
async function getOdpMetadata(appNumber) {
  const url = `https://api.uspto.gov/api/v1/patent/applications/${appNumber}`;
  try {
    const resp = await fetch(url, {
      headers: { 'X-API-Key': ODP_API_KEY }
    });
    if (resp.status === 200) {
      const data = JSON.parse(resp.body);
      const bag = data.patentFileWrapperDataBag?.[0];
      if (!bag) return null;

      const meta = bag.applicationMetaData || {};
      const pgpub = bag.pgpubDocumentMetaData || {};
      const grant = bag.grantDocumentMetaData || {};

      return {
        appNumber,
        title: meta.inventionTitle,
        pubNumber: meta.earliestPublicationNumber,  // e.g. US20210089589A1
        patentNumber: meta.patentNumber,
        // XML file locations for published app and grant
        pgpubXmlUri: pgpub.fileLocationURI ? `${pgpub.fileLocationURI}${pgpub.xmlFileName}` : null,
        grantXmlUri: grant.fileLocationURI ? `${grant.fileLocationURI}${grant.xmlFileName}` : null,
        pgpubXmlFile: pgpub.xmlFileName,
        grantXmlFile: grant.xmlFileName,
      };
    }
  } catch (e) {
    console.log(`  ODP metadata error: ${e.message}`);
  }
  return null;
}

// Step 2: Download XML full text from USPTO bulk data
async function downloadXml(xmlUri, apiKey) {
  if (!xmlUri) return null;
  console.log(`  Downloading XML: ${xmlUri}`);
  try {
    const resp = await fetch(xmlUri, {
      headers: { 'X-API-Key': apiKey },
      accept: 'application/xml',
    });
    console.log(`  XML status: ${resp.status}, length: ${resp.body.length}`);
    if (resp.status === 200 && resp.body.length > 100) {
      return resp.body;
    }
    if (resp.body.length < 500) {
      console.log(`  XML body preview: ${resp.body.substring(0, 300)}`);
    }
  } catch (e) {
    console.log(`  XML download error: ${e.message}`);
  }
  return null;
}

// Step 3: Parse patent XML (both pgpub and grant formats)
function parsePatentXml(xmlText) {
  const result = {
    abstract: null,
    description_paragraphs: [],
    claims: [],
  };

  if (!xmlText) return result;

  // --- Abstract ---
  // Match <abstract ...>...</abstract>
  const absMatch = xmlText.match(/<abstract[^>]*>([\s\S]*?)<\/abstract>/i);
  if (absMatch) {
    let absText = absMatch[1];
    // Remove XML tags, keep text
    absText = absText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    result.abstract = absText;
  }

  // --- Description ---
  // Match <description ...>...</description>
  const descMatch = xmlText.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
  if (descMatch) {
    const descText = descMatch[1];
    // Extract paragraphs: <p id="..." num="XXXX">...</p>
    const pMatches = descText.match(/<p\s[^>]*>([\s\S]*?)<\/p>/gi) || [];
    for (const p of pMatches) {
      // Get paragraph number
      const numMatch = p.match(/num="(\d+)"/);
      const paraNum = numMatch ? numMatch[1] : null;
      // Get text content
      let text = p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 0) {
        if (paraNum) {
          result.description_paragraphs.push(`[${paraNum.padStart(4, '0')}] ${text}`);
        } else {
          result.description_paragraphs.push(text);
        }
      }
    }
  }

  // --- Claims ---
  // Match <claims ...>...</claims> or <us-claim-statement> patterns
  const claimsMatch = xmlText.match(/<claims[^>]*>([\s\S]*?)<\/claims>/i);
  if (claimsMatch) {
    const claimsText = claimsMatch[1];
    // Individual claims: <claim id="..." num="X">...</claim>
    const claimMatches = claimsText.match(/<claim\s[^>]*>([\s\S]*?)<\/claim>/gi) || [];
    for (const c of claimMatches) {
      const numMatch = c.match(/num="(\d+)"/);
      const claimNum = numMatch ? numMatch[1] : null;
      let text = c.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 0) {
        if (claimNum && !text.startsWith(claimNum + '.')) {
          result.claims.push(`${claimNum}. ${text}`);
        } else {
          result.claims.push(text);
        }
      }
    }
  }

  return result;
}

// Alternative: Try fetching from Google Patents
async function tryGooglePatents(pubNumber) {
  if (!pubNumber) return null;
  const url = `https://patents.google.com/patent/${pubNumber}/en`;
  try {
    console.log(`  Google Patents: ${url}`);
    const resp = await fetch(url, { accept: 'text/html' });
    console.log(`  Google Patents status: ${resp.status}, length: ${resp.body.length}`);
    if (resp.status === 200 && resp.body.length > 5000) {
      return parseGooglePatentsHtml(resp.body);
    }
  } catch (e) {
    console.log(`  Google Patents error: ${e.message}`);
  }
  return null;
}

function parseGooglePatentsHtml(html) {
  const result = { abstract: null, description_paragraphs: [], claims: [] };

  // Abstract
  const absMatch = html.match(/<section\s+itemprop="abstract"[^>]*>([\s\S]*?)<\/section>/i);
  if (absMatch) {
    result.abstract = absMatch[1].replace(/<[^>]+>/g, ' ').replace(/Abstract/i, '').replace(/\s+/g, ' ').trim();
  }

  // Description
  const descMatch = html.match(/<section\s+itemprop="description"[^>]*>([\s\S]*?)<\/section>/i);
  if (descMatch) {
    // Look for description-paragraph divs
    const paraDivs = descMatch[1].match(/<div[^>]*>([\s\S]*?)<\/div>/gi) || [];
    for (const d of paraDivs) {
      const text = d.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 5) result.description_paragraphs.push(text);
    }
    // Fallback to p tags
    if (result.description_paragraphs.length === 0) {
      const pTags = descMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
      for (const p of pTags) {
        const text = p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text.length > 5) result.description_paragraphs.push(text);
      }
    }
  }

  // Claims
  const claimsMatch = html.match(/<section\s+itemprop="claims"[^>]*>([\s\S]*?)<\/section>/i);
  if (claimsMatch) {
    const claimDivs = claimsMatch[1].match(/<div[^>]*class="claim[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="claim|$)/gi) || [];
    for (const c of claimDivs) {
      const text = c.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 5) result.claims.push(text);
    }
    // Fallback
    if (result.claims.length === 0) {
      const text = claimsMatch[1].replace(/<[^>]+>/g, '\n');
      const claimSplits = text.split(/\n\s*(?=\d+\.\s)/).filter(c => /^\d+\./.test(c.trim()));
      result.claims = claimSplits.map(c => c.trim());
    }
  }

  return result;
}

async function processApp(app) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Processing: ${app.number} - ${app.title}`);
  console.log('='.repeat(70));

  // Step 1: Get metadata
  const meta = await getOdpMetadata(app.number);
  if (meta) {
    console.log(`  Title: ${meta.title}`);
    console.log(`  Pub Number: ${meta.pubNumber}`);
    console.log(`  Patent Number: ${meta.patentNumber}`);
    console.log(`  PGPub XML URI: ${meta.pgpubXmlUri}`);
    console.log(`  Grant XML URI: ${meta.grantXmlUri}`);
  } else {
    console.log(`  No ODP metadata found`);
  }

  await sleep(500);

  let result = { abstract: null, description_paragraphs: [], claims: [] };

  // Step 2: Try downloading pgpub XML (published application)
  if (meta?.pgpubXmlUri) {
    const xml = await downloadXml(meta.pgpubXmlUri, ODP_API_KEY);
    if (xml) {
      result = parsePatentXml(xml);
      console.log(`  PGPub XML: abs=${!!result.abstract}, desc=${result.description_paragraphs.length}, claims=${result.claims.length}`);
    }
    await sleep(500);
  }

  // Step 3: If pgpub didn't work, try grant XML
  if (result.description_paragraphs.length === 0 && meta?.grantXmlUri) {
    const xml = await downloadXml(meta.grantXmlUri, ODP_API_KEY);
    if (xml) {
      result = parsePatentXml(xml);
      console.log(`  Grant XML: abs=${!!result.abstract}, desc=${result.description_paragraphs.length}, claims=${result.claims.length}`);
    }
    await sleep(500);
  }

  // Step 4: Fallback to Google Patents
  if (result.description_paragraphs.length === 0 && meta?.pubNumber) {
    const gpResult = await tryGooglePatents(meta.pubNumber);
    if (gpResult) {
      if (gpResult.abstract) result.abstract = gpResult.abstract;
      if (gpResult.description_paragraphs.length > 0) result.description_paragraphs = gpResult.description_paragraphs;
      if (gpResult.claims.length > 0) result.claims = gpResult.claims;
      console.log(`  Google Patents: abs=${!!result.abstract}, desc=${result.description_paragraphs.length}, claims=${result.claims.length}`);
    }
    await sleep(500);
  }

  // Step 5: If still nothing and we have patent number, try Google Patents with patent number
  if (result.description_paragraphs.length === 0 && meta?.patentNumber) {
    const patPubNum = `US${meta.patentNumber}`;
    const gpResult = await tryGooglePatents(patPubNum);
    if (gpResult) {
      if (!result.abstract && gpResult.abstract) result.abstract = gpResult.abstract;
      if (result.description_paragraphs.length === 0 && gpResult.description_paragraphs.length > 0)
        result.description_paragraphs = gpResult.description_paragraphs;
      if (result.claims.length === 0 && gpResult.claims.length > 0) result.claims = gpResult.claims;
      console.log(`  Google Patents (grant): abs=${!!result.abstract}, desc=${result.description_paragraphs.length}, claims=${result.claims.length}`);
    }
  }

  const title = meta?.title || app.title;
  console.log(`\n  FINAL: abstract=${!!result.abstract}, desc=${result.description_paragraphs.length} paras, claims=${result.claims.length}`);

  return {
    application_number: app.number,
    title,
    abstract: result.abstract,
    description_paragraphs: result.description_paragraphs,
    claims: result.claims,
  };
}

async function main() {
  console.log('Starting USPTO patent specification pull...');
  console.log(`Output: ${OUTPUT_PATH}\n`);

  const results = [];
  for (const app of APPS) {
    try {
      const result = await processApp(app);
      results.push(result);
    } catch (e) {
      console.error(`Error processing ${app.number}: ${e.stack}`);
      results.push({
        application_number: app.number,
        title: app.title,
        abstract: null,
        description_paragraphs: [],
        claims: [],
        _error: e.message,
      });
    }
    await sleep(1000);
  }

  // Write output
  const lines = results.map(r => JSON.stringify(r));
  fs.writeFileSync(OUTPUT_PATH, lines.join('\n') + '\n', 'utf-8');
  console.log(`\nWrote ${results.length} records to ${OUTPUT_PATH}`);

  // Summary
  console.log('\n--- Summary ---');
  for (const r of results) {
    const descPreview = r.description_paragraphs.length > 0 ? r.description_paragraphs[0].substring(0, 80) + '...' : '(none)';
    console.log(`${r.application_number}: abstract=${!!r.abstract}, desc=${r.description_paragraphs.length} paras, claims=${r.claims.length}`);
    console.log(`  First para: ${descPreview}`);
  }
}

main().catch(console.error);
