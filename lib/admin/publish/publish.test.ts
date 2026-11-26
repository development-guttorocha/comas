import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { blockChanges, caseDataChanged, embedNames, isReferenced, jsonChanged, missingEmbeds, pageLabel, sameStem, underPaths } from "./diff";
import { CODE_PATHS, CONTENT_PATHS } from "./plan";

test("o publicar leva o código do site e deixa de fora ferramentas, chaves e anotações", () => {
  for (const file of ["lib/supabase.ts", "app/actions/careerKit.ts", "components/Footer.tsx", "supabase/career_kit.sql", "proxy.ts", "package-lock.json", ".env.example"]) assert.equal(underPaths(file, CODE_PATHS), true, file);
  for (const file of [".env.local", ".env", ".mcp.json", ".codex/config.toml", ".superdesign/resume.json", "docs/admin/relatorio.md", "components.json", ".admin/keys.json", "libs/x.ts", "application/x.ts"]) assert.equal(underPaths(file, CODE_PATHS), false, file);
  assert.equal(underPaths("content/home.json", CONTENT_PATHS), true);
  assert.equal(underPaths("public/logo.svg", CONTENT_PATHS), false);
});
import { MATERIAL_MEDIA_PREFIX, materialMediaIn, materialMediaUrl, mediaFilePath, parseMaterialMediaUrl } from "@/lib/admin/materialMedia";
import { listMedia, promoteMaterialMedia, saveMaterialMedia } from "@/lib/admin/caseStore";

test("a lista conta blocos novos, alterados, removidos e a ordem", () => {
  const a = [{ id: "1", t: "a" }, { id: "2", t: "b" }, { id: "3", t: "c" }];
  assert.deepEqual(blockChanges(a, a), { added: 0, removed: 0, changed: 0, moved: false });
  assert.deepEqual(blockChanges(a, [{ id: "1", t: "a" }, { id: "2", t: "B" }, { id: "4", t: "d" }]), { added: 1, removed: 1, changed: 1, moved: false });
  assert.equal(blockChanges(a, [a[1], a[0], a[2]]).moved, true);
});

test("salvar sem mudar nada (só updatedAt) não é mudança no site", () => {
  assert.equal(caseDataChanged('{"title":"A","updatedAt":"2026-11-01"}', '{"title":"A","updatedAt":"2026-11-12"}'), false);
  assert.equal(caseDataChanged('{"title":"A"}', '{"title":"B"}'), true);
  assert.equal(jsonChanged('{"a":1}', '{\n  "a": 1\n}\n'), false);
  assert.equal(jsonChanged(null, '{"a":1}'), true);
});

test("componente que o código commitado não conhece bloqueia", () => {
  const body = JSON.stringify(["[case:CaseBento] {}", "[case:CaseImageStack] {}", "[case:CaseBento] {}"]);
  assert.deepEqual(embedNames(body), ["CaseBento", "CaseImageStack"]);
  assert.deepEqual(missingEmbeds(embedNames(body), `switch (k) { case "CaseBento": }`), ["CaseImageStack"]);
});

test("mídia em uso: texto que aponta para ela, mesmo codificado ou sem a barra", () => {
  assert.ok(isReferenced("/cases/x/a b.png", `"src":"/cases/x/a%20b.png"`));
  assert.ok(isReferenced("/cases/x/a.png", `url(cases/x/a.png)`));
  assert.ok(!isReferenced("/cases/x/a.png", `/cases/x/ab.png`));
  assert.ok(sameStem("video.mov", "video.mp4"));
  assert.equal(pageLabel("content/pages/sobre.json", null), "Sobre");
  assert.equal(pageLabel("content/services/head-de-design.json", { serviceName: "Head de Design as a service" }), "Serviço: Head de Design as a service");
});

test("endereço privado do material: só dentro de .admin/material/<slug>/images", () => {
  const url = materialMediaUrl("sulamerica", "slide-19.png");
  assert.equal(url, `${MATERIAL_MEDIA_PREFIX}sulamerica/slide-19.png`);
  assert.equal(parseMaterialMediaUrl(url)?.file, path.join(process.cwd(), ".admin", "material", "sulamerica", "images", "slide-19.png"));
  assert.equal(parseMaterialMediaUrl(`${MATERIAL_MEDIA_PREFIX}sulamerica/../x.png`), null);
  assert.equal(parseMaterialMediaUrl(`${MATERIAL_MEDIA_PREFIX}sulamerica/a/b.png`), null);
  assert.equal(mediaFilePath("/cases/x/a.png"), path.join(process.cwd(), "public", "cases", "x", "a.png"));
  assert.equal(mediaFilePath("/api/admin/media"), null);
  assert.deepEqual(materialMediaIn(`"${url}" "${url}" "${materialMediaUrl("outro", "a.png")}"`, "sulamerica"), [url]);
});

test("imagem do material fica privada até um bloco salvo usar", async () => {
  const slug = "zz-teste-publicacao";
  const privateDir = path.join(process.cwd(), ".admin", "material", slug);
  const publicDir = path.join(process.cwd(), "public", "cases", slug);
  // no content/cases folder: other test files read every case there while this one runs
  try {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    const saved = await saveMaterialMedia(slug, new File([png], "Relatório Slide 19.png", { type: "image/png" }));
    assert.equal(saved.private, true);
    assert.ok(saved.url.startsWith(MATERIAL_MEDIA_PREFIX));
    assert.ok(!existsSync(publicDir), "nada em public/ antes de entrar num bloco");
    assert.ok((await listMedia(slug)).some(f => f.url === saved.url && f.private), "o editor e a IA enxergam a imagem");

    const body = [{ id: "b1", type: "image", image: { src: saved.url } }];
    const { value, promoted } = await promoteMaterialMedia(slug, { body });
    assert.deepEqual(promoted, [`/cases/${slug}/relatorio-slide-19.png`]);
    assert.equal(JSON.stringify(value).includes(MATERIAL_MEDIA_PREFIX), false, "o case salvo só aponta para public/");
    assert.deepEqual(await readFile(path.join(publicDir, "relatorio-slide-19.png")), png);
    assert.ok(existsSync(path.join(privateDir, "images", "relatorio-slide-19.png")), "o material continua com a sua cópia");

    await writeFile(path.join(privateDir, "images", "relatorio-slide-19.png"), Buffer.concat([png, Buffer.from([0])]));
    const again = await promoteMaterialMedia(slug, { body });
    assert.deepEqual(again.promoted, [`/cases/${slug}/relatorio-slide-19-2.png`], "outro arquivo com o mesmo nome não sobrescreve o publicado");
  } finally {
    await Promise.all([privateDir, publicDir].map(dir => rm(dir, { recursive: true, force: true })));
  }
});
