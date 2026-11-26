/**
 * O currículo como era antes de ficar editável: hoje é só o conteúdo padrão de `content/pages/curriculo.json`
 * (lib/pages/defaults.ts) e a fonte dos dados estruturados de busca (lib/seo.ts). Edite pelo admin, em Páginas.
 */

export const summary =
  "Mais de 18 anos de experiência em design, atuando no desenvolvimento de produtos inovadores e criação de sistemas de design robustos. Experiência comprovada em conduzir pesquisas de usuários, testes de usabilidade e desenvolver plataformas com usabilidade simples, fluida e intuitiva. Buscando uma posição em design onde eu possa contribuir com minha expertise em design centrado no usuário e inovação em produtos."

export interface ExperienceBlock {
  title: string
  period: string
  bullets?: string[]
  /** Métricas / resultados (ex.: BrandLovrs) */
  resultLines?: string[]
}

export const experience: ExperienceBlock[] = [
  {
    title: "Design Manager @ SulAmérica",
    period: "Setembro de 2025 — Atual",
    bullets: [
      "Atuo como líder de Design nas unidades de negócios de: Marketing & Vendas, Vida & Previdência e APPs.",
      "Responsável pela direção de design do novo aplicativo da companhia, responsável pela estratégia e evolução do novo ecossistema de portais corporativos.",
    ],
  },
  {
    title: "Design Manager & Product Lead @ Oficina Brasil",
    period: "Julho de 2024 — Fevereiro de 2025",
    bullets: [
      "Na minha passagem pela Oficina Brasil, liderei iniciativas estratégicas voltadas para a transformação digital de uma empresa com mais de 30 anos de trajetória no mercado automotivo. Meu foco esteve na modernização do portfólio digital, criando e evoluindo produtos voltados ao Aftermarket para conectar reparadores, indústrias e distribuidores de forma eficiente.",
      "Trabalhei diretamente com equipes multidisciplinares, alinhando design, tecnologia e objetivos de negócios para desenvolver soluções integradas, como ferramentas educacionais, marketplaces e plataformas de análise de dados. Sempre priorizando a experiência do usuário, garanti que cada produto atendesse às necessidades do setor, ao mesmo tempo que gerava valor tangível para a empresa e seus parceiros.",
      "Além do desenvolvimento de produtos, tive um papel fundamental na implementação de práticas ágeis e data-driven, utilizando inteligência de mercado para entender o comportamento do reparador e antecipar tendências. Meu objetivo foi consolidar a Oficina Brasil como um elo indispensável para a evolução do aftermarket automotivo, entregando soluções escaláveis e de impacto real.",
      "Essa experiência reforçou minha paixão por criar produtos que vão além da interface, produtos que transformam negócios, otimizam processos e geram inovação de verdade.",
    ],
  },
  {
    title: "Design Manager @ BrandLovrs",
    period: "Maio de 2023 — Julho de 2024",
    bullets: [
      "Liderei o chapter de design na BrandLovrs, gerenciando as equipes de Product Design e desempenhando um papel estratégico na construção e evolução das frentes de Research, Content e Design System da empresa.",
      "Além do impacto na área de design, tive participação direta na rodada de captação de R$ 35 milhões liderada pela Kaszek, contribuindo com estratégias e iniciativas que fortaleceram a posição da BrandLovrs no mercado, consolidando a empresa como referência na Creator Economy.",
      "Ao longo da minha atuação, fui fundamental no fortalecimento da cultura de design, estruturando e desenvolvendo um time de alta performance, capacitado para superar desafios e gerar resultados expressivos. Minha liderança e expertise ajudaram a criar experiências cativantes e inovadoras, conectando criadores de conteúdo e marcas em um ecossistema dinâmico.",
      "Reportei diretamente ao CPO e CEO, garantindo alinhamento estratégico e impacto real para o crescimento da empresa. Minha experiência em liderar equipes, escalar produtos e transformar desafios em oportunidades reflete meu compromisso com um design centrado no usuário e uma inovação contínua.",
    ],
    resultLines: [
      "+20% na taxa de downloads do app",
      "−75% na quantidade de chamados do app",
      "+46% na conversão do app",
      "+75% na ativação mensal de criadores de conteúdo no app",
      "+78% nas avaliações do app nas lojas de aplicativos",
    ],
  },
  {
    title: "Design Manager @ Loft",
    period: "Março de 2022 — Março de 2023",
    bullets: [
      "Liderei duas tribos de design, gerenciando um time de alto desempenho com seis designers, incluindo um Staff Designer (especialista) e cinco Product Designers. Além disso, ofereci liderança indireta para um Content Designer, um UX Researcher e um Service Designer, promovendo colaboração entre diferentes disciplinas.",
      "Minha atuação esteve focada em mentoria e desenvolvimento de equipe, conduzindo 1:1s regulares, apoiando o crescimento de carreira e fortalecendo tanto as competências técnicas de design quanto as habilidades interpessoais dos profissionais.",
    ],
  },
  {
    title: "Design Manager @ PicPay",
    period: "Maio de 2020 — Fevereiro de 2022",
    bullets: [
      "Liderei equipes de até 15 profissionais em Product Design, UX Research e UX Writing, além de estruturar as primeiras posições de Staff Designer e Service Designer na empresa.",
      "Fui peça-chave na escalada da equipe de design, que cresceu de 15 para 170 profissionais entre 2020 e 2022. Atuei na liderança do design em diversas unidades de negócios B2B e B2C, incluindo ferramentas para negócios, pagamentos presenciais e digitais, mobilidade e novos serviços financeiros. Desenvolvi e implementei estratégias centradas no usuário, contribuindo para a otimização das jornadas no maior superapp da América Latina.",
    ],
  },
  {
    title: "Product Designer & UX Lead @ Banco Pan",
    period: "Maio de 2018 — Novembro de 2019",
  },
  {
    title: "Product Designer @ Conta Azul",
    period: "Janeiro de 2018 — Abril de 2019",
  },
  {
    title: "Product Designer @ WebMotors",
    period: "Agosto de 2015 — Janeiro de 2018",
  },
  {
    title: "Lead UI Designer @ RRP Digital",
    period: "Novembro de 2014 — Julho de 2015",
  },
  {
    title: "Lead UI Designer @ FCB Brasil",
    period: "Setembro de 2014 — Novembro de 2014",
  },
  {
    title: "Lead UI Designer @ Agência VM2",
    period: "Janeiro de 2014 — Setembro de 2014",
  },
  {
    title: "UI Designer @ Mint Digitall",
    period: "Maio de 2013 — Janeiro de 2014",
  },
  {
    title: "UI Designer @ CondoTV",
    period: "Outubro de 2012 — Maio de 2013",
  },
  {
    title: "UI Designer @ Agência VM2",
    period: "Junho de 2011 — Outubro de 2012",
  },
  {
    title: "Junior UI Designer @ Agência VM2",
    period: "Fevereiro de 2009 — Junho de 2011",
  },
]

export const education = [
  {
    course: "Evoluindo design nas organizações",
    institution: "Aprender Design",
    year: "2023",
  },
  {
    course: "Design digital",
    institution: "Unibero",
    year: "2016",
  },
  {
    course: "Arquitetura da Informação",
    institution: "Jump Education",
    year: "2012",
  },
]

export const skills = [
  "Gestão de pessoas",
  "Gestão de equipes",
  "Gestão de design",
  "Gestão de produto",
  "Formação de times",
  "Inovação",
  "Comunicação",
  "Design System",
  "Design Thinking",
  "Agile",
]

export const tools = ["Figma", "Sketch", "Framer", "Suíte Adobe", "Miro", "Office", "Hotjar & Smartlook", "LinkedIn Recruiter", "Gupy", "Greenhouse"]

export const ai = ["ChatGPT", "Claude", "Gemini", "Figma Make", "Higgsfield AI", "Magnific AI"]

export const social = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/guttorocha/" },
  { label: "Instagram", href: "https://www.instagram.com/guttorocha" },
  { label: "Dribbble", href: "https://dribbble.com/guttorocha" },
]

export interface CurriculumTestimonial {
  /** What the person does today; the site shows the position, not the name. */
  position: string
  /** How they worked with Gutto. */
  role: string
  date: string
  quote: string
}

/** LinkedIn recommendations, newest first. */
export const testimonials = [
  {
    position: "Senior Product Designer",
    role: "Liderado por mim na BrandLovrs",
    date: "2024",
    quote:
      "Gutto é um amigo de trabalho incrível! Além de ser um líder excepcional, ele tem um conhecimento técnico impressionante e está sempre disposto a ensinar os outros. Sua escuta ativa e sua empatia são realmente admiráveis. Aprendo algo novo todos os dias sob a liderança do Gutto e é sempre um prazer trocar ideias e discutir soluções com ele. Eu sei que o céu é o limite, mas para o Gutto, parece que nem mesmo o céu é o bastante!",
  },
  {
    position: "Product Designer",
    role: "Liderada por mim no PicPay e na Loft",
    date: "2022",
    quote:
      "Trabalhei sob a liderança do Gutto em dois momentos da minha carreira, e em ambos os momentos, tive excelentes experiências com ele. Nossas trocas sempre muito ricas, com boas provocações, conselhos e sugestões de melhorias sempre com tom respeitoso e leve. Isso auxilia muito o meu desenvolvimento como profissional. Um ponto que quero destacar em sua atuação como líder é sua disponibilidade em ouvir as diferentes opiniões, estimulando assim um ambiente seguro de colaboração entre os designers. Relevante também ressaltar a boa habilidade de comunicação que ele tem, o vejo trazendo questionamentos e feedbacks sempre muito bem estruturados.",
  },
  {
    position: "Especialista em produtos digitais",
    role: "Trabalhamos juntos, em times diferentes",
    date: "2019",
    quote:
      "Comprometido com o olhar do usuário, possui visão holística para poder desenvolver projetos de design de serviços. Sua personalidade motiva todos ao seu redor a buscar as melhores práticas e entrega de valor em tudo que faz.",
  },
  {
    position: "Senior Group Product Manager",
    role: "Minha gestora direta",
    date: "2017",
    quote:
      "Gutto é um profissional que traz segurança para a gestão! É rápido, faz acontecer e tem muita proatividade! Se adapta fácil às estruturas e tem muito carisma!",
  },
  {
    position: "UX Design Specialist",
    role: "Colega na Agência VM2 e, depois, liderado por mim",
    date: "2017",
    quote:
      "Quando iniciei minha jornada na Agência VM2, trabalhamos na mesma equipe e logo pude notar o excelente profissional que é o Gutto. Muito criativo, focado, prestativo, competente e responsável. Depois de algum tempo, tive o prazer de trabalhar novamente com ele, dessa vez como líder da equipe da qual eu fazia parte. Sem dúvida, foi um período no qual aprendi muito sobre direção de arte, UI e UX.",
  },
  {
    position: "Chief Product Officer",
    role: "Meu gestor direto na Webmotors",
    date: "2017",
    quote:
      "Gutto é um excelente profissional com ótima visão de UX e um grande potencial na carreira. Seus projetos na Webmotors são desenvolvidos com uma qualidade diferenciada para poucos profissionais.",
  },
  {
    position: "Executive General Manager",
    role: "Participou da minha contratação na Webmotors",
    date: "2017",
    quote:
      "Participei da contratação do Gutto para o time da Webmotors. Ele trabalhou praticamente 1 ano na equipe de MKT e em seguida foi para um novo desafio na área de UX. Além de bom de se trabalhar em equipe, tem alto potencial criativo, é eclético, com excelentes entregas tanto na direção de arte como no design de interfaces. Está sempre dando ideias, incomodado com as dores dos clientes e participa ativamente não só dos seus projetos, mas também de outras iniciativas em que consegue apoiar ou ajudar, seja atuando bem próximo ou pelo menos com boas ideias.",
  },
  {
    position: "Desenvolvimento de negócios sustentáveis",
    role: "Trabalhamos no mesmo time",
    date: "2017",
    quote:
      "Eu e o Gutto trabalhamos em alguns projetos juntos. Nesses projetos o que mais marcou foi sua preocupação, detalhismo e empenho ao pensar e propor soluções, mais do que somente interface. Busca sempre balancear experiência e orientação ao negócio. Gutto é um ótimo designer, sempre atualizado e uma pessoa muito boa de se trabalhar ao lado.",
  },
  {
    position: "Gerente de projetos sênior",
    role: "Trabalhamos no mesmo time na Agência VM2",
    date: "2014",
    quote:
      "Gustavo, um profissional incrível, possui uma mente criativa brilhante, um profissional comprometido com as entregas e seus prazos, sempre ajudando a equipe com suas opiniões de design e melhores práticas para desenvolvimento de um layout, seja ele para campanhas ou um portal.",
  },
  {
    position: "Product Owner",
    role: "Trabalhamos no mesmo time na Agência VM2",
    date: "2014",
    quote:
      "Tenho o prazer de trabalhar na mesma equipe do Gustavo, um excelente diretor de arte, que além de muito criativo ajuda muito no trabalho em equipe.",
  },
  {
    position: "Fotógrafo",
    role: "Estudamos juntos na Unibero",
    date: "2014",
    quote:
      "Eu tive o prazer de estudar com o Gustavo no Centro Universitário Ibero Americano. Participamos juntos em vários projetos e era impressionante a habilidade que ele já tinha naquela época com criação. Como líder ou membro de qualquer equipe, o Gustavo recebe minhas recomendações.",
  },
  {
    position: "Senior Engineering Manager",
    role: "Trabalhamos no mesmo time",
    date: "2013",
    quote:
      "Profissional criativo e dinâmico. Desenvolve seu trabalho com excelência, sempre prezando pela boa integração com as demais equipes.",
  },
  {
    position: "AI Product Owner",
    role: "Estudamos juntos na Unibero",
    date: "2013",
    quote:
      "Estudei com o Gustavo na Unibero, e ele sempre foi um garoto esperto, atento e muito talentoso. Se atualizou e saiu da faculdade como um ótimo criativo, sempre em busca de novos desafios.",
  },
  {
    position: "Diretor de arte",
    role: "Trabalhamos juntos, em times diferentes",
    date: "2013",
    quote:
      "Gustavo é um excelente profissional, completamente dedicado.",
  },
  {
    position: "Líder de Product Design",
    role: "Trabalhamos no mesmo time",
    date: "2013",
    quote:
      "Focado, dedicado e com excelente gosto visual. Um ótimo profissional e agrega muito em qualquer equipe. Ótimas ideias e trabalha muito bem em grupo!",
  },
] as const satisfies readonly CurriculumTestimonial[];
