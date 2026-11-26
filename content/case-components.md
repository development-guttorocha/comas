# Componentes de case: quando usar cada um

Este guia é para o gerador de cases com IA, e para você corrigir. Os esquemas (`lib/admin/componentSchemas.ts`) dizem **como** preencher cada componente. Aqui está **quando** ele faz sentido, o tipo de imagem que ele aceita, até onde vai o texto e o ritmo de uma boa página de case.

Tudo saiu dos seis cases publicados (Banco PAN, Creator Ads, Loft, PicPay, Plenno e Webmotors) e de como cada componente se comporta na tela.

**Como corrigir:** edite este arquivo à vontade. O gerador lê o texto das seções marcadas com `<!-- case-components:… -->`, e o que você mudar aqui chega ao próximo rascunho. Só os números (peso, gerador, máximo por case, itens e limites) também ficam em `lib/ai/caseComponents.ts`, porque as checagens precisam deles. Se você mudar um número aqui, o teste avisa qual linha do código acompanhar.

**Pesos:** *leve* é uma ideia de relance (uma frase, um número, uma imagem). *Médio* é um visual com pouco texto. *Denso* pede leitura.
**Gerador:** *usar* entra quando o material pede. *Raro* entra só quando o material traz exatamente aquilo. *Evitar* são componentes válidos que continuam no admin para você usar, mas ainda não apareceram em nenhum case publicado. O gerador fica nos que já têm uso.

**Nada aqui é regra fixa de narrativa.** Cada case é documentado como o momento e o produto pedem. Abertura, fechamento e o tom das frases são sugestões. As checagens só reprovam o que aparece quebrado ou foi inventado; o resto é aviso para revisar.

## O que os cases publicados mostram

Há dois formatos no site, e o gerador escolhe o modelo pelo tipo de case:

- **Formato de ritmo** (PicPay e Creator Ads). Cada seção abre de um jeito diferente: título + caixa, frase centralizada, número gigante ou abertura de capítulo. Um divisor de tela inteira separa as seções, e texto, número e imagem se alternam. **O PicPay é o modelo para cases de liderança, estratégia e negócio.**
- **Formato seção + texto** (Plenno, Banco PAN, Loft e Webmotors). Cada seção abre com "Texto com título lateral" e mostra logo depois o que o texto descreve: imagem, site incorporado, cards. **O Plenno é o modelo para cases focados só em produto e design**, sem a parte de liderança e time: uma seção por lado do produto, cada uma mostrando o produto em seguida.

| Componente | Usos publicados |
|---|---|
| Texto com título lateral (`CaseSectionSplit`) | 21 (Banco PAN 5, Loft 6, Plenno 4, Webmotors 4, PicPay 2) |
| Frase centralizada (`CaseStatement`) | 10 (Creator Ads 7, PicPay 3) |
| Título + caixa (`CaseTitleBox`) | 5 (PicPay 3, Creator Ads 2) |
| Números (`CaseStatBand`) | 5 (Loft 2, Banco PAN, Plenno, Webmotors) |
| Bento (`CaseBento`) | 4 (PicPay 3, Creator Ads) |
| Cards (`CaseApproachCards`) | 4 (Banco PAN, Creator Ads, Loft, Plenno) |
| Fluxo (`CaseFlowDiagram`) | 3 (PicPay 2, Creator Ads) |
| Antes e depois (`CaseBeforeAfter`) | 3 (Banco PAN, Loft, Plenno) |
| Abertura de capítulo, Painel, Números com ícone | 2 cada (PicPay; Creator Ads; PicPay) |
| Número gigante, Depoimento, Agradecimentos | 2 cada |
| Seção clara, Gráfico, Linha do tempo, Antes e depois em imagens, Imagens sobrepostas, Destaque | 1 cada |
| Galeria de telas, Comparação, Proporção com ícones, Fluxo simples, Jornada | nunca usados |
| Parágrafo editorial, Figura, Imagem larga, Seção com imagem, Incorporação com título | ainda não usados (o gerador evita por enquanto) |

Imagens soltas aparecem em todos os cases (de 2 a 13 por case). Vídeo em loop aparece em Webmotors e Creator Ads, e protótipo ou site incorporado em Banco PAN e Plenno.

## 1. Componentes

<!-- case-components:componentes -->

### `section` · Marcador de seção
**Peso:** leve · **Gerador:** usar · **Máx. por case:** —
- **Quando usar:** no começo de cada capítulo da história. Ele cria o item do menu lateral e não aparece no texto. Todo case começa por um, depois do divisor.
- **Quando não usar:** para subtítulos dentro de uma seção. Para isso servem a frase centralizada e o rótulo dos componentes.
- **Limites:** `label` ≤ 24.
- **Rótulo:** de 1 a 3 palavras, como nome de capítulo ("O começo", "Diagnóstico", "O que ficou"). Nada de frase.
- **Antes:** divisor de tela inteira. **Depois:** o bloco que abre a seção.
- **Visto em:** todos os cases (de 5 a 6 por case).

### `divider` · Divisor
**Peso:** leve · **Gerador:** usar · **Máx. por case:** —
- **Quando usar:** na troca de seção, no formato de ritmo: largura 100% da tela, cor `#161c20`, espaço grande em cima e embaixo, colado ao marcador de seção (um por seção, inclusive a primeira). Também vai um antes dos agradecimentos.
- **Quando não usar:** no meio de uma seção, ou dois seguidos. Para respirar dentro da seção, use o espaçamento do componente (`spaceTop`/`spaceBottom`).
- **Limites:** nenhum.
- **Antes:** o último bloco da seção anterior. **Depois:** marcador de seção.
- **Visto em:** PicPay (6, um por seção), Creator Ads (6).

### `spacer` · Espaço vazio
**Peso:** leve · **Gerador:** evitar · **Máx. por case:** —
- **Quando usar:** nunca num rascunho novo. É um parágrafo em branco herdado do Notion.
- **Quando não usar:** sempre. Para espaço, use `spaceTop`/`spaceBottom` do componente (`none`, `sm`, `md`, `lg`, `xl`).
- **Limites:** nenhum.
- **Visto em:** Banco PAN, Loft, Plenno e Webmotors, inclusive no fim da página (até 6 seguidos na Loft).

### `CaseTitleBox` · Título + caixa
**Peso:** denso · **Gerador:** usar · **Máx. por case:** —
- **Quando usar:** para abrir o case com o contexto e o seu papel, ou para abrir uma seção que muda o problema. Funciona também para fechar com o aprendizado. O título é a afirmação. A continuação, em cinza, completa a frase com a virada ("Dois designers" + "para uma unidade de negócios inteira."). A caixa traz dois parágrafos: a situação e o que coube a você.
- **Quando não usar:** colado a outro bloco de leitura (título lateral, seção clara), ou para listar coisas. Lista vira cards ou números com ícone.
- **Imagem:** nenhuma.
- **Limites:** `sectionLabel` ≤ 24 · `title` ≤ 45 · `continuation` ≤ 45 · `intro` ≤ 160 · `body` ≤ 520.
- **Antes:** marcador de seção, ou abertura de capítulo. **Depois:** um visual que prove ou dimensione: números com ícone (3), fluxo, depoimento.
- **Visto em:** PicPay (abertura, seção 4 e fechamento), Creator Ads (seções 1 e 2).

### `CaseSectionSplit` · Texto com título lateral
**Peso:** denso · **Gerador:** usar · **Máx. por case:** —
- **Quando usar:** em cases de produto e design (modelo Plenno), para abrir cada seção com o que aquela parte do produto faz, seguido logo do produto em si. Em cases de história (modelo PicPay), para explicar uma decisão ou um mecanismo no meio da seção, com o título lateral como afirmação ("Cada parte da vida do lojista virou o escopo de uma tribo.").
- **Quando não usar:** colado a título + caixa ou seção clara, ou seguido de outro texto em vez de mostrar o que descreve.
- **Imagem:** nenhuma.
- **Limites:** `label` ≤ 60 · `body` ≤ 700.
- **Antes:** marcador de seção, números, frase ou imagem. **Depois:** o que o texto explicou: imagem, site incorporado, cards, fluxo, bento, telas.
- **Visto em:** PicPay (2, título como frase), e em todas as seções de Banco PAN, Loft, Plenno e Webmotors.

### `CaseStatement` · Frase centralizada
**Peso:** leve · **Gerador:** usar · **Máx. por case:** —
- **Quando usar:** como título do que vem logo abaixo. É uma frase curta com a ideia principal ("A resposta: um ciclo entre quem compra e quem vende."), e o apoio explica em duas ou três linhas. Abre uma seção ou um bloco dentro dela. A frase é livre: afirmação ou pergunta ("De onde partimos?"), quantas vezes a narrativa pedir.
- **Quando não usar:** sem nada que a desenvolva logo depois, ou colada a outra frase grande ou a um capítulo.
- **Imagem:** nenhuma.
- **Limites:** `body` ≤ 60 · `caption` ≤ 320.
- **Antes:** marcador de seção ou um bloco de outra ideia. **Depois:** sempre a prova (painel, imagem, bento, fluxo, telas) ou um número gigante seguido da prova.
- **Visto em:** Creator Ads (7), PicPay (3).

### `CaseChapter` · Abertura de capítulo
**Peso:** leve · **Gerador:** raro · **Máx. por case:** 2
- **Quando usar:** quando a história muda de escala, por exemplo do time para o mercado. Ou como clímax antes do fechamento, com a frase que resume a visão ("Todo mundo usa, todo lugar aceita."). Ocupa a tela inteira, com a imagem escurecida atrás.
- **Quando não usar:** no primeiro bloco do case (a capa já faz esse papel), duas vezes seguidas, colada a frase centralizada, ou só para decorar. O número gigante e vazado é opcional, e os cases publicados não o usam.
- **Imagem:** paisagem, larga ou quadrada, com algo legível mesmo escurecida (painel, foto, mockup). Nada vertical: ela cobre a tela e é cortada.
- **Limites:** `number` ≤ 3 · `title` ≤ 40 · `body` ≤ 120.
- **Antes:** marcador de seção, ou o último bloco da seção. **Depois:** título + caixa, ou o divisor da próxima seção.
- **Visto em:** PicPay (2).

### `CaseLightPanel` · Seção clara
**Peso:** denso · **Gerador:** raro · **Máx. por case:** 2
- **Quando usar:** para a virada de método, quando a página precisa de uma quebra clara ("Em vez de começar pelas contratações, começamos pelo lojista."). Também é o lugar de um diagrama de fundo claro.
- **Quando não usar:** para texto comum, ou colada a outro bloco de leitura. Duas no mesmo case perdem o efeito.
- **Imagem:** opcional. Diagramas e prints claros em paisagem, larga ou faixa. Imagem alta não, e retrato só se não houver outra.
- **Limites:** `sectionLabel` ≤ 24 · `heading` ≤ 80 · `body` ≤ 600 · `caption` ≤ 120.
- **Antes:** número gigante ou frase. **Depois:** o mapa do que ela anunciou, como números com ícone com 8 itens no PicPay.
- **Visto em:** PicPay (1).

### `text` · Texto solto
**Peso:** leve · **Gerador:** raro · **Máx. por case:** —
- **Quando usar:** para notas de rodapé ("\*Números relacionados à comparação de Q323 com Q424", pequeno, centralizado e cinza), a frase de apresentação de um protótipo incorporado, ou uma última linha em título 2 que fecha o case.
- **Quando não usar:** para parágrafos de história. Esses vão em título + caixa ou título lateral.
- **Limites:** `md` ≤ 400.
- **Antes:** o bloco a que a nota se refere. **Depois:** qualquer um.
- **Visto em:** Creator Ads (nota), Banco PAN (apresentação de protótipo), Plenno (fecho em título 2).

### `CaseEditorialParagraph` · Parágrafo editorial
**Peso:** denso · **Gerador:** evitar · **Máx. por case:** —
- **Quando usar:** para um parágrafo corrido sem título, normal ou recuado. Ainda não foi usado em case publicado, então o gerador prefere título + caixa ou título lateral.
- **Limites:** `body` ≤ 600.
- **Visto em:** nenhum case.

### `CaseBigNumber` · Número gigante
**Peso:** leve · **Gerador:** usar · **Máx. por case:** 1
- **Quando usar:** para o número que resume o case ou a escala do problema, sozinho e enorme: "+99%" de creators ganhando dinheiro, "12 → 29" squads em um trimestre. O rótulo diz o que ele mede, em uma linha.
- **Quando não usar:** mais de uma vez por case, para número fraco ou derivado (arredondado, porcentagem calculada por você), ou com valor que não seja número.
- **Imagem:** nenhuma.
- **Limites:** `value` ≤ 8 · `label` ≤ 80 · `body` ≤ 220.
- **Antes:** frase centralizada que o anuncia, ou o marcador de seção. **Depois:** a prova ou o desdobramento, como um gráfico (Creator Ads) ou uma seção clara (PicPay).
- **Visto em:** Creator Ads (resultado), PicPay (escala do problema).

### `CaseStatBand` · Números
**Peso:** médio · **Gerador:** usar · **Máx. por case:** —
- **Quando usar:** para vários resultados do mesmo tipo e período, lado a lado. Com setas ("5,2M → 17,8M"), vira gráfico de crescimento.
- **Quando não usar:** com um número só (aí é número gigante), com números de naturezas misturadas sem rótulo claro, ou mais de 6.
- **Imagem:** nenhuma.
- **Itens:** `stats` de 2 a 6.
- **Limites:** `sectionLabel` ≤ 40 · `heading` ≤ 60 · `intro` ≤ 200 · `stats[].value` ≤ 18 · `stats[].label` ≤ 40 · `stats[].caption` ≤ 40 · `attributionNote` ≤ 200.
- **Antes:** o texto do impacto. **Depois:** a imagem do produto no ar, ou o fechamento.
- **Visto em:** Loft (2), Banco PAN, Plenno, Webmotors.

### `CaseIconStats` · Números com ícone
**Peso:** médio · **Gerador:** usar · **Máx. por case:** —
- **Quando usar:** com 3 números de escala logo depois da abertura (pessoas, tribos, mercado), ou como mapa de 8 itens curtos (as necessidades do lojista). O valor pode ser palavra ("Vender") quando é um mapa.
- **Quando não usar:** com textos longos em cada item, ou com números que precisam de comparação (aí é gráfico).
- **Imagem:** nenhuma (ícones da biblioteca).
- **Itens:** `items` de 3 a 8.
- **Limites:** `heading` ≤ 60 · `intro` ≤ 200 · `items[].value` ≤ 16 · `items[].label` ≤ 50 · `items[].body` ≤ 90.
- **Antes:** título + caixa ou seção clara. **Depois:** título lateral ou fluxo.
- **Visto em:** PicPay (2).

### `CaseIconRatio` · Proporção com ícones
**Peso:** médio · **Gerador:** raro · **Máx. por case:** 1
- **Quando usar:** quando o achado é uma proporção de pessoas ("7 de 10 creators não tinham renda") e a grade de ícones torna isso concreto.
- **Quando não usar:** para porcentagens de métricas de produto (conversão, sessões), que pedem número ou gráfico.
- **Imagem:** nenhuma.
- **Limites:** `heading` ≤ 60 · `intro` ≤ 200 · `display` ≤ 12 · `label` ≤ 90 · `caption` ≤ 120.
- **Antes:** frase centralizada. **Depois:** a evidência qualitativa (painel, imagem da pesquisa).
- **Visto em:** nenhum case.

### `CaseChart` · Gráfico
**Peso:** médio · **Gerador:** usar · **Máx. por case:** —
- **Quando usar:** quando a forma dos dados conta algo: evolução no tempo (linha, área), comparação entre grupos (colunas, barras), dois resultados em porcentagem (medidor) ou antes e depois. Use os números exatamente como estão no material.
- **Quando não usar:** com um valor só, com dados inventados ou interpolados, ou com mais de 8 categorias. Não deixe "Série 1" como nome de série.
- **Imagem:** nenhuma.
- **Itens:** `categories` de 2 a 8.
- **Limites:** `heading` ≤ 60 · `intro` ≤ 200 · `title` ≤ 60 · `caption` ≤ 120.
- **Antes:** número gigante ou frase centralizada. **Depois:** imagem das pessoas ou do produto por trás dos números, e a nota de fonte.
- **Visto em:** Creator Ads (medidor com conversão e ativação).

### `CasePanel` · Painel de cards
**Peso:** denso · **Gerador:** usar · **Máx. por case:** —
- **Quando usar:** para reunir a evidência da pesquisa num só lugar: dados de mercado (números empilhados, gráficos com fonte), prints de sessão ou suporte com uma frase, e um card de texto com a síntese e a lista de problemas.
- **Quando não usar:** com um card só, ou sem fonte em dado de mercado. Não use dois painéis colados (no Creator Ads há uma frase, uma imagem e uma linha do tempo entre eles).
- **Imagem:** nos cards "imagem e frase", prints em retrato ou paisagem (a imagem se ajusta ao card).
- **Itens:** `cards` de 2 a 4.
- **Limites:** `heading` ≤ 60 · `intro` ≤ 200 · `cards[].title` ≤ 60 · `cards[].body` ≤ 700.
- **Antes:** frase centralizada ("De onde partimos?"). **Depois:** frase centralizada da próxima etapa.
- **Visto em:** Creator Ads (2).

### `CaseFlowDiagram` · Fluxo
**Peso:** médio · **Gerador:** usar · **Máx. por case:** —
- **Quando usar:** para desenhar um mecanismo: o ciclo de valor (círculos, como "Criar → Publicar → … → Ganhar"), a organização do time (organograma) ou um processo com ramos. Destaque na cor do case o nó que é o ponto da história.
- **Quando não usar:** para etapas de projeto em ordem cronológica (aí é linha do tempo), ou com textos longos nos nós.
- **Imagem:** nenhuma.
- **Itens:** `nodes` de 3 a 6.
- **Limites:** `heading` ≤ 60 · `intro` ≤ 200 · `caption` ≤ 120 · `nodes[].title` ≤ 30 · `nodes[].body` ≤ 70.
- **Antes:** título + caixa, título lateral ou frase centralizada que o anuncia. **Depois:** o divisor da próxima seção, ou a evidência.
- **Visto em:** PicPay (organograma e ciclo), Creator Ads (ciclo do creator).

### `CaseFlow` · Fluxo simples
**Peso:** médio · **Gerador:** raro · **Máx. por case:** —
- **Quando usar:** para 3 a 5 etapas em linha com texto curto, quando não há ramos nem ciclo.
- **Quando não usar:** se o fluxo (`CaseFlowDiagram`) servir, porque ele é o padrão dos cases publicados.
- **Itens:** `steps` de 3 a 5.
- **Limites:** `heading` ≤ 60 · `steps[].title` ≤ 30 · `steps[].body` ≤ 120.
- **Visto em:** nenhum case.

### `CaseTimeline` · Linha do tempo
**Peso:** médio · **Gerador:** raro · **Máx. por case:** —
- **Quando usar:** para marcos com data, ou para uma contagem curta em sequência (no Creator Ads: 10 creators, 5 ativos, 2 ex-usuários, 3 potenciais).
- **Quando não usar:** para explicar um mecanismo (fluxo) ou para mais de 6 marcos.
- **Itens:** `items` de 3 a 6.
- **Limites:** `heading` ≤ 60 · `intro` ≤ 200 · `items[].date` ≤ 12 · `items[].title` ≤ 30 · `items[].body` ≤ 120.
- **Antes:** a foto ou a frase da pesquisa. **Depois:** o painel com o que a pesquisa achou.
- **Visto em:** Creator Ads (1).

### `CaseResultsJourney` · Jornada
**Peso:** denso · **Gerador:** raro · **Máx. por case:** —
- **Quando usar:** para etapas numeradas que precisam de um parágrafo cada (fases de um processo de discovery).
- **Quando não usar:** se o texto de cada etapa couber num fluxo ou numa linha do tempo.
- **Itens:** `steps` de 3 a 5.
- **Limites:** `heading` ≤ 60 · `intro` ≤ 200 · `steps[].title` ≤ 40 · `steps[].body` ≤ 200.
- **Visto em:** nenhum case.

### `CaseApproachCards` · Cards
**Peso:** denso · **Gerador:** usar · **Máx. por case:** —
- **Quando usar:** para 2 a 4 escolhas paralelas com título e uma ou duas frases: pilares da direção, achados da pesquisa, frentes de trabalho. Use o tom "suave" no card que é a aposta.
- **Quando não usar:** com 1 card ou mais de 4, ou com parágrafos longos. Com mais texto, use título lateral.
- **Imagem:** nenhuma.
- **Itens:** `items` de 2 a 4.
- **Limites:** `sectionLabel` ≤ 30 · `heading` ≤ 60 · `items[].title` ≤ 40 · `items[].body` ≤ 240.
- **Antes:** frase centralizada ou imagem da decisão. **Depois:** frase que apresenta o resultado, e as telas.
- **Visto em:** Banco PAN, Creator Ads, Loft, Plenno.

### `CaseComparison` · Comparação lado a lado
**Peso:** denso · **Gerador:** raro · **Máx. por case:** 1
- **Quando usar:** para comparar opções ou concorrentes atributo por atributo, com ✓ e ✕, e uma coluna em destaque.
- **Quando não usar:** para antes e depois de um mesmo produto (antes e depois), ou para mais de 4 colunas.
- **Itens:** `rows` de 3 a 8.
- **Limites:** `heading` ≤ 60 · `intro` ≤ 200 · `caption` ≤ 120.
- **Visto em:** nenhum case.

### `CaseBeforeAfter` · Antes e depois
**Peso:** denso · **Gerador:** raro · **Máx. por case:** 1
- **Quando usar:** quando a mudança é de cenário, não de tela: como o trabalho acontecia antes e depois, em duas frases cada lado.
- **Quando não usar:** se houver imagens reais do antes e do depois (aí é antes e depois em imagens), ou como resumo que repete o texto anterior.
- **Imagem:** nenhuma.
- **Limites:** `heading` ≤ 60 · `banner` ≤ 80 · `before.label` ≤ 24 · `after.label` ≤ 24 · `before.body` ≤ 240 · `after.body` ≤ 240.
- **Antes:** o texto da decisão ou os números. **Depois:** o protótipo, a frase de fechamento.
- **Visto em:** Banco PAN, Loft, Plenno.

### `image` · Imagem
**Peso:** leve · **Gerador:** usar · **Máx. por case:** —
- **Quando usar:** para uma tela, um mockup, uma foto da pesquisa ou um benchmark, logo depois da frase que a apresenta. Até 3 seguidas.
- **Quando não usar:** com 4 ou mais seguidas (junte em galeria de telas, imagens sobrepostas ou bento).
- **Imagem:** na largura do conteúdo, paisagem, larga ou faixa (quadrada só se não houver outra). A 100% da tela, só larga ou faixa. A 50% (`w50`), aceita retrato e quadrada: é onde vai um mockup ou uma foto. Imagem alta (tela de celular, página inteira) nunca fica solta na largura do conteúdo.
- **Limites:** `caption` ≤ 120.
- **Antes:** frase centralizada ou o texto que ela ilustra. **Depois:** a próxima ideia.
- **Visto em:** todos os cases.

### `images` · Imagens lado a lado
**Peso:** médio · **Gerador:** raro · **Máx. por case:** —
- **Quando usar:** para duas ou três imagens da mesma proporção que se comparam.
- **Quando não usar:** com proporções diferentes (as alturas não batem). Prefira galeria de telas ou bento.
- **Itens:** `images` de 2 a 3.
- **Limites:** nenhum.
- **Visto em:** nenhum case.

### `video` · Vídeo
**Peso:** leve · **Gerador:** raro · **Máx. por case:** —
- **Quando usar:** para um loop silencioso do produto em uso (Webmotors) ou um pequeno ornamento entre seções, a 25% da tela (a moeda girando no Creator Ads).
- **Quando não usar:** para vídeo com fala ou que precise de som. Esse leva os controles do player e não é loop.
- **Limites:** `caption` ≤ 120.
- **Visto em:** Webmotors, Creator Ads (2).

### `embed` · Incorporação (site ou protótipo)
**Peso:** médio · **Gerador:** raro · **Máx. por case:** 2
- **Quando usar:** quando o produto está no ar ou há um protótipo navegável que vale mais que um print. Ponha antes uma linha de texto dizendo o que é.
- **Quando não usar:** para um site que pode sair do ar, ou para mais de dois por case.
- **Limites:** `caption` ≤ 120.
- **Antes:** texto solto que apresenta. **Depois:** a próxima seção.
- **Visto em:** Banco PAN (Figma e site), Plenno (2 sites).

### `CaseBento` · Bento grid
**Peso:** médio · **Gerador:** usar · **Máx. por case:** —
- **Quando usar:** para mostrar várias telas ou conceitos de uma vez, com um título curto em cada bloco ("Para quem compra: onde usar o PicPay"). Também serve para juntar práticas em blocos de texto curtos com um depoimento grande, ou o legado (imagem, número e vídeo).
- **Quando não usar:** com imagem que não combina com o tamanho do bloco, com texto longo em bloco pequeno, ou sem uma frase antes dizendo o que o leitor vê.
- **Imagem:** o bloco corta a imagem. Use `1x2` para telas de celular (alta ou retrato), `2x1` para telas de computador ou painéis (paisagem ou larga) e `2x2` ou `1x1` para imagem quadrada ou pouco retangular.
- **Itens:** `tiles` de 3 a 6.
- **Limites:** `heading` ≤ 60 · `tiles[].title` ≤ 50 · `tiles[].body` ≤ 260 · `tiles[].value` ≤ 10 · `tiles[].label` ≤ 140 · `tiles[].caption` ≤ 80.
- **Texto de bloco "texto":** até uns 80 caracteres. O limite de 260 é para o bloco "citação".
- **Antes:** frase centralizada ou título lateral. **Depois:** frase centralizada, capítulo ou divisor.
- **Visto em:** PicPay (3), Creator Ads.

### `CaseScreens` · Galeria de telas
**Peso:** médio · **Gerador:** usar · **Máx. por case:** —
- **Quando usar:** para as telas do app, lado a lado com legenda curta ("Acesso", "Carteira"). Com a moldura de celular, as imagens são cortadas pelo topo. É a saída natural para 4 ou mais telas que viraram imagens soltas.
- **Quando não usar:** com moldura de celular em telas de computador (use "sem moldura"), ou com telas que precisam ser lidas inteiras.
- **Imagem:** com moldura de celular, imagens altas (cerca de 390×844). Sem moldura, todas com a mesma proporção.
- **Itens:** `screens` de 2 a 8.
- **Limites:** `heading` ≤ 60 · `intro` ≤ 200 · `screens[].label` ≤ 24 · `screens[].caption` ≤ 80.
- **Antes:** frase centralizada que apresenta o produto. **Depois:** a próxima ideia, ou números.
- **Visto em:** nenhum case (seria o lugar das 4 telas soltas do Creator Ads e do Webmotors).

### `CaseImageStack` · Imagens sobrepostas
**Peso:** médio · **Gerador:** usar · **Máx. por case:** —
- **Quando usar:** para 2 a 5 telas que formam um conjunto e mostram a amplitude do produto, sem que o leitor precise ler cada uma. Escolha a composição pelo que as telas contam:
  - **Cascata** (2 a 4): janelas de computador do mesmo fluxo, descendo na diagonal; a última fica na frente.
  - **Destaque** (2 a 3): uma tela principal na frente e as outras espiando atrás (no Webmotors, a página do catálogo).
  - **Leque** (2 a 5): telas de celular abertas pela base, com a do meio por cima.
  - **Colunas desencontradas** (2 a 5): várias telas do mesmo peso, em duas colunas que se encostam.
  - **Fileira** (2 a 4): telas de celular lado a lado, cada uma cobrindo a borda da vizinha.
  A primeira imagem é a principal: na cascata fica atrás, no destaque fica na frente.
- **Quando não usar:** quando cada tela precisa ser lida (galeria de telas), com uma imagem só, ou com fotos, logos e diagramas (eles têm lugar no bento, na seção clara ou soltos).
- **Imagem:** pela legenda da imagem (`content/media-captions/`, campo `kind`), só `tela-app` e `tela-web`. Para tela web ou de computador, use quadro paisagem ou clássico, com moldura de navegador ou cartão; o quadro retrato serve para uma página web longa cortada pelo ponto de foco (Webmotors). Para tela de app, use quadro celular ou retrato, com leque ou fileira. Não misture os dois tipos no mesmo quadro. Imagem `varias-telas` já é uma composição: vai solta. Marque o ponto de foco quando a imagem for uma página longa, porque o quadro corta pelo topo.
- **Itens:** `items` de 2 a 5. Cascata e fileira comportam até 4, destaque até 3; o que passar disso não aparece.
- **Limites:** `heading` ≤ 60 · `intro` ≤ 200 · `caption` ≤ 120.
- **Antes:** o texto da decisão. **Depois:** a próxima seção.
- **Visto em:** Webmotors (destaque, páginas do catálogo).

### `CaseImageCompare` · Antes e depois em imagens
**Peso:** médio · **Gerador:** raro · **Máx. por case:** 2
- **Quando usar:** só com antes e depois reais da mesma tela, exportados no mesmo tamanho. O divisor arrastável só faz sentido se os elementos se sobrepõem.
- **Quando não usar:** com telas diferentes, com tamanhos diferentes (o depois é cortado no quadro do antes), ou com mockup de um lado e print do outro.
- **Imagem:** as duas com a mesma proporção, de preferência larga ou paisagem, e as duas telas ou composições de telas (`tela-app`, `tela-web` ou `varias-telas` na legenda), nunca foto ou logo.
- **Limites:** `heading` ≤ 60 · `intro` ≤ 200 · `caption` ≤ 120 · `before.label` ≤ 16 · `after.label` ≤ 16.
- **Antes:** frase que diga o que mudou. **Depois:** o que o case pedir; ele pode fechar o case, como no Creator Ads.
- **Visto em:** Creator Ads (home antes e depois, 3840×1880 as duas).

### `CaseMediaEmbed` · Incorporação com título
**Peso:** médio · **Gerador:** evitar · **Máx. por case:** —
- **Quando usar:** para um site ou protótipo incorporado com título e legenda próprios. Ainda não foi usado em case publicado; o gerador usa a incorporação do site (`embed`) com uma linha de texto antes.
- **Limites:** `title` ≤ 60 · `caption` ≤ 120.
- **Visto em:** nenhum case.

### `CaseMediaFigure` · Figura
**Peso:** leve · **Gerador:** evitar · **Máx. por case:** —
- **Quando usar:** para uma imagem num quadro fixo de 16:10, com legenda. Ainda não foi usada em case publicado; o gerador usa a imagem do site (`image`), que tem largura, corte e versão de celular.
- **Imagem:** paisagem ou larga (o quadro corta o resto).
- **Limites:** `caption` ≤ 120.
- **Visto em:** nenhum case.

### `CaseMediaFullWidth` · Imagem larga
**Peso:** leve · **Gerador:** evitar · **Máx. por case:** —
- **Quando usar:** para uma imagem na largura total do conteúdo. Ainda não foi usada em case publicado; o gerador usa a imagem do site (`image`) com a largura escolhida.
- **Imagem:** larga ou faixa.
- **Limites:** nenhum.
- **Visto em:** nenhum case.

### `CaseSectionMedia` · Seção com imagem
**Peso:** médio · **Gerador:** evitar · **Máx. por case:** —
- **Quando usar:** para um título, uma introdução e uma imagem num bloco só. Ainda não foi usada em case publicado; o gerador monta o mesmo com frase centralizada e imagem.
- **Limites:** `label` ≤ 40 · `intro` ≤ 300.
- **Visto em:** nenhum case.

### `CasePullQuote` · Destaque
**Peso:** leve · **Gerador:** raro · **Máx. por case:** 1
- **Quando usar:** para o aprendizado final em uma frase forte, com o rótulo "Aprendizados" (Webmotors).
- **Quando não usar:** para citação de outra pessoa (aí é depoimento), ou no meio do case.
- **Imagem:** nenhuma.
- **Limites:** `label` ≤ 24 · `body` ≤ 220.
- **Antes:** o último bloco de resultado. **Depois:** nada, ou os agradecimentos.
- **Visto em:** Webmotors.

### `CaseResultsQuote` · Depoimento
**Peso:** leve · **Gerador:** raro · **Máx. por case:** 2
- **Quando usar:** quando o material traz uma fala real: um lojista na pesquisa ("Vender mais, sempre vender mais…") como prova do problema, ou um liderado sobre a sua liderança. Use o texto literal e a atribuição sem nome quando o material não tiver nome.
- **Quando não usar:** com fala inventada ou parafraseada, ou sem atribuição.
- **Imagem:** nenhuma.
- **Limites:** `body` ≤ 240 · `attribution` ≤ 80.
- **Antes:** título + caixa com o problema, ou o texto do aprendizado. **Depois:** a frase centralizada com a resposta.
- **Visto em:** PicPay (lojista), Loft (designer).

### `CaseThanksCards` · Agradecimentos
**Peso:** leve · **Gerador:** raro · **Máx. por case:** 1
- **Quando usar:** no fim, com um card "Obrigado" e os nomes do time, na cor do case, em uma coluna. Só se o material trouxer os nomes.
- **Quando não usar:** no meio do case, ou com nomes inventados.
- **Itens:** `items` de 1 a 2.
- **Limites:** `items[].title` ≤ 30 · `items[].body` ≤ 300.
- **Antes:** divisor de tela inteira. **Depois:** nada.
- **Visto em:** Creator Ads, Loft.

<!-- /case-components:componentes -->

## 2. Ritmo da página

<!-- case-components:ritmo -->
Ritmo da página. Escolha o modelo pelo tipo de case: PicPay para liderança, estratégia e negócio; Plenno para cases só de produto e design. As linhas abaixo valem para os dois, salvo quando dizem o modelo. Abertura e fechamento são sugestões: cada case começa e termina como o momento e o produto pedem.

- **Três pesos se alternam.** Leve é uma ideia de relance (frase centralizada, número gigante, capítulo, citação, uma imagem). Médio é um visual com pouco texto (fluxo, bento, telas, gráfico, números). Denso pede leitura (título + caixa, título lateral, seção clara, painel, cards). Nunca 3 densos seguidos. Dois blocos guiados por parágrafo (título + caixa, título lateral, seção clara) nunca ficam colados: entre eles vai uma frase, um número ou uma imagem.
- **Toda afirmação tem prova logo abaixo.** A frase centralizada é o título do que vem depois: imagem, painel, bento, fluxo, telas. Frase → número gigante → gráfico também vale. Duas frases grandes coladas (frase, capítulo, número gigante) costumam ler como dois títulos sem conteúdo. A frase em si é livre: afirmação ou pergunta, conforme a narrativa.
- **Seções de 2 a 6 blocos.** O PicPay vai de 2 a 5. Acima de 9, divida a seção ou junte as imagens num componente. A última seção pode ser um bloco só, o fechamento.
- **Abertura das seções.** No modelo PicPay, varie entre título + caixa, frase centralizada, número gigante e capítulo. No modelo Plenno, cada seção abre com o título lateral do que aquela parte do produto faz, e mostra o produto logo em seguida.
- **Divisores marcam só a troca de seção.** No modelo PicPay, use um divisor de tela inteira (100% da tela, cor `#161c20`, espaço grande em cima e embaixo) colado a cada marcador de seção, inclusive o primeiro, e mais um antes dos agradecimentos. Nunca no meio de uma seção e nunca dois seguidos.
- **Espaço vem do componente.** Use `spaceTop`/`spaceBottom`: `lg` entre ideias, `md` quando o bloco seguinte continua a mesma ideia, `sm` ou `none` para colar uma nota. Não use parágrafos vazios.
- **Raridades.** Número gigante: um por case, o número que resume tudo. Capítulo: no máximo dois, para a virada de escala da história e para o clímax antes do fechamento. Seção clara: uma. Antes e depois em imagens: só com a mesma tela, real, no mesmo tamanho.
- **Imagens.** Até 3 soltas seguidas. Com mais, use galeria de telas, imagens sobrepostas ou bento. A proporção da imagem decide o componente: alta (celular, página inteira) vai em bento `1x2`, galeria com moldura de celular, imagens sobrepostas em leque ou imagem a 50%. Larga (computador) vai solta na largura do conteúdo, em bento `2x1` ou em cascata.
- **Abertura do case (sugestão).** No PicPay: capa → divisor → seção 1 → título + caixa com o contexto e o seu papel (título curto + continuação em cinza; caixa com dois parágrafos: a situação e o que coube a você) → um visual que dá a escala ou o mecanismo (números com ícone com 3 itens, ou fluxo). No Plenno: título lateral com o que o produto é e o prazo, seguido da imagem do produto.
- **Fechamento do case (sugestão).** Termina como o case pede: título + caixa com o aprendizado (PicPay), uma linha em título 2 (Plenno), destaque (Webmotors), ou um bento e o antes e depois da tela principal (Creator Ads). Agradecimentos são opcionais e, quando existem, vêm por último, depois de um divisor.
- **Capa (no case.json, não no corpo).** Use a capa em tela cheia (`heroVariant: "fullBleed"`) quando houver uma imagem larga (proporção de 1,6 a 2,4) com pelo menos 1600 px de largura, ou um vídeo. Ela usa o `productTag` como sobretítulo e o resumo como linha de apoio (até 280 caracteres); marque `heroImageFocus` quando o assunto não estiver no centro. Use a capa editorial (padrão) quando não houver imagem forte, só prints pequenos ou material sob sigilo. Ela mostra a palavra gigante (`heroMegaWord`, até 12 letras: o nome da empresa).
<!-- /case-components:ritmo -->

## 3. Estrutura típica

<!-- case-components:estrutura -->
Estrutura típica. Os rótulos de seção são exemplos reais; a ordem é sugestão.

**Liderança, estratégia e negócio (modelo PicPay, formato de ritmo):**

1. **Contexto** ("O começo", "Contexto"): título + caixa com a situação e o seu papel → números com ícone (3) ou fluxo do mecanismo.
2. **Problema ou diagnóstico** ("Diagnóstico", "O lojista primeiro"): número gigante ou frase com a escala do problema → evidência (painel com dados e fonte, seção clara, foto da pesquisa, linha do tempo dos participantes) → o achado (frase + imagens de benchmark, mapa em números com ícone).
3. **Decisão** ("Decisão", "As pessoas"): frase centralizada com a direção → cards com os pilares, ou bento com as práticas → título lateral com a organização + fluxo.
4. **Virada ou solução** ("O mercado novo", "A visão"): capítulo (opcional) → título + caixa com o novo problema → depoimento da pesquisa → frase com a resposta → fluxo do ciclo → bento com as telas e os conceitos.
5. **Resultados** ("Resultados", "Impacto"): frase centralizada → número gigante → gráfico → frase + imagem das pessoas por trás dos números → nota de fonte.
6. **Fechamento** ("O que ficou", "Legado", "Aprendizados"): título + caixa com o aprendizado, ou frase + bento com o legado → (divisor + agradecimentos).

**Produto e design (modelo Plenno, formato seção + texto):**

1. **O produto** ("Produto"): título lateral com o que é, para quem e o prazo → imagem larga do produto.
2. **Um lado do produto por seção** ("Para o médico", "Para o hospital"): título lateral com o que aquele lado resolve → o produto em uso (site ou protótipo incorporado, telas, vídeo em loop).
3. **O sistema** ("Sistema"): título lateral com o que os lados compartilham → cards com as capacidades → imagem ou animação do sistema.
4. **A entrega** ("Entrega"): números (prazo, uso) → antes e depois do cenário → uma linha final em título 2.

Variações:
- **Liderança e time** (PicPay, Loft): a escala do time (2 → 15), o organograma no fluxo, as práticas de gestão em bento, o depoimento de um liderado. Resultados são de pessoas e de negócio, com a atribuição dita com cuidado ("resultados do produto e do trabalho coletivo do time").
- **Produto** (Creator Ads, Webmotors, Plenno): pesquisa com dados de mercado (painel), benchmarks, telas (bento, galeria ou imagens sobrepostas), gráfico de resultado, antes e depois real da tela principal.
- **Discovery** (Banco PAN): achados em cards, protótipo incorporado, números da escala da pesquisa.
- **Case curto** (Plenno, dois meses): 4 ou 5 seções, cada uma com um lado do produto.
- Sem resultado numérico no material: a seção de resultados vira "Impacto" com o que mudou (antes e depois, depoimento) e nenhum número gigante.
<!-- /case-components:estrutura -->

## 4. Checagens automáticas

Rodam sobre o `body.json` sem IA (`checkCase` em `lib/ai/caseComponents.ts`; as de imagem precisam dos tamanhos dos arquivos, lidos por `loadImageSizes`). *Erro* é o que vai aparecer quebrado ou é inventado. *Aviso* é questão de gosto, para revisar.

**Estrutura**
- `secao-abertura`: o corpo começa com um marcador de seção (no máximo um divisor antes). Erro.
- `secao-quantidade`: de 4 a 7 seções.
- `secao-rotulo`: rótulo de seção com até 24 caracteres e 3 palavras.
- `secao-curta` / `secao-longa`: de 2 a 9 blocos de conteúdo por seção. A última pode ter 1.
- `agradecimentos`: uma vez só, e por último.
- Abertura e fechamento do case não têm checagem: cada case começa e termina como pede.

**Ritmo**
- `denso-seguido`: nunca 3 blocos densos seguidos.
- `texto-seguido`: título + caixa, título lateral e seção clara nunca colados.
- `frase-seguida`: duas frases grandes coladas (exceto frase → número gigante). Só aviso.
- `frase-sem-prova`: frase centralizada sem nada que a desenvolva, na mesma seção. Só aviso; o conteúdo da frase (afirmação ou pergunta) é livre.
- `componente-repetido`: o mesmo componente 3 vezes seguidas.
- `imagens-seguidas`: 4 ou mais imagens soltas seguidas.
- `divisor-duplo`, `divisor-solto`, `divisor-faltando`: divisores colados, divisor de tela inteira no meio de uma seção, ou uma seção sem o divisor que as outras têm.
- `espaco`: parágrafos vazios em sequência ou no fim.

**Conteúdo**
- `texto-longo`: campo acima do limite do componente. Aviso até 1,5× o limite, erro acima disso.
- `contagem`: lista fora da quantidade que o componente comporta. Erro se estiver vazia.
- `repeticao`: componente acima do máximo por case.
- `componente-desconhecido` e `componente-invalido`: nome inventado, ou campos com que o site não renderiza. Erro.
- `bloco-cru`: bloco avançado (JSON cru).
- `placeholder`: texto padrão do admin esquecido ("Texto.", "Título", "Série 1"…). Erro.
- `atribuicao`: depoimento sem atribuição. Erro.
- `numero-sem-numero`: número gigante sem número.
- `alt`: imagem dentro de componente sem descrição.

**Imagens**
- `imagem-formato`: proporção que não combina com o espaço. Imagem alta ou em retrato solta na largura do conteúdo ou a 100% da tela é erro; também capítulo ou figura com imagem vertical. Bento com imagem que não combina com o tamanho do bloco, galeria de celular com tela de computador e imagens sobrepostas com quadro trocado são avisos.
- `imagem-tipo`: pela legenda da imagem (`kind` em `content/media-captions/`), imagens sobrepostas e galeria de telas recebem só telas (`tela-app`, `tela-web`), e antes e depois em imagens também aceita `varias-telas`. Nas imagens sobrepostas, tela web não vai no quadro celular, nem tela de app no quadro paisagem. Aviso.
- `imagem-par`: antes e depois em imagens com proporções diferentes. Erro.
- `hero`: capa em tela cheia sem imagem (erro), com imagem estreita ou com menos de 1600 px; palavra gigante longa; resumo acima de 280 caracteres.

**O que as checagens acham hoje nos cases publicados** (com o tipo de cada imagem lido das legendas):
- **PicPay:** nenhum aviso.
- **Plenno:** só espaços vazios (um trecho de 3 parágrafos em branco e o fim da página).
- **Loft:** um rótulo de números acima do limite e espaços vazios no fim.
- **Banco PAN:** capa de 800 px (abaixo de 1600 px), seção Contexto com um bloco só, dois títulos laterais colados, dois cards acima do limite e espaço vazio no fim.
- **Webmotors:** capa de 853 px, imagens sobrepostas sem descrição, 4 imagens soltas seguidas e espaços vazios no fim.
- **Creator Ads:** um erro ("Série 1" no gráfico de conversão) e 6 avisos: a seção Diagnóstico com 13 blocos, a seção Decisão sem o divisor que as outras têm, 4 telas soltas seguidas, uma legenda de 379 caracteres, imagem do bento sem descrição e espaço vazio no fim.
