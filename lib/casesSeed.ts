import type { Case } from "./cases";

/** Dados estáticos só para scripts (gerar .md Notion). O site usa `getCaseDataSource()` → Notion. */
export const CASES_SEED: Case[] = [
  {
    slug: "picpay-b2b",
    num: "01",
    title: "Jornada B2B do zero",
    company: "PicPay",
    year: "2020–2022",
    role: "Design Manager",
    tags: ["Produto", "Liderança"],
    accentTags: ["Escala"],
    placeholder: "#D8E8FF",
    brandColor: "#38b160",
    summary:
      "Construir uma jornada B2B completa enquanto o produto consumer já atendia 70 milhões de usuários.",
    context:
      "O PicPay era um produto massivo no Brasil — mas 100% focado no consumidor final. A operação B2B existia, mas era artesanal. Sem jornada, sem produto, sem time de design dedicado.",
    challenge:
      "Criar do zero uma jornada para lojistas e estabelecimentos enquanto o produto consumer crescia em velocidade máxima. O desafio não era só de design — era de descobrir o que o B2B do PicPay deveria ser.",
    approach: [
      {
        title: "Entendendo quem eram os lojistas",
        body: [
          "Começamos com pesquisa direta. Visitamos estabelecimentos, acompanhamos o dia a dia de quem recebia pagamento pelo PicPay e mapeamos onde o processo travava.",
          "O que encontramos: a experiência de cadastro era manual, suporte era por telefone e não havia visibilidade nenhuma das transações. Lojistas grandes e pequenos conviviam com o mesmo fluxo inadequado.",
        ],
      },
      {
        title: "Estruturando o produto com o time",
        body: [
          "Formei e liderei um pod dedicado ao B2B — designers, PMs e engenheiros. Criamos os primeiros rituais de discovery específicos para esse público, separados do fluxo consumer.",
          "O portal do lojista foi o primeiro entregável: dashboard de transações, gestão de estabelecimentos e relatórios. Simples, mas funcional — e pela primeira vez com um padrão visual consistente.",
        ],
      },
      {
        title: "Escalando sem perder qualidade",
        body: [
          "Com o produto validado, o desafio virou velocidade. Criei junto com o time um design system específico para o B2B, reutilizando tokens do sistema consumer mas com componentes adequados para interfaces de gestão.",
          "Isso permitiu que novos módulos fossem entregues em semanas, não meses.",
        ],
      },
    ],
    stats: [
      { value: "2 anos",    label: "do zero ao produto maduro" },
      { value: "12×",       label: "crescimento em lojistas ativos" },
      { value: "1 pod",     label: "criado e liderado do zero" },
      { value: "0→1",       label: "jornada B2B completa" },
    ],
    outcome:
      "Uma jornada B2B completa, com produto, time e processo. O que começou como uma operação manual virou um produto com roadmap, métricas e identidade própria dentro do PicPay.",
    learning:
      "Construir B2B dentro de uma empresa consumer exige muita negociação de prioridade. O produto quase sempre perde para a urgência do consumer. Aprendi a proteger o espaço do B2B criando evidências de negócio — não só de design.",
  },

  {
    slug: "sulamerica-portal",
    num: "02",
    title: "Novo App e Portal no ar",
    company: "SulAmérica",
    year: "2024–atual",
    role: "Design Lead",
    tags: ["Produto"],
    accentTags: ["Design System"],
    placeholder: "#D0EDE0",
    brandColor: "#f05223",
    summary:
      "App e portal redesenhados do zero. Sistema de design do chão ao teto, com time novo e prazo real.",
    context:
      "A SulAmérica tinha dois produtos digitais — um app e um portal — com interfaces envelhecidas, inconsistentes e sem sistema de design por trás.",
    challenge:
      "Redesenhar os dois produtos em paralelo, criando um sistema de design do zero, com um time que estava sendo montado ao mesmo tempo em que o projeto acontecia.",
    approach: [
      {
        title: "Sistema de design antes do produto",
        body: [
          "A decisão mais importante foi não começar pelas telas. Começamos pelo sistema — tokens, componentes base e guidelines que dariam consistência a tudo que viesse depois.",
          "Isso exigiu convencer stakeholders de que investir semanas sem entregar telas visíveis era o caminho certo. Valeu.",
        ],
      },
      {
        title: "App e portal em sprints paralelos",
        body: [
          "Com o sistema em pé, dividimos o time. Uma frente no app mobile, outra no portal web. Os componentes eram compartilhados — o que acelerou as duas frentes.",
          "Cada sprint tinha entregas tangíveis: fluxos completos, não telas soltas. Isso ajudou a manter o ritmo e a visibilidade do progresso.",
        ],
      },
    ],
    stats: [
      { value: "1 sistema",  label: "de design criado do zero" },
      { value: "2 produtos", label: "redesenhados em paralelo" },
      { value: "6 meses",    label: "do kickoff ao go-live" },
      { value: "1 time",     label: "montado e liderado no processo" },
    ],
    outcome:
      "App e portal no ar, com sistema de design documentado e time em velocidade de cruzeiro. O que era dois produtos inconsistentes virou uma família coesa.",
    learning:
      "Redesign com sistema de design do zero é lento no começo e rápido no final. O desafio é manter o projeto vivo durante a fase lenta — quando as entregas são invisíveis para quem não está no dia a dia.",
  },

  {
    slug: "brandlovers-criadores",
    num: "03",
    title: "Creators ganhando mais dinheiro",
    company: "BrandLovrs",
    year: "2023–2024",
    role: "Design Manager",
    tags: ["Produto", "Creators"],
    accentTags: ["Creators"],
    featuredOnSite: true,
    placeholder: "#FFE4D0",
    brandColor: "#ff007e",
    heroImage:
      "https://cdn.prod.website-files.com/6893922838397a26f7a3a11a/6897455e12efcde9655d36ce_header.png",
    summary:
      "App que liga creators e marcas em campanhas, com carteira e pagamentos no ecossistema que a marca descreve hoje. No MVP, quanto dava para ganhar não aparecia direito. Foco em clareza, campanhas mais legíveis e avisos, com entregas enxutas em desenvolvimento.",
    context:
      "A BrandLovrs conecta creators e marcas. Quando cheguei, a proposta de valor no app não estava clara: o MVP não mostrava o mais importante para creators, quanto podiam ganhar com cada marca na plataforma. Creators já tinham comunidade e influência, mas monetizar no app era difícil.\n\nO site do produto fala em campanhas, carteira e transparência. No app que eu peguei, essa história não fechava no primeiro uso.",
    challenge:
      "Revelar potencial de ganho com mudanças baratas de construir e alto impacto percebido. Hipótese: mais clareza sobre recompensas aumenta participação em campanhas e renda. Critério: mais gente entendendo ganho antes de se comprometer com a campanha, com mudanças baratas de construir.",
    approach: [
      {
        title: "Diagnóstico",
        body: [
          "Diagnóstico aprofundado no MVP: fluxo no Smartlook, mapa de reclamações de suporte, benchmark de peers e pesquisa quali e quanti com usuários ativos, ex-usuários e potenciais novos.",
          "O que emergiu voltava sempre ao mesmo lugar: quanto dava para ganhar não aparecia cedo nem com segurança. Muitos desistiam antes de se comprometer com a campanha.",
          "O padrão: interesse até o dinheiro some na interface.",
        ],
      },
      {
        title: "Valor no primeiro uso",
        body: [
          "Redesenhamos o fluxo para quanto e como ganhar aparecer cedo, ainda no primeiro uso, alinhado à ideia de previsibilidade que a marca comunica hoje para creators, sem cravar release por release no texto.",
          "Referência mental: produtos que mostram potencial de ganho antes de pedir esforço pesado. Aqui o foco foi ordem da informação e hierarquia na superfície, não uma lista enorme de feature nova.",
        ],
      },
      {
        title: "Campanhas e avisos",
        body: [
          "Campanhas em lista e cards com sinais de match com o perfil, para leitura de fit sem passeio infinito.",
          "Notificações para campanha no segmento e para marco de ganho. Menos depender de abrir o app para descobrir oportunidade.",
          "Alinhamento com PMs e engenharia para não inflar escopo: o que ia para sprint era o que mudava percepção com custo baixo de construção.",
        ],
      },
    ],
    stats: [
      { value: "+99%", label: "creators ganhando na plataforma" },
      { value: "+48%", label: "participação em novas campanhas" },
      {
        value: "R$ 500 mil",
        label: "primeira campanha acima desse valor em creators",
      },
      { value: "1 quarter", label: "primeiros resultados nessa linha" },
    ],
    outcome:
      "Em um quarter, creators mais engajados, marcas mais confiantes e mais recompensas distribuídas. A primeira campanha com investimento acima de R$ 500 mil em creators nasceu nesse período, com marcas ganhando confiança na plataforma. Isso conversa com o produto que a BrandLovrs vende hoje, campanhas e carteira como lugar de ver transação e saldo. O case é o momento em que no uso essa história ainda não estava clara.",
    learning:
      "Se a empresa já fala em transparência de ganhos e carteira, mas no primeiro uso o creator não enxerga valor, o trabalho é informação e ordem, não lista de feature. Pequena mudança na superfície e na sequência pode destravar confiança e participação.",
    attributionNote:
      "Métricas do período documentado no case. Resultados depois somam outras mudanças de produto e negócio.",
    editorialSourceNote:
      "Narrativa e números: trabalho documentado. Contexto de produto: posicionamento público BrandLovrs.",
  },

  {
    slug: "webmotors-catalogo",
    num: "04",
    title: "Catálogo 0km do zero",
    company: "WebMotors",
    productTag: "Catálogo 0km",
    year: "2015–2018",
    role: "Product Designer",
    tags: ["Produto", "SEO"],
    accentTags: ["0km"],
    featuredOnSite: true,
    placeholder: "#E4DCFF",
    brandColor: "#e11138",
    heroImage: "/cases/webmotors/webmotors-case-hero.png",
    summary:
      "Time pequeno e escopo fechado: modelo e versão como índice primeiro, páginas pilar e entrega responsiva no prazo, para o produto nascer indexável em vez de remendado depois.",
    context:
      "0km ainda era dado espelhado em vários cantos: pouco padronizado e difícil de reaproveitar entre produto, páginas e busca. Outras frentes precisavam de uma âncora única. Nada disso existia como base comum reutilizável; o catálogo precisava ser levantado do zero.",
    challenge:
      "Dar forma a modelo e versão, páginas pilar e descoberta sem estourar o que um time de três fecharia no tempo. A escolha foi cortar polimento de tela que não sustentava índice nem comparação e empurrar estrutura com SEO no topo.",
    approach: [
      {
        title: "O que já existia lá fora",
        body: [
          "Benchmarks e stakeholders: o que o negócio e o uso esperavam de 0km, e onde o recorte atual perdia leitura de montadora, modelo e versão.",
          "Duas dores voltavam sempre: dados duplicados entre fontes e busca que não espelhava montadora, modelo e versão.",
        ],
      },
      {
        title: "Um lugar para modelo e versão",
        body: [
          "Indexação e páginas pilar foram tratadas junto com a estrutura com SEO, para não nascer bonito e depois refazer árvore.",
          "Montadora, modelo e versão como árvore navegável viraram base de componentes e abriram caminho para comparador e fichas, com uma leitura só para quem usa e para quem indexa.",
        ],
      },
      {
        title: "Três pessoas, três meses, no ar",
        body: [
          "Wireframes, protótipo navegável, validação com negócio e SEO, handoff e acompanhamento com engenharia até o go-live num fluxo único, no tamanho do time.",
          "No topo de funil, celular já pesava; responsivo entrou no corte junto com o restante, em vez de vir como segunda onda.",
        ],
      },
    ],
    stats: [
      {
        value: "5,2M → 17,8M",
        label: "Sessões orgânicas",
        caption: "jan/2016 → jan/2025",
      },
      {
        value: "108 mil → 822 mil",
        label: "Palavras-chave indexadas",
      },
      {
        value: "30 mil → 153 mil",
        label: "Posições no top 3",
      },
      {
        value: "69%",
        label: "Busca com intenção informativa",
        caption: "Topo de funil",
      },
    ],
    outcome:
      "O catálogo 0km virou alicerce interno: comparador, fichas e o que depende de modelo e versão passou a se apoiar na mesma estrutura. O orgânico ganhou escala ao longo de muitos anos, com outras frentes somando em cima.",
    learning:
      "O que parece burocracia no kickoff é o que sustenta busca e produto quando o negócio escala. Disciplina na base evita refação cara de narrativa e de interface mais tarde.",
    attributionNote:
      "Números de busca referem-se a um período longo. O catálogo 0km foi peça estrutural; o resultado orgânico acumula outras frentes e iniciativas ao longo dos anos.",
  },

  {
    slug: "loft-lideranca-gestao-e-cultura-de-design",
    num: "05",
    title: "Construindo um time de design quando crescer já não era suficiente",
    company: "Loft",
    productTag: "People and Operations",
    year: "2022–2023",
    role: "Design Manager",
    tags: ["Liderança", "Desenvolvimento", "People"],
    accentTags: ["Growth"],
    placeholder: "#FFD8D8",
    brandColor: "#ff774a",
    heroMegaWord: "LOFT",
    heroImage: "/cases/loft/hero.png",
    summary:
      "Na Loft, liderava duas tribos de growth. O risco de um time imaturo nessa área é direto: decisão ruim, velocidade menor, resultado abaixo do possível. O trabalho foi criar a base que o time precisava — antes que a falta dela virasse problema de produto.",
    context:
      "A Loft vivia um momento de crescimento acelerado. O time de design crescia junto. Eu liderava designers em duas tribos de growth — área onde fragilidade de time tem consequência direta em métrica de produto.\n\nO risco não era abstrato. Time imaturo em growth significa decisão ruim, velocidade menor e resultado abaixo do possível. Enquanto o produto consumer avançava, a estrutura de design não acompanhava no mesmo ritmo.\n\nHavia também um problema de operação. As cerimônias existiam, mas cada uma funcionava de um jeito. Cada líder conduzia diferente. Não havia sistema. Havia esforço individual.",
    challenge:
      "Não faltava talento. Faltava base para esse talento se transformar em resultado. Um designer do time não estava entregando no contexto em que estava. O problema não era capacidade. Era contexto. E enquanto isso não fosse resolvido, o time inteiro pagava o custo.",
    approach: [
      {
        title: "Reposicionamento",
        body: [
          "Movi o designer que não estava entregando para outro time, onde o contexto era mais adequado para o que ele entregava. No lugar dele, trouxe uma designer pleno.",
          "Decisão que gerou desconforto no curto prazo e que se provou certa depois. O designer reposicionado se encontrou no novo contexto. A designer que entrou deslanchou.",
        ],
      },
      {
        title: "Sistema de rituais",
        body: [
          "Construí o sistema que o time precisava. Não uma iniciativa isolada. Um conjunto de rituais com dono, frequência, pauta e output definidos.",
          "Touchpoint quinzenal para conexão e estratégia. Critique semanal para elevar a barra das entregas. Retrospectiva mensal para ajustar o que não estava funcionando. Planning Cross trimestral para alinhar design ao roadmap de produto.",
        ],
      },
      {
        title: "Reconhecimento com evidência",
        body: [
          "Com o sistema funcionando, comecei a construir os casos de reconhecimento com base em evidência de produto, não só percepção.",
          "Cada promoção precisava ter número, não só narrativa. Conversão, produtividade, impacto em funil. Essa disciplina mudou a qualidade das conversas de carreira e a confiança do time na liderança.",
        ],
      },
    ],
    stats: [
      { value: "+1M", label: "usuários" },
      { value: "66,1K", label: "MAU" },
      { value: "4,8", label: "App Store" },
      { value: "4,5", label: "Play Store" },
      { value: "+452%", label: "buscas" },
      { value: "+26%", label: "conversão lead para agendamento" },
    ],
    attributionNote: "EPOD Demand · App B2C Loft · Outubro 2022",
    outcome:
      "O time ficou mais claro, mais alinhado e mais consistente. As pessoas passaram a entender melhor o próprio caminho. A liderança ganhou mais segurança para acompanhar e decidir. E o design deixou de depender só de esforço individual para funcionar bem.\n\nQuatro designers do time nesse período chegaram a posições de liderança ou especialização. Nenhum deles era o candidato óbvio quando foram reconhecidos. Todos foram reconhecidos com evidência de produto, não só percepção.",
    learning:
      "Reposicionar alguém é uma das decisões mais difíceis na liderança de design. A tentação é esperar mais um pouco, dar mais uma chance, evitar o desconforto. Mas ficar na posição errada prejudica todo mundo.\n\nO que aprendi na Loft é que cuidar do time não significa protegê-lo do incômodo. Significa criar as condições certas para cada pessoa crescer. Às vezes isso exige uma conversa difícil. Às vezes exige um sistema que não existia. Às vezes exige reconhecer alguém com evidência, não só com intenção. Quase sempre vale.",
  },

  {
    slug: "modelo",
    num: "00",
    title: "Modelo de página (playbook)",
    heroMegaWord: "PLAYBOOK",
    company: "Gutto Rocha",
    year: "2026",
    role: "Referência de UI",
    tags: ["Todos os blocos"],
    accentTags: ["Playbook"],
    placeholder: "#E8E4E0",
    brandColor: "red",
    summary:
      "Laboratório com todas as seções e componentes de case num fluxo só — refinar aqui antes de replicar nas landings reais.",
    context:
      "Conteúdo interno ao portfólio: alinha ritmo, tipografia e menu local sem depender de narrativa de um cliente específico.",
    challenge:
      "Expor o catálogo de blocos reutilizáveis numa única página legível.",
    approach: [
      {
        title: "Secção editorial",
        body: [
          "Padrão label estreito + conteúdo: usado em contexto, desafio e abordagem.",
        ],
      },
    ],
    stats: [
      { value: "100%", label: "blocos do sistema listados" },
      { value: "0", label: "métricas de produto reais" },
    ],
    outcome:
      "Quando o layout estiver fechado aqui, replicamos o padrão nas páginas de cases.",
    learning:
      "Iterar no modelo reduz retrabalho nas páginas narrativas.",
    featuredOnSite: false,
  },
];
