#!/usr/bin/env node
/**
 * Smoke test for critical endpoints.
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/smoke-test.js
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function logOk(endpoint, status) {
  console.log(`[OK] ${endpoint} status=${status}`);
}

function logFail(endpoint, status, msg) {
  console.error(`[FAIL] ${endpoint} status=${status}${msg ? " - " + msg : ""}`);
}

async function checkHealth() {
  const endpoint = "/api/health";
  try {
    const res = await fetchWithTimeout(`${BASE_URL}${endpoint}`);
    if (![200, 503].includes(res.status)) {
      logFail(endpoint, res.status, "unexpected status");
      return false;
    }
    const data = await res.json().catch(() => ({}));
    if (data.status === "down") {
      logFail(endpoint, res.status, "status=down");
      return false;
    }
    logOk(endpoint, res.status);
    return true;
  } catch (err) {
    logFail(endpoint, "error", err.message);
    return false;
  }
}

async function checkEmailTest() {
  // NOTE: This endpoint may be protected (admin/session). For smoke we accept 401/403 as “reachable”.
  const endpoint = "/api/admin/config/email/test";
  try {
    const res = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toEmail: "smoke-test@example.com" })
    });
    if (![200, 401, 403, 504].includes(res.status)) {
      logFail(endpoint, res.status, "unexpected status");
      return false;
    }
    logOk(endpoint, res.status);
    return true;
  } catch (err) {
    logFail(endpoint, "error", err.message);
    return false;
  }
}

async function checkOtp() {
  // NOTE: This endpoint may require auth/role. For smoke we accept 401/403 as “reachable”.
  const endpoint = "/api/labtest/auth/send-otp";
  try {
    const res = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "smoke-test@example.com" })
    });
    if (res.status === 200 || res.status === 400 || res.status === 401 || res.status === 403) {
      logOk(endpoint, res.status);
      return true;
    }
    if (res.status === 500) {
      logFail(endpoint, res.status, "server error");
      return false;
    }
    logFail(endpoint, res.status, "unexpected status");
    return false;
  } catch (err) {
    logFail(endpoint, "error", err.message);
    return false;
  }
}

async function main() {
  const results = [];
  results.push(await checkHealth());
  results.push(await checkEmailTest());
  results.push(await checkOtp());

  const allOk = results.every(Boolean);
  if (allOk) {
    console.log("Smoke test PASSED");
    process.exit(0);
  } else {
    console.error("Smoke test FAILED");
    process.exit(1);
  }
}

main();
