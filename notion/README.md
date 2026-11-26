# Corpo do case Loft

- **Texto para colar no Notion (parágrafo + `[case:…]`):** Loft → `npm run notion:loft-plain` (ou `npx tsx scripts/generate-notion-loft-plain-text.ts`) → `NOTION-CASE-LOFT-CONTEUDO.md`. Outros cases → `npm run notion:cases-plain`.

---

# Import do corpo do case Loft (API Notion)

O ficheiro **`loft-case-body.blocks.json`** está no formato que a API Notion espera em `PATCH /v1/blocks/{page_id}/children` (campo `children`).

Os blocos de embed usam **código com linguagem `json`** (a API Notion não tem linguagem `case`). O site passou a interpretar `json` + JSON válido com `"component": "…"` como os mesmos widgets que `case` / `portfolio-case`.

## Regenerar o JSON

```bash
node scripts/generate-notion-loft-blocks.mjs
```

## Enviar para uma página vazia do case

1. Abre a **página** da linha na database (corpo abaixo das propriedades) — ou cria uma página filha vazia.
2. Copia o **ID** da página (32 chars do URL).
3. Integração com permissão **insert content** na página.

```bash
export NOTION_TOKEN="secret_…"
export NOTION_PAGE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
node scripts/notion-append-blocks.mjs notion/loft-case-body.blocks.json
```

Isto **acrescenta** os blocos ao fim da página. Se já houver conteúdo, apaga no Notion primeiro ou usa outra página.

## Propriedades da linha (hero)

Continuam na database: `slug`, `title`, `company`, `productTag`, `year`, `role`, `tags`, `accentTags`, `summary`, `brandColor`, `placeholder`, `heroMegaWord`, `heroImage`, etc. — ver `mapCaseFromNotion` em `lib/notionCases.ts`. Referência de valores: `lib/casesSeed.ts` (só para scripts / geradores de `.md`).

## Cards de destaque na Home

`featuredOnSite` / `Destaque` define os painéis com imagem. Cases desmarcados entram na lista sem imagens, depois dos destaques. Ambos seguem `order` / `Ordem`; `modelo` não aparece na Home.

Os cards aproveitam o primeiro `[case:CaseStatBand]` do corpo do case: exibem até duas métricas, priorizando `emphasizeIndices`, com o rótulo e as notas de atribuição do bloco. Um marcador de navegação `Entrega` antes do bloco preserva esse rótulo. Sem métricas, usam `outcome` ou `summary`.

Para editar o resumo diretamente na database, crie as propriedades opcionais:

- `homeSummary` / `Resumo Home` (texto): resumo específico do card; substitui a leitura do corpo.
- `homeHighlightKind` / `Tipo Resumo Home` (select): `Resultados` ou `Entrega`.

Novos textos de `Resumo Home` passam pela revisão de tradução existente antes de aparecerem na Home em inglês.
