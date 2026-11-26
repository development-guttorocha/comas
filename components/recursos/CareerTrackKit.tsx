"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveCareerKitWorkbookAction, signOutCareerKitAction } from "@/app/actions/careerKit";
import { LogoMark } from "@/components/LogoMark";
import {
  IconCheck,
  IconCompass,
  IconCopy,
  IconFileText,
  IconLayers,
  IconLogOut,
  IconPrinter,
  IconSliders,
  IconTarget,
} from "@/components/recursos/CareerIcons";
import type { ServiceContact } from "@/components/servicos/ServiceShell";
import type { CareerKitUser } from "@/lib/careerKitAuth";
import {
  CAREER_ROLES,
  CAREER_SKILLS,
  COMPETENCY_AXES,
  COMPETENCY_STATUS_OPTIONS,
  formatRoleLabel,
  getMomentById,
  getRoleById,
  JOURNEY_MOMENTS,
  SKILL_SCALE,
  type CompetencyAxis,
  type CompetencyStatus,
  type MomentId,
  type RoleId,
} from "@/lib/careerKitContent";
import {
  analyzeCompetencies,
  analyzeSkills,
  kitCompletion,
  workbookToMarkdown,
  type BragDocRow,
  type CareerKitWorkbook,
  type FeedbackRow,
  type MissionRow,
  type SkillSummaryItem,
} from "@/lib/careerKitWorkbook";
import type { CareerConsultingContent, CareerTrackContent } from "@/lib/resources";
import styles from "@/app/(pt)/recursos/material.module.css";

type SaveState = "idle" | "saving" | "saved" | "error";
type WorkspaceTabId = "momento" | "competencias" | "habilidades" | "plano" | "resumo";
type AxisId = CompetencyAxis["id"];
type PlanSubTabId = "trimestre" | "entregas" | "reconhecimento";

const WORKSPACE_TABS: Array<{ id: WorkspaceTabId; num: string; label: string }> = [
  { id: "momento", num: "01", label: "Momento" },
  { id: "competencias", num: "02", label: "Competências" },
  { id: "habilidades", num: "03", label: "Habilidades" },
  { id: "plano", num: "04", label: "Plano e entregas" },
  { id: "resumo", num: "05", label: "Resumo pro 1:1" },
];

const SHORT_SKILL_LABELS: Record<string, string> = {
  "pesquisa-quali": "Pesquisa quali",
  "dados-quanti": "Dados e métricas",
  "visual-ui": "Design visual",
  "interacao-fluxos": "Interação e fluxos",
  "conteudo-ux-writing": "Escrita e conteúdo",
  "arquitetura-ia": "Arq. de informação",
  "design-system": "Sistema de design",
  "negocio-produto": "Negócio e produto",
  "criterios-experiencia": "Qualidade e entrega",
  "influencia-narrativa": "Narrativa no 1:1",
};

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 7)}`;

function SkillComparisonChart({
  items,
  selfAvg,
  leaderAvg,
  ratedCount,
  leaderRatedCount,
}: {
  items: SkillSummaryItem[];
  selfAvg: number | null;
  leaderAvg: number | null;
  ratedCount: number;
  leaderRatedCount: number;
}) {
  const xMin = 136;
  const xMax = 352;
  const xFor = (val: number) => xMin + ((val - 1) / 4) * (xMax - xMin);
  const rowStep = 28;
  const topPad = 24;
  const height = topPad + items.length * rowStep + 18;
  const summaryText = `Gráfico comparativo de 10 habilidades em escala de 1 a 5. Autoavaliação: ${ratedCount} marcadas${selfAvg ? `, média ${selfAvg.toFixed(1)}` : ""}. Visão da liderança: ${leaderRatedCount} marcadas${leaderAvg ? `, média ${leaderAvg.toFixed(1)}` : ""}.`;

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartLegend}>
        <span><i className={styles.legendSelf} aria-hidden="true" />Minha nota</span>
        <span><i className={styles.legendLeader} aria-hidden="true" />Liderança</span>
      </div>
      <svg
        viewBox={`0 0 376 ${height}`}
        className={styles.skillChartSvg}
        role="img"
        aria-label={summaryText}
      >
        {[1, 2, 3, 4, 5].map(tick => {
          const x = xFor(tick);
          return (
            <g key={tick}>
              <line
                x1={x}
                y1={14}
                x2={x}
                y2={height - 14}
                stroke="#263238"
                strokeDasharray={tick === 3 ? undefined : "3 3"}
                strokeWidth={1}
              />
              <text
                x={x}
                y={10}
                textAnchor="middle"
                fill="#92928a"
                fontSize="11"
                fontWeight="700"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {items.map((item, idx) => {
          const y = topPad + idx * rowStep + 10;
          const hasSelf = item.self !== null;
          const hasLeader = item.leader !== null;
          const sx = hasSelf ? xFor(item.self!) : 0;
          const lx = hasLeader ? xFor(item.leader!) : 0;

          return (
            <g key={item.id}>
              <line x1={xMin} y1={y} x2={xMax} y2={y} stroke="#1d272c" strokeWidth={2} />
              <text
                x={xMin - 10}
                y={y + 4}
                textAnchor="end"
                fill={hasSelf || hasLeader ? "#e6e6df" : "#7c7c75"}
                fontSize="11.5"
                fontWeight={hasSelf && hasLeader && Math.abs(item.diff ?? 0) >= 1 ? "700" : "600"}
              >
                {SHORT_SKILL_LABELS[item.id] ?? item.label}
              </text>

              {hasSelf && hasLeader && Math.abs(sx - lx) > 2 ? (
                <line
                  x1={Math.min(sx, lx)}
                  y1={y}
                  x2={Math.max(sx, lx)}
                  y2={y}
                  stroke={item.direction === "self_higher" ? "#ffd666" : "#4cc9f0"}
                  strokeWidth={3}
                  strokeOpacity={0.75}
                />
              ) : null}

              {hasSelf ? (
                <circle cx={sx} cy={y} r={5.5} fill="#8f7bff" stroke="#0a0f11" strokeWidth={1.5} />
              ) : null}

              {hasLeader ? (
                <polygon
                  points={`${lx},${y - 6.5} ${lx + 6.5},${y} ${lx},${y + 6.5} ${lx - 6.5},${y}`}
                  fill="#4cc9f0"
                  stroke="#0a0f11"
                  strokeWidth={1.5}
                />
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function StepIcon({ id }: { id: WorkspaceTabId }) {
  if (id === "momento") return <IconCompass />;
  if (id === "competencias") return <IconLayers />;
  if (id === "habilidades") return <IconSliders />;
  if (id === "plano") return <IconTarget />;
  return <IconFileText />;
}

/**
 * Interactive 5-stage dark-studio Career Track workspace with warm-paper 1:1 dossier,
 * cloud Supabase persistence, accessible SVG comparisons, and A4 white PDF compilation.
 */
export default function CareerTrackKit({
  user,
  initialWorkbook,
  track: careerTrack,
  consulting,
  contact,
}: {
  user: CareerKitUser;
  initialWorkbook: CareerKitWorkbook;
  track: CareerTrackContent;
  consulting: CareerConsultingContent;
  contact: ServiceContact;
}) {
  const router = useRouter();
  const [wb, setWb] = useState<CareerKitWorkbook>(() => initialWorkbook);
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>("momento");
  const [activeAxis, setActiveAxis] = useState<AxisId>("execucao");
  const [activePlanTab, setActivePlanTab] = useState<PlanSubTabId>("trimestre");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [copiedMd, setCopiedMd] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const saveTimerRef = useRef<number | null>(null);
  const latestWbRef = useRef<CareerKitWorkbook>(initialWorkbook);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const storageKey = `career-track-v1:${user.email}`;

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const persistWorkbook = useCallback(
    (next: CareerKitWorkbook) => {
      latestWbRef.current = next;
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ updatedAt: new Date().toISOString(), data: next }),
        );
      } catch {
        // Ignore storage quota or private mode issues.
      }
      setSaveState("saving");
      setSaveError("");

      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(async () => {
        const res = await saveCareerKitWorkbookAction(latestWbRef.current);
        if (res.ok) {
          setSaveState("saved");
          setSaveError("");
        } else {
          setSaveState("error");
          setSaveError(res.error ?? "Erro ao salvar.");
        }
      }, 900);
    },
    [storageKey],
  );

  const updateWb = useCallback(
    (updater: (prev: CareerKitWorkbook) => CareerKitWorkbook) => {
      setWb(prev => {
        const next = updater(prev);
        persistWorkbook(next);
        return next;
      });
    },
    [persistWorkbook],
  );

  const retrySave = async () => {
    setSaveState("saving");
    setSaveError("");
    const res = await saveCareerKitWorkbookAction(latestWbRef.current);
    if (res.ok) {
      setSaveState("saved");
    } else {
      setSaveState("error");
      setSaveError(res.error ?? "Erro ao salvar.");
    }
  };

  const handleCopyMarkdown = async () => {
    const md = workbookToMarkdown(wb, user.name || user.email);
    try {
      await navigator.clipboard.writeText(md);
      setCopiedMd(true);
      track("material_copy_markdown", { material: "trilha-de-carreira" });
      window.setTimeout(() => setCopiedMd(false), 2200);
    } catch {
      setCopiedMd(false);
    }
  };

  const handlePrint = () => {
    track("material_print", { material: "trilha-de-carreira" });
    window.print();
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOutCareerKitAction();
    router.refresh();
  };

  const switchTab = (tab: WorkspaceTabId, scrollToTop = false) => {
    setActiveTab(tab);
    if (scrollToTop && workspaceRef.current) {
      workspaceRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const pullBragToRecognition = () => {
    const filled = wb.bragDoc.filter(b => b.delivery.trim() || b.impact.trim());
    if (!filled.length) return;
    const summary = filled
      .map(b => {
        const head = b.quarter.trim() ? `[${b.quarter.trim()}] ` : "";
        const body = [b.delivery.trim(), b.okr.trim() ? `Meta: ${b.okr.trim()}` : "", b.impact.trim()]
          .filter(Boolean)
          .join(" · ");
        return `- ${head}${body}`;
      })
      .join("\n");
    updateWb(prev => ({
      ...prev,
      recognition: {
        ...prev.recognition,
        highlights: prev.recognition.highlights.trim()
          ? `${prev.recognition.highlights.trim()}\n${summary}`
          : summary,
      },
    }));
  };

  const firstName = (user.name || user.email.split("@")[0] || "").trim().split(/\s+/)[0] || "designer";
  const currentRoleObj = getRoleById(wb.currentRole);
  const targetRoleObj = getRoleById(wb.targetRole);
  const selectedMoment = wb.moment ? getMomentById(wb.moment) : null;
  const compStats = analyzeCompetencies(wb);
  const skillStats = analyzeSkills(wb);
  const completion = kitCompletion(wb);
  const todayBrt = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const setCurrentRole = (roleId: RoleId) => {
    const nextRole = getRoleById(roleId);
    const firstSuggested = nextRole.nextPaths[0]?.roleId ?? roleId;
    updateWb(prev => ({
      ...prev,
      currentRole: roleId,
      targetRole: prev.targetRole === prev.currentRole ? firstSuggested : prev.targetRole,
    }));
  };

  const toggleMoment = (id: MomentId) => {
    updateWb(prev => ({
      ...prev,
      moment: prev.moment === id ? "" : id,
    }));
  };

  const toggleCompetency = (dimensionId: string, status: CompetencyStatus) => {
    updateWb(prev => {
      const nextMap = { ...prev.competencies };
      if (nextMap[dimensionId] === status) {
        delete nextMap[dimensionId];
      } else {
        nextMap[dimensionId] = status;
      }
      return { ...prev, competencies: nextMap };
    });
  };

  const toggleSkillRating = (target: "selfSkills" | "leaderSkills", skillId: string, val: number) => {
    updateWb(prev => {
      const nextMap = { ...prev[target] };
      if (nextMap[skillId] === val) {
        delete nextMap[skillId];
      } else {
        nextMap[skillId] = val;
      }
      return { ...prev, [target]: nextMap };
    });
  };

  const consultingHref = `/recursos/${consulting.slug}`;
  const isTransitionMoment = wb.moment === "mastering" || wb.moment === "transitioning";
  const currentTabIndex = WORKSPACE_TABS.findIndex(t => t.id === activeTab);
  const prevTab = currentTabIndex > 0 ? WORKSPACE_TABS[currentTabIndex - 1] : null;
  const nextTab = currentTabIndex < WORKSPACE_TABS.length - 1 ? WORKSPACE_TABS[currentTabIndex + 1] : null;
  const currentAxisObj = COMPETENCY_AXES.find(a => a.id === activeAxis) ?? COMPETENCY_AXES[0]!;

  const activeMissions = wb.pdi.missions.filter(m => m.mission.trim() || m.metric.trim());
  const activeDeliveries = wb.bragDoc.filter(b => b.delivery.trim() || b.impact.trim());
  const activeFeedbacks = wb.feedbacks.filter(f => f.note.trim());

  const pctExceeds = (compStats.exceeds / compStats.total) * 100;
  const pctConsistent = (compStats.consistent / compStats.total) * 100;
  const pctInconsistent = (compStats.inconsistent / compStats.total) * 100;
  const pctNotYet = (compStats.notYet / compStats.total) * 100;

  return (
    <div className={styles.studioShell}>
      {/* ─── Floating glass studio bar (hidden on print) ─── */}
      <header className={`${styles.studioNavWrap} ${styles.noPrint}`}>
        <nav className={styles.studioNav} aria-label="Barra da trilha">
          <div className={styles.navLeft}>
            <Link href="/recursos" className={styles.navBrand}>
              <span className={styles.navLogoWrap}>
                <LogoMark variant="onDark" className={styles.navLogo} />
              </span>
              <span>Design Resources</span>
            </Link>
            <span className={styles.userBadge}>Olá, {firstName}</span>
          </div>

          <div className={styles.navActions}>
            <span className={styles.syncPill} data-state={saveState} role="status">
              <i className={styles.syncDot} aria-hidden="true" />
              {saveState === "saving" ? "Salvando…" : null}
              {saveState === "saved" ? "Salvo na sua conta" : null}
              {saveState === "idle" ? "Sincronizado" : null}
              {saveState === "error" ? (
                <button type="button" onClick={retrySave} className={styles.retryBtn}>
                  {saveError || "Erro ao salvar"} · tentar de novo
                </button>
              ) : null}
            </span>

            <button type="button" className={styles.navActionGhost} onClick={handleCopyMarkdown}>
              {copiedMd ? <IconCheck /> : <IconCopy />}
              <span>{copiedMd ? "Resumo copiado" : "Copiar resumo"}</span>
            </button>

            <button type="button" className={styles.navActionPrimary} onClick={handlePrint}>
              <IconPrinter />
              <span>Imprimir PDF</span>
            </button>

            <button
              type="button"
              className={styles.navActionSignOut}
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <IconLogOut />
              <span>{signingOut ? "Saindo…" : "Sair"}</span>
            </button>
          </div>
        </nav>
      </header>

      <main className={`${styles.studioMain} ${styles.noPrint}`}>
        {/* ─── Compact dotted studio intro ─── */}
        <section className={styles.boardIntro} aria-labelledby="trilha-hero-title">
          <span className={styles.boardTab} aria-hidden="true">◇ Caderno / Trilha de carreira</span>
          <div className={styles.boardIntroGrid}>
            <div>
              <h1 id="trilha-hero-title">
                Enxergue seu lugar hoje.
                <span> E saiba como agir no próximo passo.</span>
              </h1>
              <p className={styles.boardLead}>
                Preencha no seu ritmo com base no trabalho real das últimas semanas. Carreira não é escada nem trilha em Y: é uma rede de competências, contexto e evidências para você guiar seus próximos 1:1s.
              </p>
            </div>

            <div className={styles.boardStatusCard}>
              <div className={styles.statusRow}>
                <span>Posição mapeada</span>
                <strong>{currentRoleObj.name} → {targetRoleObj.name}</strong>
              </div>
              <div className={styles.statusRow}>
                <span>Momento na cadeira</span>
                <strong>{selectedMoment ? selectedMoment.name : "A escolher"}</strong>
              </div>
              <div className={styles.statusProgress}>
                <div>
                  <span>Progresso na trilha</span>
                  <strong>{completion.completedModules} de {completion.totalModules} etapas</strong>
                </div>
                <div className={styles.progressTrack} aria-hidden="true">
                  <span style={{ width: `${(completion.completedModules / completion.totalModules) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5-Tab Workspace Stepper ─── */}
        <div ref={workspaceRef} className={styles.workspace}>
          <div role="tablist" aria-label="Etapas da trilha de carreira" className={styles.tablist}>
            {WORKSPACE_TABS.map(tab => {
              const selected = activeTab === tab.id;
              const done =
                tab.id === "momento"
                  ? completion.modules.moment
                  : tab.id === "competencias"
                    ? completion.modules.competencies
                    : tab.id === "habilidades"
                      ? completion.modules.skills
                      : tab.id === "plano"
                        ? completion.modules.pdi
                        : completion.completedModules >= 3;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`panel-${tab.id}`}
                  data-done={done ? "true" : undefined}
                  onClick={() => switchTab(tab.id)}
                  className={styles.tabBtn}
                >
                  <span className={styles.tabIcon}>
                    {done && !selected ? <IconCheck /> : <StepIcon id={tab.id} />}
                  </span>
                  <span className={styles.tabText}>
                    <small>{tab.num}</small>
                    <strong>{tab.label}</strong>
                  </span>
                </button>
              );
            })}
          </div>

          {/* ══ TAB 01: MOMENTO ══ */}
          {activeTab === "momento" ? (
            <section
              role="tabpanel"
              id="panel-momento"
              aria-labelledby="tab-momento"
              className={styles.panelSection}
            >
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelKicker}>Etapa 01 · Onde estou hoje</p>
                  <h2>Seu papel atual e momento na cadeira</h2>
                  <p>
                    O mesmo cargo pede posturas bem diferentes dependendo do momento. Escolha seu papel e clique no cartão que mais traduz suas últimas semanas.
                  </p>
                </div>
              </header>

              <div className={styles.roleRibbon} role="group" aria-label="Escolha seu papel atual">
                {CAREER_ROLES.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={wb.currentRole === r.id}
                    onClick={() => setCurrentRole(r.id)}
                    className={styles.roleChip}
                  >
                    <strong>{r.name}</strong>
                    {r.marketTitle ? <small>{r.marketTitle}</small> : <small>{r.scope}</small>}
                  </button>
                ))}
              </div>
              <p className={styles.roleCaption}>
                <strong>{formatRoleLabel(currentRoleObj)} ({currentRoleObj.scope}):</strong> {currentRoleObj.summary}
              </p>

              <div className={styles.momentsGrid}>
                {JOURNEY_MOMENTS.map((m, idx) => {
                  const active = wb.moment === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleMoment(m.id)}
                      className={styles.momentCard}
                    >
                      <div className={styles.momentHead}>
                        <span className={styles.momentIdx}>0{idx + 1}</span>
                        <span className={styles.momentState}>{active ? "Selecionado" : "Escolher"}</span>
                      </div>
                      <h3>{m.name}</h3>
                      <p className={styles.momentTagline}>{m.tagline}</p>
                      <ul>
                        {m.signals.map(sig => (
                          <li key={sig}>{sig}</li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              {selectedMoment ? (
                <div className={styles.momentDetail}>
                  <div className={styles.momentDetailGrid}>
                    <div className={styles.momentActionsCol}>
                      <span className={styles.detailLabel}>Diagnóstico · {selectedMoment.name}</span>
                      <h3>Como agir nesta fase</h3>
                      <p className={styles.momentSummary}>{selectedMoment.summary}</p>
                      <ol className={styles.actionList}>
                        {selectedMoment.howToAct.map(act => (
                          <li key={act}>{act}</li>
                        ))}
                      </ol>
                    </div>

                    <div className={styles.momentRightCol}>
                      <div className={styles.trapBox}>
                        <span>Armadilha mais comum</span>
                        <p>{selectedMoment.commonTrap}</p>
                      </div>
                      <div className={styles.questionBox}>
                        <span>Pergunta pronta para levar ao próximo 1:1</span>
                        <p>“{selectedMoment.oneOnOneQuestion}”</p>
                      </div>
                      <label className={styles.darkField}>
                        <span>Onde você enxerga isso na sua semana?</span>
                        <textarea
                          rows={3}
                          placeholder="Anote fatos recentes para abrir o próximo 1:1 com clareza…"
                          value={wb.momentNote}
                          onChange={e => updateWb(prev => ({ ...prev, momentNote: e.target.value }))}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.emptyCallout}>
                  Clique em um dos 4 cartões acima (`Chegada`, `Consistência`, `Domínio` ou `Transição`) para abrir o guia de postura e a pergunta pronta de 1:1.
                </div>
              )}

              <aside className={styles.nudgeBox} data-hot={isTransitionMoment ? "true" : undefined}>
                <div>
                  <strong>
                    {isTransitionMoment
                      ? `Em fase de ${selectedMoment?.name} e a conversa sobre promoção travou?`
                      : "Quer validar seu momento com quem já liderou mais de 100 designers?"}
                  </strong>
                  <p>
                    {selectedMoment
                      ? selectedMoment.consultingNudge
                      : "Na consultoria de carreira, a conversa inicial de 30 minutos é gratuita para entender o seu caso e decidir o próximo movimento."}
                  </p>
                </div>
                <Link
                  href={`${consultingHref}#agendar`}
                  className={styles.nudgeCta}
                  onClick={() => track("kit_consulting_click", { placement: "moment_nudge", moment: wb.moment || "none" })}
                >
                  Marcar conversa grátis →
                </Link>
              </aside>
            </section>
          ) : null}

          {/* ══ TAB 02: COMPETÊNCIAS ══ */}
          {activeTab === "competencias" ? (
            <section
              role="tabpanel"
              id="panel-competencias"
              aria-labelledby="tab-competencias"
              className={styles.panelSection}
            >
              <header className={styles.panelHeaderSplit}>
                <div>
                  <p className={styles.panelKicker}>Etapa 02 · Papéis em rede</p>
                  <h2>Mapa de competências em 3 eixos</h2>
                  <p>
                    Ninguém fica 100% dentro de um cargo só. Compare sua posição atual com o próximo passo que quer explorar e marque sua consistência real.
                  </p>
                </div>

                <div className={styles.rolePair}>
                  <label className={styles.darkSelect}>
                    <span>Papel atual</span>
                    <select
                      value={wb.currentRole}
                      onChange={e => setCurrentRole(e.target.value as RoleId)}
                    >
                      {CAREER_ROLES.map(r => (
                        <option key={r.id} value={r.id}>{formatRoleLabel(r)}</option>
                      ))}
                    </select>
                  </label>
                  <span className={styles.arrowSep} aria-hidden="true">→</span>
                  <label className={styles.darkSelect}>
                    <span>Papel alvo</span>
                    <select
                      value={wb.targetRole}
                      onChange={e => updateWb(prev => ({ ...prev, targetRole: e.target.value as RoleId }))}
                    >
                      {CAREER_ROLES.map(r => (
                        <option key={r.id} value={r.id}>{formatRoleLabel(r)}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </header>

              <div className={styles.networkBox}>
                <span>Caminhos possíveis a partir de <strong>{currentRoleObj.name}</strong> (incluindo movimentos laterais):</span>
                <div className={styles.pathChips}>
                  {currentRoleObj.nextPaths.map(p => {
                    const dest = getRoleById(p.roleId);
                    const selected = wb.targetRole === p.roleId;
                    return (
                      <button
                        key={`${currentRoleObj.id}-${p.roleId}`}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => updateWb(prev => ({ ...prev, targetRole: p.roleId }))}
                      >
                        <strong>{dest.name}</strong>
                        <span>{p.why}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Readiness proportional bar */}
              <div className={styles.readinessCard}>
                <div className={styles.readinessHead}>
                  <strong>Prontidão para {targetRoleObj.name}</strong>
                  <span>{compStats.marked} de {compStats.total} competências marcadas</span>
                </div>
                <div className={styles.readinessBar} aria-hidden="true">
                  {pctExceeds > 0 ? <span data-status="exceeds" style={{ width: `${pctExceeds}%` }} /> : null}
                  {pctConsistent > 0 ? <span data-status="consistent" style={{ width: `${pctConsistent}%` }} /> : null}
                  {pctInconsistent > 0 ? <span data-status="inconsistent" style={{ width: `${pctInconsistent}%` }} /> : null}
                  {pctNotYet > 0 ? <span data-status="not_yet" style={{ width: `${pctNotYet}%` }} /> : null}
                </div>
                <div className={styles.readinessCounts}>
                  <span><i data-status="exceeds" />{compStats.exceeds} já no alvo</span>
                  <span><i data-status="consistent" />{compStats.consistent} consistentes</span>
                  <span><i data-status="inconsistent" />{compStats.inconsistent} oscilam</span>
                  <span><i data-status="not_yet" />{compStats.notYet} ainda não</span>
                </div>
              </div>

              {/* 3 Axis Sub-tabs */}
              <div role="tablist" aria-label="Eixos de competência" className={styles.subTablist}>
                {COMPETENCY_AXES.map(axis => {
                  const markedInAxis = axis.dimensions.filter(d => wb.competencies[d.id]).length;
                  const active = activeAxis === axis.id;
                  return (
                    <button
                      key={axis.id}
                      type="button"
                      role="tab"
                      id={`axis-tab-${axis.id}`}
                      aria-selected={active}
                      aria-controls={`axis-panel-${axis.id}`}
                      onClick={() => setActiveAxis(axis.id)}
                      className={styles.subTabBtn}
                    >
                      <span>{axis.title}</span>
                      <small>{markedInAxis}/{axis.dimensions.length}</small>
                    </button>
                  );
                })}
              </div>

              <div
                role="tabpanel"
                id={`axis-panel-${currentAxisObj.id}`}
                aria-labelledby={`axis-tab-${currentAxisObj.id}`}
                className={styles.axisPanel}
              >
                <p className={styles.axisSubtitle}>{currentAxisObj.subtitle}</p>
                <div className={styles.dimensionList}>
                  {currentAxisObj.dimensions.map(dim => {
                    const activeStatus = wb.competencies[dim.id];
                    return (
                      <article key={dim.id} className={styles.dimensionCard}>
                        <div className={styles.dimensionTop}>
                          <div>
                            <h3>{dim.name}</h3>
                            <p className={styles.dimensionQuestion}>{dim.question}</p>
                          </div>
                          <div className={styles.statusButtons} role="group" aria-label={`Sua consistência em ${dim.name}`}>
                            {COMPETENCY_STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt.id}
                                type="button"
                                aria-pressed={activeStatus === opt.id}
                                data-status={opt.id}
                                onClick={() => toggleCompetency(dim.id, opt.id)}
                              >
                                {opt.short}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className={styles.dimensionCompare}>
                          <div>
                            <span>Hoje · {currentRoleObj.name}</span>
                            <p>{dim.levels[currentRoleObj.id]}</p>
                          </div>
                          <div data-target="true">
                            <span>Alvo · {targetRoleObj.name}</span>
                            <p>{dim.levels[targetRoleObj.id]}</p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <details className={styles.matrixDetails}>
                <summary>Ver tabela completa dos 7 papéis × 12 competências</summary>
                <div className={styles.tableWrap}>
                  <table className={styles.darkTable}>
                    <thead>
                      <tr>
                        <th scope="col">Competência</th>
                        {CAREER_ROLES.map(r => (
                          <th key={r.id} scope="col">
                            {r.name}
                            <small>{r.marketTitle ? `${r.marketTitle} · ` : ""}{r.scope}</small>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {COMPETENCY_AXES.flatMap(axis =>
                        axis.dimensions.map(dim => (
                          <tr key={dim.id}>
                            <th scope="row">
                              {dim.name}
                              <small>{axis.title}</small>
                            </th>
                            {CAREER_ROLES.map(r => (
                              <td key={r.id}>{dim.levels[r.id]}</td>
                            ))}
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
          ) : null}

          {/* ══ TAB 03: HABILIDADES ══ */}
          {activeTab === "habilidades" ? (
            <section
              role="tabpanel"
              id="panel-habilidades"
              aria-labelledby="tab-habilidades"
              className={styles.panelSection}
            >
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelKicker}>Etapa 03 · Autoavaliação vs. Liderança</p>
                  <h2>Onde vocês concordam e onde a régua diverge</h2>
                  <p>
                    Dê sua nota de 1 a 5 em cada habilidade e preencha a coluna da liderança durante o 1:1. Crescimento trava mais por desalinhamento de expectativa do que por falta de entrega.
                  </p>
                </div>
              </header>

              <ol className={styles.rubricBar}>
                {SKILL_SCALE.map(s => (
                  <li key={s.value}>
                    <strong>{s.value} · {s.label}</strong>
                    <span>{s.description}</span>
                  </li>
                ))}
              </ol>

              <div className={styles.skillsLayout}>
                <div className={styles.skillsTable}>
                  {CAREER_SKILLS.map(skill => {
                    const selfVal = wb.selfSkills[skill.id] ?? 0;
                    const leaderVal = wb.leaderSkills[skill.id] ?? 0;
                    const diff = selfVal && leaderVal ? selfVal - leaderVal : 0;

                    return (
                      <div key={skill.id} className={styles.skillRow}>
                        <div className={styles.skillMeta}>
                          <div className={styles.skillTitleRow}>
                            <h3>{skill.label}</h3>
                            {selfVal && leaderVal ? (
                              <span
                                className={styles.gapPill}
                                data-gap={diff === 0 ? "aligned" : diff > 0 ? "self" : "leader"}
                              >
                                {diff === 0
                                  ? "Alinhado"
                                  : diff > 0
                                    ? `Você +${diff}`
                                    : `Liderança +${Math.abs(diff)}`}
                              </span>
                            ) : null}
                          </div>
                          <p>{skill.hint}</p>
                        </div>

                        <div className={styles.skillRatings}>
                          <div className={styles.ratingCol}>
                            <span>Minha nota</span>
                            <div className={styles.ratingPills}>
                              {[1, 2, 3, 4, 5].map(n => (
                                <button
                                  key={n}
                                  type="button"
                                  aria-pressed={selfVal === n}
                                  onClick={() => toggleSkillRating("selfSkills", skill.id, n)}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className={styles.ratingCol}>
                            <span>Visão da liderança</span>
                            <div className={styles.ratingPills}>
                              {[1, 2, 3, 4, 5].map(n => (
                                <button
                                  key={n}
                                  type="button"
                                  data-leader="true"
                                  aria-pressed={leaderVal === n}
                                  onClick={() => toggleSkillRating("leaderSkills", skill.id, n)}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <aside className={styles.skillsSidebar}>
                  <SkillComparisonChart
                    items={skillStats.items}
                    selfAvg={skillStats.selfAvg}
                    leaderAvg={skillStats.leaderAvg}
                    ratedCount={skillStats.ratedCount}
                    leaderRatedCount={skillStats.leaderRatedCount}
                  />

                  <div className={styles.skillSummaryPanel}>
                    <dl className={styles.skillKpis}>
                      <div>
                        <dt>Minha média</dt>
                        <dd>{skillStats.selfAvg !== null ? skillStats.selfAvg.toFixed(1) : "—"}</dd>
                      </div>
                      <div>
                        <dt>Liderança</dt>
                        <dd>{skillStats.leaderAvg !== null ? skillStats.leaderAvg.toFixed(1) : "—"}</dd>
                      </div>
                      <div>
                        <dt>Diferenças</dt>
                        <dd>{skillStats.misalignments.length}</dd>
                      </div>
                    </dl>

                    <div className={styles.insightBlock}>
                      <h4>Suas forças (4–5)</h4>
                      {skillStats.topStrengths.length ? (
                        <ul>
                          {skillStats.topStrengths.map(i => (
                            <li key={i.id}><strong>{i.label}</strong> ({i.self})</li>
                          ))}
                        </ul>
                      ) : (
                        <p>Marque suas notas para destacar onde já entrega com domínio.</p>
                      )}
                    </div>

                    <div className={styles.insightBlock}>
                      <h4>Focos de evolução (1–3)</h4>
                      {skillStats.focusAreas.length ? (
                        <ul>
                          {skillStats.focusAreas.map(i => (
                            <li key={i.id}><strong>{i.label}</strong> ({i.self})</li>
                          ))}
                        </ul>
                      ) : (
                        <p>Habilidades entre 1 e 3 aparecem aqui para virarem missão do trimestre.</p>
                      )}
                    </div>

                    <div className={styles.insightBlock}>
                      <h4>Onde alinhar no 1:1</h4>
                      {skillStats.misalignments.length ? (
                        <ul>
                          {skillStats.misalignments.map(i => (
                            <li key={i.id}>
                              <strong>{i.label}:</strong>{" "}
                              {i.direction === "self_higher"
                                ? `Você marcou ${i.self}, liderança marcou ${i.leader}. Peça exemplos práticos do que faltou.`
                                : `Liderança marcou ${i.leader}, você marcou ${i.self}. Você pode estar se cobrando acima da régua.`}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>Preencha as duas notas em um item para revelar diferenças de percepção.</p>
                      )}
                    </div>
                  </div>
                </aside>
              </div>

              <aside className={styles.nudgeBox}>
                <div>
                  <strong>Seu gestor não é designer ou a calibragem ficou distante?</strong>
                  <p>
                    Na consultoria, avalio o seu momento e os seus entregáveis com o critério de quem já contratou e promoveu designers no PicPay, na Loft, na BrandLovrs e na SulAmérica.
                  </p>
                </div>
                <Link
                  href={`${consultingHref}#agendar`}
                  className={styles.nudgeCta}
                  onClick={() => track("kit_consulting_click", { placement: "skills_nudge" })}
                >
                  Conversar 30 min grátis →
                </Link>
              </aside>
            </section>
          ) : null}

          {/* ══ TAB 04: PLANO E ENTREGAS ══ */}
          {activeTab === "plano" ? (
            <section
              role="tabpanel"
              id="panel-plano"
              aria-labelledby="tab-plano"
              className={styles.panelSection}
            >
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelKicker}>Etapa 04 · Ação e evidências</p>
                  <h2>Plano do trimestre, entregas e pedido de reconhecimento</h2>
                  <p>
                    Transforme o diagnóstico em missões práticas, registre resultados na hora em que acontecem e chegue no 1:1 com fatos na mesa.
                  </p>
                </div>
              </header>

              <div role="tablist" aria-label="Blocos do plano e entregas" className={styles.subTablist}>
                <button
                  type="button"
                  role="tab"
                  id="plan-tab-trimestre"
                  aria-selected={activePlanTab === "trimestre"}
                  aria-controls="plan-panel-trimestre"
                  onClick={() => setActivePlanTab("trimestre")}
                  className={styles.subTabBtn}
                >
                  <span>4.1 Plano do trimestre</span>
                  <small>{activeMissions.length}</small>
                </button>
                <button
                  type="button"
                  role="tab"
                  id="plan-tab-entregas"
                  aria-selected={activePlanTab === "entregas"}
                  aria-controls="plan-panel-entregas"
                  onClick={() => setActivePlanTab("entregas")}
                  className={styles.subTabBtn}
                >
                  <span>4.2 Diário de entregas e retornos</span>
                  <small>{activeDeliveries.length + activeFeedbacks.length}</small>
                </button>
                <button
                  type="button"
                  role="tab"
                  id="plan-tab-reconhecimento"
                  aria-selected={activePlanTab === "reconhecimento"}
                  aria-controls="plan-panel-reconhecimento"
                  onClick={() => setActivePlanTab("reconhecimento")}
                  className={styles.subTabBtn}
                >
                  <span>4.3 Pedido de reconhecimento</span>
                  <small>1 página</small>
                </button>
              </div>

              {activePlanTab === "trimestre" ? (
                <div role="tabpanel" id="plan-panel-trimestre" aria-labelledby="plan-tab-trimestre" className={styles.subPanel}>
                  <div className={styles.grid3}>
                    <label className={styles.darkField}>
                      <span>Curto prazo (3 a 6 meses)</span>
                      <input
                        type="text"
                        placeholder="Ex.: Assumir descoberta do fluxo principal sem apoio"
                        value={wb.pdi.shortTerm}
                        onChange={e =>
                          updateWb(prev => ({ ...prev, pdi: { ...prev.pdi, shortTerm: e.target.value } }))
                        }
                      />
                    </label>
                    <label className={styles.darkField}>
                      <span>Médio prazo (6 a 12 meses)</span>
                      <input
                        type="text"
                        placeholder="Ex.: Reunir evidências consistentes de Sênior"
                        value={wb.pdi.midTerm}
                        onChange={e =>
                          updateWb(prev => ({ ...prev, pdi: { ...prev.pdi, midTerm: e.target.value } }))
                        }
                      />
                    </label>
                    <label className={styles.darkField}>
                      <span>Longo prazo (1 a 3 anos)</span>
                      <input
                        type="text"
                        placeholder="Ex.: Testar Especialista vs. Líder de Design na prática"
                        value={wb.pdi.longTerm}
                        onChange={e =>
                          updateWb(prev => ({ ...prev, pdi: { ...prev.pdi, longTerm: e.target.value } }))
                        }
                      />
                    </label>
                  </div>

                  <div className={styles.grid2}>
                    <label className={styles.darkField}>
                      <span>Fortalezas para multiplicar no time</span>
                      <textarea
                        rows={3}
                        placeholder="Onde você já gera confiança e pode ajudar outras pessoas a evoluir?"
                        value={wb.pdi.strengths}
                        onChange={e =>
                          updateWb(prev => ({ ...prev, pdi: { ...prev.pdi, strengths: e.target.value } }))
                        }
                      />
                    </label>
                    <label className={styles.darkField}>
                      <span>Focos prioritários de evolução</span>
                      <textarea
                        rows={3}
                        placeholder="Escolha 2 lacunas prioritárias das etapas anteriores, não 10 de uma vez."
                        value={wb.pdi.gaps}
                        onChange={e =>
                          updateWb(prev => ({ ...prev, pdi: { ...prev.pdi, gaps: e.target.value } }))
                        }
                      />
                    </label>
                  </div>

                  <div className={styles.listHeader}>
                    <h3>Missões do trimestre</h3>
                    {wb.pdi.missions.length < 15 ? (
                      <button
                        type="button"
                        className={styles.addBtn}
                        onClick={() =>
                          updateWb(prev => ({
                            ...prev,
                            pdi: {
                              ...prev.pdi,
                              missions: [
                                ...prev.pdi.missions,
                                { id: uid("m"), mission: "", strategy: "", audience: "", metric: "" },
                              ],
                            },
                          }))
                        }
                      >
                        + Adicionar missão
                      </button>
                    ) : null}
                  </div>

                  <div className={styles.dynamicRows}>
                    {wb.pdi.missions.map((row, index) => {
                      const patchMission = (patch: Partial<MissionRow>) =>
                        updateWb(prev => ({
                          ...prev,
                          pdi: {
                            ...prev.pdi,
                            missions: prev.pdi.missions.map(m => (m.id === row.id ? { ...m, ...patch } : m)),
                          },
                        }));

                      return (
                        <div key={row.id} className={styles.dynamicCard}>
                          <div className={styles.dynamicCardTop}>
                            <span>Missão #{index + 1}</span>
                            {wb.pdi.missions.length > 1 ? (
                              <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() =>
                                  updateWb(prev => ({
                                    ...prev,
                                    pdi: {
                                      ...prev.pdi,
                                      missions: prev.pdi.missions.filter(m => m.id !== row.id),
                                    },
                                  }))
                                }
                              >
                                Remover
                              </button>
                            ) : null}
                          </div>
                          <div className={styles.grid2}>
                            <label className={styles.darkField}>
                              <span>O quê (Missão)</span>
                              <input
                                type="text"
                                placeholder="Ex.: Liderar descoberta e redesenho do fluxo de entrada"
                                value={row.mission}
                                onChange={e => patchMission({ mission: e.target.value })}
                              />
                            </label>
                            <label className={styles.darkField}>
                              <span>Para quem (Cliente / Time)</span>
                              <input
                                type="text"
                                placeholder="Ex.: Novos clientes + time de ativação"
                                value={row.audience}
                                onChange={e => patchMission({ audience: e.target.value })}
                              />
                            </label>
                            <label className={styles.darkField}>
                              <span>Como (Caminho prático)</span>
                              <input
                                type="text"
                                placeholder="Ex.: 8 entrevistas + 2 ciclos de teste com produto e engenharia"
                                value={row.strategy}
                                onChange={e => patchMission({ strategy: e.target.value })}
                              />
                            </label>
                            <label className={styles.darkField}>
                              <span>Meta mensurável e prazo</span>
                              <input
                                type="text"
                                placeholder="Ex.: Subir conclusão na primeira semana de 42% para 55% até junho"
                                value={row.metric}
                                onChange={e => patchMission({ metric: e.target.value })}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {activePlanTab === "entregas" ? (
                <div role="tabpanel" id="plan-panel-entregas" aria-labelledby="plan-tab-entregas" className={styles.subPanel}>
                  <div className={styles.listHeader}>
                    <div>
                      <h3>Diário de entregas e impacto</h3>
                      <p className={styles.subLead}>Quem não registra impacto na hora da entrega chega na avaliação dependendo da memória do gestor.</p>
                    </div>
                    {wb.bragDoc.length < 25 ? (
                      <button
                        type="button"
                        className={styles.addBtn}
                        onClick={() =>
                          updateWb(prev => ({
                            ...prev,
                            bragDoc: [
                              ...prev.bragDoc,
                              { id: uid("b"), quarter: "", delivery: "", okr: "", impact: "", link: "" },
                            ],
                          }))
                        }
                      >
                        + Adicionar entrega
                      </button>
                    ) : null}
                  </div>

                  <div className={styles.dynamicRows}>
                    {wb.bragDoc.map((row, index) => {
                      const patchBrag = (patch: Partial<BragDocRow>) =>
                        updateWb(prev => ({
                          ...prev,
                          bragDoc: prev.bragDoc.map(b => (b.id === row.id ? { ...b, ...patch } : b)),
                        }));
                      return (
                        <div key={row.id} className={styles.dynamicCard}>
                          <div className={styles.dynamicCardTop}>
                            <span>Entrega #{index + 1}</span>
                            {wb.bragDoc.length > 1 ? (
                              <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() =>
                                  updateWb(prev => ({
                                    ...prev,
                                    bragDoc: prev.bragDoc.filter(b => b.id !== row.id),
                                  }))
                                }
                              >
                                Remover
                              </button>
                            ) : null}
                          </div>
                          <div className={styles.bragGrid}>
                            <label className={styles.darkField}>
                              <span>Ciclo</span>
                              <input
                                type="text"
                                placeholder="1º tri 2027"
                                value={row.quarter}
                                onChange={e => patchBrag({ quarter: e.target.value })}
                              />
                            </label>
                            <label className={styles.darkField}>
                              <span>O que entreguei</span>
                              <input
                                type="text"
                                placeholder="Novo fluxo de assinatura digital"
                                value={row.delivery}
                                onChange={e => patchBrag({ delivery: e.target.value })}
                              />
                            </label>
                            <label className={styles.darkField}>
                              <span>Meta do time</span>
                              <input
                                type="text"
                                placeholder="Conversão de venda B2B"
                                value={row.okr}
                                onChange={e => patchBrag({ okr: e.target.value })}
                              />
                            </label>
                            <label className={styles.darkField}>
                              <span>Impacto medido</span>
                              <input
                                type="text"
                                placeholder="+18% conclusão, -35% chamados"
                                value={row.impact}
                                onChange={e => patchBrag({ impact: e.target.value })}
                              />
                            </label>
                            <label className={styles.darkField}>
                              <span>Link da evidência</span>
                              <input
                                type="url"
                                placeholder="https://..."
                                value={row.link}
                                onChange={e => patchBrag({ link: e.target.value })}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className={styles.listHeader} style={{ marginTop: 12 }}>
                    <h3>Retornos recebidos de pares e lideranças</h3>
                    {wb.feedbacks.length < 25 ? (
                      <button
                        type="button"
                        className={styles.addBtn}
                        onClick={() =>
                          updateWb(prev => ({
                            ...prev,
                            feedbacks: [...prev.feedbacks, { id: uid("f"), date: "", from: "", note: "" }],
                          }))
                        }
                      >
                        + Registrar retorno
                      </button>
                    ) : null}
                  </div>

                  <div className={styles.dynamicRows}>
                    {wb.feedbacks.map((row, index) => {
                      const patchFb = (patch: Partial<FeedbackRow>) =>
                        updateWb(prev => ({
                          ...prev,
                          feedbacks: prev.feedbacks.map(f => (f.id === row.id ? { ...f, ...patch } : f)),
                        }));
                      return (
                        <div key={row.id} className={styles.dynamicCard}>
                          <div className={styles.dynamicCardTop}>
                            <span>Retorno #{index + 1}</span>
                            {wb.feedbacks.length > 1 ? (
                              <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() =>
                                  updateWb(prev => ({
                                    ...prev,
                                    feedbacks: prev.feedbacks.filter(f => f.id !== row.id),
                                  }))
                                }
                              >
                                Remover
                              </button>
                            ) : null}
                          </div>
                          <div className={styles.feedbackGrid}>
                            <label className={styles.darkField}>
                              <span>Quando</span>
                              <input
                                type="text"
                                placeholder="Out/2026"
                                value={row.date}
                                onChange={e => patchFb({ date: e.target.value })}
                              />
                            </label>
                            <label className={styles.darkField}>
                              <span>Quem / Papel</span>
                              <input
                                type="text"
                                placeholder="Produto ou Liderança Técnica"
                                value={row.from}
                                onChange={e => patchFb({ from: e.target.value })}
                              />
                            </label>
                            <label className={styles.darkField}>
                              <span>O que destacou</span>
                              <input
                                type="text"
                                placeholder="Fala literal sobre autonomia, alinhamento ou resultado"
                                value={row.note}
                                onChange={e => patchFb({ note: e.target.value })}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {activePlanTab === "reconhecimento" ? (
                <div role="tabpanel" id="plan-panel-reconhecimento" aria-labelledby="plan-tab-reconhecimento" className={styles.subPanel}>
                  {/* Signature warm paper sheet inside dark board */}
                  <div className={styles.paperSheet}>
                    <header className={styles.paperSheetHead}>
                      <div>
                        <span className={styles.paperKicker}>Folha do 1:1 · Pedido de reconhecimento</span>
                        <h3>Roteiro objetivo de 1 página</h3>
                        <p>Quando estiver em Domínio ou Transição, leve fatos e resultados em vez de desabafo.</p>
                      </div>
                      <button type="button" className={styles.paperPullBtn} onClick={pullBragToRecognition}>
                        Puxar entregas do diário
                      </button>
                    </header>

                    <div className={styles.recognitionGrid}>
                      <label className={styles.paperField}>
                        <span>1. Contexto atual do seu papel</span>
                        <textarea
                          rows={3}
                          placeholder="Em qual frente você atua, há quanto tempo está na cadeira e qual problema o negócio tinha?"
                          value={wb.recognition.context}
                          onChange={e =>
                            updateWb(prev => ({
                              ...prev,
                              recognition: { ...prev.recognition, context: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <label className={styles.paperField}>
                        <span>2. Principais resultados do ciclo em números</span>
                        <textarea
                          rows={4}
                          placeholder="Liste entregas ligadas a metas do time, conversão, redução de custo ou adoção."
                          value={wb.recognition.highlights}
                          onChange={e =>
                            updateWb(prev => ({
                              ...prev,
                              recognition: { ...prev.recognition, highlights: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <label className={styles.paperField}>
                        <span>3. O que já opero acima da cadeira</span>
                        <textarea
                          rows={3}
                          placeholder="Responsabilidades recorrentes da Etapa 02 que já correspondem ao papel alvo."
                          value={wb.recognition.aboveRole}
                          onChange={e =>
                            updateWb(prev => ({
                              ...prev,
                              recognition: { ...prev.recognition, aboveRole: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <label className={styles.paperField}>
                        <span>4. Por que agora</span>
                        <textarea
                          rows={3}
                          placeholder="Recorrência das evidências, retornos de pares e risco de manter escopo acima sem reconhecimento."
                          value={wb.recognition.whyNow}
                          onChange={e =>
                            updateWb(prev => ({
                              ...prev,
                              recognition: { ...prev.recognition, whyNow: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <label className={`${styles.paperField} ${styles.span2}`}>
                        <span>5. Proposta clara para este 1:1 (cargo, faixa ou combinado com data)</span>
                        <input
                          type="text"
                          placeholder="Ex.: Promoção para Sênior no ciclo de março, ou combinado de 2 entregas finais com prazo"
                          value={wb.recognition.proposal}
                          onChange={e =>
                            updateWb(prev => ({
                              ...prev,
                              recognition: { ...prev.recognition, proposal: e.target.value },
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* ══ TAB 05: RESUMO PARA O 1:1 ══ */}
          {activeTab === "resumo" ? (
            <section
              role="tabpanel"
              id="panel-resumo"
              aria-labelledby="tab-resumo"
              className={styles.panelSection}
            >
              <header className={styles.panelHeaderSplit}>
                <div>
                  <p className={styles.panelKicker}>Etapa 05 · Documento pronto</p>
                  <h2>Seu resumo para levar ao próximo 1:1</h2>
                  <p>
                    Tudo o que você preencheu nas etapas anteriores reunido em uma folha limpa. Imprima em PDF ou copie o texto pronto para colar na sua pauta.
                  </p>
                </div>
                <div className={styles.dossierActions}>
                  <button type="button" className={styles.navActionGhost} onClick={handleCopyMarkdown}>
                    {copiedMd ? <IconCheck /> : <IconCopy />}
                    <span>{copiedMd ? "Resumo copiado" : "Copiar resumo"}</span>
                  </button>
                  <button type="button" className={styles.navActionPrimary} onClick={handlePrint}>
                    <IconPrinter />
                    <span>Imprimir / Salvar PDF</span>
                  </button>
                </div>
              </header>

              <article className={styles.paperDossier}>
                <header className={styles.dossierHead}>
                  <div>
                    <span className={styles.paperKicker}>Gutto Rocha · Trilha de carreira em design</span>
                    <h3>{user.name || user.email}</h3>
                  </div>
                  <div className={styles.dossierMeta}>
                    <span>{formatRoleLabel(currentRoleObj)} → {formatRoleLabel(targetRoleObj)}</span>
                    <strong>{selectedMoment ? `Momento: ${selectedMoment.name}` : "Momento não definido"}</strong>
                    <small>Atualizado em {todayBrt}</small>
                  </div>
                </header>

                <dl className={styles.dossierKpis}>
                  <div>
                    <dt>Competências marcadas</dt>
                    <dd>{compStats.exceeds + compStats.consistent} / {compStats.total} firmes</dd>
                  </div>
                  <div>
                    <dt>Média autoavaliação</dt>
                    <dd>{skillStats.selfAvg !== null ? `${skillStats.selfAvg.toFixed(1)} / 5` : "—"}</dd>
                  </div>
                  <div>
                    <dt>Média liderança</dt>
                    <dd>{skillStats.leaderAvg !== null ? `${skillStats.leaderAvg.toFixed(1)} / 5` : "—"}</dd>
                  </div>
                  <div>
                    <dt>Entregas registradas</dt>
                    <dd>{activeDeliveries.length}</dd>
                  </div>
                </dl>

                <div className={styles.dossierGrid}>
                  <section className={styles.dossierBlock}>
                    <div className={styles.dossierBlockHead}>
                      <h4>1. Momento na cadeira</h4>
                      <button type="button" onClick={() => switchTab("momento", true)}>Editar</button>
                    </div>
                    {selectedMoment ? (
                      <>
                        <p><strong>{selectedMoment.name}:</strong> {selectedMoment.summary}</p>
                        <p className={styles.dossierQuote}>Pergunta pro 1:1: “{selectedMoment.oneOnOneQuestion}”</p>
                        {wb.momentNote.trim() ? <p>{wb.momentNote}</p> : null}
                      </>
                    ) : (
                      <p className={styles.dossierEmpty}>Nenhum momento escolhido ainda na Etapa 01.</p>
                    )}
                  </section>

                  <section className={styles.dossierBlock}>
                    <div className={styles.dossierBlockHead}>
                      <h4>2. Habilidades e alinhamento</h4>
                      <button type="button" onClick={() => switchTab("habilidades", true)}>Editar</button>
                    </div>
                    {skillStats.topStrengths.length || skillStats.misalignments.length || skillStats.focusAreas.length ? (
                      <ul className={styles.dossierList}>
                        {skillStats.topStrengths.length ? (
                          <li><strong>Forças (4–5):</strong> {skillStats.topStrengths.map(s => `${s.label} (${s.self})`).join(", ")}</li>
                        ) : null}
                        {skillStats.focusAreas.length ? (
                          <li><strong>Focos para evoluir:</strong> {skillStats.focusAreas.map(s => `${s.label} (${s.self})`).join(", ")}</li>
                        ) : null}
                        {skillStats.misalignments.map(m => (
                          <li key={m.id}>
                            <strong>Diferença em {m.label}:</strong> Você {m.self} × Liderança {m.leader}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.dossierEmpty}>Marque suas notas de 1 a 5 na Etapa 03 para resumir seus pontos fortes e diferenças.</p>
                    )}
                  </section>

                  <section className={styles.dossierBlock}>
                    <div className={styles.dossierBlockHead}>
                      <h4>3. Missões do trimestre</h4>
                      <button type="button" onClick={() => { setActivePlanTab("trimestre"); switchTab("plano", true); }}>Editar</button>
                    </div>
                    {activeMissions.length ? (
                      <ul className={styles.dossierList}>
                        {activeMissions.map(m => (
                          <li key={m.id}>
                            <strong>{m.mission || "Missão"}:</strong> {[m.strategy, m.metric].filter(Boolean).join(" · ")}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.dossierEmpty}>Adicione ao menos uma missão mensurável na Etapa 04.</p>
                    )}
                  </section>

                  <section className={styles.dossierBlock}>
                    <div className={styles.dossierBlockHead}>
                      <h4>4. Entregas e reconhecimento</h4>
                      <button type="button" onClick={() => { setActivePlanTab("reconhecimento"); switchTab("plano", true); }}>Editar</button>
                    </div>
                    {activeDeliveries.length || wb.recognition.proposal.trim() || wb.recognition.highlights.trim() ? (
                      <ul className={styles.dossierList}>
                        {activeDeliveries.slice(0, 4).map(d => (
                          <li key={d.id}>
                            <strong>{d.quarter ? `[${d.quarter}] ` : ""}{d.delivery}</strong>
                            {d.impact ? ` · ${d.impact}` : ""}
                          </li>
                        ))}
                        {wb.recognition.proposal.trim() ? (
                          <li><strong>Proposta no 1:1:</strong> {wb.recognition.proposal}</li>
                        ) : null}
                      </ul>
                    ) : (
                      <p className={styles.dossierEmpty}>Registre suas entregas ou preencha a folha de reconhecimento na Etapa 04.</p>
                    )}
                  </section>
                </div>
              </article>
            </section>
          ) : null}

          {/* ─── Bottom Stepper Navigation ─── */}
          <footer className={styles.stepFooter}>
            {prevTab ? (
              <button type="button" className={styles.stepNavBtn} onClick={() => switchTab(prevTab.id, true)}>
                ← Anterior: {prevTab.label}
              </button>
            ) : <span />}
            {nextTab ? (
              <button type="button" className={styles.stepNavPrimary} onClick={() => switchTab(nextTab.id, true)}>
                Próxima etapa: {nextTab.num} · {nextTab.label} →
              </button>
            ) : null}
          </footer>
        </div>

        {/* ─── SIGNATURE CAREER CONSULTING SHOWCASE ─── */}
        <section id="consultoria" className={styles.consultingShowcase} aria-labelledby="consultoria-title">
          <div className={styles.consultingTop}>
            <div className={styles.consultingCopy}>
              <p className={styles.consultingKicker}>Próximo passo opcional · Consultoria individual</p>
              <h2 id="consultoria-title">
                A trilha mostra onde você está.
                <span> A consultoria destrava o próximo passo.</span>
              </h2>
              <p className={styles.consultingLead}>
                Se ao preencher as etapas você enxergou o problema, mas não quer encarar o 1:1, uma troca de empresa ou a dúvida entre gestão e especialista no escuro, desenhamos seu plano em cima dos seus casos reais.
              </p>
              <dl className={styles.consultingProof}>
                {consulting.hero.proof.map(p => (
                  <div key={p.label}>
                    <dt>{p.value}</dt>
                    <dd>{p.label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className={styles.consultingOffer}>
              <p className={styles.offerTag}>Projeto fechado · sem mensalidade</p>
              <h3>Como resolvemos em 5 semanas</h3>
              <ol>
                <li>
                  <strong>Conversa de mapeamento grátis (30 min)</strong>
                  <span>Você conta o momento e o que travou. Eu digo com honestidade se a consultoria resolve e fecho o escopo.</span>
                </li>
                <li>
                  <strong>4 conversas de 1 hora por vídeo</strong>
                  <span>Lemos onde você está, comparamos opções reais, fechamos a decisão e ensaiamos a conversa difícil antes da hora.</span>
                </li>
                <li>
                  <strong>Plano escrito no fim do projeto</strong>
                  <span>Você sai com o caso montado, critérios, prazos e roteiro para seguir sem depender de mim.</span>
                </li>
              </ol>
              <p className={styles.offerPrice}>
                {consulting.price.from} <strong>{consulting.price.value}</strong> pelo projeto inteiro · emito nota fiscal se a empresa for pagar.
              </p>
            </div>
          </div>

          <ul className={styles.consultingCases}>
            <li>
              <strong>“Entrego acima do cargo e o reconhecimento não vem.”</strong>
              <span>Transformamos seu diário de entregas da Etapa 04 em caso escrito com critérios, números e prazo fechado para o 1:1.</span>
            </li>
            <li>
              <strong>“Especialista ou gestão? Tenho medo de escolher errado.”</strong>
              <span>Comparamos os prós, os custos reais e os salários de especialista vs. liderança antes de você aceitar ou recusar convites.</span>
            </li>
            <li>
              <strong>“Meu gestor não é designer e não sabe me calibrar.”</strong>
              <span>Você recebe leitura técnica direta da Etapa 03 e narrativa clara para defender valor de design para liderança de produto e negócio.</span>
            </li>
          </ul>

          <div className={styles.consultingActions}>
            <Link
              href={`${consultingHref}#agendar`}
              className={styles.consultingPrimary}
              onClick={() => track("kit_consulting_click", { placement: "showcase_primary" })}
            >
              Marcar conversa grátis de 30 min →
            </Link>
            <Link
              href={consultingHref}
              className={styles.consultingSecondary}
              onClick={() => track("kit_consulting_click", { placement: "showcase_details" })}
            >
              Ver página da consultoria
            </Link>
            {contact.whatsapp ? (
              <a
                href={contact.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.consultingSecondary}
                onClick={() => track("kit_consulting_click", { placement: "showcase_whatsapp" })}
              >
                Tirar dúvida no WhatsApp
              </a>
            ) : null}
          </div>
        </section>
      </main>

      <footer className={`${styles.studioFoot} ${styles.noPrint}`}>
        <p>{careerTrack.material.footer}</p>
        <div className={styles.footLinks}>
          <Link href="/recursos/salario-em-design">Calcular minha faixa na régua salarial →</Link>
          <Link href="/termos-de-uso">Termos de uso</Link>
        </div>
      </footer>

      {/* ─── DEDICATED A4 WHITE PRINT COMPILATION (printed regardless of active tab) ─── */}
      <article className={styles.printDoc} aria-hidden="true">
        <header className={styles.printDocHead}>
          <p>Gutto Rocha · Design Resources · Trilha de carreira em design</p>
          <h1>{user.name || user.email}</h1>
          <p className={styles.printDocMeta}>
            Papel: {formatRoleLabel(currentRoleObj)} → {formatRoleLabel(targetRoleObj)} · Momento: {selectedMoment ? selectedMoment.name : "Não definido"} · Gerado em {todayBrt}
          </p>
        </header>

        <section className={styles.printSection}>
          <h2>1. Momento na cadeira</h2>
          <p>
            <strong>{selectedMoment ? `${selectedMoment.name} (${selectedMoment.tagline})` : "Não selecionado"}</strong>
            {selectedMoment ? ` — ${selectedMoment.summary}` : ""}
          </p>
          {wb.momentNote.trim() ? <p>Observação da semana: {wb.momentNote.trim()}</p> : null}
        </section>

        <section className={styles.printSection}>
          <h2>2. Mapa de competências ({compStats.marked}/{compStats.total} marcadas)</h2>
          <p className={styles.printStatsRow}>
            Já no alvo: {compStats.exceeds} · Consistente: {compStats.consistent} · Oscilo: {compStats.inconsistent} · Ainda não: {compStats.notYet}
          </p>
          <table className={styles.printTable}>
            <thead>
              <tr>
                <th>Eixo / Competência</th>
                <th>Status atual</th>
                <th>Alvo ({targetRoleObj.name})</th>
              </tr>
            </thead>
            <tbody>
              {COMPETENCY_AXES.flatMap(axis =>
                axis.dimensions.map(dim => {
                  const st = COMPETENCY_STATUS_OPTIONS.find(o => o.id === wb.competencies[dim.id])?.label ?? "—";
                  return (
                    <tr key={dim.id}>
                      <td><strong>{dim.name}</strong></td>
                      <td>{st}</td>
                      <td>{dim.levels[targetRoleObj.id]}</td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </section>

        <section className={styles.printSection}>
          <h2>3. Habilidades (1 a 5) · Minha média: {skillStats.selfAvg ?? "—"} · Liderança: {skillStats.leaderAvg ?? "—"}</h2>
          <table className={styles.printTable}>
            <thead>
              <tr>
                <th>Habilidade</th>
                <th>Minha nota</th>
                <th>Liderança</th>
                <th>Diferença</th>
              </tr>
            </thead>
            <tbody>
              {skillStats.items.map(s => (
                <tr key={s.id}>
                  <td>{s.label}</td>
                  <td>{s.self ?? "—"}</td>
                  <td>{s.leader ?? "—"}</td>
                  <td>{s.diff === null ? "—" : s.diff === 0 ? "Alinhado" : s.diff > 0 ? `+${s.diff}` : `${s.diff}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.printSection}>
          <h2>4. Plano do trimestre, entregas e pedido de reconhecimento</h2>
          <ul className={styles.printList}>
            {wb.pdi.shortTerm.trim() ? <li><strong>Curto prazo (3–6m):</strong> {wb.pdi.shortTerm.trim()}</li> : null}
            {wb.pdi.midTerm.trim() ? <li><strong>Médio prazo (6–12m):</strong> {wb.pdi.midTerm.trim()}</li> : null}
            {wb.pdi.longTerm.trim() ? <li><strong>Longo prazo (1–3a):</strong> {wb.pdi.longTerm.trim()}</li> : null}
            {wb.pdi.strengths.trim() ? <li><strong>Fortalezas:</strong> {wb.pdi.strengths.trim()}</li> : null}
            {wb.pdi.gaps.trim() ? <li><strong>Focos de evolução:</strong> {wb.pdi.gaps.trim()}</li> : null}
          </ul>

          {activeMissions.length ? (
            <>
              <h3>Missões do trimestre</h3>
              <ul className={styles.printList}>
                {activeMissions.map(m => (
                  <li key={m.id}>
                    <strong>{m.mission || "Missão"}:</strong> Como: {m.strategy || "—"} | Para quem: {m.audience || "—"} | Meta: {m.metric || "—"}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {activeDeliveries.length ? (
            <>
              <h3>Diário de entregas</h3>
              <ul className={styles.printList}>
                {activeDeliveries.map(b => (
                  <li key={b.id}>
                    <strong>{b.quarter ? `[${b.quarter}] ` : ""}{b.delivery || "Entrega"}:</strong> Meta: {b.okr || "—"} · Impacto: {b.impact || "—"}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {activeFeedbacks.length ? (
            <>
              <h3>Retornos recebidos</h3>
              <ul className={styles.printList}>
                {activeFeedbacks.map(f => (
                  <li key={f.id}><strong>{f.date || "Data"} · {f.from || "Par"}:</strong> {f.note}</li>
                ))}
              </ul>
            </>
          ) : null}

          <div className={styles.printRecognition}>
            <h3>Pedido de reconhecimento para o 1:1</h3>
            {wb.recognition.context.trim() ? <p><strong>Contexto:</strong> {wb.recognition.context}</p> : null}
            {wb.recognition.highlights.trim() ? <p><strong>Resultados:</strong> {wb.recognition.highlights}</p> : null}
            {wb.recognition.aboveRole.trim() ? <p><strong>Atuação acima da cadeira:</strong> {wb.recognition.aboveRole}</p> : null}
            {wb.recognition.whyNow.trim() ? <p><strong>Por que agora:</strong> {wb.recognition.whyNow}</p> : null}
            {wb.recognition.proposal.trim() ? <p><strong>Proposta:</strong> {wb.recognition.proposal}</p> : null}
          </div>
        </section>
      </article>
    </div>
  );
}
