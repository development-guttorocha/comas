Cola no corpo da página do case no Notion: linha em branco = novo parágrafo. Linhas [case:Nome] {json} = um parágrafo só (sem Enter no meio). Não precisas de "component" no JSON.

## Propriedades Notion (database — hero e listagem)

Preenche nas **colunas da linha** deste case na database (slug, título, empresa, imagem de capa, cores, etiquetas). Isto **não** é corpo da página: o site usa estas propriedades para o hero e para a listagem.

slug: webmotors-catalogo
num: 04
title: Catálogo 0km do zero
company: WebMotors
productTag: Catálogo 0km
year: 2015–2018
role: Product Designer
tags: Produto, SEO
accentTags: 0km
featuredOnSite: true
placeholder: #E4DCFF
brandColor: #e11138
heroImage: /cases/webmotors/webmotors-case-hero.png
summary: Time pequeno e escopo fechado: modelo e versão como índice primeiro, páginas pilar e entrega responsiva no prazo, para o produto nascer indexável em vez de remendado depois.

_Aliases de colunas e campos extra: `mapCaseFromNotion` em `lib/notionCases.ts`._

---

[-nav 1] Contexto

[case:CaseSectionSplit] {"id":"case-contexto","label":"// Contexto","body":"0km ainda era dado espelhado em vários cantos: pouco padronizado e difícil de reaproveitar entre produto, páginas e busca. Outras frentes precisavam de uma âncora única. Nada disso existia como base comum reutilizável; o catálogo precisava ser levantado do zero.","borderClass":"border-t border-ink/10 dark:border-white/10"}

[case:CaseMediaFullWidth] {"src":"/cases/webmotors/portfolio-destaque-processo.png","alt":"Destaque do processo: da ideia ao impacto no mercado de 0km"}

Trecho do case público em guttorocha.com.br/meus-cases/catalogowebmotors.

[-nav 2] Desafio

// Desafio

Dar forma a modelo e versão, páginas pilar e descoberta sem estourar o que um time de três fecharia no tempo. A escolha foi cortar polimento de tela que não sustentava índice nem comparação e empurrar estrutura com SEO no topo.

[case:CaseSectionMedia] {"label":"// Problema estrutural","media":{"src":"/cases/webmotors/portfolio-taxonomia-central.png","alt":"Estrutura montadora, modelo e versão no catálogo"},"intro":"Organização central usada como base de componentes e páginas pilar."}

[-nav 3] Abordagem

[case:CaseSectionSplit] {"label":"// 01","body":"O que já existia lá fora\n\nBenchmarks e stakeholders: o que o negócio e o uso esperavam de 0km, e onde o recorte atual perdia leitura de montadora, modelo e versão.\n\nDuas dores voltavam sempre: dados duplicados entre fontes e busca que não espelhava montadora, modelo e versão.","borderClass":"border-t border-ink/10 dark:border-white/10","id":"case-abordagem"}

[case:CaseSectionSplit] {"label":"// 02","body":"Um lugar para modelo e versão\n\nIndexação e páginas pilar foram tratadas junto com a estrutura com SEO, para não nascer bonito e depois refazer árvore.\n\nMontadora, modelo e versão como árvore navegável viraram base de componentes e abriram caminho para comparador e fichas, com uma leitura só para quem usa e para quem indexa.","borderClass":"border-t border-ink/10 dark:border-white/10"}

[case:CaseSectionSplit] {"label":"// 03","body":"Três pessoas, três meses, no ar\n\nWireframes, protótipo navegável, validação com negócio e SEO, handoff e acompanhamento com engenharia até o go-live num fluxo único, no tamanho do time.\n\nNo topo de funil, celular já pesava; responsivo entrou no corte junto com o restante, em vez de vir como segunda onda.","borderClass":"border-t border-ink/10 dark:border-white/10"}

// Referência no produto

[case:CaseMediaFullWidth] {"src":"/cases/webmotors/portfolio-step-1.png","alt":"Catálogo 0km: pesquisa, benchmarks e descoberta"}

[case:CaseMediaFullWidth] {"src":"/cases/webmotors/portfolio-step-2.png","alt":"Catálogo 0km: navegação montadora, modelo e versão"}

[case:CaseMediaFullWidth] {"src":"/cases/webmotors/portfolio-step-3.png","alt":"Catálogo 0km: listagem e comparador"}

Telas de referência do fluxo atual em webmotors.com.br/catalogo. Contexto completo no case público em guttorocha.com.br/meus-cases/catalogowebmotors.

[-nav 4] Impacto

[case:CaseStatBand] {"stats":[{"value":"5,2M → 17,8M","label":"Sessões orgânicas","caption":"jan/2016 → jan/2025"},{"value":"108 mil → 822 mil","label":"Palavras-chave indexadas"},{"value":"30 mil → 153 mil","label":"Posições no top 3"},{"value":"69%","label":"Busca com intenção informativa","caption":"Topo de funil"}],"attributionNote":"Números de busca referem-se a um período longo. O catálogo 0km foi peça estrutural; o resultado orgânico acumula outras frentes e iniciativas ao longo dos anos."}

[-nav 5] Resultado

[case:CaseSectionSplit] {"id":"case-resultado","label":"// Resultado","body":"O catálogo 0km virou alicerce interno: comparador, fichas e o que depende de modelo e versão passou a se apoiar na mesma estrutura. O orgânico ganhou escala ao longo de muitos anos, com outras frentes somando em cima.","borderClass":"border-t border-ink/10 dark:border-white/10"}

[case:CasePullQuote] {"label":"// Learning","body":"O que parece burocracia no kickoff é o que sustenta busca e produto quando o negócio escala. Disciplina na base evita refação cara de narrativa e de interface mais tarde."}
