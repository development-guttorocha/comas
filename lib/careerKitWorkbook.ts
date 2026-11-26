import {
  CAREER_ROLES,
  CAREER_SKILLS,
  COMPETENCY_AXES,
  COMPETENCY_STATUS_OPTIONS,
  formatRoleLabel,
  getMomentById,
  getRoleById,
  MOMENT_IDS,
  ROLE_IDS,
  type CompetencyStatus,
  type MomentId,
  type RoleId,
} from "./careerKitContent";

/**
 * Typed state, sanitization, gap diagnostics, and Markdown export for the Career Track workspace.
 */

export type MissionRow = {
  id: string;
  mission: string;
  strategy: string;
  audience: string;
  metric: string;
};

export type BragDocRow = {
  id: string;
  quarter: string;
  delivery: string;
  okr: string;
  impact: string;
  link: string;
};

export type FeedbackRow = {
  id: string;
  date: string;
  from: string;
  note: string;
};

export type CareerKitWorkbook = {
  version: 1;
  currentRole: RoleId;
  targetRole: RoleId;
  moment: MomentId | "";
  momentNote: string;
  competencies: Record<string, CompetencyStatus>;
  selfSkills: Record<string, number>;
  leaderSkills: Record<string, number>;
  pdi: {
    shortTerm: string;
    midTerm: string;
    longTerm: string;
    strengths: string;
    gaps: string;
    missions: MissionRow[];
  };
  bragDoc: BragDocRow[];
  feedbacks: FeedbackRow[];
  recognition: {
    context: string;
    highlights: string;
    aboveRole: string;
    whyNow: string;
    proposal: string;
  };
};

const VALID_ROLES = new Set<string>(ROLE_IDS);
const VALID_MOMENTS = new Set<string>(MOMENT_IDS);
const VALID_COMP_STATUS = new Set<string>(COMPETENCY_STATUS_OPTIONS.map(o => o.id));
const VALID_COMP_IDS = new Set<string>(COMPETENCY_AXES.flatMap(a => a.dimensions.map(d => d.id)));
const VALID_SKILL_IDS = new Set<string>(CAREER_SKILLS.map(s => s.id));

const MAX_LIST_ITEMS = 25;

export function createEmptyWorkbook(): CareerKitWorkbook {
  return {
    version: 1,
    currentRole: "pleno",
    targetRole: "senior",
    moment: "",
    momentNote: "",
    competencies: {},
    selfSkills: {},
    leaderSkills: {},
    pdi: {
      shortTerm: "",
      midTerm: "",
      longTerm: "",
      strengths: "",
      gaps: "",
      missions: [
        { id: "m-1", mission: "", strategy: "", audience: "", metric: "" },
        { id: "m-2", mission: "", strategy: "", audience: "", metric: "" },
      ],
    },
    bragDoc: [
      { id: "b-1", quarter: "", delivery: "", okr: "", impact: "", link: "" },
      { id: "b-2", quarter: "", delivery: "", okr: "", impact: "", link: "" },
    ],
    feedbacks: [
      { id: "f-1", date: "", from: "", note: "" },
    ],
    recognition: {
      context: "",
      highlights: "",
      aboveRole: "",
      whyNow: "",
      proposal: "",
    },
  };
}

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.slice(0, max) : "";

const rowId = (value: unknown, fallback: string) => {
  const clean = text(value, 40).replace(/[^a-zA-Z0-9_-]/g, "");
  return clean || fallback;
};

export function sanitizeWorkbook(raw: unknown): CareerKitWorkbook {
  const base = createEmptyWorkbook();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;

  const currentRole = typeof obj.currentRole === "string" && VALID_ROLES.has(obj.currentRole)
    ? (obj.currentRole as RoleId)
    : base.currentRole;
  const targetRole = typeof obj.targetRole === "string" && VALID_ROLES.has(obj.targetRole)
    ? (obj.targetRole as RoleId)
    : base.targetRole;
  const moment = typeof obj.moment === "string" && VALID_MOMENTS.has(obj.moment)
    ? (obj.moment as MomentId)
    : "";

  const competencies: Record<string, CompetencyStatus> = {};
  if (obj.competencies && typeof obj.competencies === "object") {
    for (const [k, v] of Object.entries(obj.competencies as Record<string, unknown>)) {
      if (VALID_COMP_IDS.has(k) && typeof v === "string" && VALID_COMP_STATUS.has(v)) {
        competencies[k] = v as CompetencyStatus;
      }
    }
  }

  const readSkillMap = (source: unknown): Record<string, number> => {
    const out: Record<string, number> = {};
    if (!source || typeof source !== "object") return out;
    for (const [k, v] of Object.entries(source as Record<string, unknown>)) {
      const num = typeof v === "number" ? Math.round(v) : Number.NaN;
      if (VALID_SKILL_IDS.has(k) && Number.isFinite(num) && num >= 1 && num <= 5) {
        out[k] = num;
      }
    }
    return out;
  };

  const rawPdi = (obj.pdi && typeof obj.pdi === "object" ? obj.pdi : {}) as Record<string, unknown>;
  const rawMissions = Array.isArray(rawPdi.missions) ? rawPdi.missions.slice(0, MAX_LIST_ITEMS) : [];
  const missions: MissionRow[] = rawMissions.length
    ? rawMissions.map((item, idx) => {
        const m = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        return {
          id: rowId(m.id, `m-${idx + 1}`),
          mission: text(m.mission, 240),
          strategy: text(m.strategy, 360),
          audience: text(m.audience, 160),
          metric: text(m.metric, 240),
        };
      })
    : base.pdi.missions;

  const rawBrag = Array.isArray(obj.bragDoc) ? obj.bragDoc.slice(0, MAX_LIST_ITEMS) : [];
  const bragDoc: BragDocRow[] = rawBrag.length
    ? rawBrag.map((item, idx) => {
        const b = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        return {
          id: rowId(b.id, `b-${idx + 1}`),
          quarter: text(b.quarter, 30),
          delivery: text(b.delivery, 240),
          okr: text(b.okr, 180),
          impact: text(b.impact, 300),
          link: text(b.link, 300),
        };
      })
    : base.bragDoc;

  const rawFeedbacks = Array.isArray(obj.feedbacks) ? obj.feedbacks.slice(0, MAX_LIST_ITEMS) : [];
  const feedbacks: FeedbackRow[] = rawFeedbacks.length
    ? rawFeedbacks.map((item, idx) => {
        const f = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        return {
          id: rowId(f.id, `f-${idx + 1}`),
          date: text(f.date, 30),
          from: text(f.from, 140),
          note: text(f.note, 500),
        };
      })
    : base.feedbacks;

  const rawRec = (obj.recognition && typeof obj.recognition === "object" ? obj.recognition : {}) as Record<string, unknown>;

  return {
    version: 1,
    currentRole,
    targetRole,
    moment,
    momentNote: text(obj.momentNote, 1200),
    competencies,
    selfSkills: readSkillMap(obj.selfSkills),
    leaderSkills: readSkillMap(obj.leaderSkills),
    pdi: {
      shortTerm: text(rawPdi.shortTerm, 600),
      midTerm: text(rawPdi.midTerm, 600),
      longTerm: text(rawPdi.longTerm, 600),
      strengths: text(rawPdi.strengths, 1000),
      gaps: text(rawPdi.gaps, 1000),
      missions,
    },
    bragDoc,
    feedbacks,
    recognition: {
      context: text(rawRec.context, 1200),
      highlights: text(rawRec.highlights, 1600),
      aboveRole: text(rawRec.aboveRole, 1200),
      whyNow: text(rawRec.whyNow, 1200),
      proposal: text(rawRec.proposal, 600),
    },
  };
}

export function analyzeCompetencies(wb: CareerKitWorkbook) {
  const total = VALID_COMP_IDS.size;
  let consistent = 0;
  let exceeds = 0;
  let inconsistent = 0;
  let notYet = 0;

  for (const id of VALID_COMP_IDS) {
    const status = wb.competencies[id];
    if (status === "consistent") consistent += 1;
    else if (status === "exceeds") exceeds += 1;
    else if (status === "inconsistent") inconsistent += 1;
    else if (status === "not_yet") notYet += 1;
  }

  const marked = consistent + exceeds + inconsistent + notYet;
  return { total, marked, consistent, exceeds, inconsistent, notYet };
}

export type SkillSummaryItem = {
  id: string;
  label: string;
  self: number | null;
  leader: number | null;
  diff: number | null;
  direction: "self_higher" | "leader_higher" | "aligned" | null;
};

export function analyzeSkills(wb: CareerKitWorkbook) {
  const items: SkillSummaryItem[] = CAREER_SKILLS.map(skill => {
    const self = wb.selfSkills[skill.id] ?? null;
    const leader = wb.leaderSkills[skill.id] ?? null;
    const diff = self !== null && leader !== null ? self - leader : null;
    const direction =
      diff === null
        ? null
        : diff >= 1
          ? "self_higher"
          : diff <= -1
            ? "leader_higher"
            : "aligned";
    return { id: skill.id, label: skill.label, self, leader, diff, direction };
  });

  const selfValues = items.map(i => i.self).filter((v): v is number => v !== null);
  const leaderValues = items.map(i => i.leader).filter((v): v is number => v !== null);

  const avg = (nums: number[]) =>
    nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;

  const topStrengths = items
    .filter(i => i.self !== null && i.self >= 4)
    .sort((a, b) => (b.self ?? 0) - (a.self ?? 0))
    .slice(0, 3);

  const focusAreas = items
    .filter(i => i.self !== null && i.self <= 3)
    .sort((a, b) => (a.self ?? 0) - (b.self ?? 0))
    .slice(0, 3);

  const misalignments = items
    .filter(i => i.direction === "self_higher" || i.direction === "leader_higher")
    .sort((a, b) => Math.abs(b.diff ?? 0) - Math.abs(a.diff ?? 0));

  return {
    items,
    ratedCount: selfValues.length,
    leaderRatedCount: leaderValues.length,
    selfAvg: avg(selfValues),
    leaderAvg: avg(leaderValues),
    topStrengths,
    focusAreas,
    misalignments,
  };
}

export function kitCompletion(wb: CareerKitWorkbook) {
  const moment = Boolean(wb.moment || wb.momentNote.trim());
  const competencies = Object.keys(wb.competencies).length >= 4;
  const skills = Object.keys(wb.selfSkills).length >= 5;
  const hasMission = wb.pdi.missions.some(m => m.mission.trim() || m.metric.trim());
  const hasBrag = wb.bragDoc.some(b => b.delivery.trim() || b.impact.trim());
  const hasHorizon = Boolean(wb.pdi.shortTerm.trim() || wb.pdi.midTerm.trim() || wb.pdi.strengths.trim() || wb.pdi.gaps.trim());
  const pdi = hasMission || hasBrag || hasHorizon;

  const completedModules = [moment, competencies, skills, pdi].filter(Boolean).length;
  return {
    completedModules,
    totalModules: 4,
    modules: { moment, competencies, skills, pdi },
  };
}

export function isWorkbookSubstantivelyEmpty(wb: CareerKitWorkbook): boolean {
  const { modules } = kitCompletion(wb);
  const anyFeedback = wb.feedbacks.some(f => f.note.trim() || f.from.trim());
  const anyRec = Object.values(wb.recognition).some(v => v.trim().length > 0);
  return (
    !modules.moment &&
    Object.keys(wb.competencies).length === 0 &&
    Object.keys(wb.selfSkills).length === 0 &&
    Object.keys(wb.leaderSkills).length === 0 &&
    !modules.pdi &&
    !anyFeedback &&
    !anyRec
  );
}

export function workbookToMarkdown(wb: CareerKitWorkbook, userName?: string): string {
  const current = getRoleById(wb.currentRole);
  const target = getRoleById(wb.targetRole);
  const moment = wb.moment ? getMomentById(wb.moment) : null;
  const compStats = analyzeCompetencies(wb);
  const skillStats = analyzeSkills(wb);

  const lines: string[] = [
    `# Trilha de carreira em design${userName ? ` — ${userName}` : ""}`,
    "",
    `- **Papel atual:** ${formatRoleLabel(current)} (${current.scope})`,
    `- **Próximo passo explorado:** ${formatRoleLabel(target)} (${target.scope})`,
    `- **Momento na cadeira:** ${moment ? `${moment.name} (${moment.tagline})` : "Não selecionado"}`,
  ];

  if (wb.momentNote.trim()) {
    lines.push("", "### Leitura do momento", wb.momentNote.trim());
  }

  lines.push(
    "",
    "## 2. Mapa de competências",
    `Marcadas: ${compStats.marked}/${compStats.total} · Já no alvo: ${compStats.exceeds} · Consistente: ${compStats.consistent} · Oscilo: ${compStats.inconsistent} · Ainda não: ${compStats.notYet}`,
  );

  for (const axis of COMPETENCY_AXES) {
    const marked = axis.dimensions.filter(d => wb.competencies[d.id]);
    if (!marked.length) continue;
    lines.push("", `### ${axis.title}`);
    for (const d of marked) {
      const label = COMPETENCY_STATUS_OPTIONS.find(o => o.id === wb.competencies[d.id])?.label ?? "";
      lines.push(`- **${d.name}:** ${label}`);
    }
  }

  lines.push(
    "",
    "## 3. Habilidades (1 a 5)",
    `Média autoavaliação: ${skillStats.selfAvg ?? "—"} · Média liderança: ${skillStats.leaderAvg ?? "—"}`,
  );

  for (const s of skillStats.items) {
    if (s.self === null && s.leader === null) continue;
    const gap = s.diff && Math.abs(s.diff) >= 1 ? ` (diferença ${s.diff > 0 ? `+${s.diff}` : s.diff})` : "";
    lines.push(`- **${s.label}:** Eu ${s.self ?? "—"} | Liderança ${s.leader ?? "—"}${gap}`);
  }

  lines.push("", "## 4. Plano do trimestre");
  if (wb.pdi.shortTerm.trim()) lines.push(`- **Curto prazo (3–6m):** ${wb.pdi.shortTerm.trim()}`);
  if (wb.pdi.midTerm.trim()) lines.push(`- **Médio prazo (6–12m):** ${wb.pdi.midTerm.trim()}`);
  if (wb.pdi.longTerm.trim()) lines.push(`- **Longo prazo (1–3a):** ${wb.pdi.longTerm.trim()}`);
  if (wb.pdi.strengths.trim()) lines.push(`- **Fortalezas para multiplicar:** ${wb.pdi.strengths.trim()}`);
  if (wb.pdi.gaps.trim()) lines.push(`- **Focos para destravar:** ${wb.pdi.gaps.trim()}`);

  const activeMissions = wb.pdi.missions.filter(m => m.mission.trim() || m.metric.trim());
  if (activeMissions.length) {
    lines.push("", "### Missões do trimestre");
    for (const m of activeMissions) {
      lines.push(`- **${m.mission || "Missão"}** | Como: ${m.strategy || "—"} | Para quem: ${m.audience || "—"} | Meta e prazo: ${m.metric || "—"}`);
    }
  }

  const activeBrag = wb.bragDoc.filter(b => b.delivery.trim() || b.impact.trim());
  if (activeBrag.length) {
    lines.push("", "### Diário de entregas");
    for (const b of activeBrag) {
      lines.push(`- **[${b.quarter || "Ciclo"}] ${b.delivery || "Entrega"}** · Meta do time: ${b.okr || "—"} · Impacto: ${b.impact || "—"}${b.link ? ` · Link: ${b.link}` : ""}`);
    }
  }

  const activeFb = wb.feedbacks.filter(f => f.note.trim());
  if (activeFb.length) {
    lines.push("", "### Retornos recebidos");
    for (const f of activeFb) {
      lines.push(`- **${f.date || "Data"} · ${f.from || "Par/liderança"}:** ${f.note.trim()}`);
    }
  }

  const recEntries = [
    ["Contexto atual", wb.recognition.context],
    ["Resultados do ciclo", wb.recognition.highlights],
    ["O que já opero acima da cadeira", wb.recognition.aboveRole],
    ["Por que agora", wb.recognition.whyNow],
    ["Proposta para o 1:1", wb.recognition.proposal],
  ].filter(([, val]) => val.trim().length > 0);

  if (recEntries.length) {
    lines.push("", "### Pedido de reconhecimento (para o 1:1)");
    for (const [k, v] of recEntries) lines.push(`- **${k}:** ${v.trim()}`);
  }

  if (CAREER_ROLES.length) {
    lines.push("", "---", "Gerado na Trilha de carreira · guttorocha.com.br/recursos/trilha-de-carreira");
  }

  return lines.join("\n");
}
