Cola no corpo da página do case no Notion: linha em branco = novo parágrafo. Linhas [case:Nome] {json} = um parágrafo só (sem Enter no meio). Não precisas de "component" no JSON.

## Propriedades Notion (database — hero e listagem)

Preenche nas **colunas da linha** deste case na database (slug, título, empresa, imagem de capa, cores, etiquetas). Isto **não** é corpo da página: o site usa estas propriedades para o hero e para a listagem.

slug: sulamerica-portal
num: 02
title: Novo App e Portal no ar
company: SulAmérica
year: 2024–atual
role: Design Lead
tags: Produto
accentTags: Design System
featuredOnSite: true
placeholder: #D0EDE0
brandColor: #f05223
heroImage: 
summary: App e portal redesenhados do zero. Sistema de design do chão ao teto, com time novo e prazo real.

_Aliases de colunas e campos extra: `mapCaseFromNotion` em `lib/notionCases.ts`._

---

[-nav 1] Contexto

[case:CaseSectionSplit] {"id":"case-contexto","label":"// Contexto","body":"A SulAmérica tinha dois produtos digitais — um app e um portal — com interfaces envelhecidas, inconsistentes e sem sistema de design por trás.","borderClass":"border-t border-ink/10 dark:border-white/10"}

[-nav 2] Desafio

// Desafio

Redesenhar os dois produtos em paralelo, criando um sistema de design do zero, com um time que estava sendo montado ao mesmo tempo em que o projeto acontecia.

[-nav 3] Abordagem

[case:CaseSectionSplit] {"label":"// 01","body":"Sistema de design antes do produto\n\nA decisão mais importante foi não começar pelas telas. Começamos pelo sistema — tokens, componentes base e guidelines que dariam consistência a tudo que viesse depois.\n\nIsso exigiu convencer stakeholders de que investir semanas sem entregar telas visíveis era o caminho certo. Valeu.","borderClass":"border-t border-ink/10 dark:border-white/10","id":"case-abordagem"}

[case:CaseSectionSplit] {"label":"// 02","body":"App e portal em sprints paralelos\n\nCom o sistema em pé, dividimos o time. Uma frente no app mobile, outra no portal web. Os componentes eram compartilhados — o que acelerou as duas frentes.\n\nCada sprint tinha entregas tangíveis: fluxos completos, não telas soltas. Isso ajudou a manter o ritmo e a visibilidade do progresso.","borderClass":"border-t border-ink/10 dark:border-white/10"}

[-nav 4] Impacto

[case:CaseStatBand] {"stats":[{"value":"1 sistema","label":"de design criado do zero"},{"value":"2 produtos","label":"redesenhados em paralelo"},{"value":"6 meses","label":"do kickoff ao go-live"},{"value":"1 time","label":"montado e liderado no processo"}]}

[-nav 5] Resultado

[case:CaseSectionSplit] {"id":"case-resultado","label":"// Resultado","body":"App e portal no ar, com sistema de design documentado e time em velocidade de cruzeiro. O que era dois produtos inconsistentes virou uma família coesa.","borderClass":"border-t border-ink/10 dark:border-white/10"}

[case:CasePullQuote] {"label":"// Learning","body":"Redesign com sistema de design do zero é lento no começo e rápido no final. O desafio é manter o projeto vivo durante a fase lenta — quando as entregas são invisíveis para quem não está no dia a dia."}
