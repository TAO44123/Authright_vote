import { spawn } from "node:child_process";
import { resolve } from "node:path";

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT 必须是 1–65535 之间的整数");
  process.exit(1);
}

async function prewarm(signal = AbortSignal.timeout(30_000)) {
  const started = performance.now();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/polls/__prewarm__/vote`, { signal });
      if (response.status !== 405) throw new Error(`预期 405，实际返回 ${response.status}`);
      console.log(`✓ 投票接口预热完成（${Math.round(performance.now() - started)} 毫秒，未写入选票）`);
      return;
    } catch (error) {
      if (signal.aborted || attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

if (process.argv.includes("--warmup-only")) {
  try { await prewarm(); }
  catch (error) { console.error("投票接口预热失败：", error); process.exitCode = 1; }
} else {
  const dev = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), "dev", "--webpack", "-H", "0.0.0.0", "-p", String(port)], {
    stdio: ["inherit", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });
  let output = "";
  let warming = false;
  let stopping = false;
  let warmupController;

  dev.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    output += chunk.toString();
    const lines = output.split(/\r?\n/);
    output = lines.pop() || "";
    for (const line of lines) {
      if (!line.includes("Ready in") || warming || stopping) continue;
      warming = true;
      warmupController = new AbortController();
      const signal = AbortSignal.any([warmupController.signal, AbortSignal.timeout(30_000)]);
      void prewarm(signal).catch((error) => {
        if (!stopping) console.warn("⚠ 投票接口预热失败，开发服务仍可使用：", error);
      }).finally(() => { warming = false; warmupController = undefined; });
    }
  });
  dev.stderr.on("data", (chunk) => process.stderr.write(chunk));

  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => {
      stopping = true;
      warmupController?.abort();
      if (!dev.pid) return;
      try {
        if (process.platform === "win32") dev.kill(signal);
        else process.kill(-dev.pid, signal);
      } catch (error) {
        if (error.code !== "ESRCH") console.error("停止开发服务失败：", error);
      }
    });
  }
  dev.on("error", (error) => { console.error("启动开发服务失败：", error); process.exitCode = 1; });
  dev.on("close", (code, signal) => {
    stopping = true;
    warmupController?.abort();
    process.exitCode = code ?? (signal === "SIGINT" || signal === "SIGTERM" ? 0 : 1);
  });
}
