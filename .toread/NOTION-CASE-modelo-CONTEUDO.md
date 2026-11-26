Cola no corpo da página do case no Notion: linha em branco = novo parágrafo. Linhas [case:Nome] {json} = um parágrafo só (sem Enter no meio). Não precisas de "component" no JSON.

## Propriedades Notion (database — hero e listagem)

Preenche nas **colunas da linha** deste case na database (slug, título, empresa, imagem de capa, cores, etiquetas). Isto **não** é corpo da página: o site usa estas propriedades para o hero e para a listagem.

slug: modelo
num: 00
title: Modelo de página (playbook)
company: Gutto Rocha
year: 2026
role: Referência de UI
tags: Todos os blocos
accentTags: Playbook
featuredOnSite: false
placeholder: #E8E4E0
brandColor: red
heroImage: 
summary: Laboratório com todas as seções e componentes de case num fluxo só — refinar aqui antes de replicar nas landings reais.
heroMegaWord: PLAYBOOK

_Aliases de colunas e campos extra: `mapCaseFromNotion` em `lib/notionCases.ts`._

---

[-nav 1] Contexto

[case:CaseSectionSplit] {"id":"case-contexto","label":"// Contexto","body":"Conteúdo interno ao portfólio: alinha ritmo, tipografia e menu local sem depender de narrativa de um cliente específico.","borderClass":"border-t border-ink/10 dark:border-white/10"}

[-nav 2] Desafio

// Desafio

Expor o catálogo de blocos reutilizáveis numa única página legível.

[-nav 3] Abordagem

[case:CaseSectionSplit] {"label":"// 01","body":"Secção editorial\n\nPadrão label estreito + conteúdo: usado em contexto, desafio e abordagem.","borderClass":"border-t border-ink/10 dark:border-white/10","id":"case-abordagem"}

[-nav 4] Impacto

[case:CaseStatBand] {"stats":[{"value":"100%","label":"blocos do sistema listados"},{"value":"0","label":"métricas de produto reais"}]}

[-nav 5] Resultado

[case:CaseSectionSplit] {"id":"case-resultado","label":"// Resultado","body":"Quando o layout estiver fechado aqui, replicamos o padrão nas páginas de cases.","borderClass":"border-t border-ink/10 dark:border-white/10"}

[case:CasePullQuote] {"label":"// Learning","body":"Iterar no modelo reduz retrabalho nas páginas narrativas."}
