#!/usr/bin/env node

/**
 * AI Act Compliance Report — Data Collection
 *
 * Collects AI usage data and scans the project for compliance artifacts.
 * Outputs structured JSON for the AI agent to analyze and produce the final report.
 *
 * Usage:
 *   node report.mjs [--days 90] [--output report-data.json]
 *
 * Env vars (set automatically in OpenKBS Studio):
 *   OPENKBS_PROJECT_ID  — Project ID
 *   OPENKBS_API_KEY     — Project API key
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PROJECT_API = 'https://project.openkbs.com';
const PROJECT_DIR = process.env.OPENKBS_PROJECT_DIR || process.cwd();
const HOME = process.env.HOME || '/home/user';

function resolveCredentials() {
  let projectId = process.env.OPENKBS_PROJECT_ID;
  let apiKey = process.env.OPENKBS_API_KEY;

  if (projectId && apiKey) return { projectId, apiKey };

  const jwtPath = path.join(HOME, '.openkbs', 'projectJWT');
  if (!fs.existsSync(jwtPath)) return { projectId, apiKey };

  try {
    const jwt = fs.readFileSync(jwtPath, 'utf-8').trim();
    if (!jwt) return { projectId, apiKey };
    apiKey = apiKey || jwt;
    if (!projectId) {
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
      projectId = payload.projectId || payload.sub;
    }
  } catch {}

  return { projectId, apiKey };
}

const { projectId: PROJECT_ID, apiKey: API_KEY } = resolveCredentials();

const args = process.argv.slice(2);
const daysIdx = args.indexOf('--days');
const days = daysIdx !== -1 ? parseInt(args[daysIdx + 1], 10) : 90;
const outIdx = args.indexOf('--output');
const outputPath = outIdx !== -1 ? args[outIdx + 1] : 'ai-act-report-data.json';

if (!PROJECT_ID || !API_KEY) {
  console.error('Error: Could not resolve project credentials.');
  console.error('Checked: OPENKBS_PROJECT_ID/OPENKBS_API_KEY env vars and ~/.openkbs/projectJWT');
  process.exit(1);
}

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status} ${res.statusText}`);
  return res.json();
}

async function getAIUsage() {
  try {
    return await fetchJSON(`${PROJECT_API}/projects/${PROJECT_ID}/usage?days=${days}`);
  } catch (e) {
    console.error(`Warning: Could not fetch AI usage data: ${e.message}`);
    return { byModel: [], daily: [] };
  }
}

function scanComplianceArtifacts() {
  const artifacts = {
    aiActSkill: false,
    aiDisclosure: false,
    aiAcceptableUsePolicy: false,
    aiLiteracyPolicy: false,
    humanOversightWorkflow: false,
    logRetentionConfig: false,
  };

  const skillDirs = [
    path.join(PROJECT_DIR, '.claude', 'skills'),
    path.join(PROJECT_DIR, 'skills'),
  ];

  for (const dir of skillDirs) {
    if (fs.existsSync(dir)) {
      try {
        const entries = fs.readdirSync(dir, { recursive: true }).map(String);
        if (entries.some(f => f.includes('ai-act'))) {
          artifacts.aiActSkill = true;
        }
      } catch {}
    }
  }

  try {
    const grepDisclosure = execSync(
      `grep -rl "ai-disclosure\\|AI Disclosure\\|ai.generated\\|aiGenerated" "${PROJECT_DIR}/site" "${PROJECT_DIR}/functions" 2>/dev/null || true`,
      { encoding: 'utf8' }
    ).trim();
    if (grepDisclosure) artifacts.aiDisclosure = true;
  } catch {}

  const policyPaths = [
    'AI-ACCEPTABLE-USE-POLICY.md',
    'ai-acceptable-use-policy.md',
    'docs/ai-policy.md',
    'AI-POLICY.md',
  ];
  for (const p of policyPaths) {
    if (fs.existsSync(path.join(PROJECT_DIR, p))) {
      artifacts.aiAcceptableUsePolicy = true;
      break;
    }
  }

  const literacyPaths = [
    'AI-LITERACY-POLICY.md',
    'ai-literacy-policy.md',
    'docs/ai-literacy.md',
  ];
  for (const p of literacyPaths) {
    if (fs.existsSync(path.join(PROJECT_DIR, p))) {
      artifacts.aiLiteracyPolicy = true;
      break;
    }
  }

  try {
    const grepApproval = execSync(
      `grep -rl "approval\\|human.oversight\\|human.review\\|requires_approval\\|pending_review" "${PROJECT_DIR}/functions" 2>/dev/null || true`,
      { encoding: 'utf8' }
    ).trim();
    if (grepApproval) artifacts.humanOversightWorkflow = true;
  } catch {}

  return artifacts;
}

function listProjectFunctions() {
  const functionsDir = path.join(PROJECT_DIR, 'functions');
  if (!fs.existsSync(functionsDir)) return [];
  return fs.readdirSync(functionsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

async function main() {
  console.error(`Collecting AI Act compliance data for project ${PROJECT_ID}...`);
  console.error(`Period: last ${days} days`);

  const usage = await getAIUsage();
  const artifacts = scanComplianceArtifacts();
  const functions = listProjectFunctions();

  const report = {
    meta: {
      projectId: PROJECT_ID,
      generatedAt: new Date().toISOString(),
      periodDays: days,
      toolVersion: '1.0.0',
    },
    aiUsage: usage,
    complianceArtifacts: artifacts,
    projectFunctions: functions,
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.error(`Data written to ${outputPath}`);
  console.log(outputPath);
}

main().catch(e => {
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});
