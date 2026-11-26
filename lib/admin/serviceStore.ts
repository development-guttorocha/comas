import { createHash, randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * The Design Services files the admin edits: `content/services/<file>.json`, imported by the
 * pages at build time. The editor may change any text and add, remove or reorder list items,
 * but never the file's shape, so the pages that read it keep working.
 */
export const SERVICES_DIR = path.join(process.cwd(), "content", "services");

export const SERVICE_FILES = [
  { slug: "hub", file: "hub.json", label: "Design Services", description: "A página que reúne os serviços, o formulário de contato e o Calendly.", path: "/servicos" },
  { slug: "prototipagem-com-ia", file: "prototipagem-com-ia.json", label: "Prototipagem com IA", description: "Workshop e acompanhamento para times que geram telas com IA.", path: "/servicos/prototipagem-com-ia" },
  { slug: "design-system-figma", file: "design-system-figma.json", label: "Design System no Figma", description: "Tokens, componentes, documentação e governança no Figma.", path: "/servicos/design-system-figma" },
  { slug: "head-de-design", file: "head-de-design.json", label: "Head de Design as a service", description: "Liderança de design por uma parte da semana.", path: "/servicos/head-de-design" },
] as const;

export type ServiceFile = (typeof SERVICE_FILES)[number];
export class ServiceConflict extends Error {}

export function serviceFile(slug: string): ServiceFile {
  const entry = SERVICE_FILES.find(f => f.slug === slug);
  if (!entry) throw new Error("Serviço não encontrado.");
  return entry;
}

const fullPath = (entry: ServiceFile) => path.join(SERVICES_DIR, entry.file);
const revisionOf = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 16);

export async function readService(slug: string) {
  const text = await readFile(fullPath(serviceFile(slug)), "utf8");
  return { values: JSON.parse(text) as Record<string, unknown>, revision: revisionOf(text) };
}

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
const isObject = (v: unknown): v is Record<string, Json> => !!v && typeof v === "object" && !Array.isArray(v);

/** What a list item may look like: every key any current item has; required, the keys all of them have. */
function itemTemplate(items: Json[]): { template: Json; required: Set<string> } | null {
  if (!items.length) return null;
  if (!items.every(isObject)) return { template: items[0], required: new Set() };
  const objects = items as Array<Record<string, Json>>;
  const merged: Record<string, Json> = {};
  for (const item of objects) for (const [k, v] of Object.entries(item)) if (!(k in merged)) merged[k] = v;
  const required = new Set(Object.keys(merged).filter(k => objects.every(item => k in item)));
  return { template: merged, required };
}

/** Throws, naming the place, when `value` does not have the shape of `template`. */
function conform(template: Json, value: unknown, where: string, required?: Set<string>): Json {
  if (typeof template === "string") {
    if (typeof value !== "string") throw new Error(`${where}: esperava um texto.`);
    return value;
  }
  if (typeof template === "number" || typeof template === "boolean" || template === null) {
    if (typeof value !== typeof template) throw new Error(`${where}: tipo inesperado.`);
    return value as Json;
  }
  if (Array.isArray(template)) {
    if (!Array.isArray(value)) throw new Error(`${where}: esperava uma lista.`);
    const shape = itemTemplate(template);
    if (!shape) { if (value.length) throw new Error(`${where}: esta lista não aceita itens.`); return []; }
    return value.map((item, i) => conform(shape.template, item, `${where} · item ${i + 1}`, shape.required));
  }
  if (!isObject(value)) throw new Error(`${where}: esperava um grupo de campos.`);
  const keys = Object.keys(template);
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw new Error(`${where}: campo desconhecido "${key}".`);
  const out: Record<string, Json> = {};
  for (const key of keys) {
    if (!(key in value)) {
      if (required && !required.has(key)) continue;
      throw new Error(`${where}: falta o campo "${key}".`);
    }
    out[key] = conform(template[key], value[key], where ? `${where} › ${key}` : key);
  }
  return out;
}

export async function saveService(slug: string, revision: string, values: unknown) {
  if (process.env.NODE_ENV === "production") throw new Error("Os serviços são editados no admin local e publicados com o deploy.");
  const entry = serviceFile(slug);
  const current = await readFile(fullPath(entry), "utf8");
  if (revisionOf(current) !== revision) throw new ServiceConflict("O arquivo deste serviço mudou fora desta tela. Recarregue para ver a versão atual.");
  const before = JSON.parse(current) as Json;
  const next = conform(before, values, "");
  // The slug is the page's address and the key the site looks it up by.
  if (isObject(before) && isObject(next) && next.slug !== before.slug) throw new Error("O endereço (slug) do serviço não pode mudar pelo admin.");
  const text = `${JSON.stringify(next, null, 2)}\n`;
  const temp = `${fullPath(entry)}.${randomUUID()}.tmp`;
  await writeFile(temp, text);
  await rename(temp, fullPath(entry));
  return { values: next, revision: revisionOf(text) };
}
