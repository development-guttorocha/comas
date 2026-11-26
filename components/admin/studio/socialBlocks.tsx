"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { useState } from "react";
import MuapiGeneratorDialog from "../MuapiGeneratorDialog";
import { CloseIcon, ImageIcon, PlusIcon } from "../icons";
import admin from "../admin.module.css";
import st from "./studioEditor.module.css";

function parseItems(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // ignore
  }
  return ["Primeiro item do checklist"];
}

/* ---------- 1. Capa (/capa) ---------- */
export const SocialCoverBlock = createReactBlockSpec(
  {
    type: "socialCover",
    propSchema: {
      eyebrow: { default: "TEXTO EM CICLO" },
      title: { default: "Título forte que prende a atenção" },
      subtitle: { default: "Uma linha curta explicando o que o leitor vai aprender." },
      cta: { default: "Arraste para ver →" },
      imageUrl: { default: "" },
      imageOverlay: { default: 0.78 },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const [muapiOpen, setMuapiOpen] = useState(false);
      const set = (props: Partial<typeof block.props>) => editor.updateBlock(block, { props });
      return (
        <div className={st.card} contentEditable={false}>
          <div className={st.cardHead}>
            <span className={`${st.badge} ${st.badgeAccent}`}>Slide · Capa</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className={`${admin.button} ${admin.small}`} onClick={() => setMuapiOpen(true)}>
                <ImageIcon />{block.props.imageUrl ? "Trocar fundo IA" : "Fundo IA (MuAPI)"}
              </button>
              {block.props.imageUrl ? (
                <button type="button" className={`${admin.button} ${admin.ghost} ${admin.small}`} onClick={() => set({ imageUrl: "" })}>
                  Remover fundo
                </button>
              ) : null}
            </div>
          </div>
          <div className={st.cardBody}>
            <input
              className={st.inlineSmall}
              value={block.props.eyebrow}
              onChange={e => set({ eyebrow: e.target.value })}
              placeholder="Etiqueta superior (ex: MÉTODO DE ESCRITA)"
            />
            <textarea
              className={st.inlineTitle}
              rows={2}
              value={block.props.title}
              onChange={e => set({ title: e.target.value })}
              placeholder="Título da capa (use *asteriscos* para destacar)"
            />
            <textarea
              className={st.inlineText}
              rows={2}
              value={block.props.subtitle}
              onChange={e => set({ subtitle: e.target.value })}
              placeholder="Subtítulo curto…"
            />
            <input
              className={st.inlineSmall}
              value={block.props.cta}
              onChange={e => set({ cta: e.target.value })}
              placeholder="Chamada (ex: Arraste para ver →)"
            />
            {block.props.imageUrl ? (
              <div className={st.thumbBar}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.props.imageUrl} alt="" className={st.thumbImg} />
                <label className={admin.rangeField} style={{ flex: 1 }}>
                  <span className={admin.rangeHead}>
                    <span>Véu de leitura</span>
                    <strong>{Math.round(block.props.imageOverlay * 100)}%</strong>
                  </span>
                  <input
                    type="range"
                    min={0.25}
                    max={0.92}
                    step={0.03}
                    value={block.props.imageOverlay}
                    onChange={e => set({ imageOverlay: Number(e.target.value) })}
                  />
                </label>
              </div>
            ) : null}
          </div>
          <MuapiGeneratorDialog
            open={muapiOpen}
            kindFilter="image"
            inlineDataUrl
            defaultPrompt={`Fotografia editorial minimalista sobre escrita, caderno de papel creme e luz natural, sem texto, inspirado em: ${block.props.title}`}
            onResult={url => set({ imageUrl: url })}
            onClose={() => setMuapiOpen(false)}
          />
        </div>
      );
    },
  },
);

/* ---------- 2. Antes × Depois (/antes-depois) ---------- */
export const SocialBeforeAfterBlock = createReactBlockSpec(
  {
    type: "socialBeforeAfter",
    propSchema: {
      eyebrow: { default: "ANTES × DEPOIS" },
      title: { default: "Compare as duas versões" },
      wrongLabel: { default: "Evite assim" },
      wrongText: { default: "Vamos estar realizando a entrega do material no decorrer da semana." },
      rightLabel: { default: "Prefira assim" },
      rightText: { default: "Entregaremos o material nesta semana." },
      note: { default: "Corte verbos auxiliares para dar ritmo e clareza." },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const set = (props: Partial<typeof block.props>) => editor.updateBlock(block, { props });
      return (
        <div className={st.card} contentEditable={false}>
          <div className={st.cardHead}>
            <span className={`${st.badge} ${st.badgeAccent}`}>Slide · Antes × Depois</span>
            <input
              className={st.inlineSmall}
              style={{ width: 160, textAlign: "right" }}
              value={block.props.eyebrow}
              onChange={e => set({ eyebrow: e.target.value })}
            />
          </div>
          <div className={st.cardBody}>
            <input
              className={st.inlineTitle}
              value={block.props.title}
              onChange={e => set({ title: e.target.value })}
              placeholder="Título do comparativo"
            />
            <div className={st.compareGrid}>
              <div className={`${st.compareBox} ${st.compareWrong}`}>
                <span className={st.tagWrong}>✕ {block.props.wrongLabel}</span>
                <textarea
                  className={st.inlineText}
                  rows={3}
                  value={block.props.wrongText}
                  onChange={e => set({ wrongText: e.target.value })}
                  placeholder="Frase com erro ou truncada…"
                />
              </div>
              <div className={`${st.compareBox} ${st.compareRight}`}>
                <span className={st.tagRight}>✓ {block.props.rightLabel}</span>
                <textarea
                  className={st.inlineText}
                  rows={3}
                  value={block.props.rightText}
                  onChange={e => set({ rightText: e.target.value })}
                  placeholder="Frase fluida e reescrita…"
                />
              </div>
            </div>
            <input
              className={st.inlineSmall}
              value={block.props.note}
              onChange={e => set({ note: e.target.value })}
              placeholder="Explicação curta do porquê funciona melhor…"
            />
          </div>
        </div>
      );
    },
  },
);

/* ---------- 3. Passo / Ciclo (/passo) ---------- */
export const SocialStepBlock = createReactBlockSpec(
  {
    type: "socialStep",
    propSchema: {
      stepNumber: { default: "01" },
      eyebrow: { default: "PASSO 01" },
      title: { default: "Ideia principal deste passo" },
      body: { default: "Explique em 2 ou 3 frases objetivas. Use *asteriscos* para destacar palavras-chave." },
      tip: { default: "Dica prática: leia em voz alta para testar o ritmo." },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const set = (props: Partial<typeof block.props>) => editor.updateBlock(block, { props });
      return (
        <div className={st.card} contentEditable={false}>
          <div className={st.cardHead}>
            <span className={st.badge}>Slide · Passo / Ciclo</span>
            <input
              className={`${st.inlineSmall} ${admin.mono}`}
              style={{ width: 64, textAlign: "right", color: "#e28663", fontWeight: 700 }}
              value={block.props.stepNumber}
              onChange={e => set({ stepNumber: e.target.value, eyebrow: `PASSO ${e.target.value}` })}
              aria-label="Número do passo"
            />
          </div>
          <div className={st.cardBody}>
            <input
              className={st.inlineTitle}
              value={block.props.title}
              onChange={e => set({ title: e.target.value })}
              placeholder="Título do passo"
            />
            <textarea
              className={st.inlineText}
              rows={3}
              value={block.props.body}
              onChange={e => set({ body: e.target.value })}
              placeholder="Explicação clara…"
            />
            <div className={st.tipRow}>
              <input
                className={st.inlineSmall}
                style={{ color: "var(--soft)" }}
                value={block.props.tip}
                onChange={e => set({ tip: e.target.value })}
                placeholder="Destaque / Dica prática (opcional)…"
              />
            </div>
          </div>
        </div>
      );
    },
  },
);

/* ---------- 4. Checklist (/checklist) ---------- */
export const SocialChecklistBlock = createReactBlockSpec(
  {
    type: "socialChecklist",
    propSchema: {
      eyebrow: { default: "CHECKLIST" },
      title: { default: "Antes de entregar seu texto, confira:" },
      itemsJson: { default: JSON.stringify(["Primeiro ponto de revisão", "Segundo ponto de revisão", "Terceiro ponto de revisão"]) },
      footerNote: { default: "" },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const items = parseItems(block.props.itemsJson);
      const set = (props: Partial<typeof block.props>) => editor.updateBlock(block, { props });
      const updateItem = (i: number, value: string) => {
        const next = items.map((x, idx) => (idx === i ? value : x));
        set({ itemsJson: JSON.stringify(next) });
      };
      const addItem = () => set({ itemsJson: JSON.stringify([...items, ""]) });
      const removeItem = (i: number) => {
        if (items.length <= 1) return;
        set({ itemsJson: JSON.stringify(items.filter((_, idx) => idx !== i)) });
      };
      return (
        <div className={st.card} contentEditable={false}>
          <div className={st.cardHead}>
            <span className={st.badge}>Slide · Checklist</span>
            <button type="button" className={`${admin.button} ${admin.ghost} ${admin.small}`} onClick={addItem}>
              <PlusIcon />Item
            </button>
          </div>
          <div className={st.cardBody}>
            <input
              className={st.inlineTitle}
              value={block.props.title}
              onChange={e => set({ title: e.target.value })}
              placeholder="Título do checklist"
            />
            <div style={{ display: "grid", gap: 6 }}>
              {items.map((item, i) => (
                <div key={i} className={st.checkItem}>
                  <span className={st.checkMark}>✓</span>
                  <input
                    className={st.inlineText}
                    value={item}
                    onChange={e => updateItem(i, e.target.value)}
                    placeholder={`Item ${i + 1}…`}
                  />
                  {items.length > 1 ? (
                    <button
                      type="button"
                      className={`${admin.button} ${admin.ghost} ${admin.iconButton}`}
                      onClick={() => removeItem(i)}
                      aria-label="Remover item"
                    >
                      <CloseIcon />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <input
              className={st.inlineSmall}
              value={block.props.footerNote}
              onChange={e => set({ footerNote: e.target.value })}
              placeholder="Observação final (opcional)…"
            />
          </div>
        </div>
      );
    },
  },
);

/* ---------- 5. Nota / Citação (/nota) ---------- */
export const SocialQuoteBlock = createReactBlockSpec(
  {
    type: "socialQuote",
    propSchema: {
      eyebrow: { default: "NOTA DE CADERNO" },
      quote: { default: "Escrever bem não é usar palavras difíceis; é fazer o leitor entender na primeira leitura." },
      author: { default: "Renata · Texto em Ciclo" },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const set = (props: Partial<typeof block.props>) => editor.updateBlock(block, { props });
      return (
        <div className={st.card} contentEditable={false}>
          <div className={st.cardHead}>
            <span className={st.badge}>Slide · Nota / Citação</span>
          </div>
          <div className={st.cardBody}>
            <textarea
              className={st.inlineTitle}
              rows={3}
              value={block.props.quote}
              onChange={e => set({ quote: e.target.value })}
              placeholder="Frase ou reflexão memorável…"
            />
            <input
              className={st.inlineSmall}
              value={block.props.author}
              onChange={e => set({ author: e.target.value })}
              placeholder="Assinatura (ex: Renata · Texto em Ciclo)"
            />
          </div>
        </div>
      );
    },
  },
);

/* ---------- 6. Imagem Editorial IA (/imagem-ia) ---------- */
export const SocialImageBlock = createReactBlockSpec(
  {
    type: "socialImage",
    propSchema: {
      eyebrow: { default: "REPERTÓRIO VISUAL" },
      title: { default: "" },
      caption: { default: "Legenda curta sobre a imagem" },
      imageUrl: { default: "" },
      imageOverlay: { default: 0.42 },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const [muapiOpen, setMuapiOpen] = useState(false);
      const set = (props: Partial<typeof block.props>) => editor.updateBlock(block, { props });
      return (
        <div className={st.card} contentEditable={false}>
          <div className={st.cardHead}>
            <span className={`${st.badge} ${st.badgeAccent}`}>Slide · Imagem IA (MuAPI)</span>
            <button type="button" className={`${admin.button} ${admin.small}`} onClick={() => setMuapiOpen(true)}>
              <ImageIcon />{block.props.imageUrl ? "Gerar outra" : "Gerar com MuAPI"}
            </button>
          </div>
          <div className={st.cardBody}>
            {block.props.imageUrl ? (
              <div className={st.thumbBar}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.props.imageUrl} alt="" className={st.thumbImg} />
                <span className={admin.hint} style={{ flex: 1 }}>Imagem pronta no slide</span>
                <button type="button" className={`${admin.button} ${admin.ghost} ${admin.small}`} onClick={() => set({ imageUrl: "" })}>
                  Limpar
                </button>
              </div>
            ) : (
              <p className={admin.hint} style={{ margin: 0 }}>Clique em “Gerar com MuAPI” para criar uma fotografia ou ilustração editorial.</p>
            )}
            <input
              className={st.inlineTitle}
              value={block.props.title}
              onChange={e => set({ title: e.target.value })}
              placeholder="Título sobre a imagem (opcional)"
            />
            <input
              className={st.inlineText}
              value={block.props.caption}
              onChange={e => set({ caption: e.target.value })}
              placeholder="Legenda curta…"
            />
          </div>
          <MuapiGeneratorDialog
            open={muapiOpen}
            kindFilter="image"
            inlineDataUrl
            defaultPrompt={block.props.title || block.props.caption || "Fotografia editorial minimalista de caderno, café e livros"}
            onResult={url => set({ imageUrl: url })}
            onClose={() => setMuapiOpen(false)}
          />
        </div>
      );
    },
  },
);

/* ---------- 7. CTA Final (/cta) ---------- */
export const SocialCtaBlock = createReactBlockSpec(
  {
    type: "socialCta",
    propSchema: {
      eyebrow: { default: "SALVE PARA CONSULTAR" },
      title: { default: "Este conteúdo te ajudou?" },
      body: { default: "Salve para revisar antes do seu próximo texto e envie para quem precisa desta dica." },
      buttonLabel: { default: "Comente sua dúvida aqui embaixo ↓" },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const set = (props: Partial<typeof block.props>) => editor.updateBlock(block, { props });
      return (
        <div className={st.card} contentEditable={false}>
          <div className={st.cardHead}>
            <span className={st.badge}>Slide · CTA Final</span>
          </div>
          <div className={st.cardBody}>
            <input
              className={st.inlineTitle}
              value={block.props.title}
              onChange={e => set({ title: e.target.value })}
              placeholder="Pergunta ou chamada final"
            />
            <textarea
              className={st.inlineText}
              rows={2}
              value={block.props.body}
              onChange={e => set({ body: e.target.value })}
              placeholder="Convite para salvar / compartilhar…"
            />
            <input
              className={st.inlineSmall}
              style={{ color: "#e28663", fontWeight: 600 }}
              value={block.props.buttonLabel}
              onChange={e => set({ buttonLabel: e.target.value })}
              placeholder="Botão de destaque…"
            />
          </div>
        </div>
      );
    },
  },
);

/* ---------- 8. Quebra de Slide (/slide) ---------- */
export const SlideBreakBlock = createReactBlockSpec(
  {
    type: "slideBreak",
    propSchema: {},
    content: "none",
  },
  {
    render: () => (
      <div className={st.slideBreak} contentEditable={false}>
        <span>Novo slide</span>
      </div>
    ),
  },
);
