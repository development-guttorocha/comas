# Auditoria de Product Design do admin local (12/11/2026)

Escopo: `/admin` (Next.js 16, só em `next dev`), rotas `app/(pt)/admin/**`, `app/api/admin/**`, `components/admin/**`, `lib/admin/**` e `proxy.ts`. Foi só diagnóstico: nada gravado, nada salvo, nenhum commit. As imagens de evidência estão nesta pasta (`01-…` a `18-…`), capturadas a 1280×800, salvo quando outro tamanho é indicado.

Legenda: **Observado** = reproduzido no navegador. **Inferido do código** = comportamento lido no código, sem reproduzir (normalmente porque reproduzir exigiria gravar). Esforço: **P** até 1 dia, **M** 2 a 5 dias, **G** mais de uma semana.

---

## 1. Diagnóstico executivo

1. **"Publicar site" põe no ar a mídia de casos em rascunho e a mídia sem uso.** As 73 imagens extraídas do material da SulAmérica estão públicas (HTTP 200), embora o case seja rascunho. 17 delas são painéis com números internos de GA4 e de vendas. As imagens do "relatório completo" são ícones e prints de sites públicos. (PUB-1)
2. **"Publicar site" sobe a árvore de trabalho inteira para produção.** Isso inclui código sem commit de sessões paralelas, traduções automáticas sem revisão e tudo o que estiver em `content/` e `public/cases`. (PUB-2, PUB-3)
3. **Dá para perder trabalho sem aviso.** Reproduzido: com alteração não salva, clicar em qualquer item do menu sai da tela e a alteração some. A aba Tradução, a esteira da Home e a IA têm variações do mesmo problema. (SAVE-1 a SAVE-3)
4. **Não há um modelo único de salvar.** Na mesma tela convivem "grava na hora", "precisa de Salvar" e "grava a cada mensagem". Um conflito de versão só se resolve com "Recarregue a página", e isso descarta o que está na tela. (SAVE-4, SAVE-5)
5. **A mesma tarefa tem vários caminhos.** Traduzir tem 4, destacar na Home tem 3, SEO fica em 2 lugares e "publicar" tem 3 sentidos. É daí que vem a sensação de confusão.
6. **Acessibilidade: a base está boa** (rótulos, nomes de botão, idioma, foco global visível), **com falhas pontuais.** O cinza de apoio não atinge o contraste mínimo, a gaveta de pendências se diz modal mas não prende o foco, a galeria não usa as descrições que a IA já escreveu e o bloqueio por inatividade chega sem aviso. (seção 7)
7. **A recomendação é estrutural e vem antes do visual.** Salvar automático com histórico visível, IA que propõe em vez de sobrescrever, uma única "Publicar" com pré-checagem honesta, e editor com prévia lado a lado na tela inteira.

---

## 2. Problemas por área

### 2.1 Publicação

**PUB-1. O deploy leva para produção a mídia de rascunho e a sem uso, e com ela dados internos** (P0)
- Evidência (observada): `public/cases/sulamerica/` tem 73 arquivos, todos versionados no commit `8765354` ("Conteúdo dos cases (12/11/2026, 10:44:27)") e no ar: os 7 que testei respondem HTTP 200 em `https://www.guttorocha.com.br/cases/sulamerica/…`, enquanto `/cases/sulamerica` responde **404**, porque o case é rascunho. Na galeria, quase todos aparecem como "Sem uso" (`09-galeria-sulamerica-sem-uso.jpg`).
- O que as 73 imagens mostram (abri todas):
  - **As 40 `202510-relatoriocompleto-pesquisa-motivo-slide-*`** não têm dado da pesquisa. São ícones (slides 19, 24 e 39), prints de sites públicos de seguradoras concorrentes (Allianz, Chubb, Bradesco, Assist Card e outras) e cinco prints de conversa no WhatsApp com o atendimento da SulAmérica (slides 66, 93, 94, 96 e 96-2), com preços, datas de viagem e o primeiro nome de um atendente. *Correção:* a versão anterior deste item dizia que eram dados de um relatório interno, e isso estava errado.
  - **17 imagens mostram números internos:**
    - 13 painéis do funil do GA4, com sessões, usuários e conversão por etapa, mês a mês de 2024: `captura-de-tela-2025-07-25-as-09-07-59` até `…-09-13-51`;
    - 3 painéis "Resumo Distribuição", com prêmio (855,26 mil), quantidade de apólices (5,09 mil), ticket médio, idade média e distribuição por plano, idade, sexo e meio de pagamento: `captura-de-tela-2025-07-25-as-18-26-30`, `…-18-27-38` e `image-9`;
    - 1 tabela de eventos do GA4 por plano, com 162 mil eventos e 101 mil usuários: `image-13-2`.
    Um dos funis (`…-09-07-59`) está no corpo do rascunho do case. Os outros 16 estão sem uso.
  - O resto são telas do redesenho, ilustrações e fotos sem dado sensível.
- Causa (código): a extração do Material grava cada imagem com `saveMedia`, que escreve em `public/cases/<slug>/` (`lib/material/sources.ts:89` → `lib/admin/caseStore.ts:188-205`). "Publicar site" roda `git add content public/cases …` e `vercel deploy --prod` (`app/api/admin/publish/route.local.ts:80-85`) sem filtrar case em rascunho nem mídia sem uso. O `.vercelignore` protege `.admin/` e `material.json`, mas não as imagens extraídas.
- Impacto: tudo o que entra no material de um case vira URL pública no próximo deploy, esteja o case no ar ou não, e fica no histórico do git. Hoje isso inclui números internos de analytics e de vendas.
- Recomendação:
  - (a) Decisão do Gutto: se os 17 painéis com números internos podem ficar públicos. Se não, é preciso remover e publicar de novo; o histórico do git continua com eles. O funil usado no rascunho entra nessa mesma decisão, quando o case for ao ar.
  - (b) As imagens extraídas do material ficam em `.admin/material/<slug>/images/` e só são copiadas para `public/` quando entram num bloco do case.
  - (c) A publicação só leva mídia referenciada por conteúdo que não é rascunho.
- Esforço: M.

**PUB-2. O deploy de produção leva código que não está em nenhum commit** (P0)
- Evidência (inferida do código e do git): o botão faz commit só de `content` e `public/*` e depois roda `vercel deploy --prod --yes` (`publish/route.local.ts:80-85`). O CLI da Vercel sobe os arquivos locais, não o commit. Hoje `git status` mostra mais de 30 arquivos de código modificados e sem commit (`components/admin/*`, `lib/*`, `next.config.ts`, `package.json` …), editados por várias sessões em paralelo.
- Impacto: produção pode rodar código pela metade, que não está em nenhum commit, e aí não dá para reproduzir nem voltar a uma versão conhecida.
- Recomendação: publicar sempre a partir de um commit limpo. Se houver código sujo fora de `content/` e `public/`, a publicação para e diz quais arquivos são. A alternativa é publicar de um worktree temporário em `HEAD`.
- Esforço: M.

**PUB-3. A publicação faz coisas que a tela não diz** (P1)
- Evidência (inferida do código): o diálogo diz "Registra no histórico o que mudou nos cases e publica o site" (`PublishButton.tsx:51`). Antes de publicar, porém, a rota traduz com IA os vídeos com inglês faltando ou velho (`publish/route.local.ts:26-41,77`), sem revisão, e prepara as telas no PhotoCraft (`:44-57,78`). O `git add content` leva tudo o que estiver em `content/`, inclusive `content/cases/*/material.json` (fatos e citações do material bruto) e documentos de trabalho como `content/case-components.md`.
- Impacto: vai ao ar texto que ninguém revisou e o commit carrega mais do que "o que mudou nos cases". A tela não é honesta sobre o que vai fazer.
- Recomendação: antes de publicar, mostrar a lista do que vai mudar no site (cases, páginas, imagens novas, traduções) e bloquear itens não revisados. A publicação nunca chama IA.
- Esforço: M.

**PUB-4. Três sentidos para "salvar" e "publicar"** (P1)
- Evidência (observada): na aba Tradução convivem "Salvo" e "Salvar" (do case), "Salvar rascunho" e "Publicar inglês" (da tradução) e "Publicar site" (`06-traducao-dois-salvar.jpg`). As mensagens dizem "Inglês publicado: vai ao ar no próximo deploy" (`TranslationPanel.tsx:106`), "Página salva: vai ao ar no próximo deploy" (`PageEditor.tsx:153`) e "Salvo. Abra o case no site para conferir." (`CaseEditor.tsx:182`). O site publicado só muda com "Publicar site".
- Impacto: "Publicar inglês" não publica nada, e "Abra o case no site para conferir" só vale para o servidor local. O Gutto precisa guardar de cabeça qual botão faz o quê.
- Recomendação: um vocabulário só. "Salvo" é automático. O estado de cada item é "Rascunho", "Pronto" ou "No ar". Existe um único "Publicar", que lista o que está pronto.
- Esforço: M (junto com R7).

### 2.2 Editor de case: salvar, sair e conflitos

**SAVE-1. Sair pelo menu descarta as alterações sem avisar** (P0)
- Evidência (observada): `/admin/cases/picpay` → aba Dados → campo Período mudou para "2020–2022 TESTE" → topo mostrou "Alterações não salvas" (`03-dados-alteracao-nao-salva.jpg`). Um clique em **Home** no menu lateral navegou direto para Home › Textos, sem nenhum aviso (`04-saiu-sem-aviso-home-textos.jpg`). Ao voltar, o campo estava em "2020–2022" e o topo dizia "Salvo" (`05-edicao-perdida-ao-voltar.jpg`).
- Causa (código): a proteção é só `beforeunload` (`CaseEditor.tsx:244-253`), que dispara ao fechar ou recarregar a aba, mas não na navegação interna do Next (`<Link>` do menu, das migalhas, de "Trocar imagem"…). O mesmo padrão aparece em `PageEditor.tsx:171-175`, `ServiceEditor.tsx:190` e `ArticleEditor.tsx:155`. A esteira (`AdminHomeBelt.tsx`) não tem proteção nenhuma, e o link "Trocar imagem" de cada linha sai da tela.
- Impacto: perda silenciosa de trabalho, na ação mais comum do admin, que é trocar de tela.
- Recomendação: salvar automaticamente (ver R6). Até isso existir, guardar um rascunho local por tela (restaurado ao voltar) e interceptar a navegação interna enquanto houver alteração.
- Esforço: P (guarda e rascunho local) / M (salvar automático).

**SAVE-2. A tradução manual se perde e não dá para salvar pela metade** (P0)
- Evidência (inferida do código; a edição por script não chegou ao React com o painel oculto): as edições do inglês vivem só no estado do `TranslationPanel` (`TranslationPanel.tsx:52`) e não entram no `dirty` do case (`CaseEditor.tsx:160-164`). Trocar de aba desmonta o painel (`CaseEditor.tsx:302`) e perde o texto. O `beforeunload` também não as considera. Além disso, "Salvar rascunho" fica desabilitado enquanto **algum** trecho estiver sem inglês (`TranslationPanel.tsx:157`, `disabled={… || !complete}`). Observado: o topo mostra "Salvo" com o painel de tradução aberto (`06-traducao-dois-salvar.jpg`).
- Impacto: quem traduz à mão um case com 98 trechos não consegue guardar o progresso e perde tudo ao trocar de aba.
- Recomendação: salvar o rascunho da tradução sempre, mesmo incompleto, de forma automática e com "Publicar" exigindo completo. As edições da tradução entram no mesmo estado de "não salvo" do case.
- Esforço: P.

**SAVE-3. A IA sobrescreve o trabalho em vez de propor** (P0)
- Evidência (inferida do código): quando o rascunho da conversa chega, `MaterialPanel.tsx:177` chama `applyDraft`, que troca o corpo inteiro (`CaseEditor.tsx:226-233`) sem olhar se há edição manual não salva em Conteúdo. "Descartar" volta para o último salvo (`:190-197`), não para a versão de antes da IA. O mesmo acontece com "Gerar de novo com IA" no vídeo (`ReelStudio.tsx:487-488`). A conversa da SulAmérica mostra três rascunhos seguidos, às 22:27, 22:30 e 22:35 (`07-material-rascunho-pronto-apos-salvar.jpg`): cada um substituiu o anterior no editor.
- Impacto: edições feitas enquanto a IA trabalhava (1 a 3 minutos) somem, e não há como voltar ao estado de antes da IA.
- Recomendação: a IA entrega uma **proposta** (lado a lado ou por seção, com "Usar tudo", "Usar esta seção" e "Ignorar"). Antes de aplicar qualquer coisa, o sistema guarda uma versão e mostra "Desfazer IA".
- Esforço: M.

**SAVE-4. Um conflito de versão descarta o que está na tela** (P1)
- Evidência (inferida do código): o salvar compara a revisão e, se mudou, recusa com "Recarregue a página para ver a versão atual" (`caseStore.ts:75`). Recarregar descarta as edições. Várias ações gravam o mesmo `case.json` por fora do editor: a estrela e o arquivar da lista (`AdminHome.tsx:102-103`), a estrela da esteira (`AdminHomeBelt.tsx:53`) e o `setCaseFlags` (`caseStore.ts:131-141`). Nas páginas, o botão "Traduzir e salvar" das pendências grava o arquivo direto (`notices.ts:152`). Basta o editor aberto numa aba e uma estrela clicada em outra para o Salvar falhar.
- Impacto: o Gutto tem de escolher entre perder as edições e copiá-las à mão.
- Recomendação: gravar só os campos alterados (patch por campo). Em conflito real, manter a cópia local e mostrar "a versão do disco mudou: ver diferença · manter a minha · usar a do disco".
- Esforço: M.

**SAVE-5. Modelos de salvar diferentes na mesma tela** (P1)
- Evidência (observada e no código):
  - Esteira: a estrela grava na hora ("salvo de uma vez", `AdminHomeBelt.tsx:49-61`), mas a ordem e as voltas precisam de Salvar (`:64-70`). As duas coisas ficam na mesma linha (`10-esteira-estrela-grava-na-hora.jpg`).
  - Material: cada mensagem da conversa grava o material (`CaseEditor.tsx:218-223`), mas editar ou remover um fato na gaveta "O que a IA já sabe" só fica salvo com o Salvar do topo (`MaterialPanel.tsx:71-77`).
  - Vídeo: enviar uma música grava na hora (`ReelStudio.tsx:458`), enquanto o vídeo precisa de Salvar.
  - Lista de cases: a estrela e o arquivar gravam na hora, mas os mesmos campos na aba Dados precisam de Salvar (`lib/admin/caseFields.ts:23-24`).
- Impacto: o Gutto não consegue prever o que já foi gravado, o que alimenta SAVE-1 e SAVE-4.
- Recomendação: um modelo único, com salvar automático em tudo, histórico e desfazer (R6).
- Esforço: G (junto com R6).

**SAVE-6. O histórico existe, mas não é visível** (P2)
- Evidência (código): cada salvar copia os arquivos para `.content-history/<slug>/` (30 versões, `caseStore.ts:60-68`), o mesmo vale para material e artigos, e excluir move para `.content-history/deleted/`. Nenhum componente do admin lê essas pastas (busca por `content-history` em `components/`: nada). A própria mensagem de exclusão manda procurar a pasta à mão (`AdminHome.tsx:120`).
- Impacto: a rede de segurança existe, mas só serve a quem abre o Finder.
- Recomendação: um painel "Versões" no case (lista com data e "restaurar") e uma "Lixeira" com "restaurar".
- Esforço: M.

### 2.3 Lista de cases e editor (Conteúdo, Dados, prévia)

**CASE-1. Um mesmo dado editável em vários lugares** (P2)
- Evidência: "Destaque na Home" tem 3 lugares (estrela na lista, estrela na esteira e caixa na aba Dados, `caseFields.ts:24`). "Rascunho" e "Arquivado" têm 2 (lista e Dados).
- Impacto: há dois jeitos de fazer a mesma coisa, com regras de salvar diferentes (SAVE-5).
- Recomendação: decidir um lugar por dado. Sugestão: a ordem e o destaque ficam na esteira e o estado (rascunho, no ar, arquivado) fica no cabeçalho do case, sem duplicar na aba Dados.
- Esforço: P.

**CASE-2. Cabeçalho instável e com muitas ações** (P2)
- Evidência (observada): o topo do editor tem até 7 controles (pendência, estado, Descartar, Prévia, Ver no site, Salvar, Publicar site), e "Prévia" some fora da aba Conteúdo (`02-…` × `03-…`). As abas mudam de lugar conforme o case: abaixo do título no PicPay (`02-…`) e à direita do título na SulAmérica (`07-…`).
- Recomendação: título e estado à esquerda; à direita, só "Ver no site" e "Publicar". A prévia vira coluna fixa, não um botão.
- Esforço: P.

**CASE-3. A prévia é opcional e o índice ocupa espaço** (P2)
- Evidência (observada): a 1280px a prévia vem desligada (só abre sozinha a partir de 1400px, `CaseEditor.tsx:199-205`), e o editor divide a largura com um índice de 6 itens (`02-case-editor-conteudo-1280.jpg`). Já está decidido que o admin pode usar a tela inteira com editor e prévia lado a lado.
- Recomendação: editor e prévia lado a lado por padrão a partir de 1200px. O índice vira um seletor no topo do editor (ver wireframe W1).
- Esforço: M.

**CASE-4. A aba Dados repete as prévias** (P3)
- Evidência (observada): "Capa do case" e "Card na Home" repetem título, imagem e resumo à direita do formulário (`03-…`).
- Recomendação: uma prévia só, que acompanha o grupo de campos em foco.
- Esforço: P.

### 2.4 Material com IA

**MAT-1. O estado do Material mente depois de salvar** (P1)
- Evidência (observada): na SulAmérica, o corpo salvo às 10:37 é idêntico ao rascunho da IA em `.admin/drafts/sulamerica.json`. Mesmo assim, a conversa mostra três vezes "Rascunho no editor, na aba Conteúdo. Nada foi gravado: revise e clique em Salvar." e a faixa de próximo passo diz "Rascunho pronto, na aba Conteúdo · Abrir o rascunho" (`07-material-rascunho-pronto-apos-salvar.jpg`).
- Causa: o passo é deduzido do texto das mensagens (`MaterialPanel.tsx:197-200`), não do estado dos arquivos.
- Recomendação: o passo e a faixa saem do estado real: rascunho pendente (`.admin/drafts`) contra corpo salvo. Mensagens antigas viram registro ("rascunho aplicado e salvo em 12/11 10:37").
- Esforço: P.

**MAT-2. A IA tem duas identidades e chaves demais** (P3)
- Evidência (observada): a tradução fala em "o Sol" (OpenAI; `PageEditor.tsx:162,213`, `TranslationPanel.tsx:106,156`), enquanto o material, o rascunho, o vídeo e as legendas usam DeepSeek sem nome. A tela de chaves lista 5 provedores, 3 deles vazios (`15-chaves.jpg`).
- Recomendação: na interface, chamar tudo só de "IA". Mostrar o provedor apenas em Configurações e só os que estão em uso.
- Esforço: P.

### 2.5 Traduções

**TRAD-1. Quatro caminhos para traduzir, dois deles sem revisão** (P1)
- Evidência (código):
  1. aba Tradução: "Traduzir pendentes com o Sol" → revisar → "Publicar inglês" (`TranslationPanel.tsx:156-158`);
  2. gaveta de pendências: "Traduzir e publicar" publica a tradução do case sem passar pela revisão (`notices.ts:161-163`);
  3. páginas: botão no editor (fica na tela, precisa de Salvar) ou "Traduzir e salvar" na gaveta (grava direto, `notices.ts:132-152`);
  4. "Publicar site" traduz os vídeos sozinho (`publish/route.local.ts:26-41`).
- Impacto: o mesmo resultado sai por portas com regras diferentes, e duas delas põem no ar texto que ninguém leu.
- Recomendação: um caminho. Ao salvar o português, a IA prepara o inglês como rascunho. Uma fila "Inglês para revisar" junta cases, páginas e vídeos. Nada vai ao ar sem passar por ela.
- Esforço: M.

**TRAD-2. As duas listas de pendência discordam** (P2)
- Evidência (observada): a lista de cases diz "inglês para revisar em SulAmérica" (`01-cases-lista-1280.jpg`, `AdminHome.tsx:155`), mas a gaveta de pendências mostra só o Blob suspenso (`16-pendencias.jpg`), porque `caseNotices` ignora rascunhos (`notices.ts:115`).
- Recomendação: uma fonte de pendências, a mesma em todo o admin.
- Esforço: P.

**TRAD-3. A aba Tradução demora para abrir** (P3)
- Evidência (observada): "Carregando a tradução…" por cerca de 12 s no PicPay (dev server).
- Recomendação: medir antes de mexer. Se o tempo vier da extração de trechos, guardar o resultado em cache pela revisão do case.
- Esforço: P.

### 2.6 Vídeo do case

**VID-1. O modo simples ainda mostra tudo** (P2)
- Evidência (observada): na aba Vídeo do Creator Ads aparecem, ao mesmo tempo, "Gerar de novo com IA", três seletores (Música, Movimento, Na página do case), "Linha da capa", o selo "No site" ao lado do interruptor "Mostrar no site" (dois controles para a mesma informação), "Modo avançado", palco, inspetor de cena e linha do tempo (`08-video-estudio.jpg`).
- Recomendação: o modo simples fica com prévia grande, "Gerar", "Música" e "Mostrar no site". Cenas, inspetor e linha do tempo vão para "Ajustar". O selo "No site" sai, porque o interruptor já diz isso.
- Esforço: M.

### 2.7 Mídia e galeria

**GAL-1. "Sem uso" pode apagar o que está em uso** (P1)
- Evidência (código): o "uso" é calculado lendo arquivos salvos em `content/`, `app/`, `components/` e `lib/` (`lib/admin/gallery.ts:53-61`). Ficam de fora o que está só na tela de um editor aberto (imagem enviada e ainda não salva) e os rascunhos da IA em `.admin/drafts/`. "Selecionar estes" marca todos os filtrados de uma vez (observado, `09-…`).
- Impacto: uma imagem recém-enviada ou do rascunho pode ir para a lixeira, e o case passa a mostrar a imagem quebrada.
- Recomendação: considerar rascunhos e editores abertos (ou um prazo, como "enviada há menos de 24 h") no cálculo, marcar a origem "material" e pedir confirmação com a lista de arquivos.
- Esforço: P.

**GAL-2. Abrir a galeria dispara IA** (P3)
- Evidência (código): o GET da galeria enfileira legendas com IA para as imagens sem descrição (`app/api/admin/gallery/route.local.ts:13`; cerca de 1.060 tokens por imagem, segundo a nota da sessão de legendas).
- Recomendação: tudo bem ser automático, mas a tela deve dizer ("Descrevendo 12 imagens…"), o que já acontece em parte com `captionProgress`. A legenda deve ser gerada no envio, não na leitura.
- Esforço: P.

### 2.8 Páginas, SEO, Home e Serviços

**PAG-1. O SEO está em dois lugares** (P2)
- Evidência (observada): a tela SEO cobre as páginas do site (`11-seo.jpg`). O SEO de cada serviço fica dentro da página do serviço, no primeiro grupo, "Geral e SEO" (`12-servico-hub-issue.jpg`).
- Recomendação: escolher um caminho. Sugestão: o SEO fica em cada página, numa aba "Compartilhamento" com a prévia do Google, e a tela SEO vira só um índice de conferência.
- Esforço: M.

**PAG-2. Os serviços não seguem o padrão das outras páginas** (P2)
- Evidência (observada): os serviços são só em português ("Todos os textos… em português"), enquanto as demais páginas têm PT e EN lado a lado. O primeiro campo da tela é "Endereço (slug)", vazio e somente leitura ("não muda pelo admin", `serviceLabels.ts:31,41,76`).
- Recomendação: mesmo modelo de página com a mesma tradução. Tirar o campo de endereço do formulário e mostrá-lo como texto no cabeçalho.
- Esforço: M.

**PAG-3. PT e EN lado a lado em todo campo** (P2)
- Evidência (observada): em Home › Textos, cada campo vem em par PT/EN (`04-saiu-sem-aviso-home-textos.jpg`), o que dobra a altura da tela.
- Recomendação: escrever em português e revisar o inglês na fila única de tradução (TRAD-1).
- Esforço: M (junto com R7).

**PAG-4. Erro de desenvolvimento na página de serviço** (P3)
- Evidência (observada): selo "1 Issue" em `/admin/servicos/hub` (`12-…`). No console aparece "Encountered two children with the same key … Design Services". As migalhas usam o rótulo como chave (`AdminShell.tsx:73`), e no hub são "Design Services › Design Services".
- Recomendação: usar o índice ou o href como chave e não repetir o rótulo.
- Esforço: P.

### 2.9 Navegação, larguras e estética

**NAV-1. Menu longo e ícones iguais** (P2)
- Evidência (observada): 18 itens em 4 grupos. A 1280×800, o último grupo fica cortado ("Configurações" sob o selo do Next, `01-cases-lista-1280.jpg`). A 800px o menu vira só ícones, com 5 ícones de documento idênticos (Sobre, Currículo, Contato, Rodapé, Menu e 404) e 4 maletas idênticas (serviços) (`17-editor-800px-icones-iguais.jpg`). "Home" significa a Home do site, mas o admin abre em Cases.
- Recomendação: 6 entradas (Cases, Artigos, Páginas, Serviços, Mídia, Configurações). Páginas e Serviços abrem uma lista. Ferramentas (Figma) vai para Configurações (ver W3).
- Esforço: M.

**NAV-2. Abaixo de 400px o editor sai da tela** (P2)
- Evidência (observada, 390×844): a barra do topo vaza para a direita, "Salvar" fica fora da tela e a pílula de pendências cobre as migalhas (`18-editor-390px-salvar-fora.jpg`).
- Recomendação: o admin é de desktop, mas a ação principal (estado e Publicar) precisa caber. Abaixo de 900px, as ações do topo vão para um menu "⋯".
- Esforço: P.

**DEC-1. Barras decorativas** (P3)
- Evidência (observada): cartões de números com barras tipo "código de barras" em Artigos (5 cartões para 2 artigos, quase todos com 0 ou 1; `13-artigos-cartoes.jpg`) e na Tradução (`06-…`). Elas vêm da referência visual (`docs/admin/design-reference.webp`), mas ali comparam séries. Aqui não codificam nada.
- Recomendação: tirar os cartões e deixar uma linha de resumo, como já foi feito na lista de cases.
- Esforço: P.

**LOCK-1. O bloqueio de privacidade é mais um estado escondido** (P3)
- Evidência (observada): ao abrir o admin em `127.0.0.1`, a tela já veio "Admin travado / Segure para destravar", estado guardado no `localStorage` (`AdminLock.tsx:34-39`). O bloqueio também liga sozinho depois de 10 minutos sem uso (`:7`).
- Recomendação: manter, mas sem ficar travado por padrão ao abrir de novo. Com o salvar automático, o bloqueio por inatividade não ameaça trabalho.
- Esforço: P.

---

## 3. Problemas sistêmicos

1. **Sem modelo único de persistência.** Convivem "grava na hora", "precisa de Salvar" e "grava a cada mensagem", às vezes na mesma linha. Daí vêm SAVE-1, SAVE-4 e SAVE-5, MAT-1 e a confusão sobre o que está salvo.
2. **A proteção contra perda é só `beforeunload`.** Ela não cobre a navegação interna, que é o caminho mais comum. Afeta case, páginas, serviços, artigos, esteira e tradução.
3. **Conflito resolvido com "Recarregue".** Quatro stores (`caseStore`, `pages/store`, `articleStore`, `materialStore`) respondem do mesmo jeito: a versão de quem estava digitando perde.
4. **A IA aplica em vez de propor.** O rascunho do case, o vídeo e as traduções das pendências substituem o conteúdo. Não existe "desfazer IA".
5. **Vários caminhos para a mesma tarefa:** traduzir (4), destacar na Home (3), SEO (2), publicar (3 sentidos) e pendências (2 listas que discordam).
6. **Vocabulário de estado inconsistente.** "Salvo", "Tudo salvo", "Publicado", "No site", "Em dia", "Rascunho", "vai ao ar no próximo deploy", "Abra o case no site para conferir". O mesmo estado tem nomes diferentes, e a mesma palavra ("publicar") nomeia ações diferentes.
7. **Efeitos colaterais escondidos.** Publicar traduz e prepara imagens, abrir a galeria chama IA e extrair material cria arquivos públicos. A tela não diz nada disso.
8. **`public/` usado como depósito.** Tudo o que entra na mídia de um case vira URL pública no próximo deploy, esteja o case no ar ou não.
9. **Cada tela organiza seu cabeçalho de um jeito.** Ações à direita mudam por aba, as abas mudam de posição e cartões de números aparecem em umas telas e não em outras.

---

## 4. Roadmap

### P0: risco de perda de dados ou de erro em produção
| Item | O que fazer | Resolve | Esforço |
|---|---|---|---|
| R1 | A mídia extraída do material fica em `.admin/` e só vai para `public/` ao entrar num bloco. A publicação só leva mídia usada por conteúdo que não é rascunho. Decisão à parte, do Gutto: os 17 painéis com números internos podem ficar públicos? | PUB-1, sist. 8 | M |
| R2 | Publicar só a partir de commit limpo. Parar se houver código sujo fora de `content/` e `public/`, com a lista dos arquivos. | PUB-2 | M |
| R3 | Guarda de navegação interna mais rascunho local por tela (restaurado ao voltar) em case, páginas, serviços, artigos e esteira. Ponte até o R6. | SAVE-1, sist. 2 | P |
| R4 | Tradução: salvar rascunho incompleto e contar as edições do inglês como "não salvo" do case. | SAVE-2 | P |
| R5 | IA nunca sobrescreve: guardar uma versão antes de aplicar, entregar a proposta separada e oferecer "Desfazer IA". | SAVE-3, sist. 4 | M |

### P1: o caminho único
| Item | O que fazer | Resolve | Esforço |
|---|---|---|---|
| R6 | Salvar automático em todo o admin (patch por campo, sem botão Salvar), com painel "Versões" e "Lixeira" lendo `.content-history`. Conflito real abre um diff e não exige recarregar. | SAVE-4, SAVE-5, SAVE-6, MAT-1, sist. 1 e 3 | G |
| R7 | Um "Publicar" com pré-checagem: lista do que muda no site e bloqueio de rascunhos, mídia sem uso e inglês não revisado. Fila única "Inglês para revisar". A publicação nunca chama IA. Vocabulário: Rascunho, Pronto, No ar. | PUB-3, PUB-4, TRAD-1, TRAD-2, PAG-3, sist. 5, 6 e 7 | M |
| R8 | Um lugar por dado: destaque e ordem na esteira, estado no cabeçalho do case. | CASE-1 | P |
| R9 | Galeria segura: contar rascunhos e envios recentes como uso e mostrar a lista ao excluir. | GAL-1 | P |
| R17 | Gaveta de pendências como `<dialog>` modal de verdade (foco dentro, resto inerte) e aviso antes do bloqueio por inatividade, com "continuar usando". | A11Y-4, A11Y-6 | P |

### P2: estrutura das telas
| Item | O que fazer | Resolve | Esforço |
|---|---|---|---|
| R10 | Editor de case em tela inteira: editor e prévia lado a lado, índice como seletor e cabeçalho fixo com estado mais duas ações (W1). | CASE-2, CASE-3, CASE-4, sist. 9 | M |
| R11 | Menu com 6 entradas, cada uma com ícone próprio. Ações do topo cabem até 900px. | NAV-1, NAV-2 | M |
| R12 | Páginas e serviços no mesmo modelo, com SEO dentro de cada página e a tela SEO como índice de conferência. | PAG-1, PAG-2 | M |
| R13 | Vídeo com modo simples de verdade; cenas e linha do tempo vão para "Ajustar". | VID-1 | M |
| R18 | Contraste e alvos: `--dim` com 4,5:1 ou mais, bordas de campo com 3:1, foco da caixa do Material com 3:1, itens do menu com 24 px de altura e link "Pular para o conteúdo". Galeria usando o `alt` das legendas. | A11Y-1, A11Y-2, A11Y-3, A11Y-5, A11Y-7, A11Y-8 | P |

### P3: acabamento
| Item | O que fazer | Resolve | Esforço |
|---|---|---|---|
| R14 | Tirar os cartões com barras decorativas (Artigos, Tradução). | DEC-1 | P |
| R15 | Chamar tudo de "IA" e listar só as chaves em uso. | MAT-2 | P |
| R16 | Chave das migalhas, tempo da aba Tradução, legendas no envio e bloqueio que não começa travado. | PAG-4, TRAD-3, GAL-2, LOCK-1 | P |

Ordem sugerida: R1 e R2 já (produção); R3 e R4 no mesmo dia (são pequenos e fecham a perda mais comum); R5; depois R6 e R7, que são as duas mudanças que tiram a confusão de fato; R10 aproveita o R6 (sem botão Salvar, o cabeçalho fica limpo).

---

## 5. Wireframes (só as mudanças estruturais)

### W1. Editor de case em tela inteira (R6 + R10)
```
┌────┬──────────────────────────────────────────────────────────────────────────────┐
│ ▣  │ Cases › PicPay        ● Salvo há 3 s · Rascunho ▾        Ver no site  Publicar│
│ ▤  ├──────────────────────────────────────────────────────────────────────────────┤
│ ▥  │ Construindo o time de design B2B no PicPay                                   │
│ ▦  │ Conteúdo  Dados  Material  Vídeo  Inglês (2 para revisar)     Versões ▾      │
│ ▧  ├───────────────────────────────────────┬──────────────────────────────────────┤
│ ⚙  │ Seção: [1 O começo ▾]                  │  Prévia   [Desktop | Celular]        │
│    │                                        │ ┌──────────────────────────────────┐ │
│    │  Título + caixa                        │ │                                  │ │
│    │  Dois designers para uma unidade…      │ │  (o case como no site, rolando   │ │
│    │                                        │ │   junto com o bloco em edição)   │ │
│    │  Números com ícone                     │ │                                  │ │
│    │  2→15 · 3 · 1                          │ │                                  │ │
│    │                                        │ └──────────────────────────────────┘ │
│    │  + bloco                               │                                      │
└────┴───────────────────────────────────────┴──────────────────────────────────────┘
```
- Não há botão Salvar: o estado "Salvo há 3 s" é a confirmação. "Versões" abre o histórico com "restaurar".
- O estado do case (Rascunho, Pronto, No ar) fica num seletor do cabeçalho, o único lugar onde ele é editado.
- A prévia ocupa 40 a 46% da largura e fica sempre visível a partir de 1200px. Abaixo de 1200px vira aba.

### W2. A IA propõe, o Gutto escolhe (R5)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Proposta da IA · 6 seções · 12/11 22:35            Ignorar   Usar tudo       │
├───────────────────────────────────┬──────────────────────────────────────────┤
│ Agora no case                      │ Proposta                                 │
│ 1 O começo (3 blocos)              │ 1 O começo (4 blocos)      [Usar seção]  │
│ 2 O lojista primeiro (2 blocos)    │ 2 O lojista primeiro (2)   [Usar seção]  │
│ …                                  │ …                                        │
├───────────────────────────────────┴──────────────────────────────────────────┤
│ Antes de aplicar, a versão atual fica em Versões. Depois: "Desfazer IA".     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### W3. Publicar com pré-checagem (R2 + R7) e menu reduzido (R11)
```
┌────────────────────┐   ┌──────────────────────────────────────────────────────┐
│ ▣ Cases            │   │ Publicar o site                                      │
│ ▤ Artigos          │   │                                                      │
│ ▥ Páginas        › │   │ Vai ao ar                                            │
│ ▦ Serviços       › │   │  ✓ PicPay: 3 blocos alterados                        │
│ ▧ Mídia            │   │  ✓ Sobre: 2 textos                                   │
│ ⚙ Configurações    │   │                                                      │
│                    │   │ Fica de fora                                         │
│                    │   │  · SulAmérica (rascunho) e as 73 imagens dele        │
│ Publicar (2)       │   │  · Inglês do Creator Ads: 4 trechos sem revisão      │
└────────────────────┘   │                                                      │
                         │ Bloqueado                                            │
                         │  ✕ Há código sem commit: lib/…, components/…         │
                         │    Faça o commit antes de publicar.                  │
                         │                                   Cancelar  Publicar │
                         └──────────────────────────────────────────────────────┘
```

---

## 6. O que não consegui verificar, e por quê

- **Fluxos que só aparecem depois de gravar** (Salvar, Publicar, Excluir, Gerar com IA, enviar arquivo, traduzir e salvar): ficaram fora pelos limites da tarefa. Os itens SAVE-3, SAVE-4, PUB-2, PUB-3, TRAD-1 e GAL-1 estão marcados como inferidos do código.
- **SAVE-2 no navegador:** o painel do navegador estava oculto, e a digitação simulada não chegou ao estado do React no campo de inglês (o mesmo truque funcionou na aba Dados). O comportamento está descrito pelo código.
- **Se o deploy das 10:44 levou código sem commit:** dá para afirmar que o deploy sobe a árvore local, mas não quais arquivos estavam sujos naquele minuto.
- **Se o repositório do git é público:** isso decide se `material.json` e as imagens no histórico também estão expostos fora do site. Não consultei o GitHub.
- **Reprodução do vídeo:** o palco ficou preto no painel oculto (`08-…`). Não avaliei a animação.
- **Plugin do Figma e "Imagem para layout":** só vi a tela (`14-figma.jpg`). Testar exige enviar imagem ou frame.
- **Conflito entre duas abas:** exige gravar numa delas. Está descrito pelo código (SAVE-4).
- **Ferramenta, não admin:** no painel do navegador, `http://localhost:3000/admin/cases/<slug>` devolvia uma versão antiga da lista de cases (mesmo em aba nova), enquanto `curl` e `http://127.0.0.1:3000` mostravam o editor. Usei `127.0.0.1` e não registrei isso como problema do admin.

### Checagens automáticas
- `npm run check`: tipos ok; **99/99 testes passaram**. O `check:admin` dessa rodada falhou na primeira sondagem ("Servidor em http://localhost:3000 não respondeu"): o servidor estava ocupado compilando e a sondagem tem limite de 5 s (`scripts/check-admin.mjs:52`). Logo depois, o servidor respondia em 0,1 s. Na segunda rodada, só do `check:admin` (`node scripts/check-admin.mjs`): **28/28 checagens passaram**. Vale endurecer a sondagem (mais tempo ou nova tentativa), porque hoje um servidor ocupado derruba a checagem inteira.
- Nenhum arquivo em `content/`, `public/` ou `.admin/` mudou durante a auditoria (`git status` sem alteração nessas pastas). A única pasta criada é esta.

---

## 7. Acessibilidade (acrescentado em 12/11, a pedido do Gutto)

**Método.** Critérios de duas skills aprovadas pelo Gutto: *Web Interface Guidelines* (vercel-labs/agent-skills@web-design-guidelines) e *accessibility* (addyosmani/web-quality-skills, WCAG 2.2). A instalação com `npx skills add … -g -y` foi **recusada pela verificação de permissões desta sessão**, então li o texto público das duas skills no GitHub e apliquei os critérios à mão. Depois disso, as duas apareceram instaladas, fora desta sessão. As evidências vêm de leitura do DOM renderizado (scripts só de leitura em `/admin/cases/picpay`, abas Conteúdo e Dados, e em `/admin/galeria`), do CSS do admin e do cálculo de contraste pela fórmula do WCAG. Lighthouse e axe exigiriam instalar pacote e ficaram de fora.

### O que passou
- `lang="pt-BR"`, um `<main>` e um `<h1>` por tela, e `color-scheme: dark`.
- Rótulos: **0 campos sem rótulo** e **0 botões sem nome** em Dados, Conteúdo (73 controles) e Galeria (250 controles).
- Imagens: todas têm o atributo `alt`.
- Mensagens (toasts, estado de salvar) em regiões `role=status`/`alert`/`aria-live` (4 regiões no editor).
- Foco global visível: `.app :focus-visible` com contorno a 55% de branco, **6,2:1** sobre o fundo (`admin.module.css:34`). Campos com borda a 34% no foco, **3,06:1** (no limite).
- `prefers-reduced-motion` tratado em 5 folhas de estilo; nenhum `transition: all`.
- "Publicar site" usa `<dialog>` nativo, que prende o foco.

### Problemas

**A11Y-1. O cinza de apoio não atinge o contraste mínimo** (P2)
- Evidência (cálculo): `--dim` (#5c5c63) tem **3,0:1** sobre o fundo, **2,84:1** sobre os painéis e **2,67:1** sobre `--raised`. O mínimo AA para texto pequeno é 4,5:1. Ele é usado em 21 regras de `admin.module.css`, entre elas os títulos de grupo do menu (11px, `:45`), as contagens das abas (`:95`), o cabeçalho das tabelas (`:137`), os números do índice (`:165`) e o separador das migalhas (`:66`). Para comparar, `--muted` (#8d8d93) fica entre 5,4 e 6,0:1 e passa.
- Recomendação: usar `--muted` nesses textos ou clarear `--dim` até 4,5:1 sobre #18181b.
- Esforço: P.

**A11Y-2. A borda dos campos quase não aparece em repouso** (P3)
- Evidência (cálculo): a borda a 13% de branco sobre `--field` dá **1,4:1**. O WCAG 1.4.11 pede 3:1 para o contorno que identifica um controle. O campo se distingue sobretudo pelo fundo, também próximo do painel.
- Recomendação: borda a cerca de 30% em repouso, ou fundo de campo mais claro que o painel.
- Esforço: P.

**A11Y-3. A caixa de mensagem do Material perde o indicador de foco** (P2)
- Evidência (código e cálculo): `.box .input:focus-visible { outline: 0 }` vence o contorno global, e o único sinal de foco passa a ser a borda da caixa a 26% (`material.module.css:69,72`): **2,31:1** sobre o painel, abaixo de 3:1.
- Recomendação: manter o contorno global ou subir a borda de foco para 3:1 ou mais.
- Esforço: P.

**A11Y-4. A gaveta de pendências se declara modal mas não prende o foco** (P1)
- Evidência (observada): com a gaveta aberta (`role="dialog" aria-modal="true"`, `AdminShell.tsx:137-139`), o foco continuou no botão "1 pendência", fora da gaveta, e **58 controles atrás** continuaram alcançáveis pelo teclado, sem `inert`. O Esc fecha e devolve o foco, o que está certo. O nome lido do botão fica "1pendência", sem espaço, porque a contagem está num `span` separado.
- Recomendação: usar `<dialog>` com `showModal()`, como em "Publicar site".
- Esforço: P.

**A11Y-5. A galeria não usa as descrições que já existem** (P2)
- Evidência (observada): as **244 miniaturas** da galeria têm `alt=""` (`AdminGallery.tsx:29`), e os 250 checkboxes de seleção são lidos só pelo nome do arquivo ("image-3.png", "image-2.png"). As legendas geradas pela IA já guardam um `alt` por imagem (`lib/media/captions.ts`, campo `alt`). A lista também não é virtualizada (250 itens).
- Recomendação: usar o `alt` da legenda no rótulo do checkbox, como "image-3.png: tela de planos do seguro viagem", e aplicar `content-visibility: auto` nos cartões.
- Esforço: P.

**A11Y-6. O admin trava sozinho, sem aviso nem como estender** (P1)
- Evidência (observada): durante a auditoria, depois de cerca de 10 minutos sem mexer, a tela voltou "Admin travado" e o teste do teclado ficou inválido até destravar. O código trava após 10 minutos sem uso (`AdminLock.tsx:7,40-41`) e não avisa antes. Isso contraria o WCAG 2.2.1, que pede aviso e forma de estender quando há tempo limite. Hoje o bloqueio não apaga o que está na tela, mas trava no meio de uma geração com IA que leva 1 a 3 minutos de leitura.
- Recomendação: aviso 30 s antes com "Continuar usando", e não contar como inatividade enquanto houver uma tarefa da IA rodando.
- Esforço: P.

**A11Y-7. Os itens do menu são baixos demais** (P3)
- Evidência (observada): os itens do menu têm **20 a 21 px de altura**, como "Travar" (187×21) e "Abrir o site" (187×20), com 2 px entre eles. O WCAG 2.5.8 pede pelo menos 24×24 px ou espaço equivalente.
- Recomendação: altura mínima de 28 px (o menu menor do NAV-1 abre espaço para isso).
- Esforço: P.

**A11Y-8. Não há "Pular para o conteúdo"** (P3)
- Evidência (observada): nenhum link interno (`a[href^="#"]`) nas telas medidas. Quem navega por teclado passa pelos 18 itens do menu e pelas ações do topo antes de chegar ao conteúdo, em toda tela.
- Recomendação: um link "Pular para o conteúdo" que aparece no foco e leva ao `<main>`.
- Esforço: P.

**Do guia da Vercel, já coberto acima:** "avisar antes de sair com alterações não salvas (beforeunload ou guarda de rota)" é exatamente o SAVE-1, e "ação destrutiva com confirmação ou desfazer" se liga a SAVE-3 e SAVE-6.

### O que não verifiquei em acessibilidade
- Leitor de tela real (VoiceOver), zoom de 200% e alto contraste do sistema.
- Lighthouse e axe, que exigem instalar pacotes, fora dos limites da auditoria.
- Navegação real com Tab: o painel do navegador estava oculto e não aceitava teclado. Os testes de foco foram feitos por script.
- O interior do editor de blocos (BlockNote) e a linha do tempo do vídeo, que tem arrastar. Falta conferir se há alternativa por teclado para tudo o que hoje se faz arrastando (WCAG 2.5.7).
