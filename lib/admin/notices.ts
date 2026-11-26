import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { keyExpiry } from "@/lib/admin/keyExpiry";
import { expiringKeys } from "@/lib/admin/apiKeys";
import { getAllCases } from "@/lib/caseContent";
import { applyUnits, pendingUnits, type FieldDef, type PageSchema } from "@/lib/pages/model";
import { PAGE_SCHEMAS } from "@/lib/pages/schemas";
import { siteFieldHref } from "@/lib/pages/screens";
import { PAGES_DIR, readPage, savePage } from "@/lib/pages/store";
import { servicesHub } from "@/lib/services";
import salaryBands from "@/content/recursos/faixas-salariais.json";
import survey from "@/content/recursos/pesquisa-salarial.json";
import { getLeadCounts, getSurveyCounts, isSupabaseConfigured } from "@/lib/supabase";
import { generateTranslation, getTranslationSource, publishTranslation } from "@/lib/translations/service";
import { translateUnits } from "@/lib/translations/openai";
import { readTranslation } from "@/lib/translations/store";
import { getCaseReel } from "@/lib/reel/load";
import { reelTranslationState, translateReel } from "@/lib/reel/translate";

/**
 * Everything that needs Gutto's attention, one item per problem, on every admin screen. Each check
 * reads the current state, so an item disappears on its own once the thing is fixed. Items the admin
 * can fix by itself carry `fix` (the button); the rest say where and how.
 */
export type NoticeArea = "Traduções" | "Conteúdo" | "Chaves e serviços";
export type Notice = {
  id: string; area: NoticeArea; tone: "warn" | "bad"; title: string; body: string;
  /** The screen where it is fixed by hand, or where to look. */
  href?: string; action?: string;
  /** The admin fixes it on its own: the button's label (POST /api/admin/notices with the id). */
  fix?: string;
};
export type FixJob = { state: "running" | "done" | "failed"; message: string; at: number };

// ── Memory of fixes: running jobs, and texts the Sol could not translate. ───────────────────────
// On globalThis so a dev reload of this module keeps them; the failures also go to a file in .next.
type Store = { queue?: Promise<unknown>; jobs: Map<string, FixJob>; failures: Record<string, { source: string; error: string; at: number }>; loaded: boolean };
const store: Store = ((globalThis as Record<string, unknown>).__adminNotices as Store) ??= { jobs: new Map(), failures: {}, loaded: false };
const FAILURES_FILE = path.join(process.cwd(), ".next", "cache", "admin-translation-failures.json");

async function loadFailures() {
  if (store.loaded) return;
  store.loaded = true;
  try { store.failures = JSON.parse(await readFile(FAILURES_FILE, "utf8")); } catch { /* none yet */ }
}
async function saveFailures() {
  await mkdir(path.dirname(FAILURES_FILE), { recursive: true }).catch(() => {});
  await writeFile(FAILURES_FILE, JSON.stringify(store.failures, null, 2)).catch(() => {});
}

// ── Pages: each file's texts, split as site.json is (Menu e 404 / SEO). A text's link goes to the Site
// screen that shows it (siteFieldHref): the SEO of a page sits at the end of that page.
type Screen = { schema: PageSchema; section?: "seo"; label: string; fields: FieldDef[] };
const SCREENS: Screen[] = PAGE_SCHEMAS.flatMap(schema => {
  const sections = [...new Set(schema.groups.map(g => g.section))];
  return sections.map(section => ({
    schema, section: section === "seo" ? "seo" as const : undefined,
    label: section === "seo" ? "Google e compartilhamento das páginas" : schema.slug === "site" || schema.slug === "rodape" ? `Em todas as páginas (${schema.label})` : schema.label,
    fields: schema.groups.filter(g => g.section === section).flatMap(g => g.fields),
  }));
});
const screenId = (s: Screen) => `page:${s.schema.slug}:${s.section ?? "main"}`;
const fieldLabel = (s: Screen, key: string) => {
  const first = key.split(".")[0];
  const group = s.schema.groups.find(g => g.section === s.section && g.fields.some(f => f.key === first));
  const field = group?.fields.find(f => f.key === first);
  const index = key.split(".").find(step => /^\d+$/.test(step));
  return [...new Set([group?.label, field?.label, index ? `item ${Number(index) + 1}` : ""].filter(Boolean))].join(" · ") || key;
};
const snippet = (text: string) => (text.length > 110 ? `${text.slice(0, 110).trim()}…` : text);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

async function pageNotices(): Promise<Notice[]> {
  await loadFailures();
  const notices: Notice[] = [];
  for (const schema of PAGE_SCHEMAS) {
    // A broken file falls back to the default content silently on the site: say it here.
    try { JSON.parse(await readFile(path.join(PAGES_DIR, `${schema.slug}.json`), "utf8")); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") notices.push({
        id: `page-json:${schema.slug}`, area: "Conteúdo", tone: "bad", title: `content/pages/${schema.slug}.json está inválido`,
        body: `O site está mostrando o texto padrão de ${schema.label} no lugar do seu. ${(error as Error).message}`,
      });
    }
  }
  for (const screen of SCREENS) {
    const { values } = await readPage(screen.schema.slug);
    const units = pendingUnits(screen.fields, values);
    const failed = units.filter(u => store.failures[`${screen.schema.slug}:${u.key}`]?.source === u.source);
    const open = units.length - failed.length;
    if (open) {
      const missing = units.filter(u => !u.target?.trim()).length;
      notices.push({
        id: screenId(screen), area: "Traduções", tone: "warn",
        title: `${screen.label}: ${plural(open, "texto sem inglês em dia", "textos sem inglês em dia")}`,
        body: `${missing ? `${plural(missing, "sem inglês", "sem inglês")}${open - missing ? ` e ${open - missing} com o inglês desatualizado ou marcado para revisão` : ""}` : "Inglês desatualizado ou marcado para revisão"}. O Sol traduz e salva a página.`,
        fix: "Traduzir e salvar", href: siteFieldHref(screen.schema.slug, units.find(u => !failed.includes(u))!.key), action: "Ir ao primeiro",
      });
    }
    for (const unit of failed) {
      const failure = store.failures[`${screen.schema.slug}:${unit.key}`]!;
      notices.push({
        id: `unit:${screen.schema.slug}:${unit.key}`, area: "Traduções", tone: "bad",
        title: `${screen.label} · ${fieldLabel(screen, unit.key)}: o Sol não conseguiu traduzir`,
        body: `${failure.error.replace(/: [\w.]+$/, "")}. “${snippet(unit.source)}” Escreva o inglês à mão na página, ou tente de novo.`,
        fix: "Tentar de novo", href: siteFieldHref(screen.schema.slug, unit.key), action: "Escrever à mão",
      });
    }
  }
  return notices;
}

async function caseNotices(): Promise<Notice[]> {
  const notices: Notice[] = [];
  const data = await getAllCases();
  if (data.source !== "content") return [{ id: "cases-read", area: "Conteúdo", tone: "bad", title: "Não consegui ler os cases", body: "content/cases não respondeu; o site pode estar sem cases." }];
  for (const c of data.cases.filter(c => c.slug !== "modelo" && !c.draft && !c.archived)) {
    const name = c.company || c.slug;
    try {
      const [source, record] = await Promise.all([getTranslationSource(c.slug), readTranslation(c.slug)]);
      // the video has an English of its own; a draft video isn't on the site, so it waits
      if (await getCaseReel(c.slug)) {
        const state = await reelTranslationState(c.slug);
        if (state === "missing" || state === "stale") notices.push({
          id: `reel:${c.slug}`, area: "Traduções", tone: "warn",
          title: state === "missing" ? `${name}: o vídeo ainda não tem inglês` : `${name}: o vídeo em inglês está desatualizado`,
          body: state === "missing" ? "A página em inglês aparece sem o vídeo. O Sol traduz os textos das cenas." : "O vídeo mudou depois da tradução; a página em inglês fica sem ele até traduzir de novo. O Sol traduz só o que mudou.",
          fix: "Traduzir o vídeo", href: `/admin/cases/${c.slug}?aba=video`, action: "Abrir o vídeo",
        });
      }
      if (record?.published?.sourceHash === source.sourceHash) continue;
      notices.push({
        id: `case:${c.slug}`, area: "Traduções", tone: record?.published ? "warn" : "bad",
        title: record?.published ? `${name}: o inglês publicado está desatualizado` : `${name}: sem inglês publicado`,
        body: record?.published ? "O português mudou depois da última publicação; o site em inglês mostra a versão antiga. O Sol traduz o que mudou e publica." : "O site em inglês mostra “em preparação”. O Sol traduz e publica.",
        fix: "Traduzir e publicar", href: `/admin/cases/${c.slug}?aba=ingles`, action: "Abrir o inglês",
      });
    } catch (error) {
      notices.push({ id: `case-read:${c.slug}`, area: "Conteúdo", tone: "bad", title: `${name}: não consegui ler o case`, body: (error as Error).message, href: `/admin/cases/${c.slug}`, action: "Abrir o case" });
    }
  }
  return notices;
}

async function serviceNotices(): Promise<Notice[]> {
  const notices: Notice[] = [];
  const key = keyExpiry();
  if (!process.env.OPENAI_API_KEY?.trim()) {
    notices.push({ id: "openai-missing", area: "Chaves e serviços", tone: "bad", title: "Falta a chave da OpenAI", body: "Sem OPENAI_API_KEY, o Sol não traduz e nenhuma tradução daqui se resolve sozinha.", href: "/admin/chaves", action: "Abrir chaves" });
  } else if (key.state !== "ok") {
    notices.push({
      id: "openai-expiry", area: "Chaves e serviços", tone: key.state === "expired" ? "bad" : "warn",
      title: key.state === "expired" ? `A chave da OpenAI venceu em ${key.date}` : `A chave da OpenAI vence ${key.days === 0 ? "hoje" : `em ${key.days} ${key.days === 1 ? "dia" : "dias"} (${key.date})`}`,
      body: `${key.state === "expired" ? "A tradução com o Sol parou." : "Sem ela, a tradução com o Sol para."} Crie uma nova em platform.openai.com e troque OPENAI_API_KEY aqui e na Vercel.`, href: "/admin/chaves", action: "Abrir chaves",
    });
  }
  for (const k of await expiringKeys()) {
    notices.push({
      id: `key-${k.id}`, area: "Chaves e serviços", tone: k.days < 0 ? "bad" : "warn",
      title: k.days < 0 ? `A chave ${k.label} venceu` : `A chave ${k.label} vence ${k.days === 0 ? "hoje" : `em ${k.days} ${k.days === 1 ? "dia" : "dias"}`}`,
      body: `Renove no painel do provedor e troque ${k.env} em Chaves de API (e na Vercel, se o site usa).`, href: "/admin/chaves", action: "Abrir chaves",
    });
  }
  if (!process.env.RESEND_API_KEY?.trim()) {
    notices.push({ id: "resend-missing", area: "Chaves e serviços", tone: "bad", title: "Os leads não estão chegando por e-mail", body: "Falta RESEND_API_KEY (aqui e na Vercel). O formulário dos serviços depende dela.", href: "/admin/chaves", action: "Abrir chaves" });
  }
  if (!servicesHub.calendlyUrl?.trim()) {
    notices.push({ id: "calendly-missing", area: "Conteúdo", tone: "warn", title: "Falta o link do Calendly", body: "Sem ele, o formulário não oferece a agenda depois do envio.", href: "/admin/site/servicos/hub", action: "Configurar" });
  }
  if (!salaryBands.reviewed) {
    notices.push({ id: "salary-bands", area: "Conteúdo", tone: "warn", title: "As faixas salariais aguardam sua revisão", body: "A ferramenta \"Quanto você deveria estar ganhando?\" só aparece no site depois disso. Revise content/recursos/faixas-salariais.json e mude reviewed para true.", href: "/recursos/salario-em-design", action: "Ver a ferramenta" });
  }
  if (!isSupabaseConfigured()) {
    notices.push({
      id: "supabase-missing", area: "Chaves e serviços", tone: "warn",
      title: "Pesquisa salarial e formulários sem Supabase",
      body: "Os formulários chegam só por e-mail (Resend) e não ficam salvos no banco nem no admin. Cadastre SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
      href: "/admin/chaves?abrir=supabase-url", action: "Abrir chaves",
    });
  } else {
    try {
      const leadCounts = await getLeadCounts();
      if (leadCounts.new > 0) {
        notices.push({
          id: "leads-new", area: "Conteúdo", tone: "warn",
          title: plural(leadCounts.new, "novo contato aguardando leitura", "novos contatos aguardando leitura"),
          body: "Veja pedidos de serviço, downloads de materiais e mensagens em Contatos.",
          href: "/admin/leads", action: "Abrir Contatos",
        });
      }
    } catch {
      notices.push({
        id: "supabase-leads-schema", area: "Chaves e serviços", tone: "warn",
        title: "Falta criar a tabela de contatos no Supabase",
        body: "As chaves estão configuradas, mas a tabela site_leads ainda não respondeu. Abra Contatos para copiar o script.",
        href: "/admin/leads", action: "Abrir Contatos",
      });
    }
    try {
      const counts = await getSurveyCounts(survey.edition);
      if (counts.pending > 0) {
        notices.push({
          id: "survey-pending", area: "Conteúdo", tone: "warn",
          title: plural(counts.pending, "resposta da pesquisa aguardando aprovação", "respostas da pesquisa aguardando aprovação"),
          body: "Revise e aprove em Pesquisa para atualizar a régua da página Salário em design.",
          href: "/admin/pesquisa", action: "Revisar",
        });
      }
    } catch {
      notices.push({
        id: "supabase-schema", area: "Chaves e serviços", tone: "warn",
        title: "Falta rodar o SQL da pesquisa no Supabase",
        body: "As chaves estão configuradas, mas as tabelas ainda não responderam. Abra Pesquisa para copiar o script e verificar a conexão.",
        href: "/admin/pesquisa", action: "Abrir Pesquisa",
      });
    }
  }
  return notices;
}

/** A check that breaks becomes an item too: the panel never hides a problem by failing quietly. */
async function guarded(label: string, check: () => Promise<Notice[]>): Promise<Notice[]> {
  try { return await check(); }
  catch (error) { return [{ id: `check:${label}`, area: "Conteúdo", tone: "bad", title: `Não consegui verificar ${label}`, body: error instanceof Error ? error.message : String(error) }]; }
}

export async function loadNotices() {
  const groups = await Promise.all([guarded("chaves e serviços", serviceNotices), guarded("as páginas", pageNotices), guarded("os cases", caseNotices)]);
  const notices = groups.flat();
  // A finished job's message stays for a few minutes, next to the list it changed.
  for (const [id, job] of store.jobs) if (job.state !== "running" && Date.now() - job.at > 5 * 60_000) store.jobs.delete(id);
  return { notices, jobs: Object.fromEntries(store.jobs) };
}

// ── Fixes ──────────────────────────────────────────────────────────────────────────────────────
const isServiceError = (error: unknown) => /OPENAI_API_KEY|cota|créditos|modelo configurado|HTTP \d+|incompleta/i.test((error as Error)?.message ?? "");

/** Translates the screen's pending texts; a batch that fails is retried text by text, and only the texts that still fail are left out. */
async function fixScreen(screen: Screen, onlyKey?: string) {
  const { values, revision } = await readPage(screen.schema.slug);
  await loadFailures();
  // The whole page leaves out the texts already listed on their own; "Tentar de novo" sends just one.
  const units = pendingUnits(screen.fields, values).filter(u => onlyKey ? u.key === onlyKey : store.failures[`${screen.schema.slug}:${u.key}`]?.source !== u.source);
  if (!units.length) return "Nada a traduzir: já estava em dia.";
  const context = `Page "${screen.schema.label}" of a design leader's portfolio site: ${screen.schema.description}`;
  let translated: Awaited<ReturnType<typeof translateUnits>> = [];
  const failures: Array<{ key: string; source: string; error: string }> = [];
  try { translated = await translateUnits(units, context); }
  catch (error) {
    if (isServiceError(error)) throw error;
    for (const unit of units) {
      try { translated.push(...await translateUnits([unit], context)); }
      catch (unitError) {
        if (isServiceError(unitError)) throw unitError;
        failures.push({ key: unit.key, source: unit.source, error: (unitError as Error).message });
      }
    }
  }
  if (translated.length) await savePage(screen.schema.slug, revision, applyUnits(screen.fields, values, translated));
  for (const unit of translated) delete store.failures[`${screen.schema.slug}:${unit.key}`];
  for (const f of failures) store.failures[`${screen.schema.slug}:${f.key}`] = { source: f.source, error: f.error, at: Date.now() };
  await saveFailures();
  const done = translated.length ? `${screen.label}: ${plural(translated.length, "texto traduzido e salvo", "textos traduzidos e salvos")}.` : "";
  const left = failures.length ? ` ${plural(failures.length, "texto ficou", "textos ficaram")} na lista para escrever à mão.` : "";
  return `${done}${left}`.trim();
}

async function fixCase(slug: string) {
  const draft = await generateTranslation(slug);
  await publishTranslation(slug, draft.revision);
  return "Inglês traduzido e publicado. Vai ao ar no próximo deploy.";
}

function runner(id: string): (() => Promise<string>) | null {
  const [kind, slug, ...rest] = id.split(":");
  if (kind === "page") { const s = SCREENS.find(s => screenId(s) === id); return s ? () => fixScreen(s) : null; }
  if (kind === "unit") {
    const key = rest.join(":");
    const s = SCREENS.find(s => s.schema.slug === slug && s.fields.some(f => f.key === key.split(".")[0]));
    return s ? () => fixScreen(s, key) : null;
  }
  if (kind === "case" && slug) return () => fixCase(slug);
  if (kind === "reel" && slug) return async () => {
    const { translated } = await translateReel(slug);
    return translated ? `Vídeo em inglês: ${plural(translated, "texto traduzido", "textos traduzidos")}. Vai ao ar no próximo deploy.` : "O vídeo em inglês já estava em dia.";
  };
  return null;
}

/** Starts the fix and answers at once: it runs on the server, so a reload of the admin doesn't lose it. */
export function startFix(id: string) {
  const run = runner(id);
  if (!run) throw new Error("Esta pendência não se resolve por aqui.");
  if (store.jobs.get(id)?.state === "running") return;
  store.jobs.set(id, { state: "running", message: "Resolvendo…", at: Date.now() });
  // One fix at a time: two of them can write the same file (Menu e 404 and SEO share site.json).
  const next = (store.queue ?? Promise.resolve()).catch(() => {}).then(run);
  store.queue = next;
  void next.then(
    message => store.jobs.set(id, { state: "done", message, at: Date.now() }),
    error => store.jobs.set(id, { state: "failed", message: error instanceof Error ? error.message : "Não foi possível resolver.", at: Date.now() }),
  );
}
