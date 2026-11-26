# Sistema de “chamadas” no corpo dos cases (Notion → site)

Este ficheiro explica **para outro assistente (ex.: Claude)** como funciona o que o autor chama de sistema de chamadas: **marcas especiais no texto do Notion** que o Next.js interpreta e transforma em **âncoras de navegação** ou em **componentes React** do design system do case.

Não é um segundo protocolo de rede: é **convenção de texto** + **parser** no servidor/cliente.

---

## 1. Fluxo geral (visão de alto nível)

1. Cada case vem de uma **linha de database** no Notion. O **corpo** do texto é a **página** dessa linha (ou outra página, se existir coluna `notionContentPageId`).
2. O servidor chama a **API REST do Notion**, obtém a **árvore de blocos** (`blocks` com filhos recursivos).
3. `app/cases/[slug]/page.tsx` faz **um único fetch** da árvore (`fetchNotionPageBlockTree` em `lib/notionBlockTree.ts`) quando há token e ID de página.
4. Essa mesma árvore serve a dois fins:
   - **Navegação lateral**: função `collectNotionCaseSectionNav` (`lib/notionCaseNavFromHeadings.ts`) procura blocos cujo texto começa por `[-nav …]`.
   - **Render do artigo**: `NotionPageDocument` percorre os blocos e, em **parágrafos**, tenta detetar `[case:…]`.

Para documentação visual: um diagrama simples **Notion → API → árvore de blocos → (nav + HTML/React)** cobre o fluxo.

---

## 2. Protocolo A — `[-nav 1]` … `[-nav 5]` (navegação por secções)

**Onde escrever:** no início do texto de um **Heading 1/2/3** ou de um **parágrafo** normal.

**Formato:** `[-nav N] Rótulo`, com `N` entre 1 e 5 (ex.: `[-nav 1] Desafio`). Opcionalmente, no **fim da mesma linha**: `[/-nav N+true]` ou `[/-nav N+false]` (o `N` do fecho deve coincidir). Sem fecho = equivalente a `+true`. Com `+false`, o rótulo entra na barra e na âncora mas **não** é renderizado no corpo (`visibleBody: false` em `headingAnchors`).

**O que o código faz:**

- Regex em `notionCaseNavFromHeadings.ts`: o prefixo `[-nav N]` **não aparece** no site; o fecho `[/-nav N+…]` é removido quando válido.
- O texto entre abridor e fecho (ou até ao fim, se não houver fecho) vira **rótulo** na barra de navegação do case.
- Gera-se um **id de âncora** (slug derivado do rótulo, sem acentos) para o link `#…` na URL.
- No máximo **5** itens; ordenação por `N`, depois ordem de aparição na página.

**Ligação ao render:** o mapa `headingAnchors` associa o **id do bloco Notion** ao `anchorId`, ao texto sem prefixo/fecho e a `visibleBody`. `NotionPageDocument` usa isso nos headings/parágrafos para `id` e texto mostrado (ou âncora vazia se `visibleBody === false`).

Se não houver nenhum `[-nav …]`, a barra fica só com **Conteúdo** → `#case-doc`.

---

## 3. Protocolo B — `[case:NomeDoComponente] { JSON }` (componentes do playbook)

**Ideia:** em vez de só HTML genérico, o autor cola **uma linha** num parágrafo Notion que parece um “comando” + dados estruturados. O site **valida** o nome contra uma **whitelist** e monta o componente React correspondente.

**Onde escrever:** num bloco **parágrafo** (uma linha), ou no corpo de um bloco **código** com linguagem `case` (ou `portfolio-case`) contendo **só JSON** com `"component": "…"`.

**Forma parágrafo (regex):**

```text
[case:CasePullQuote] {"label":"// Aprendizados","body":"Texto aqui."}
```

- O nome após `case:` tem de ser **exatamente** um dos permitidos (ver abaixo).
- O JSON é o payload; no parágrafo o campo `"component"` pode ser **omitido** porque o parser **injeta** o nome a partir do prefixo (`tryParseCaseEmbedParagraph` em `lib/notionCaseEmbedFromNotion.ts`).

**Forma bloco de código:** JSON válido com `"component": "…"` obrigatório; `parseCaseEmbedJson` lê o texto inteiro.

**Segurança / extensibilidade:** só entram componentes listados em `NOTION_CASE_EMBED_COMPONENTS`. Qualquer outro nome é **ignorado** (não há execução dinâmica de código arbitrário).

**Componentes permitidos (lista fechada):**

| Nome | Função típica na UI |
|------|---------------------|
| `CasePullQuote` | Citação / destaque com label |
| `CaseStatBand` | Faixa de métricas (stats) |
| `CaseSectionSplit` | Secção com coluna de rótulo + corpo (body dividido por parágrafos duplos) |
| `CaseEditorialParagraph` | Parágrafo editorial |
| `CaseMediaFullWidth` | Imagem full width |
| `CaseSectionMedia` | Secção com mídia + `media: { src, alt }` |
| `CaseBeforeAfter` | Comparativo antes/depois |

**Depois do parse:** `NotionCaseEmbed.tsx` faz `switch` em `embed.kind` e renderiza o componente real em `components/case/blocks/…`.

---

### 3.1 Como adicionar o componente no Notion (passo a passo)

**Forma recomendada para a maioria — parágrafo numa linha**

1. Na página do case (corpo da linha da database), cria um bloco **Texto** / **Parágrafo** vazio.
2. Escreve **numa única linha**, sem Enter no meio: `[case:NomeExato] ` (espaço após `]`) + **JSON** entre `{` e `}`.
3. O nome tem de ser **idêntico** a um dos sete (maiúsculas/minúsculas como na tabela): `CasePullQuote`, não `casepullquote`.
4. O JSON tem de ser **válido**: aspas `"` retas, vírgulas entre campos, strings com aspas internas escapadas `\"` se precisares de `"` dentro do texto.
5. Guarda a página; no site, esse parágrafo **deixa de ser** texto normal — vira só o componente (o utilizador não vê `[case:…]` no HTML final).

**Quando o JSON fica grande ou com muitas linhas de texto**

- Usa um bloco **Código** (`/code`).
- Na lista de linguagens, escolhe **`case`** ou **`portfolio-case`** (se o Notion não listar, usa a forma parágrafo ou cria o código noutro editor e colas).
- O corpo do bloco é **só** o JSON, começando por `{` e com `"component": "CasePullQuote"` (ou outro nome) **obrigatório**.
- Vantagem: podes indentar e usar várias linhas no JSON sem a regex do parágrafo.

**Erros comuns**

- Quebra de linha **dentro** do `[case:…] {…}` no parágrafo → a regex deixa de bater; volta a pôr tudo numa linha ou usa bloco código.
- Nome fora da whitelist → o site mostra o parágrafo como texto normal (não interpreta).
- Aspas “curvas” do Word/Notion em vez de `"` → JSON inválido; substitui por aspas normais.

---

### 3.2 Cada componente — campos e exemplo mínimo

Em todos os exemplos de **parágrafo**, a linha começa por `[case:…] ` + JSON. Nos exemplos abaixo, podes copiar e só mudar os valores.

#### `CasePullQuote`

- **Obrigatório:** `label` (string), `body` (string).
- **Opcional:** `centered` (boolean; se omitires, o site usa o default do componente).

```text
[case:CasePullQuote] {"label":"// Aprendizados","body":"Aqui vai a citação ou destaque."}
```

Com `centered` explícito:

```text
[case:CasePullQuote] {"label":"// Nota","body":"Texto.","centered":false}
```

---

#### `CaseStatBand`

- **Obrigatório:** `stats` — array de objetos; cada um **tem de ter** `value` e `label` (strings); `caption` é opcional por métrica.
- **Opcional:** `sectionLabel`, `intro`, `attributionNote`, `editorialSourceNote` (strings); `emphasizeIndices` (array de números inteiros — índices das stats a realçar).

```text
[case:CaseStatBand] {"stats":[{"value":"42%","label":"Crescimento","caption":"y/y"},{"value":"6","label":"Meses"}],"sectionLabel":"// Resultados"}
```

---

#### `CaseSectionSplit`

- **Obrigatório:** `label` (string), `body` (string).
- **Opcional:** `id`, `tone` (`"editorial"` ou `"standard"`), `labelColumnPx` (`220` ou `240`), `borderClass` (string).

No **body**, separa **parágrafos** com **duas quebras de linha** dentro da string JSON: usa `\n\n` no JSON (ex.: `"Primeiro bloco.\n\nSegundo bloco."`).

```text
[case:CaseSectionSplit] {"label":"Contexto","body":"Primeiro parágrafo editorial.\n\nSegundo parágrafo, após linha em branco dupla no JSON."}
```

---

#### `CaseEditorialParagraph`

- **Obrigatório:** `body` **ou** `text` (uma das duas com o conteúdo).
- **Opcional:** `variant` (`"body"` ou `"inset"`), `className` (string).

```text
[case:CaseEditorialParagraph] {"body":"Parágrafo com tom editorial.","variant":"inset"}
```

---

#### `CaseMediaFullWidth`

- **Obrigatório:** `src` (URL absoluta `https://…` ou path do site `/…`), `alt` (string).
- **Opcional:** `id`, `priority` (boolean — útil para LCP).

```text
[case:CaseMediaFullWidth] {"src":"/cases/exemplo/capa.jpg","alt":"Descrição da imagem"}
```

---

#### `CaseSectionMedia`

- **Obrigatório:** objeto **`media`** com `src` e `alt` (strings). Não pões `src`/`alt` na raiz do JSON — têm de estar dentro de `media`.
- **Opcional:** `label`, `intro`, `id`.

```text
[case:CaseSectionMedia] {"media":{"src":"https://exemplo.com/img.png","alt":"Legenda curta"},"label":"// Referência","intro":"Texto introdutório opcional."}
```

---

#### `CaseBeforeAfter`

- **Obrigatório:** `before` e `after` — cada um é um objeto com pelo menos `label` e `body` (strings).
- **Por coluna (opcional):** `lead`, `foot`, `variant` (`"muted"` ou `"emphasis"`).
- **No nível raiz (opcional):** `sectionLabel`, `heading`, `banner`, `id`, `padClass`, `bgClass`, `borderClass`.

```text
[case:CaseBeforeAfter] {"sectionLabel":"// Evolução","before":{"label":"Antes","body":"Descrição do estado inicial."},"after":{"label":"Depois","body":"Descrição do estado final."}}
```

Com mais detalhe:

```text
[case:CaseBeforeAfter] {"heading":"Título opcional","before":{"label":"Problema","lead":"Subtítulo","body":"Corpo.","foot":"Nota de rodapé","variant":"muted"},"after":{"label":"Solução","body":"Corpo.","variant":"emphasis"}}
```

---

### 3.3 Forma alternativa: bloco de código `case`

1. Insere **Código** e define linguagem **`case`** (ou `portfolio-case`).
2. Cola JSON válido; **inclui sempre** `"component": "CasePullQuote"` (ou outro dos sete nomes).

Exemplo:

```json
{
  "component": "CasePullQuote",
  "label": "// Aprendizados",
  "body": "Texto da citação com aspas \" escapadas se precisares."
}
```

Para infográficos: um **cartão por componente** com o nome exato, campos obrigatórios a vermelho e um exemplo de **uma linha** copiável como acima.

---

## 4. Relação com o resto da página

- **Hero** (título, empresa, imagem de capa, etc.) vem das **propriedades** da linha Notion, **não** do protocolo `[case:…]`.
- **Blocos nativos** (imagens, embeds, tabelas, Figma, etc.) são renderizados por `NotionPageDocument` sem `[case:…]` — ver `NOTION-SIMPLES.md`.

---

## 5. Ficheiros-chave (para quem for implementar ou desenhar)

| Ficheiro | Papel |
|----------|--------|
| `lib/notionCaseEmbedFromNotion.ts` | Whitelist, regex `[case:…]`, `parseCaseEmbedJson`, tipos `ParsedCaseEmbed` |
| `components/case/NotionCaseEmbed.tsx` | Mapeamento `ParsedCaseEmbed` → componentes React |
| `lib/notionCaseNavFromHeadings.ts` | `[-nav N]`, `collectNotionCaseSectionNav`, `headingAnchors` |
| `components/case/NotionPageDocument.tsx` | Render da árvore de blocos; chama `tryParseCaseEmbedParagraph` em parágrafos |
| `app/cases/[slug]/page.tsx` | Fetch único da árvore; passa `headingAnchors` ao documento |

---

## 6. Sugestões para documentação visual “simples”

1. **Uma página** = fluxo “escreves no Notion → aparece no site”.
2. **Duas caixas de protocolo** lado a lado: `[-nav]` (navegação) vs `[case:]` (componentes).
3. **Seta** da lista de 7 nomes para “só estes são aceites”.
4. **Secção 3.1–3.3** deste ficheiro já traz **passos no Notion** + **exemplo mínimo por componente** — podes transformar cada `####` em cartão visual.

Não é necessário repetir a tabela completa de blocos nativos do Notion aqui — está em `NOTION-SIMPLES.md`.
