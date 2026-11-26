# Notion — jeito mais simples

## O que você precisa

1. **Uma integração** em [notion.so/my-integrations](https://www.notion.so/my-integrations) → copie o **secret** (`secret_…`).
2. **Uma tabela (database) no Notion** com os cases.
3. No projeto, no arquivo **`.env.local`**:

```bash
NOTION_TOKEN=secret_SEU_TOKEN
NOTION_CASES_DATABASE_ID=cole_aqui_o_id_da_tabela
```

**Opcional (só em dev):** `NOTION_SKIP_CACHE=1` — a lista de cases vem sempre do Notion a cada request (sem cache em memória até reiniciar o servidor). Útil enquanto edita propriedades ou adiciona linhas. Em produção, não defina.

Só isso. **Não** precisa de segunda tabela nem de coluna extra só para “link da página de texto”.

---

## Como funciona

- Cada **linha** da tabela é um case.
- As **propriedades** da linha (slug, título, empresa, imagem de capa, etc.) viram o **hero** e a lista.
- O **texto longo** do case você escreve **na própria página dessa linha**: abra a linha no Notion (como se fosse abrir uma página), e escreva **embaixo** das propriedades, no editor normal. É o mesmo WYSIWYG do Notion.
- O site lê esse conteúdo pelo **ID da página** da linha — você não precisa colar link em lugar nenhum.

**Opcional:** se um dia quiser que o texto fique em **outra** página Notion, dá para usar uma coluna tipo URL/relation (`notionContentPageId` e nomes parecidos). No dia a dia, não precisa.

**Sobre o MCP do Notion** ([mcp.notion.com](https://mcp.notion.com/mcp)): serve para **assistentes e ferramentas** (ex.: Cursor) lerem/editarem páginas. O **site** continua a usar a **API REST** com o `NOTION_TOKEN`; o MCP **não muda** o que o Next.js recebe nem o render. Não é obrigatório ligar MCP só por causa do portfolio.

### Blocos nativos do Notion no corpo (o que o site renderiza)

| No Notion | No site |
|-----------|---------|
| Parágrafo | Texto; pode conter `[-nav …]` e `[case:…]` (ver abaixo) |
| Título 1 / 2 / 3 | `h2` / `h3` / `h4` estilizados |
| Lista com marcadores / numerada | `<ul>` / `<ol>` |
| **To-do** (checklist) | Linha com caixa ✓ ou vazia + texto (não é interativo no site) |
| Citação | `<blockquote>` |
| Divisor | `<hr>` |
| Código | `<pre>`; se a linguagem for **`case`**, **`portfolio-case`** ou **`json`**, e o corpo for JSON de embed válido com `"component"`, renderiza o mesmo widget (na API Notion usa-se **`json`** — ver `notion/README.md`) |
| **Callout** | Caixa com ícone emoji (se houver) + texto; filhos aninhados renderizam |
| **Imagem** | `<img>` + legenda opcional |
| **Vídeo** | URL ou ficheiro `.mp4`/`.webm`; YouTube/Vimeo/Figma → iframe quando reconhecido |
| **Embed** | Idem (iframe ou link “Abrir conteúdo incorporado”) |
| **`link_preview`** | Muitos links colados vêm assim; iframe para Figma/YouTube/Vimeo quando a URL for reconhecida |
| **Bookmark** | Cartão com link; se a URL for embutível, usa iframe |
| **Ficheiro** | Link para abrir/baixar |
| **Tabela** | Tabela HTML; respeita cabeçalho de linha/coluna se marcar no Notion |
| **Toggle** | `<details>` / `<summary>` + filhos |
| **Colunas** | Grelha de 2 colunas (em `md+`); cada coluna renderiza os blocos filhos |
| **Equação** | Texto monoespaçado (sem render KaTeX por agora) |
| **Subpágina** (`child_page`) | Só um texto placeholder `[Página: …] — abra no Notion para editar` (não embute a subpágina) |
| **Bloco sincronizado** / **Template** | O site **só mostra o conteúdo dos blocos filhos** (o wrapper em si não aparece) |
| Outro tipo de bloco **sem** ramo dedicado | Se tiver **filhos**, estes são renderizados; caso contrário **não aparece nada** |

**Não** estão mapeados como widgets próprios (ex.: vista de **database**, **galeria**, **board**, áudio nativo do Notion): use alternativas (imagem, link, embed) ou aceite que não haverá paridade com o app Notion.

**Lista fechada de componentes `[case:…]`** (únicos aceites no JSON): `CasePullQuote`, `CaseStatBand`, `CaseSectionSplit`, `CaseEditorialParagraph`, `CaseMediaFullWidth`, `CaseSectionMedia`, `CaseBeforeAfter` — nomes **exatamente** como no código (`lib/notionCaseEmbedFromNotion.ts`).

### Navegação no case (barra ao rolar)

Em **títulos** (Heading 1, 2 ou 3) ou num **parágrafo** normal, comece o texto com **`[-nav 1]`** … **`[-nav 5]`** e depois o rótulo, ex.: `[-nav 1] Desafio`. No site, o prefixo **não aparece**; o rótulo entra na barra e o link fica em `#desafio` (slug a partir do texto, ex.: `/cases/meu-case#desafio`). Ordem: pelo número **1–5**; no máximo **cinco** itens. Sem nenhum `[-nav …]`, a barra continua com só **Conteúdo** → `#case-doc`.

**Opcional — texto só no menu/âncora (“fantasma”):** feche a linha com **`[/-nav N+true]`** ou **`[/-nav N+false]`**, com o **mesmo N** do abridor. Com **`+true`**, o rótulo continua **visível** no corpo (igual ao formato sem fecho). Com **`+false`**, o rótulo **não** é mostrado no corpo, mas **mantém** o item na barra e o `#slug`. Ex.: `[-nav 1] Contexto [/-nav 1+false]`.

### Blocos do playbook no corpo (`[case:…]`)

Igual à ideia do `[-nav …]`: o site **interpreta** o texto e mete um componente React (só os registados no código).

**Forma 1 — parágrafo** (uma linha, JSON colado à direita):

`[case:CasePullQuote] {"label":"// Aprendizados","body":"Texto da citação aqui."}`

`[case:CaseStatBand] {"stats":[{"value":"42%","label":"Crescimento","caption":"y/y"},{"value":"6","label":"Meses"}],"sectionLabel":"// Resultados"}`

Campos opcionais úteis: `CasePullQuote` → `centered`; `CaseStatBand` → `intro`, `attributionNote`, `editorialSourceNote`, `emphasizeIndices` (array de índices).

**Forma 2 — bloco de código** com linguagem **`case`** (ou **`portfolio-case`**) e **só** JSON no corpo (sempre com `"component": "…"`):

```json
{
  "component": "CasePullQuote",
  "label": "// Aprendizados",
  "body": "Texto da citação."
}
```

Se o Notion não listar `case` nas linguagens, use a **forma 1** no parágrafo.

**Campos (resumo):** `CaseSectionSplit` — `label`, `body` (parágrafos com linha em branco dupla); `CaseEditorialParagraph` — `body` ou `text`, `variant`: `body` \| `inset`; `CaseMediaFullWidth` — `src`, `alt` (URL absoluta → `<img>`, path `/…` → `next/image`); `CaseSectionMedia` — objeto **`media`** com `src` e `alt`, mais `label` / `intro` opcionais; `CaseBeforeAfter` — `before` e `after`, cada um com `label`, `body`, opcional `lead`, `foot`, `variant`. Exemplos no repositório ou JSON de teste.

**Figma no Notion:** ao colares o link, o Notion pode guardar como **`embed`**, **`link_preview`** ou **`bookmark`**. No site, **Figma** (e YouTube/Vimeo) passam a iframe em todos estes casos quando a URL é reconhecida. Se ainda não aparecer, confirma que a página da integração tem acesso ao conteúdo e faz refresh com `NOTION_SKIP_CACHE=1` em dev.

---

## O que fazer no Notion (checklist)

1. Crie a **integração** e copie o secret.
2. Crie a **tabela** (database) e conecte a integração: menu da tabela → **Connections** / **Conexões** → sua integração.
3. Tenha pelo menos uma coluna **slug** (texto), ex.: `meu-case` → vira `/cases/meu-case`.
4. Crie uma **linha**, preencha slug, título, resumo, etc.
5. **Abra essa linha como página** (clique para expandir) e escreva o texto do case no corpo da página.
6. Garanta que a **página da linha** também está compartilhada com a integração (Share → adicione a integração).

---

## Heróis (tudo na **mesma linha** da tabela)

O topo do case (`/cases/…`) usa só **propriedades** da linha — não o corpo da página. Você configura criando colunas com estes nomes (ou equivalentes; o código aceita aliases em inglês/português).

### Hero **editorial** (padrão)

Usado quando a coluna **`heroVariant`** está vazia, ou com texto `editorial`.

| O que aparece no site | Colunas úteis no Notion |
|------------------------|-------------------------|
| Título grande | **title** / **titulo** / **name** (ou a coluna “Name” padrão da tabela) |
| Empresa, ano, papel, tags | **company** / **empresa**, **year** / **ano**, **role** / **papel** |
| **Tags** (várias na home) | **tags** / **tag** / **etiquetas** / **categorias** — tipo **multi-select**, **select** (um valor conta como uma tag), **status**, ou **texto** com vírgulas / `;` / `\|` / linhas |
| **Tag de destaque** (chip na home) | **accentTags** / **tagsAccent** / **accent** / **tag destaque** — mesmos tipos que **tags**; na home usa-se normalmente o **último** valor |
| Resumo abaixo do título | **summary** / **resumo** |
| Cor da marca (degradê) | **brandColor** / **corMarca** / **brand** (hex, ex. `#E8321A`) |
| Tom de fundo no hero editorial | **placeholder** / **placeholderColor** (hex) |
| Marca d’água gigante (opcional) | **heroMegaWord** / **megaWord** — se vazio, o site usa o nome da empresa em caixa alta |
| Faixa com imagem abaixo do hero | **heroImage** / **heroImageUrl** / **hero** / **capa** / **imagemCapa** — coluna tipo **URL**, **texto com URL**, ou **Files** (upload / link no Notion). URLs de ficheiros Notion expiram; o site obtém URL nova ao consultar a API. Se vazio, **não** aparece faixa de mídia |
| Aparecer na secção **Cases** da **home** | **featuredOnSite** / **featured** / **destaque** / **Destaque no site** / … — **checkbox** (recomendado), **select** (ex. Sim/Não) ou **status**. Só linhas com **verdadeiro / Sim** entram nessa secção, na ordem da coluna **order** / **ordem**. Se **nenhuma** linha estiver marcada, o site usa o fallback dos três slugs clássicos (BrandLovers, Loft, WebMotors). Sem esta coluna na database, o fallback também é usado. |

O rótulo “Visão geral” no hero editorial é fixo no código.

### Hero **full bleed** (tela cheia com mídia)

Ative com a coluna **`heroVariant`** = texto **`fullBleed`** (ou `full` / `full-bleed`).

| Precisa | O que é |
|--------|---------|
| Mídia | **heroImage** (imagem: URL, texto ou **Files**) **ou** **heroFullBleedVideoUrl** / **heroVideoUrl** (vídeo: URL, texto ou **Files** `.mp4`) |
| Opcional | **heroFullBleedVideoPoster** — capa do vídeo (URL, texto ou **Files**) |
| Texto no canto | **heroFullBleedTagline** / **taglineHero** — se vazio, usa **summary** |
| Rótulo pequeno acima do título | **heroFullBleedEyebrow** / **eyebrowHero** — se vazio, usa **productTag** / **produto** |
| Botão “Continuar” | Por padrão rola até o conteúdo (`case-doc`). Para mudar: **heroFullBleedNextSectionId** / **continuarPara** |

O **título** do full bleed é o mesmo **title** da linha.

Se você marcar `fullBleed` mas **não** colocar imagem nem vídeo, o site volta para o hero **editorial**.

---

## ID da tabela (`NOTION_CASES_DATABASE_ID`)

Abra a tabela no navegador. O link tem um trecho longo com letras e números — é o ID. Pode colar o **link inteiro** no `.env.local`; o código aceita.

---

## Sem Notion configurado

Se faltar token ou ID, a lista de cases no site fica **vazia** até configurares o `.env.local`. Para gerar ficheiros de texto de exemplo para o Notion, usa `npm run notion:cases-plain` (dados em `lib/casesSeed.ts`, só para scripts).

---

## Arquivos antigos

`NOTION.md`, `NOTION-COMO-CRIAR.md` e `NOTION-TESTE-RAPIDO.md` têm detalhes extras; a regra de ouro é esta página + uma tabela + texto no corpo da linha.
