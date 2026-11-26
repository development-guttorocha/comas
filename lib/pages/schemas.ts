import type { PageGroup, PageSchema } from "./model";

/** The Contact page: the opening and the channels on the phone card. */
const contato: PageSchema = {
  slug: "contato",
  label: "Contato",
  description: "Abertura da página e os canais no cartão do celular.",
  paths: { pt: "/contato", en: "/en/contato" },
  groups: [
    {
      label: "Abertura",
      fields: [
        { key: "kicker", label: "Rótulo", type: "text" },
        { key: "title", label: "Título", type: "text" },
        { key: "continuation", label: "Continuação do título (em cinza)", type: "text" },
        { key: "intro", label: "Texto", type: "textarea" },
        { key: "emailButton", label: "Texto do botão", type: "text" },
        { key: "email", label: "E-mail do botão", type: "email" },
      ],
    },
    {
      label: "Cartão",
      hint: "Os canais aparecem na tela do celular, nesta ordem.",
      fields: [
        { key: "cardName", label: "Nome no cartão", type: "plain" },
        { key: "channels", label: "Canais", type: "list", itemLabel: "Canal", item: [
          { key: "label", label: "Nome", type: "text" },
          { key: "value", label: "O que aparece", type: "plain", hint: "Ex.: in/guttorocha" },
          { key: "href", label: "Link", type: "url", hint: "https://…, mailto:… ou tel:…" },
        ] },
        { key: "locationLabel", label: "Rótulo do local", type: "text" },
        { key: "location", label: "Local", type: "text" },
      ],
    },
  ],
};

/** The résumé: header, summary, experience, education, skills, networks and testimonials. */
const curriculo: PageSchema = {
  slug: "curriculo",
  label: "Currículo",
  description: "Cabeçalho, resumo, experiências, educação, habilidades, redes e depoimentos.",
  paths: { pt: "/curriculo", en: "/en/curriculo" },
  groups: [
    {
      label: "Cabeçalho",
      fields: [
        { key: "kicker", label: "Rótulo", type: "text" },
        { key: "name", label: "Nome", type: "plain" },
        { key: "surname", label: "Sobrenome (em cinza)", type: "plain" },
        { key: "headline", label: "Cargo atual", type: "text", hint: "Aparece abaixo do nome, na tela e no PDF." },
        { key: "location", label: "Local", type: "text" },
        { key: "status", label: "Status (opcional)", type: "text", hint: "Ex.: Aberto a novas oportunidades. Vazio: não aparece." },
        { key: "photo", label: "Foto", type: "plain", hint: "Caminho de uma imagem em /public, ex.: /curriculo/gutto.webp" },
        { key: "contacts", label: "Contatos", type: "list", itemLabel: "Contato", item: [
          { key: "label", label: "Rótulo", type: "text", hint: "Ex.: Telefone" },
          { key: "value", label: "O que aparece", type: "plain" },
          { key: "href", label: "Link", type: "url", hint: "https://…, mailto:… ou tel:…" },
        ] },
        { key: "printLabel", label: "Botão de baixar o PDF", type: "text" },
        { key: "contactCta", label: "Botão de contato", type: "text", hint: "Leva para a página de Contato." },
      ],
    },
    {
      label: "Resumo",
      fields: [
        { key: "summaryTitle", label: "Título", type: "text" },
        { key: "summary", label: "Resumo profissional", type: "textarea" },
      ],
    },
    {
      label: "Experiência",
      hint: "A carreira em fases, da mais recente para a mais antiga. Experiências sem parágrafos aparecem em linhas compactas.",
      fields: [
        { key: "experienceTitle", label: "Título", type: "text" },
        { key: "resultsTitle", label: "Título dos resultados", type: "text" },
        { key: "phases", label: "Fases da carreira", type: "list", itemLabel: "Fase", item: [
          { key: "title", label: "Nome da fase", type: "text", hint: "Ex.: Liderança e Gestão" },
          { key: "period", label: "Período da fase", type: "text", hint: "Ex.: A partir de 2020" },
          { key: "jobs", label: "Experiências", type: "list", itemLabel: "Experiência", item: [
            { key: "title", label: "Cargo @ empresa", type: "text" },
            { key: "period", label: "Período", type: "text" },
            { key: "bullets", label: "Parágrafos", type: "list", itemLabel: "Parágrafo", item: [{ key: "text", label: "Texto", type: "textarea" }] },
            { key: "results", label: "Principais resultados", type: "list", itemLabel: "Resultado", item: [{ key: "text", label: "Resultado", type: "text" }] },
          ] },
        ] },
      ],
    },
    {
      label: "Educação",
      fields: [
        { key: "educationTitle", label: "Título", type: "text" },
        { key: "education", label: "Cursos", type: "list", itemLabel: "Curso", item: [
          { key: "course", label: "Curso", type: "text" },
          { key: "institution", label: "Instituição", type: "plain" },
          { key: "year", label: "Ano", type: "plain" },
        ] },
      ],
    },
    {
      label: "Habilidades, ferramentas e IA",
      fields: [
        { key: "skillsTitle", label: "Título das habilidades", type: "text" },
        { key: "skills", label: "Habilidades", type: "list", itemLabel: "Habilidade", item: [{ key: "text", label: "Habilidade", type: "text" }] },
        { key: "toolsTitle", label: "Título das ferramentas", type: "text" },
        { key: "tools", label: "Ferramentas", type: "list", itemLabel: "Ferramenta", item: [{ key: "name", label: "Ferramenta", type: "text" }] },
        { key: "aiTitle", label: "Título de IA", type: "text" },
        { key: "ai", label: "Ferramentas de IA", type: "list", itemLabel: "Ferramenta de IA", item: [{ key: "name", label: "Ferramenta", type: "text" }] },
      ],
    },
    {
      label: "Redes sociais",
      fields: [
        { key: "socialTitle", label: "Título", type: "text" },
        { key: "social", label: "Redes", type: "list", itemLabel: "Rede", item: [
          { key: "label", label: "Nome", type: "plain" },
          { key: "href", label: "Link", type: "url" },
        ] },
      ],
    },
    {
      label: "Depoimentos",
      fields: [
        { key: "testimonialsKicker", label: "Rótulo", type: "text" },
        { key: "testimonialsTitle", label: "Título", type: "text" },
        { key: "testimonialsContinuation", label: "Continuação do título (em cinza)", type: "text" },
        { key: "testimonials", label: "Depoimentos", type: "list", itemLabel: "Depoimento", item: [
          { key: "quote", label: "Depoimento", type: "textarea" },
          { key: "position", label: "Posição (no lugar do nome)", type: "text" },
          { key: "role", label: "Como trabalhamos juntos", type: "text" },
          { key: "date", label: "Ano", type: "plain" },
        ] },
      ],
    },
  ],
};

/** The Home's text sections (the cases belt has its own page, Home · esteira). */
const home: PageSchema = {
  slug: "home",
  label: "Home",
  description: "Abertura, os 3P's, o manifesto, o impacto, a contagem de pessoas lideradas e os depoimentos.",
  paths: { pt: "/", en: "/en" },
  groups: [
    {
      label: "Abertura",
      fields: [
        { key: "wordmark", label: "Nome grande", type: "plain" },
        { key: "reflection", label: "Sobrenome (reflexo)", type: "plain" },
        { key: "statement", label: "Frase em destaque", type: "text" },
        { key: "statementSub", label: "Frase de apoio", type: "text" },
        { key: "primaryCta", label: "Botão principal", type: "text", hint: "Leva até os 3P's, logo abaixo." },
        { key: "secondaryCta", label: "Botão secundário", type: "text", hint: "Leva para a página Sobre." },
        { key: "video", label: "Vídeo de fundo", type: "plain", hint: "Caminho em /public, ex.: /home/hero.mp4" },
        { key: "poster", label: "Imagem do vídeo", type: "plain", hint: "Aparece enquanto o vídeo carrega e para quem prefere menos movimento." },
      ],
    },
    {
      label: "Os meus 3P's",
      fields: [
        { key: "modelBefore", label: "Título, antes do destaque", type: "text" },
        { key: "modelHighlight", label: "Destaque do título", type: "plain" },
        { key: "modelAfter", label: "Título, depois do destaque", type: "text" },
        { key: "pillars", label: "Pilares", type: "list", itemLabel: "Pilar", item: [
          { key: "title", label: "Nome", type: "text" },
          { key: "summary", label: "Resumo", type: "text" },
          { key: "tags", label: "Etiquetas", type: "list", itemLabel: "Etiqueta", item: [{ key: "text", label: "Etiqueta", type: "text" }] },
        ] },
      ],
    },
    {
      label: "Manifesto",
      fields: [{ key: "manifesto", label: "Frase", type: "textarea", hint: "Aparece palavra por palavra durante a rolagem." }],
    },
    {
      label: "Impacto",
      fields: [
        { key: "impactTitle", label: "Título", type: "text" },
        { key: "impactSubtitle", label: "Continuação do título", type: "text" },
        { key: "proofs", label: "Cards", type: "list", itemLabel: "Card", item: [
          { key: "company", label: "Empresa", type: "plain" },
          { key: "role", label: "Cargo", type: "text" },
          { key: "label", label: "O que mede", type: "text" },
          { key: "value", label: "Número ou resultado", type: "text" },
        ] },
      ],
    },
    {
      label: "Pessoas lideradas",
      fields: [
        { key: "countValue", label: "Número", type: "plain", hint: "Ex.: +30" },
        { key: "countLabel", label: "Texto", type: "text" },
        { key: "resumeBefore", label: "Link, antes do destaque", type: "text" },
        { key: "resumeLink", label: "Link, destaque", type: "text", hint: "Leva para o Currículo." },
      ],
    },
    {
      label: "Depoimentos",
      fields: [
        { key: "voicesTitle", label: "Título", type: "text" },
        { key: "voices", label: "Depoimentos", type: "list", itemLabel: "Depoimento", item: [
          { key: "quote", label: "Fala", type: "textarea" },
          { key: "preposition", label: "Antes da empresa", type: "text", hint: "Ex.: Designer no" },
          { key: "company", label: "Empresa", type: "plain" },
          { key: "portrait", label: "Ilustração", type: "plain", hint: "Caminho em /public" },
        ] },
      ],
    },
  ],
};

/** The cases page: its opening, the clients and the closing invitation (the cases come from their own files). */
const cases: PageSchema = {
  slug: "cases",
  label: "Cases",
  description: "Abertura, empresas que conheceram meu trabalho e o convite para um café. Os cases vêm dos arquivos de cada case.",
  paths: { pt: "/cases", en: "/en/cases" },
  groups: [
    {
      label: "Abertura",
      fields: [
        { key: "word", label: "Palavra grande", type: "text" },
        { key: "intro", label: "Texto", type: "textarea" },
        { key: "introLink", label: "Link para a lista", type: "text" },
      ],
    },
    {
      label: "Clientes",
      hint: "Em ordem de setor, para as linhas lerem como partes do mercado.",
      fields: [
        { key: "clientsTitle", label: "Título", type: "text" },
        { key: "clients", label: "Empresas", type: "list", itemLabel: "Empresa", item: [
          { key: "name", label: "Nome", type: "plain" },
          { key: "sector", label: "Setor", type: "text" },
        ] },
      ],
    },
    {
      label: "Convite",
      fields: [
        { key: "coffeeKicker", label: "Rótulo", type: "text" },
        { key: "coffeeTitle", label: "Título", type: "text" },
        { key: "coffeeContinuation", label: "Continuação do título (em cinza)", type: "text" },
        { key: "coffeeBody", label: "Texto", type: "textarea" },
        { key: "coffeeCta", label: "Botão", type: "text", hint: "Leva para a página de Contato." },
      ],
    },
  ],
};

/** The footer on every page: the closing call, the wordmark and the contact buttons. */
const rodape: PageSchema = {
  slug: "rodape",
  label: "Rodapé",
  description: "A chamada final, a marca e os botões de contato que aparecem no fim de todas as páginas.",
  paths: { pt: "/contato#site-footer-contact", en: "/en/contato#site-footer-contact" },
  groups: [
    {
      label: "Chamada",
      fields: [
        { key: "kicker", label: "Frase pequena", type: "text" },
        { key: "title", label: "Título", type: "text" },
        { key: "links", label: "Links", type: "list", itemLabel: "Link", item: [
          { key: "label", label: "Texto", type: "text" },
          { key: "href", label: "Endereço", type: "url", hint: "Páginas do site começam com /, ex.: /contato. A versão em inglês ganha /en sozinha." },
        ] },
      ],
    },
    {
      label: "Marca e contatos",
      fields: [
        { key: "wordmark", label: "Marca", type: "plain", hint: "O texto grande do rodapé." },
        { key: "pills", label: "Botões de contato", type: "list", itemLabel: "Botão", item: [
          { key: "label", label: "Texto", type: "text" },
          { key: "href", label: "Link", type: "url", hint: "https://…, mailto:… ou tel:…" },
        ] },
      ],
    },
  ],
};

/** The About page: every text of the story. Images, videos and animations stay in the code. */
const image = { key: "image", label: "Imagem", type: "plain", hint: "O nome da imagem no código (ex.: blog). Um nome desconhecido some da página." } as const;
const sobre: PageSchema = {
  slug: "sobre",
  label: "Sobre",
  description: "A história por décadas, a liderança e o futuro. Imagens e animações ficam no código.",
  paths: { pt: "/sobre", en: "/en/sobre" },
  groups: [
    {
      label: "Abertura",
      fields: [
        { key: "heroTitle", label: "Título", type: "text" },
        { key: "heroContinuation", label: "Continuação do título (em cinza)", type: "text" },
        { key: "heroLine", label: "Frase", type: "text" },
        { key: "heroLink", label: "Link para a história", type: "text" },
      ],
    },
    {
      label: "Resumo (TL;DR)",
      fields: [
        { key: "summaryKicker", label: "Rótulo", type: "text" },
        { key: "summaryTitle", label: "Título", type: "text" },
        { key: "summaryContinuation", label: "Continuação do título (em cinza)", type: "text" },
        { key: "summaryExplanation", label: "Texto", type: "textarea" },
        { key: "summaryCta", label: "Texto do botão", type: "text" },
        { key: "bio", label: "Parágrafos da bio", type: "list", itemLabel: "Parágrafo", hint: "Use **assim** para negrito. Um parágrafo vazio em português aparece só no inglês.", item: [
          { key: "text", label: "Texto", type: "textarea" },
        ] },
        { key: "navLabel", label: "Descrição da navegação por décadas", type: "text", hint: "Lida por leitores de tela." },
      ],
    },
    {
      label: "Décadas",
      hint: "Uma por década, ligadas pelo ano. A resposta fecha cada década, depois da pergunta abaixo.",
      fields: [
        { key: "dialogueQuestion", label: "Pergunta que fecha as décadas", type: "text" },
        { key: "eras", label: "Décadas", type: "list", itemLabel: "Década", item: [
          { key: "year", label: "Ano", type: "plain" },
          { key: "caption", label: "Frase da capa", type: "text" },
          { key: "title", label: "Título", type: "text" },
          { key: "continuation", label: "Continuação do título (em cinza)", type: "text" },
          { key: "body", label: "Texto", type: "textarea" },
          { key: "device", label: "Legenda da tela", type: "text" },
          { key: "answer", label: "Resposta", type: "text" },
        ] },
      ],
    },
    {
      label: "Anos 90",
      fields: [
        { key: "magazinesTitle", label: "Revistas: título", type: "text" },
        { key: "magazinesBody", label: "Revistas: texto", type: "textarea" },
        { key: "magazinesSpoiler", label: "Revistas: spoiler", type: "text" },
        { key: "magazinesLabel", label: "Revistas: descrição do vídeo", type: "text" },
        { key: "carTitle", label: "Carrinho: título", type: "text" },
        { key: "carBody", label: "Carrinho: texto", type: "textarea" },
        { key: "carCaption", label: "Carrinho: legenda", type: "text" },
        { key: "carHint", label: "Carrinho: dica de rolagem", type: "text" },
        { key: "carAlt", label: "Carrinho: descrição da imagem", type: "text" },
        { key: "carLabel", label: "Carrinho: descrição da animação", type: "text" },
      ],
    },
    {
      label: "Anos 2000",
      fields: [
        { key: "memoriesTitle", label: "Memórias: título", type: "textarea", hint: "Cada linha vira uma linha do título." },
        { key: "memoriesLabel", label: "Memórias: descrição da faixa", type: "text" },
        { key: "memories", label: "Memórias", type: "list", itemLabel: "Memória", item: [
          image,
          { key: "title", label: "Texto", type: "text" },
          { key: "alt", label: "Descrição da imagem", type: "text" },
        ] },
        { key: "orbitLabel", label: "Aparelhos: descrição da cena", type: "text" },
        { key: "orbit", label: "Aparelhos", type: "list", itemLabel: "Aparelho", hint: "Nomes possíveis: flipphone, smartphone, monitor, imac, notebook, tv, television.", item: [
          { key: "key", label: "Aparelho", type: "plain" },
          { key: "label", label: "Nome", type: "text" },
          { key: "caption", label: "Legenda", type: "text" },
        ] },
      ],
    },
    {
      label: "Anos 2010",
      fields: [
        { key: "galleryTitle", label: "Trabalhos: título", type: "text" },
        { key: "galleryLabel", label: "Trabalhos: descrição da galeria", type: "text" },
        { key: "gallery", label: "Trabalhos: descrição das imagens", type: "list", itemLabel: "Imagem", hint: "A ordem e o layout ficam no código; aqui só a descrição de cada imagem.", item: [
          image,
          { key: "alt", label: "Descrição", type: "text" },
        ] },
        { key: "pizzaTitle", label: "Pizza: texto", type: "text" },
        { key: "pizzaAlt", label: "Pizza: descrição da imagem", type: "text" },
        { key: "museumTitle", label: "Museu: título", type: "text" },
        { key: "museumBody", label: "Museu: texto", type: "textarea" },
        { key: "museumAlt", label: "Museu: descrição da imagem", type: "text" },
      ],
    },
    {
      label: "Anos 2020",
      fields: [
        { key: "hobbiesTitle", label: "Quarentena: título", type: "text" },
        { key: "hobbiesLabel", label: "Quarentena: descrição da faixa", type: "text" },
        { key: "hobbies", label: "Quarentena", type: "list", itemLabel: "Memória", item: [
          image,
          { key: "title", label: "Texto", type: "text" },
          { key: "alt", label: "Descrição da imagem", type: "text" },
        ] },
      ],
    },
    {
      label: "Liderança",
      fields: [
        { key: "leadershipTitle", label: "Título", type: "textarea" },
        { key: "chatLabel", label: "Descrição da conversa", type: "text" },
        { key: "chat", label: "Conversa", type: "list", itemLabel: "Mensagem", hint: "Sem quem fala, a mensagem é sua (balão à direita).", item: [
          { key: "speaker", label: "Quem fala", type: "text" },
          { key: "text", label: "Mensagem", type: "text" },
        ] },
        { key: "principlesTitle", label: "Combinados: título", type: "text" },
        { key: "principlesBody", label: "Combinados: texto", type: "textarea" },
        { key: "principles", label: "Combinados", type: "list", itemLabel: "Combinado", item: [
          { key: "title", label: "Título", type: "text" },
          { key: "body", label: "Texto", type: "textarea" },
        ] },
      ],
    },
    {
      label: "Reflexão",
      fields: [
        { key: "lifeTitle", label: "Título", type: "text" },
        { key: "lifeBody", label: "Texto", type: "textarea" },
        { key: "bikeLabel", label: "Descrição da bicicleta", type: "text" },
        { key: "mountainAlt", label: "Descrição da montanha", type: "text" },
        { key: "works", label: "Trabalhos de liderança", type: "list", itemLabel: "Trabalho", item: [
          { key: "company", label: "Empresa", type: "plain" },
          { key: "role", label: "Cargo", type: "plain" },
          { key: "date", label: "Período", type: "text" },
          { key: "href", label: "Link", type: "url", hint: "Páginas do site começam com /, ex.: /cases/loft-design." },
          { key: "title", label: "Título", type: "text" },
          { key: "metrics", label: "Números", type: "list", itemLabel: "Número", item: [
            { key: "value", label: "Número", type: "text" },
            { key: "label", label: "Texto", type: "text" },
          ] },
        ] },
        { key: "resumeNote", label: "Nota do currículo", type: "text" },
        { key: "resumeLink", label: "Link do currículo", type: "text" },
      ],
    },
    {
      label: "2030",
      fields: [
        { key: "visionLabel", label: "Descrição da cena", type: "text" },
        { key: "visionQuestion", label: "Pergunta no óculos", type: "text" },
        { key: "visionResponse", label: "Resposta digitada", type: "text" },
        { key: "visionRestart", label: "Botão de reiniciar", type: "text" },
      ],
    },
  ],
};

/** What every page shares: the menu, the 404 page, and the titles and descriptions search engines and shares show. */
const site: PageSchema = {
  slug: "site",
  label: "Menu e 404",
  description: "O menu do topo e a página de erro 404. O título e a descrição de cada página ficam em SEO.",
  paths: { pt: "/", en: "/en" },
  groups: [
    {
      label: "Menu",
      hint: "O texto curto aparece quando a barra encolhe ao rolar a página.",
      fields: [
        { key: "nav", label: "Links", type: "list", itemLabel: "Link", item: [
          { key: "label", label: "Texto", type: "text" },
          { key: "short", label: "Texto curto", type: "text" },
          { key: "href", label: "Endereço", type: "url", hint: "Páginas do site começam com /, ex.: /sobre. A versão em inglês ganha /en sozinha." },
        ] },
      ],
    },
    {
      label: "Página 404",
      fields: [
        { key: "notFoundKicker", label: "Rótulo", type: "text" },
        { key: "notFoundTitle", label: "Título", type: "text" },
        { key: "notFoundBody", label: "Texto", type: "textarea" },
        { key: "notFoundButton", label: "Texto do botão", type: "text" },
        { key: "notFoundAlt", label: "Descrição da imagem", type: "text" },
      ],
    },
    // SEO: one group per page with its share card; the admin shows each at the end of its page (Site › page).
    ...([
      ["home", "Home", "Vale também como padrão para as páginas sem título próprio."],
      ["sobre", "Sobre", undefined],
      ["cases", "Cases", undefined],
      ["curriculo", "Currículo", undefined],
      ["contato", "Contato", undefined],
    ] as const).map(([page, label, hint]): PageGroup => ({
      label, hint, section: "seo", preview: page,
      fields: [
        { key: `${page}Title`, label: "Título", type: "text", hint: "Aba do navegador, Google e cartões de LinkedIn e WhatsApp. \"Página — Frase\" vira rótulo e título na imagem." },
        { key: `${page}Description`, label: "Descrição", type: "textarea", hint: "O texto do resultado no Google e do cartão. Até uns 160 caracteres." },
      ],
    })),
    {
      label: "Dados para buscadores",
      section: "seo",
      fields: [
        { key: "personDescription", label: "Quem é você", type: "textarea", hint: "Vai nos dados estruturados de todas as páginas e no llms.txt." },
      ],
    },
  ],
};

/** Every page the admin can edit, in the order it lists them. */
export const PAGE_SCHEMAS: PageSchema[] = [home, cases, sobre, curriculo, contato, rodape, site];
export const PAGE_SCHEMA_BY_SLUG = new Map(PAGE_SCHEMAS.map(schema => [schema.slug, schema]));

/** The fields a page's component reads, typed per page. */
export type ContactContent = {
  kicker: string; title: string; continuation: string; intro: string; emailButton: string; email: string;
  cardName: string; channels: Array<{ label: string; value: string; href: string }>; locationLabel: string; location: string;
};

export type CurriculumJob = { title: string; period: string; bullets: Array<{ text: string }>; results: Array<{ text: string }> };
export type CurriculumContent = {
  kicker: string; name: string; surname: string; headline: string; location: string; status: string; photo: string;
  contacts: Array<{ label: string; value: string; href: string }>; printLabel: string; contactCta: string;
  summaryTitle: string; summary: string;
  experienceTitle: string; resultsTitle: string;
  phases: Array<{ title: string; period: string; jobs: CurriculumJob[] }>;
  educationTitle: string; education: Array<{ course: string; institution: string; year: string }>;
  skillsTitle: string; skills: Array<{ text: string }>; toolsTitle: string; tools: Array<{ name: string }>; aiTitle: string; ai: Array<{ name: string }>;
  socialTitle: string; social: Array<{ label: string; href: string }>;
  testimonialsKicker: string; testimonialsTitle: string; testimonialsContinuation: string;
  testimonials: Array<{ quote: string; position: string; role: string; date: string }>;
};

export type FooterContent = {
  kicker: string; title: string; links: Array<{ label: string; href: string }>;
  wordmark: string; pills: Array<{ label: string; href: string }>;
};

export type HomeContent = {
  wordmark: string; reflection: string; statement: string; statementSub: string; primaryCta: string; secondaryCta: string; video: string; poster: string;
  modelBefore: string; modelHighlight: string; modelAfter: string;
  pillars: Array<{ title: string; summary: string; tags: Array<{ text: string }> }>;
  manifesto: string;
  impactTitle: string; impactSubtitle: string; proofs: Array<{ company: string; role: string; label: string; value: string }>;
  countValue: string; countLabel: string; resumeBefore: string; resumeLink: string;
  voicesTitle: string; voices: Array<{ quote: string; preposition: string; company: string; portrait: string }>;
};

export type CasesContent = {
  word: string; intro: string; introLink: string;
  clientsTitle: string; clients: Array<{ name: string; sector: string }>;
  coffeeKicker: string; coffeeTitle: string; coffeeContinuation: string; coffeeBody: string; coffeeCta: string;
};

type StoryItem = { image: string; title: string; alt: string };
export type SobreContent = {
  heroTitle: string; heroContinuation: string; heroLine: string; heroLink: string;
  summaryKicker: string; summaryTitle: string; summaryContinuation: string; summaryExplanation: string; summaryCta: string;
  bio: Array<{ text: string }>; navLabel: string;
  dialogueQuestion: string;
  eras: Array<{ year: string; caption: string; title: string; continuation: string; body: string; device: string; answer: string }>;
  magazinesTitle: string; magazinesBody: string; magazinesSpoiler: string; magazinesLabel: string;
  carTitle: string; carBody: string; carCaption: string; carHint: string; carAlt: string; carLabel: string;
  memoriesTitle: string; memoriesLabel: string; memories: StoryItem[];
  orbitLabel: string; orbit: Array<{ key: string; label: string; caption: string }>;
  galleryTitle: string; galleryLabel: string; gallery: Array<{ image: string; alt: string }>;
  pizzaTitle: string; pizzaAlt: string; museumTitle: string; museumBody: string; museumAlt: string;
  hobbiesTitle: string; hobbiesLabel: string; hobbies: StoryItem[];
  leadershipTitle: string; chatLabel: string; chat: Array<{ speaker: string; text: string }>;
  principlesTitle: string; principlesBody: string; principles: Array<{ title: string; body: string }>;
  lifeTitle: string; lifeBody: string; bikeLabel: string; mountainAlt: string;
  works: Array<{ company: string; role: string; date: string; href: string; title: string; metrics: Array<{ value: string; label: string }> }>;
  resumeNote: string; resumeLink: string;
  visionLabel: string; visionQuestion: string; visionResponse: string; visionRestart: string;
};

export type SitePage = "home" | "sobre" | "cases" | "curriculo" | "contato";
export type SiteContent = {
  nav: Array<{ href: string; label: string; short: string }>;
  notFoundKicker: string; notFoundTitle: string; notFoundBody: string; notFoundButton: string; notFoundAlt: string;
  personDescription: string;
} & { [K in `${SitePage}Title` | `${SitePage}Description`]: string };
