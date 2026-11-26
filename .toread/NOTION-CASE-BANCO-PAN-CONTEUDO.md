# Corpo do case (Notion → site)

**Regras atuais**

- Cada `[case:…] {…}` = **um parágrafo**, **uma linha** (sem Enter no meio). Aspas `"` retas.
- O campo `"component"` no JSON é opcional — o nome já vai no `[case:Nome]`.
- **Galeria:** várias imagens **seguidas** (blocos de imagem) viram `CaseMediaGallery` automaticamente; ou usa abertura/fecho com opções:
  - `[case:CaseMediaGallery] {"variant":"headline","columns":2}`
  - (blocos de imagem no meio)
  - `[/case:CaseMediaGallery]`
- **Navegação lateral:** prefixos `[-nav 1]` … nos títulos/parágrafos (ver `NOTION-SIMPLES.md`).

Substitui `/cases/pan/…` pelos teus ficheiros reais ou URLs absolutas.

---

[-nav 1] Visão geral

[case:CaseSectionSplit] {"id":"visao-geral","label":"Visão geral","body":"O Banco PAN lidera financiamento de usados, mas o digital estava atrás da operação física. Entre 2018 e 2019 fui Product Designer e depois Design Lead, com squad de 23 pessoas (mobile, backend, QA, produto). Trabalhei de visão estratégica a fluxos críticos de simulação e formalização."}

[case:CaseStatBand] {"sectionLabel":"// Escala do projeto","stats":[{"value":"23","label":"Membros na squad","caption":"Multidisciplinar"},{"value":"12","label":"Lojistas em campo","caption":"Pesquisa"},{"value":"09","label":"Conceitos de serviço","caption":"Visão estratégica"}]}

[-nav 2] Problema

[case:CaseSectionSplit] {"id":"problema","label":"O problema","body":"O fluxo do banco era linear; no pátio, venda, negociação e estoque acontecem ao mesmo tempo. O digital parecia burocracia e não acompanhava WhatsApp e outros sistemas. O desafio era integrar o banco a essa rotina, não só digitalizar formulários."}

[case:CasePullQuote] {"label":"// A tensão","body":"O produto seguia a lógica de risco do banco; a operação real seguia urgência e margem do lojista."}

[-nav 3] Diagnóstico

[case:CaseSectionSplit] {"id":"diagnostico","label":"Diagnóstico","body":"Pesquisa com 12 lojistas: o CPF organiza a jornada e destrava a simulação. Dados: até 5 simulações por veículo e até 8 carros consultados por cliente — o sistema tinha de suportar simulação repetida e gestão de estoque."}

[-nav 4] Arquitetura de busca

[case:CaseBeforeAfter] {"sectionLabel":"// Arquitetura de busca","heading":"Da rigidez à adaptabilidade","before":{"label":"Busca convencional","body":"Campos fixos, pouco contexto.","variant":"muted"},"after":{"label":"Interface adaptativa","body":"Busca centrada no CPF; campos alternam entre Placa (operadores) e Unidade (lojistas).","variant":"emphasis"}}

[-nav 5] Solução

[case:CaseSectionMedia] {"id":"solucao","label":"A solução","intro":"Equilíbrio entre core (New Beetle) e valor novo (Mad Max): dashboard com pipeline de propostas, captura de documentos e laudo eletrônico, com liberação mais rápida.","media":{"src":"/cases/pan/dashboard.png","alt":"Painel com métricas e pipeline de propostas"}}

[case:CaseSectionSplit] {"label":"Inovação em estoque","body":"Estoque inteligente: mapear o pátio e simular sem reingressar dados; previsão de preço e tendências. O produto passou de portal de crédito a apoio à gestão do lojista."}

[case:CaseMediaFullWidth] {"id":"fluxos-criticos","src":"/cases/pan/simulacao-formalizacao.png","alt":"Fluxo de simulação e formalização digital"}

[-nav 6] Impacto

[case:CaseSectionSplit] {"id":"impacto","label":"Impacto","body":"Redesenho do core alinhou digital e negócio: menos pendências, melhor relação com lojistas e base para evolução futura."}

[case:CasePullQuote] {"label":"// Aprendizado principal","body":"O produto compete por relevância numa rotina fragmentada, não só por eficiência técnica."}

[case:CaseSectionSplit] {"label":"Reflexão","body":"Produto B2B2C em contexto caótico: a aderência ao uso real importa mais que o polish da UI. Valor veio de alinhar cliente, lojista, comercial e banco numa visão partilhada."}
