import { readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function portIsOpen(port) {
  return new Promise(resolve => {
    const socket = net.connect({ host: "127.0.0.1", port });
    const finish = value => { socket.destroy(); resolve(value); };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(1000, () => finish(false));
  });
}

let existing;
try {
  const lock = JSON.parse(await readFile(path.join(projectDir, ".next/dev/lock"), "utf8"));
  if (Number.isInteger(lock.pid) && lock.pid > 0 && lock.port === 3000) {
    process.kill(lock.pid, 0);
    if (await portIsOpen(lock.port)) existing = lock;
  }
} catch { /* A missing/stale lock is handled by Next when it starts. */ }

if (existing) {
  console.log(`O preview deste projeto já está ativo (PID ${existing.pid}).`);
  console.log("Abra http://127.0.0.1:3000/ — não é necessário iniciar outra instância.");
} else {
  const child = spawn(process.execPath, [
    path.join(projectDir, "node_modules/next/dist/bin/next"),
    "dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3000",
  ], { cwd: projectDir, stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
  child.once("error", error => { console.error(error.message); process.exitCode = 1; });
  child.once("close", (code, signal) => { process.exitCode = code ?? (signal === "SIGINT" || signal === "SIGTERM" ? 0 : 1); });
}
