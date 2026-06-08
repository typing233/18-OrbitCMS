#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const specPath = process.argv[2] || path.join(__dirname, 'test-replay-v1.json');
const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
const testEmail = process.env.TEST_EMAIL || 'admin@test.com';
const testPassword = process.env.TEST_PASSWORD || 'password123';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let spec;
try {
  spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
} catch (e) {
  console.error(`Failed to read spec: ${e.message}`);
  process.exit(1);
}

const vars = {};
let passed = 0;
let failed = 0;

function resolveVars(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    if (name === 'testEmail') return testEmail;
    if (name === 'testPassword') return testPassword;
    return vars[name] || '';
  });
}

function resolveBodyVars(obj) {
  if (!obj) return obj;
  if (typeof obj === 'string') return resolveVars(obj);
  if (Array.isArray(obj)) return obj.map(resolveBodyVars);
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = resolveBodyVars(v);
  }
  return result;
}

function getJsonPath(obj, pathStr) {
  const parts = pathStr.replace(/^\$\.?/, '').split('.');
  let val = obj;
  for (const p of parts) {
    if (val == null) return undefined;
    val = val[p];
  }
  return val;
}

function doRequest(method, urlPath, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const mod = url.protocol === 'https:' ? https : http;
    const bodyStr = body ? JSON.stringify(body) : null;
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers, ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}) },
    };
    const req = mod.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function checkAssertion(assertion, response) {
  switch (assertion.type) {
    case 'status':
      return response.status === assertion.expected;
    case 'jsonPath':
      const val = getJsonPath(response.body, assertion.path);
      if (assertion.check === 'exists') return val !== undefined && val !== null;
      if (assertion.check === 'isUuid') return typeof val === 'string' && UUID_REGEX.test(val);
      if (assertion.check === 'equals') return val === assertion.expected;
      return true;
    case 'body':
      if (assertion.check === 'isArray') return Array.isArray(response.body);
      return true;
    default:
      return true;
  }
}

async function runSequence() {
  console.log(`\nRunning test replay: ${spec.replaySequence.length} steps\n`);

  for (const step of spec.replaySequence) {
    const req = step.request;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': vars.accessToken ? `Bearer ${vars.accessToken}` : '',
      'x-tenant-id': vars.tenantId || '',
      ...(req.headers || {}),
    };

    const resolvedPath = resolveVars(req.path);
    const resolvedBody = resolveBodyVars(req.body);

    try {
      const response = await doRequest(req.method, resolvedPath, headers, resolvedBody);

      let stepPassed = true;
      for (const assertion of (step.assertions || [])) {
        if (!checkAssertion(assertion, response)) {
          console.log(`  FAIL [${step.step}] assertion: ${JSON.stringify(assertion)} (got status=${response.status})`);
          stepPassed = false;
          failed++;
        }
      }

      if (step.extractVars) {
        for (const [varName, jsonPath] of Object.entries(step.extractVars)) {
          vars[varName] = getJsonPath(response.body, jsonPath);
        }
      }

      if (stepPassed) {
        console.log(`  PASS [${step.step}] ${req.method} ${resolvedPath} -> ${response.status}`);
        passed++;
      }
    } catch (err) {
      console.log(`  ERROR [${step.step}] ${err.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runSequence();
