# Cases: shell e blocos

**Mensagem:** shell único, blocos compartilhados no kit, composição explícita por página; custom só isolado e nomeado. **BrandLovers** define o hero editorial padrão até haver variante documentada.

## Shell

- **`CaseShell`**: `CaseNav` + `children` + `CaseNextLink` + `CaseLandingFooter`. Props: `next: { slug, title, company, num }`.

## Blocos (`blocks/`)

| Bloco | Uso |
|--------|-----|
| **`CaseHeroEditorial`** | Hero padrão (ref. BrandLovers): `tone="surface"` \| `"ink"` (fundo escuro, mesma hierarquia); wash/`backgroundOverride`, meta, eyebrow, título, tagline, lead, grid summary + papel/escopo/tags; `belowLead` **depois** desse grid; `splitItemsAlign` para alinhar coluna meta. |
| **`CaseHeroDark`** | Legado; preferir `CaseHeroEditorial` com `tone="ink"`. |
| **`CaseMetaRow`** | Linha empresa / ano / `productTag`; `variant="onDark"` para heróis escuros. |
| **`CaseSectionSplit`** | Coluna `// label` + conteúdo; ritmo `py-32 md:py-40`. |
| **`CaseMediaFullWidth`** | Imagem edge-to-edge. |
| **`CaseStatBand`** | Sessão **// Resultados** (rótulo fixo); grelha dentro de `content-wrap`; `variant="dark"` \| `"light"`; `megaWord` vazio omite marca d’água; `intro` opcional; `attributionNote` no rodapé escuro. |
| **`CasePullQuote`** | Learning / citação com label. |

## Regras

- Nova seção que aparecer em **2+ cases** → extrair para `blocks/`.
- Só **1 case** → `components/case/custom/<slug>/` ou trecho na página até existir segundo uso.
- **Proibido por convenção**: hero copiado inline em centenas de linhas em cada `page.tsx`; o que for padrão vira `import`.
- Exceções visuais: acento do case (`placeholder`), imagem, ou um bloco custom, não tipografia nova fora dos tokens em `globals.css`.

## Composição

- Cada `app/cases/<slug>/page.tsx` importa blocos e monta a **ordem** à mão (opção A). Sem mega-template `if (slug === …)` no meio do kit.

## Dados (Notion + tipos em `lib/cases.ts`)

- Lista e campos vêm de **`getCaseDataSource()`** → arquivos em `content/cases/<slug>/` (`lib/caseContent.ts`).
- **`heroImage`**: coluna Notion — path em `public/` ou URL; alimenta hover na home quando existir.
- **`landingMedia?`**: para `webmotors-catalogo`, paths em `public/` são aplicados em código (`lib/caseLandingMediaExtras.ts`); o resto do case continua Notion.
