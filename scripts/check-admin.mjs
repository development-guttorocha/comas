// Automatic checks against the running dev server (npm run dev). Run: npm run check:admin
// It never saves anything: big uploads go to /api/admin/upload-check, which only reads them,
// and every real upload route gets only broken bodies, which they must refuse with a clear message.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const ORIGIN = { Origin: new URL(BASE).origin };
const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, why: error instanceof Error ? error.message : String(error) });
  }
};
const expect = (cond, why) => { if (!cond) throw new Error(why); };
const MB = 1024 * 1024;

// ---------- code rules (no server needed)

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

await check("Toda rota lê envios por readForm (lib/admin/form.ts)", async () => {
  const files = await walk(path.join(ROOT, "app"));
  const bad = [];
  for (const f of files) if ((await readFile(f, "utf8")).includes(".formData()")) bad.push(path.relative(ROOT, f));
  expect(!bad.length, `request.formData() direto em: ${bad.join(", ")}. Use readForm(request).`);
});

await check("Limite de envio igual em next.config.ts e lib/admin/form.ts", async () => {
  const config = await readFile(path.join(ROOT, "next.config.ts"), "utf8");
  const form = await readFile(path.join(ROOT, "lib/admin/form.ts"), "utf8");
  const a = config.match(/proxyClientMaxBodySize:\s*"(\d+)mb"/i)?.[1];
  const b = form.match(/UPLOAD_LIMIT_MB\s*=\s*(\d+)/)?.[1];
  expect(a && b && a === b, `next.config.ts tem ${a ?? "nada"} MB e form.ts tem ${b ?? "nada"} MB.`);
});

// ---------- the running server

// A dev server busy compiling can take a while to answer: four tries, 20 s each, 3 s apart.
async function serverUp() {
  for (let attempt = 1; attempt <= 4; attempt++) {
    if (await fetch(BASE, { signal: AbortSignal.timeout(20000) }).then(() => true, () => false)) return true;
    if (attempt < 4) await new Promise(resolve => setTimeout(resolve, 3000));
  }
  return false;
}
const up = await serverUp();
if (!up) {
  results.push({ name: `Servidor em ${BASE}`, ok: false, why: "não respondeu depois de 4 tentativas (cerca de 1 minuto). Rode npm run dev e tente de novo." });
} else {
  const page = (url) => check(`Página ${url}`, async () => {
    const r = await fetch(BASE + url, { signal: AbortSignal.timeout(60000) });
    expect(r.status === 200, `respondeu ${r.status}`);
  });
  for (const url of ["/", "/sobre", "/cases", "/cases/creator-ads", "/artigos", "/servicos", "/en", "/termos-de-uso", "/recursos/salario-em-design", "/recursos/pesquisa-salarial", "/recursos/trilha-de-carreira", "/recursos/trilha-de-carreira/completa"]) await page(url);
  for (const url of ["/admin/pendencias", "/admin/cases", "/admin/cases/creator-ads", "/admin/artigos", "/admin/site", "/admin/site/home", "/admin/site/home/esteira", "/admin/site/cases", "/admin/site/sobre", "/admin/site/todas-as-paginas", "/admin/site/servicos/hub", "/admin/leads", "/admin/pesquisa", "/admin/midia", "/admin/midia/figma", "/admin/chaves"]) await page(url);

  // The old addresses (before Site, Mídia and Pendências) still land, query included.
  const movedTo = (from, to) => check(`Endereço antigo ${from} leva a ${to}`, async () => {
    const r = await fetch(BASE + from, { redirect: "manual", signal: AbortSignal.timeout(60000) });
    const location = r.headers.get("location") ?? "";
    expect(r.status >= 300 && r.status < 400 && new URL(location, BASE).href.replace(BASE, "") === to, `respondeu ${r.status} → ${location || "sem destino"}`);
  });
  for (const [from, to] of [
    ["/admin", "/admin/pendencias"],
    ["/admin/traducoes", "/admin/pendencias"],
    ["/admin/paginas", "/admin/site"],
    ["/admin/paginas/sobre?campo=sobre.title", "/admin/site/sobre?campo=sobre.title"],
    ["/admin/paginas/cases", "/admin/site/cases"],
    ["/admin/paginas/rodape", "/admin/site/todas-as-paginas"],
    ["/admin/paginas/site", "/admin/site/todas-as-paginas"],
    ["/admin/home", "/admin/site/home"],
    ["/admin/home/esteira", "/admin/site/home/esteira"],
    ["/admin/seo", "/admin/site"],
    ["/admin/servicos", "/admin/site#servicos"],
    ["/admin/servicos/hub", "/admin/site/servicos/hub"],
    ["/admin/galeria", "/admin/midia"],
    ["/admin/imagem-para-layout", "/admin/midia/figma"],
    ["/admin/configuracoes", "/admin/chaves"],
  ]) await movedTo(from, to);

  await check("Galeria lista a mídia", async () => {
    const r = await fetch(`${BASE}/api/admin/gallery`);
    const d = await r.json();
    expect(r.ok && Array.isArray(d.items ?? d.files ?? d), `respondeu ${r.status} ${JSON.stringify(d).slice(0, 120)}`);
  });

  const blob = (mb) => new Blob([new Uint8Array(mb * MB)], { type: "application/octet-stream" });

  await check("Envio de 30 MB chega inteiro (passa pelo proxy.ts)", async () => {
    const body = new FormData();
    body.append("file", blob(30), "grande.bin");
    const r = await fetch(`${BASE}/api/admin/upload-check`, { method: "POST", headers: ORIGIN, body });
    const d = await r.json();
    expect(r.ok && d.files?.[0]?.size === 30 * MB, `respondeu ${r.status} ${JSON.stringify(d)}`);
  });

  await check("Envio de 120 MB chega inteiro", async () => {
    const body = new FormData();
    body.append("file", blob(120), "maior.bin");
    const r = await fetch(`${BASE}/api/admin/upload-check`, { method: "POST", headers: ORIGIN, body });
    const d = await r.json();
    expect(r.ok && d.files?.[0]?.size === 120 * MB, `respondeu ${r.status} ${JSON.stringify(d)}`);
  });

  await check("Imagem para layout recusa mais de 25 MB com mensagem clara", async () => {
    const body = new FormData();
    body.append("image", blob(30), "tela.png");
    const r = await fetch(`${BASE}/api/admin/screen-design`, { method: "POST", headers: ORIGIN, body });
    const text = await r.text();
    expect(r.status === 413 && /limite/.test(text), `respondeu ${r.status} ${text.slice(0, 120)}`);
  });

  const key = await fetch(`${BASE}/api/admin/figma-import?key=1`).then((r) => r.json()).then((d) => d.key, () => "");
  const routes = [
    { url: "/api/admin/media", headers: ORIGIN },
    { url: "/api/admin/reel-tracks", headers: ORIGIN },
    { url: "/api/admin/cases/teste-material/material/chat", headers: ORIGIN },
    { url: "/api/admin/screen-design", headers: ORIGIN },
    { url: "/api/admin/figma-import", headers: { Authorization: `Bearer ${key}` } },
  ];
  const broken = {
    "sem separação": { type: "multipart/form-data", body: "lixo" },
    "cortado no meio": { type: "multipart/form-data; boundary=abc", body: '--abc\r\nContent-Disposition: form-data; name="file"; filename="x.png"\r\n\r\nmeio' },
  };
  for (const route of routes) {
    for (const [label, b] of Object.entries(broken)) {
      await check(`${route.url}: envio ${label} vira mensagem clara`, async () => {
        const r = await fetch(BASE + route.url, { method: "POST", headers: { ...route.headers, "Content-Type": b.type }, body: b.body });
        const text = await r.text();
        expect(r.status >= 400 && r.status < 500, `respondeu ${r.status}`);
        expect(!/Failed to parse|FormData/i.test(text), `mostrou o erro técnico: ${text.slice(0, 160)}`);
        expect(/envio/i.test(text), `mensagem inesperada: ${text.slice(0, 160)}`);
      });
    }
  }
}

// ---------- report

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "ok  " : "FALHOU"}  ${r.name}${r.ok ? "" : ` — ${r.why}`}`);
console.log(`\n${results.length - failed.length}/${results.length} checagens passaram.`);
process.exit(failed.length ? 1 : 0);
