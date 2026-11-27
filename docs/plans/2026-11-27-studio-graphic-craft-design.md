# Estúdio Texto em Ciclo — 3 Famílias Gráficas & Acabamento Visual Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corrigir os 5 defeitos gráficos do motor de slides do `@textoemciclo` (pílulas esticadas vazias, buracos verticais fixos, falha de contraste WCAG em paletas escuras, faux-bold em `Archivo Black` e superfícies chapadas) e expandir o catálogo para **15 modelos de alto acabamento** organizados em **3 famílias gráficas** (`editorial`, `minimal`, `pop`).

**Architecture:** Mantemos a separação em 3 camadas do Estúdio (`SlideContent` semântico, `layoutId` + elementos posicionados em `1080×1350` / `1080×1920`, e `paletteId`). Adicionamos medição óptica determinística (`measureTextHeight`) para empilhamento e centralização vertical dinâmica, cálculo real de luminância relativa WCAG 2.1 (`contrastRatio >= 4.5`), propriedades visuais ricas (`hug`, `shadow`, `borderWidth`, `borderColor` e novas formas vetoriais) em `CanvasSlideView.tsx`, e filtragem/aplicação por estilo gráfico no painel `Modelos` e na geração de variações por IA.

**Tech Stack:** TypeScript, Next.js 16.3.8, React 19, CSS Modules, `node:test`, Playwright/Chromium (validação visual em PNG real `1080×1350`).

---

## Diagnóstico Gráfico Validado

1. **Pílulas e tarjas esticadas com vazio lateral (`CanvasSlideView.tsx`)**: `width: "100%"` + `alignItems: "stretch"` transformavam rótulos curtos (`"ANTES"`, `"REPERTÓRIO"`) em tubos largos meio vazios. Solução: `hug?: boolean` renderizando `width: "fit-content"`, `maxWidth: "100%"` alinhado à esquerda/centro/direita.
2. **Buracos verticais por coordenadas `Y` fixas (`lib/social/canvas.ts`)**: títulos curtos deixavam ~350px em branco antes do sublinhado/subtítulo; títulos longos espremiam ou encolhiam demais. Solução: `measureTextHeight` + cursor vertical dinâmico centralizado opticamente dentro de `contentFrame(aspect)`.
3. **Contraste WCAG reprovado em paletas escuras (`indigo_mostarda`)**: `wrong: "#FF8A80"` e `right: "#7AE5B8"` com `color: "white"` geravam razão `1.5:1`–`1.9:1`. Solução: `contrastRatio(fg, bg)` com luminância WCAG 2.1 em `resolveColor("contrast", palette, behind)`, garantindo sempre `>= 4.5:1`.
4. **Faux-bold e tipografia sem refinamento óptico**: `Archivo Black` (`font: "display"`) só possui peso `400`; pedir `weight: 900` gerava borramento sintético no navegador. Solução: `fontWeight: 400` para `display`, `textWrap: "balance"` em títulos (`size >= 48`), tracking óptico por família e assinatura editorial no rodapé (`@textoemciclo` + `01/06 →`).
5. **3 Famílias Gráficas Completas (15 Layouts)**:
   - **`editorial` (Editorial & Caderno — 5 layouts)**: `manchete` (*Capa Revista*), `verbete` (*Ficha de Dicionário*), `passo` (*Folha de Caderno*), `citacao` (*Página Literária*), `checklist` (*Ficha de Revisão*).
   - **`minimal` (Minimalista / Suíço — 5 layouts)**: `suico` (*Grid Suíço*), `antes-depois` (*Comparativo em Fios*), `indice` (*Grande Número*), `impacto` (*Frase Pura*), `foto-dividida` (*Foto Editorial*).
   - **`pop` (Colagem Pop / Neobrutalista — 5 layouts)**: `manifesto` (*Tarjas de Pôster*), `neobrutal` (*Cartão Pop*), `post-it` (*Post-it Colagem*), `foto-tarja` (*Foto + Tarja Pop*), `chamada` (*Chamada Pop*).

---

### Task 1: Testes Automatizados de Contraste WCAG, Ritmo Óptico e 3 Famílias (TDD RED)

**Files:**
- Modify: `lib/social/canvas.test.ts`

**Step 1: Escrever os novos testes falhando em `lib/social/canvas.test.ts`**
- Testar `STYLE_FAMILIES` (`editorial`, `minimal`, `pop`) com pelo menos 5 layouts cada (total 15).
- Testar `contrastRatio(textHex, effectiveBgHex) >= 4.5` em todos os elementos de texto (`role !== "decor"`) nos 15 layouts × 5 paletas `@textoemciclo`.
- Testar empilhamento óptico dinâmico em `manchete` (título curto aproxima sublinhado/subtítulo; título longo empurra sem sobreposição).
- Testar `hug === true` em pílulas/tarjas curtas e filtragem por família em `slidesFromCompiled` e `remixLayoutId`.

**Step 2: Rodar `npm test` para verificar falha esperada (RED)**
Run: `npm test`
Expected: FAIL porque `contrastRatio`, `STYLE_FAMILIES` e os 15 layouts ainda não existem.

---

### Task 2: Motor Gráfico, Contraste WCAG, Medição Óptica e 15 Layouts (TDD GREEN)

**Files:**
- Modify: `lib/social/canvas.ts`
- Modify: `components/social/CanvasSlideView.tsx`

**Step 1: Implementar contraste WCAG, `measureTextHeight`, tipos gráficos e os 15 layouts em `lib/social/canvas.ts`**
- Exportar `StyleFamily`, `STYLE_FAMILIES`, `contrastRatio`, `measureTextHeight`, `layoutsFor(kind, family)` e suporte a `family?: StyleFamily | "all"` em `slidesFromCompiled`, `canvasFromCompiled` e `remixLayoutId`.
- Implementar os 15 layouts com hierarquia tipográfica, margens generosas, `hug: true` em etiquetas/tarjas, sombras (`soft`, `hard`, `note`), bordas e formas vetoriais (`frame`, `notebook-margin`, `badge-star`, `quote-mark`).

**Step 2: Atualizar `components/social/CanvasSlideView.tsx` para renderizar o acabamento gráfico**
- Respeitar `el.hug` (`width: "fit-content"`, `maxWidth: "100%"`), `el.shadow`, `el.borderWidth` e `el.borderColor`.
- Corrigir `font === "display"` para `fontWeight: 400`, aplicar `textWrap: "balance"` em títulos, canto dobrado sutil em `note`, textura de papel acolhedora e novas formas SVG (`frame`, `notebook-margin`, `badge-star`, `quote-mark`).

**Step 3: Rodar `npm test` para verificar aprovação total (GREEN)**
Run: `npm test`
Expected: PASS em 100% dos testes.

---

### Task 3: Seleção de Família Gráfica no Painel e nas Variações de IA

**Files:**
- Modify: `components/admin/studio/AdminStudioEditor.tsx`
- Modify: `components/admin/studio/studioEditor.module.css`
- Modify: `lib/social/ai.ts`

**Step 1: Adicionar filtro simples de estilo na aba `Modelos` (`Todos`, `Editorial`, `Minimalista`, `Colagem`) + botão *"Aplicar estilo no post inteiro"***
**Step 2: Fazer `generateStudioVariations` variar a família gráfica (`editorial`, `minimal`, `pop`) além da paleta**
**Step 3: Verificar tipos e testes (`npm run check:types && npm test`)**

---

### Task 4: Validação Visual Rigorosa em PNG Real (`@ui-visual-validator`)

**Files:**
- Temporary render harness in `/tmp/` (removido após inspeção)

**Step 1: Renderizar os 15 modelos em `1080×1350` nas paletas claras e escuras + captura da interface `/admin/estudio/[id]`**
**Step 2: Inspecionar cada prancha PNG com `view_file` aplicando o checklist `@ui-visual-validator` (alinhamento, respiro, ausência de cortes, pílulas ajustadas, contraste e apelo gráfico)**
**Step 3: Ajustar qualquer microdetalhe visual encontrado nas capturas e re-renderizar até ficar impecável**

---

### Task 5: Verificação Final e Push (`@verification-before-completion`)

**Step 1: Rodar `npx eslint`, `npm run check:types`, `npm test` e `npm run build` completos**
**Step 2: Commit limpo e `git push origin main`**
