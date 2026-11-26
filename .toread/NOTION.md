# Notion — referência técnica

**Comece por:** [**NOTION-SIMPLES.md**](./NOTION-SIMPLES.md) (fluxo em poucas linhas).

## Variáveis de ambiente

```bash
NOTION_TOKEN=secret_…
NOTION_CASES_DATABASE_ID=<id da database de cases>
```

Não é mais necessária segunda database nem `NOTION_CASE_BLOCKS_DATABASE_ID` para o fluxo padrão.

## Como o corpo do case é carregado

1. Cada linha da tabela Notion é uma **página**. O texto que você escreve **no corpo dessa página** (abaixo das propriedades) é o que o site renderiza.
2. O código guarda `notionSourcePageId` a partir do ID da linha na API (automático).
3. **Opcional:** coluna com link/relation para **outra** página de conteúdo (`notionContentPageId` e aliases em `lib/notionCases.ts`).

## Propriedades da linha (mapeamento)

Nomes aceites estão em `mapCaseFromNotion` em `lib/notionCases.ts` (slug, title, company, summary, heroImage, brandColor, published, order, etc.). Campos como `context` / `challenge` vêm do mapeamento mas **não** aparecem na rota `/cases/[slug]` quando a lista vem do Notion — só o corpo da página Notion + hero.

## Sem Notion configurado

Sem `NOTION_TOKEN` ou sem `NOTION_CASES_DATABASE_ID`, a lista de cases fica **vazia** (`getCaseDataSource().cases === []`). Para desenvolvimento local e deploy, define as variáveis no `.env.local` / painel Vercel.

Scripts que geram `.md` para colar no Notion usam `lib/casesSeed.ts` (cópia estática só para isso — não alimenta o site).

## Código relacionado

- `lib/notionCases.ts` — query da database e mapeamento
- `lib/notionBlockTree.ts` + `components/case/NotionPageDocument.tsx` — render do corpo
- `components/case/NotionCaseBlocks.tsx` — legado (não usado no fluxo Notion atual da rota `[slug]`)

Guia longo antigo: `NOTION-COMO-CRIAR.md` (pode estar desatualizado em detalhes).
