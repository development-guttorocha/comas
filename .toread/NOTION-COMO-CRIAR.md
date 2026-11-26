# Como montar tudo no Notion (passo a passo)

Este guia explica **só o lado Notion**: o que criar, onde clicar e na que ordem. O ficheiro `NOTION.md` continua a ser a **referência técnica** (nomes de colunas e variáveis de ambiente).

---

## O que você precisa ter na cabeça

1. **Uma integração** no Notion (é como um “utilizador robô” que o site usa para ler os teus dados).
2. **Um database “Cases”** (tabela): cada **linha** é um projeto no site.
3. O **texto do case** (tudo o que não é hero) vem de **uma página Notion** que tu editas no editor normal do Notion. Na linha do case, **ligas** essa página (coluna tipo URL ou **relation** para a página). **Não** precisas de preencher “Contexto”, “Desafio”, “Resultado”, “Learning” na tabela para o miolo — isso era o template antigo; com Notion ligado, o miolo é **só** a página.
4. **Hero**, **navegação** entre secções do case, **próximo case** continuam automáticos a partir da linha + tema.

Abaixo: **modo documento** (uma página = corpo inteiro). O database “Case Blocks” só interessa em cenários sem lista vinda da API Notion (desenvolvimento avançado).

---

## Parte A — Criar a integração (uma vez)

1. Abre [notion.so/my-integrations](https://www.notion.so/my-integrations) (ou **Settings** → **Connections** → **Develop or manage integrations**).
2. Clica em **New integration**.
3. Dá um nome (ex.: “Portfolio Site”) e escolhe o **workspace** onde vão estar os teus databases.
4. Guarda. Na página da integração, copia o **Internal Integration Secret** (começa por `secret_`). **Isso é o `NOTION_TOKEN`** no `.env.local` do projeto — não partilhes em público.

Sem este token, o site não consegue ler o Notion.

---

## Parte B — Criar o database “Cases”

1. No Notion, numa página vazia, escreve `/database` e escolhe **Table – Full page** (tabela em página inteira).
2. Dá o título **Cases** (ou outro nome; o código não depende do título, só das **colunas**).
3. A primeira coluna já existe (sou o Notion a chamar **Name** ou semelhante). Podes usá-la como **título do projeto** — no código isto mapeia para `title` / `name` / `titulo`.

### Colunas que deves criar (as mais importantes)

Clica em **+** à direita da última coluna para adicionar propriedades. Usa **estes nomes** (ou os equivalentes em PT listados no `NOTION.md`):

| O que é | Tipo no Notion | Para que serve |
|--------|----------------|----------------|
| **slug** | Texto | O endereço do case: se escreveres `meu-projeto`, o site fica em `/cases/meu-projeto`. **Sem espaços**, usa hífens. **Obrigatório.** |
| **summary** ou **resumo** | Texto | Frase curta; aparece na lista e no SEO. |
| **company** ou **empresa** | Texto | Nome da empresa/cliente. |
| **heroImage** ou URL | URL ou texto | Imagem de capa (link direto para uma imagem `.jpg`/`.png` ou URL do teu CDN). |
| **notionContentPageId** (ou **paginaConteudo**) | URL ou texto | **O segredo do modo documento:** aqui vais colar o **link da página** onde escreveste o texto longo (passo na Parte C). |
| **published** ou **publicado** | Checkbox | Se desligares, o case não deve aparecer (depende do código; no nosso mapeamento, `false` esconde). |

Outras colunas úteis: **year**, **role**, **tags** (multi-select), **brandColor** (hex), etc. — vê `NOTION.md` para a lista completa.

### Ordenar a lista no site

- Cria uma coluna **order** ou **ordem** (número): `1`, `2`, `3`… para a ordem na página `/cases`.

---

## Parte C — Criar a página do “artigo” (modo documento)

1. No Notion, cria uma **nova página** (pode estar dentro do mesmo workspace; não precisa de estar dentro da tabela Cases).
2. Escreve o case **como um documento normal**:
   - Títulos com os blocos de heading do Notion,
   - Parágrafos,
   - Listas,
   - Imagens (upload ou link),
   - Callouts, citações, etc.
3. No topo da página, clica em **Share** (Partilhar).
4. Em **Invite**, adiciona a **integração** que criaste na Parte A (o mesmo nome, ex. “Portfolio Site”). Sem isto, a API devolve erro “forbidden”.
5. Copia o **link da página** (Copy link). Esse link (ou só o ID que aparece no URL) é o que vais colar na coluna **notionContentPageId** da linha do case na tabela Cases.

**Importante:** a página do artigo **não** precisa de estar “publicada na web” no sentido do Notion “Share to web”. O site lê via API com o token. Só precisa da integração com acesso.

---

## Parte D — Ligar a tabela Cases à integração

1. Abre a **database Cases** (a tabela).
2. Clica nos **…** no canto superior direito da vista da database (ou **Connections** / **Add connections** conforme a interface).
3. Adiciona a mesma **integração** (“Portfolio Site”).  
   Sem isto, o site não consegue ler as linhas.

---

## Parte E — Preencher uma linha (exemplo concreto)

1. Na tabela **Cases**, **+ New** para uma nova linha.
2. **slug:** `teste-notion` (exemplo).
3. **title / Name:** título visível, ex. “Redesign E-commerce”.
4. **summary:** uma frase.
5. **company:** nome da marca.
6. **heroImage:** URL de uma imagem.
7. **notionContentPageId:** cola o link da página que criaste na Parte C.
8. **published:** ligado (marcado).
9. **order:** `1` se quiseres controlar ordem na listagem.

Guarda. No projeto, no `.env.local`, confirma:

- `NOTION_TOKEN=secret_...`
- `NOTION_CASES_DATABASE_ID=` → ID da **database Cases** (abre a database no browser, copia o URL; o ID é o bloco de caracteres hex no meio do link — o projeto normaliza isso).

Reinicia `npm run dev` e abre `http://localhost:3000/cases/teste-notion` (ajusta o slug ao que escreveste).

---

## Parte F — Se quiseres também “Case Blocks” (opcional)

Só precisas disto se **não** usares `notionContentPageId` e quiseres montar o corpo com **componentes** (antes/depois, faixa de métricas, etc.).

1. Cria outra tabela **Case Blocks**.
2. Colunas mínimas: **caseSlug** (igual ao **slug** da linha em Cases), **componentKey** (texto exato, ex. `case.sectionSplit`), **order** (número).
3. Liga esta database à **mesma integração** e mete o ID em `NOTION_CASE_BLOCKS_DATABASE_ID`.

Se **notionContentPageId** estiver preenchido no case, o site **usa só o documento** e ignora os blocos para esse slug.

---

## Checklist rápido (antes de dizer que “não funciona”)

- [ ] Integração criada e **secret** no `.env.local`
- [ ] Database **Cases** com ID no `NOTION_CASES_DATABASE_ID`
- [ ] Integração **convidada** na database Cases (e na **página** do artigo, se usares modo documento)
- [ ] Linha com **slug** único e **notionContentPageId** com link correto
- [ ] Servidor de desenvolvimento **reiniciado** depois de mudar o `.env.local`

---

## Onde está o quê no projeto

| Ficheiro | Função |
|----------|--------|
| `NOTION.md` | Referência técnica: nomes de propriedades, variáveis, prioridades |
| `NOTION-COMO-CRIAR.md` | Este guia — fluxo humano no Notion |
| `NOTION-TESTE-RAPIDO.md` | **Valores e texto para copiar/colar** e validar tudo em minutos |
| `lib/notionCases.ts` | Código que lê as colunas (se mudares nomes, vê aqui os aliases) |

Se algo continuar confuso, descreve o que vês no ecrã (por exemplo “não encontro Connections”) e o passo em que estás; dá para adaptar o guia a essa versão da interface do Notion.
