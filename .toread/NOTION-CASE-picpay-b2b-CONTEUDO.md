Cola no corpo da página do case no Notion: linha em branco = novo parágrafo. Linhas [case:Nome] {json} = um parágrafo só (sem Enter no meio). Não precisas de "component" no JSON.

## Propriedades Notion (database — hero e listagem)

Preenche nas **colunas da linha** deste case na database (slug, título, empresa, imagem de capa, cores, etiquetas). Isto **não** é corpo da página: o site usa estas propriedades para o hero e para a listagem.

slug: picpay-b2b
num: 01
title: Jornada B2B do zero
company: PicPay
year: 2020–2022
role: Design Manager
tags: Produto, Liderança
accentTags: Escala
featuredOnSite: true
placeholder: #D8E8FF
brandColor: #38b160
heroImage: 
summary: Construir uma jornada B2B completa enquanto o produto consumer já atendia 70 milhões de usuários.

_Aliases de colunas e campos extra: `mapCaseFromNotion` em `lib/notionCases.ts`._

---

[-nav 1] Contexto

[case:CaseSectionSplit] {"id":"case-contexto","label":"// Contexto","body":"O PicPay era um produto massivo no Brasil — mas 100% focado no consumidor final. A operação B2B existia, mas era artesanal. Sem jornada, sem produto, sem time de design dedicado.","borderClass":"border-t border-ink/10 dark:border-white/10"}

[-nav 2] Desafio

// Desafio

Criar do zero uma jornada para lojistas e estabelecimentos enquanto o produto consumer crescia em velocidade máxima. O desafio não era só de design — era de descobrir o que o B2B do PicPay deveria ser.

[-nav 3] Abordagem

[case:CaseSectionSplit] {"label":"// 01","body":"Entendendo quem eram os lojistas\n\nComeçamos com pesquisa direta. Visitamos estabelecimentos, acompanhamos o dia a dia de quem recebia pagamento pelo PicPay e mapeamos onde o processo travava.\n\nO que encontramos: a experiência de cadastro era manual, suporte era por telefone e não havia visibilidade nenhuma das transações. Lojistas grandes e pequenos conviviam com o mesmo fluxo inadequado.","borderClass":"border-t border-ink/10 dark:border-white/10","id":"case-abordagem"}

[case:CaseSectionSplit] {"label":"// 02","body":"Estruturando o produto com o time\n\nFormei e liderei um pod dedicado ao B2B — designers, PMs e engenheiros. Criamos os primeiros rituais de discovery específicos para esse público, separados do fluxo consumer.\n\nO portal do lojista foi o primeiro entregável: dashboard de transações, gestão de estabelecimentos e relatórios. Simples, mas funcional — e pela primeira vez com um padrão visual consistente.","borderClass":"border-t border-ink/10 dark:border-white/10"}

[case:CaseSectionSplit] {"label":"// 03","body":"Escalando sem perder qualidade\n\nCom o produto validado, o desafio virou velocidade. Criei junto com o time um design system específico para o B2B, reutilizando tokens do sistema consumer mas com componentes adequados para interfaces de gestão.\n\nIsso permitiu que novos módulos fossem entregues em semanas, não meses.","borderClass":"border-t border-ink/10 dark:border-white/10"}

[-nav 4] Impacto

[case:CaseStatBand] {"stats":[{"value":"2 anos","label":"do zero ao produto maduro"},{"value":"12×","label":"crescimento em lojistas ativos"},{"value":"1 pod","label":"criado e liderado do zero"},{"value":"0→1","label":"jornada B2B completa"}]}

[-nav 5] Resultado

[case:CaseSectionSplit] {"id":"case-resultado","label":"// Resultado","body":"Uma jornada B2B completa, com produto, time e processo. O que começou como uma operação manual virou um produto com roadmap, métricas e identidade própria dentro do PicPay.","borderClass":"border-t border-ink/10 dark:border-white/10"}

[case:CasePullQuote] {"label":"// Learning","body":"Construir B2B dentro de uma empresa consumer exige muita negociação de prioridade. O produto quase sempre perde para a urgência do consumer. Aprendi a proteger o espaço do B2B criando evidências de negócio — não só de design."}
