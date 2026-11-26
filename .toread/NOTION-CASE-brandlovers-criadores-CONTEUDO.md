Cola no corpo da página do case no Notion: linha em branco = novo parágrafo. Linhas [case:Nome] {json} = um parágrafo só (sem Enter no meio). Não precisas de "component" no JSON.

## Propriedades Notion (database — hero e listagem)

Preenche nas **colunas da linha** deste case na database (slug, título, empresa, imagem de capa, cores, etiquetas). Isto **não** é corpo da página: o site usa estas propriedades para o hero e para a listagem.

slug: brandlovers-criadores
num: 03
title: Creators ganhando mais dinheiro
company: BrandLovers
year: 2023–2024
role: Design Manager
tags: Produto, Creators
accentTags: Creators
featuredOnSite: true
placeholder: #FFE4D0
brandColor: #ff007e
heroImage: https://cdn.prod.website-files.com/6893922838397a26f7a3a11a/6897455e12efcde9655d36ce_header.png
summary: App que liga creators e marcas em campanhas, com carteira e pagamentos no ecossistema que a marca descreve hoje. No MVP, quanto dava para ganhar não aparecia direito. Foco em clareza, campanhas mais legíveis e avisos, com entregas enxutas em desenvolvimento.

_Aliases de colunas e campos extra: `mapCaseFromNotion` em `lib/notionCases.ts`._

---

[-nav 1] Contexto

[case:CaseSectionSplit] {"id":"case-contexto","label":"// Contexto","body":"A BrandLovers conecta creators e marcas. Quando cheguei, a proposta de valor no app não estava clara: o MVP não mostrava o mais importante para creators, quanto podiam ganhar com cada marca na plataforma. Creators já tinham comunidade e influência, mas monetizar no app era difícil.\n\nO site do produto fala em campanhas, carteira e transparência. No app que eu peguei, essa história não fechava no primeiro uso.","borderClass":"border-t border-ink/10 dark:border-white/10"}

[-nav 2] Desafio

// Desafio

Revelar potencial de ganho com mudanças baratas de construir e alto impacto percebido. Hipótese: mais clareza sobre recompensas aumenta participação em campanhas e renda. Critério: mais gente entendendo ganho antes de se comprometer com a campanha, com mudanças baratas de construir.

[-nav 3] Abordagem

[case:CaseSectionSplit] {"label":"// 01","body":"Diagnóstico\n\nDiagnóstico aprofundado no MVP: fluxo no Smartlook, mapa de reclamações de suporte, benchmark de peers e pesquisa quali e quanti com usuários ativos, ex-usuários e potenciais novos.\n\nO que emergiu voltava sempre ao mesmo lugar: quanto dava para ganhar não aparecia cedo nem com segurança. Muitos desistiam antes de se comprometer com a campanha.\n\nO padrão: interesse até o dinheiro some na interface.","borderClass":"border-t border-ink/10 dark:border-white/10","id":"case-abordagem"}

[case:CaseSectionSplit] {"label":"// 02","body":"Valor no primeiro uso\n\nRedesenhamos o fluxo para quanto e como ganhar aparecer cedo, ainda no primeiro uso, alinhado à ideia de previsibilidade que a marca comunica hoje para creators, sem cravar release por release no texto.\n\nReferência mental: produtos que mostram potencial de ganho antes de pedir esforço pesado. Aqui o foco foi ordem da informação e hierarquia na superfície, não uma lista enorme de feature nova.","borderClass":"border-t border-ink/10 dark:border-white/10"}

[case:CaseSectionSplit] {"label":"// 03","body":"Campanhas e avisos\n\nCampanhas em lista e cards com sinais de match com o perfil, para leitura de fit sem passeio infinito.\n\nNotificações para campanha no segmento e para marco de ganho. Menos depender de abrir o app para descobrir oportunidade.\n\nAlinhamento com PMs e engenharia para não inflar escopo: o que ia para sprint era o que mudava percepção com custo baixo de construção.","borderClass":"border-t border-ink/10 dark:border-white/10"}

[-nav 4] Impacto

[case:CaseStatBand] {"stats":[{"value":"+99%","label":"creators ganhando na plataforma"},{"value":"+48%","label":"participação em novas campanhas"},{"value":"R$ 500 mil","label":"primeira campanha acima desse valor em creators"},{"value":"1 quarter","label":"primeiros resultados nessa linha"}],"attributionNote":"Métricas do período documentado no case. Resultados depois somam outras mudanças de produto e negócio.","editorialSourceNote":"Narrativa e números: trabalho documentado. Contexto de produto: posicionamento público BrandLovers."}

[-nav 5] Resultado

[case:CaseSectionSplit] {"id":"case-resultado","label":"// Resultado","body":"Em um quarter, creators mais engajados, marcas mais confiantes e mais recompensas distribuídas. A primeira campanha com investimento acima de R$ 500 mil em creators nasceu nesse período, com marcas ganhando confiança na plataforma. Isso conversa com o produto que a BrandLovers vende hoje, campanhas e carteira como lugar de ver transação e saldo. O case é o momento em que no uso essa história ainda não estava clara.","borderClass":"border-t border-ink/10 dark:border-white/10"}

[case:CasePullQuote] {"label":"// Learning","body":"Se a empresa já fala em transparência de ganhos e carteira, mas no primeiro uso o creator não enxerga valor, o trabalho é informação e ordem, não lista de feature. Pequena mudança na superfície e na sequência pode destravar confiança e participação."}
