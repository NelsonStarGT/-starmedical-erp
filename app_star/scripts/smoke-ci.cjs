#!/usr/bin/env node
/**
 * CI smoke pipeline: build -> start -> wait health -> smoke -> stop
 * Usage: npm run smoke:ci
 */
const { spawn } = require("child_process");
const net = require("net");

const PORT_START = 3000;
const PORT_END = 3010;
const READY_TIMEOUT_MS = 20_000;
const READY_POLL_MS = 300;

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", ...opts });
    p.on("error", reject);
    p.on("exit", (code) => {
      if (code === 0) return resolve(0);
      reject(new Error(`${cmd} ${args.join(" ")} failed with code ${code}`));
    });
  });
}

async function waitForHealth(healthUrl) {
  const start = Date.now();
  while (Date.now() - start < READY_TIMEOUT_MS) {
    try {
      const res = await fetch(healthUrl, { cache: "no-store" });
      if (res.ok) return true; // server reachable and health ok/degraded
    } catch (_) {
      /* ignore and retry */
    }
    await new Promise((r) => setTimeout(r, READY_POLL_MS));
  }
  return false;
}

function killServer(proc) {
  if (!proc || proc.killed) return;
  try {
    process.kill(-proc.pid, "SIGTERM"); // kill group when detached
  } catch {
    try {
      proc.kill("SIGTERM");
    } catch (_) {
      /* ignore */
    }
  }
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", (err) => {
      if (err?.code === "EADDRINUSE" || err?.code === "EACCES") {
        resolve(false);
        return;
      }
      resolve(false);
    });
    server.listen({ port, host: "127.0.0.1" }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(start, end) {
  for (let port = start; port <= end; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free port found between ${start} and ${end}`);
}

async function main() {
  let server = null;
  const port = await findAvailablePort(PORT_START, PORT_END);
  const baseUrl = `http://localhost:${port}`;
  const healthUrl = `${baseUrl}/api/health`;
  console.info(`[smoke] using port ${port}`);

  // 1) build
  await run("npm", ["run", "build"]);

  // 2) start server (detached)
  server = spawn("npm", ["run", "start", "--", "-p", String(port)], {
    stdio: "inherit",
    detached: true
  });

  const cleanup = async () => {
    killServer(server);
    await new Promise((r) => setTimeout(r, 3000));
    try {
      if (server && server.exitCode == null && !server.killed) {
        process.kill(-server.pid, "SIGKILL");
      }
    } catch (_) {
      /* ignore */
    }
  };

  const handleSignal = async (code) => {
    await cleanup();
    process.exit(code);
  };
  process.on("SIGINT", () => handleSignal(130));
  process.on("SIGTERM", () => handleSignal(143));

  try {
    // 3) wait readiness
    const ready = await waitForHealth(healthUrl);
    if (!ready) {
      console.error(`[FAIL] Server not ready at ${healthUrl}`);
      process.exitCode = 1;
      return;
    }

    // 4) run smoke
    const smoke = spawn("npm", ["run", "smoke"], {
      stdio: "inherit",
      env: { ...process.env, BASE_URL: baseUrl }
    });
    const smokeCode = await new Promise((resolve) => smoke.on("exit", resolve));
    process.exitCode = smokeCode || 0;
  } finally {
    // 5) stop server always
    await cleanup();
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
