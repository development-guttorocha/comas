import { homeText } from "@/components/home/homeCopy";
import { getTranslator } from "@/lib/i18n/messages";
import { designersLed, voices } from "@/lib/leadership";
import * as cv from "@/lib/curriculum";
import type { PageValues } from "./model";

/**
 * What each page showed before it became editable: used when its file is missing or a field is new.
 * Server only (the admin's browser never needs it). The résumé's comes from lib/curriculum.ts, with the
 * English the fixed-text catalog already had.
 */
const en = getTranslator("en");
const both = (pt: string, english = en(pt)) => ({ pt, en: english });
const texts = (list: readonly string[]) => list.map(text => ({ text: both(text) }));
const jobs = (from: number, to?: number) => cv.experience.slice(from, to)
  .map(job => ({ title: both(job.title), period: both(job.period), bullets: texts(job.bullets ?? []), results: texts(job.resultLines ?? []) }));

const contato: PageValues = {
  kicker: both("Contato", "Contact"),
  title: both("Oi, quer tc?", "Hey, want to chat?"),
  continuation: both("Bora conversar.", "Let’s talk."),
  intro: both("Chama no bate-papo, vamos criar algo que faça sentido juntos.", "Drop me a message. Let's create something meaningful together."),
  emailButton: both("Mandar um e-mail", "Send an email"),
  email: "guttorsbueno@gmail.com",
  cardName: "Gutto Rocha",
  channels: [
    { label: both("E-mail", "Email"), value: "guttorsbueno@gmail.com", href: "mailto:guttorsbueno@gmail.com" },
    { label: both("Telefone", "Phone"), value: "+55 11 9 6325-1446", href: "tel:+5511963251446" },
    { label: both("LinkedIn", "LinkedIn"), value: "in/guttorocha", href: "https://www.linkedin.com/in/guttorocha/" },
    { label: both("Instagram", "Instagram"), value: "@guttorocha", href: "https://instagram.com/guttorocha" },
    { label: both("Dribbble", "Dribbble"), value: "dribbble.com/guttorocha", href: "https://dribbble.com/guttorocha" },
  ],
  locationLabel: both("Onde estou", "Where I'm based"),
  location: both("Guarulhos, SP — Brasil", "Guarulhos, SP — Brazil"),
};

const curriculo: PageValues = {
  kicker: both("Currículo"),
  name: "Gustavo Rocha",
  surname: "Souza Bueno",
  headline: both("Design Manager @ SulAmérica"),
  location: both("Guarulhos, SP — Brasil", "Guarulhos, SP — Brazil"),
  status: both("", ""),
  photo: "/curriculo/gutto.webp",
  contacts: [
    { label: both("Telefone", "Phone"), value: "+55 11 9 6325-1446", href: "tel:+5511963251446" },
    { label: both("Site", "Website"), value: "guttorocha.com.br", href: "https://www.guttorocha.com.br" },
    { label: both("E-mail", "Email"), value: "guttorsbueno@gmail.com", href: "mailto:guttorsbueno@gmail.com" },
  ],
  printLabel: both("Baixar PDF", "Download PDF"),
  contactCta: both("Fale comigo", "Get in touch"),
  summaryTitle: both("Resumo profissional"),
  summary: both(cv.summary),
  experienceTitle: both("Experiência profissional"),
  resultsTitle: both("Principais resultados"),
  // The career in three phases, newest first: lib/curriculum.ts lists the roles in that order.
  phases: [
    { title: both("Liderança e Gestão", "Leadership & Management"), period: both("A partir de 2020", "Since 2020"), jobs: jobs(0, 5) },
    { title: both("Design de Produto", "Product Design"), period: both("2016 — 2020"), jobs: jobs(5, 8) },
    { title: both("UI Design"), period: both("2009 — 2015"), jobs: jobs(8) },
  ],
  educationTitle: both("Educação"),
  education: cv.education.map(e => ({ course: both(e.course), institution: e.institution, year: e.year })),
  skillsTitle: both("Habilidades"),
  skills: texts(cv.skills),
  toolsTitle: both("Ferramentas"),
  tools: cv.tools.map(name => ({ name: both(name) })),
  aiTitle: both("Fluente em IA", "Fluent in AI"),
  ai: cv.ai.map(name => ({ name: both(name) })),
  socialTitle: both("Redes sociais"),
  social: cv.social.map(s => ({ label: s.label, href: s.href })),
  testimonialsKicker: both("Depoimentos"),
  testimonialsTitle: both("O que diz quem"),
  testimonialsContinuation: both("trabalhou comigo."),
  testimonials: cv.testimonials.map(t => ({ quote: both(t.quote), position: both(t.position), role: both(t.role), date: t.date })),
};

const rodape: PageValues = {
  kicker: both("O mundo muda. Eu continuo curioso."),
  title: both("Vamos construir o próximo capítulo?"),
  links: [
    { label: both("Vamos conversar"), href: "/contato" },
    { label: both("Ver currículo completo"), href: "/curriculo" },
  ],
  wordmark: "©guttorocha",
  pills: [
    { label: both("guttorsbueno@gmail.com"), href: "mailto:guttorsbueno@gmail.com" },
    { label: both("+55 11 9 6325-1446"), href: "tel:+5511963251446" },
    { label: both("LinkedIn"), href: "https://www.linkedin.com/in/guttorocha/" },
    { label: both("Instagram"), href: "https://instagram.com/guttorocha" },
    { label: both("Dribbble"), href: "https://dribbble.com/guttorocha" },
  ],
};

// The Home kept its English in its own dictionary (components/home/homeCopy.ts).
const h = (pt: string, english = homeText("en", pt)) => ({ pt, en: english });
const tags = (list: string[]) => list.map(text => ({ text: h(text) }));
const home: PageValues = {
  wordmark: "Gutto",
  reflection: "Rocha",
  statement: h("18 anos em design, 8 anos liderando."),
  statementSub: h("Pessoas, Produtos e Negócios crescendo juntos"),
  primaryCta: h("Conheça minha forma de Liderar"),
  secondaryCta: h("Descubra minha história"),
  video: "/home/hero.mp4",
  poster: "/home/redesign/hero-reference.png",
  modelBefore: h("Os meus"),
  modelHighlight: "3P’s",
  modelAfter: h("para negócios"),
  pillars: [
    { title: h("Pessoas"), summary: h("Pessoas certas, nos lugares certos, crescendo sempre"), tags: tags(["Contratar", "Desenvolver", "Diversificar", "Reter"]) },
    { title: h("Processos"), summary: h("Processos que trazem alinhamento, reduzem riscos e não travam"), tags: tags(["Documentar", "Alinhar", "Acompanhar", "Preparar", "Automatizar"]) },
    { title: h("Produtos"), summary: h("Produtos que entregam proposta de valor pra quem usa"), tags: tags(["Construir", "Experimentar", "Inovar", "Materializar", "Entregar", "Medir"]) },
  ],
  manifesto: h("Liderança é ferramenta para desenvolver pessoas em carreiras de design, alavancar produtos e gerar impacto em negócio!"),
  impactTitle: h("Negócio, produto e pessoas"),
  impactSubtitle: h("Crescendo ao mesmo tempo"),
  proofs: [
    { company: "SulAmérica", role: h("Design manager"), label: h("Primeira promoção de design em"), value: h("5 anos") },
    { company: "Creator Ads", role: h("Head of design"), label: h("Ajudei a alcançar a:"), value: h("Série A") },
    { company: "PicPay B2B", role: h("Head of design"), label: h("Mais lojistas usando"), value: h("+ 500%") },
  ],
  countValue: `+${designersLed}`,
  countLabel: h("Pessoas lideradas nessa jornada"),
  resumeBefore: h("Veja mais em meu"),
  resumeLink: h("currículo"),
  voicesTitle: h("A voz das pessoas que liderei"),
  voices: [
    { quote: h(voices[0].quote, "…his willingness to listen to different opinions, encouraging a safe environment for collaboration among designers."), preposition: h("Designer no"), company: "Picpay", portrait: "/home/redesign/portrait.png" },
    { quote: h("Nossas trocas sempre muito ricas, com boas provocações, conselhos e sugestões de melhorias sempre com tom respeitoso e leve.", "Our exchanges have always been rich, with thoughtful questions, advice and suggestions for improvement, always delivered with respect and warmth."), preposition: h("Designer na"), company: "Loft", portrait: "/home/redesign/portrait-loft.png" },
    { quote: h(voices[1].quote, "Besides being an exceptional leader, he has impressive technical knowledge and is always willing to teach others."), preposition: h("Designer na"), company: "Creator Ads", portrait: "/home/redesign/portrait-creator-ads.png" },
  ],
};

const clients = [
  ["Microsoft", "Tecnologia"], ["Samsung", "Tecnologia"], ["Panasonic", "Tecnologia"], ["Philco", "Tecnologia"],
  ["Sonda", "Tecnologia"], ["General Motors", "Automotivo"], ["Webmotors", "Automotivo"], ["Oficina Brasil", "Automotivo"],
  ["PicPay", "Finanças"], ["Conta Azul", "Finanças"], ["SulAmérica", "Seguros"], ["Dasa", "Saúde"],
  ["Ajinomoto", "Consumo"], ["Melhoramentos", "Consumo"], ["Loft", "Imobiliário"], ["Creator Ads", "Creators"],
];
const cases: PageValues = {
  word: both("cases"),
  intro: both("Nesses 18 anos, tive a chance de conhecer de perto negócios de todos os tamanhos. Nas agências digitais, aprendi a olhar para cada cliente de um jeito. Depois, levei essa experiência para produtos, passando por empresas em transformação, startups e negócios mais maduros. Em cada lugar, aprendi algo que faz parte do meu jeito de trabalhar hoje."),
  introLink: both("Ver os cases"),
  clientsTitle: both("Empresas que conheceram meu trabalho"),
  clients: clients.map(([name, sector]) => ({ name, sector: both(sector) })),
  coffeeKicker: both("Disponível para conversas"),
  coffeeTitle: both("Vamos tomar"),
  coffeeContinuation: both("um café?"),
  coffeeBody: both("Estou disponível para novas conversas. Se você está montando um time, repensando um produto ou só quer trocar uma ideia sobre design e liderança, me chama."),
  coffeeCta: both("Marcar um café"),
};

// The About page's texts, with the English the fixed-text catalog had. `bold` keeps **markup** in both.
const bold = (...parts: Array<string | [string]>) => ({
  pt: parts.map(part => typeof part === "string" ? part : `**${part[0]}**`).join(""),
  en: parts.map(part => typeof part === "string" ? en(part) : `**${en(part[0])}**`).join(""),
});
const joined = (...parts: string[]) => ({ pt: parts.join(" "), en: parts.map(part => en(part)).join(" ") });
const item = (image: string, title: string, alt: string) => ({ image, title: both(title), alt: both(alt) });
const era = (year: string, caption: string, title: string, continuation: string, body: string, device: string, answer: string) =>
  ({ year, caption: both(caption), title: both(title), continuation: both(continuation), body: both(body), device: both(device), answer: both(answer) });
const sobre: PageValues = {
  heroTitle: both("O mundo muda."),
  heroContinuation: both("Eu continuo curioso."),
  heroLine: both("Designer brasileiro com mais de 18 anos de experiência."),
  heroLink: both("Conheça minha história"),
  summaryKicker: both("TL;DR"),
  summaryTitle: both("Um pouco de mim,"),
  summaryContinuation: both("em poucas linhas."),
  summaryExplanation: both("Um resumo pra você saber rápido quem eu sou. Se tiver um tempinho, escrevi minha história inteira logo abaixo."),
  summaryCta: both("Ver conteúdo inteiro"),
  bio: [
    { text: { pt: "", en: `**${en("Liderança em design, do desenvolvimento de pessoas ao impacto no produto.")}**` } },
    { text: bold("Filho do seu Joel e da dona Elian, pai de 3 gatas, ", ["amante do mar e maratonista de séries."], " Moro em Guarulhos, São Paulo. O TDAH me garante hiperfocos aleatórios; o da vez é ", ["marcenaria"], ", minha namorada diz que sou o Bob Construtor.") },
    { text: bold(["Mais de 18 anos em design. Experiência liderando times de até 15 pessoas."], " ", "Conecto desenvolvimento de pessoas, qualidade de design e resultado. Passei por fintechs, produtos imobiliários e plataformas para creators. Hoje, sigo aprendendo e experimentando com IA.") },
  ],
  navLabel: both("Navegar pelas décadas"),
  dialogueQuestion: both("- Cadê o Gutto?"),
  eras: [
    era("1990", "olhar, memória, repertório", "Eu sou cria dos anos 90,", "daquelas crianças que foram criadas pela TV.", "Meus pais, seu Joel e dona Elian, sempre trabalharam muito e, como bons pais dos anos 90, deixaram minha irmã e eu assistir muita TV. No meio do monte de coisa maluca que passava naquela época, aprendi a observar desde cedo e me apaixonei principalmente pelos comerciais, pelos desenhos e pela mágica da TV.", "PLAY ▷ 1990", "- tá malinando"),
    era("2000", "www, um mundo novo se abriu", "Ah! os anos 2000", "tudo era demorado, mas tudo era novidade", "Internet discada depois da meia-noite, WordArt, downloads intermináveis de músicas de 3mb, sites que assustavam, flogões, tumblrs e os vídeos do Guilherme Zaiden. Assim era a internet para mim nos anos 2000: apesar de tudo, era divertido.", "Conectado ツ 2000", "- tá nos computer"),
    era("2010", "Como diria a Britney, essa foi a minha era Work B**ch!", "Por volta de 2009, comecei", "com o tal do Web Design", "Tudo bem que nesse momento tive um puxão de orelha da minha mãe. Aos 45 do segundo tempo, no finzinho do meu terceiro ano na escola, ela me colocou na parede e perguntou: e aí, o que você vai ser quando crescer? Entre Publicidade & Propaganda e Design Digital, escolhi design e o resto é história.", "Criando ↗ 2010", "- vish, só trabalha"),
    era("2020", "Uma pandemia global quase dizimou a humanidade, mas segui pedalando", "Um período difícil, mas", "eu tô fazendo muita coisa legal", "A marcenaria virou mais um jeito de aprender fazendo. Madeira, computadores e eletrônica: abrir máquinas antigas deu asas pra minha imaginação. No meio disso tudo ainda sobrou tempo pra aprender a liderar gente. Tá sendo uma era maluca.", "DELETE ✕ 2020", "- tá vivendo"),
    era("2030", "Será que a IA vai dominar o mundo e levar nossos empregos?", "Já tive medo do futuro,", "agora quero mesmo é construir", "Aquela criança sonhadora dos anos 90 continua aqui. Aprendendo a usar a IA e descobrindo novas maneiras de dar vida às minhas ideias. Quero levá-la para o meu dia a dia e experimentar o que antes parecia distante. O futuro me anima: tem tanta coisa que eu ainda posso descobrir e colocar em prática.", "", "- Tá indo de volta pro futuro"),
  ],
  magazinesTitle: both("Eu lia muitas revistas, achava divertido descobrir tanta coisa nova"),
  magazinesBody: both("Carro, tecnologia e empreendedorismo estavam presentes desde a infância. Eu prestava atenção nas formas, nos detalhes e nas possibilidades. Encontrava coisas que me faziam pensar muito naquela pergunta: o que você quer ser quando crescer?"),
  magazinesSpoiler: both("Spoiler: eu não cresci, mas usei muito do que aprendi pra minha carreira :)"),
  magazinesLabel: both("Revistas brasileiras que fizeram parte da minha infância"),
  carTitle: joined("Sempre quis saber o que", "tinha dentro das coisas..."),
  carBody: both("Meus carrinhos sofreram nas minhas mãos. A ponto de um dia ganhar um de aniversário e jogar no chão, na frente da convidada, só para descobrir por que aquele carrinho tinha tanta luz piscando."),
  carCaption: both("O carrinho e suas peças, uma memória recriada."),
  carHint: both("Role para explorar ↕"),
  carAlt: both("BMW vermelho visto de lado"),
  carLabel: both("BMW e suas peças, animação controlada pela rolagem"),
  memoriesTitle: { pt: "Em 2000 minhas ideias queriam\nganhar o mundo", en: `${en("Em 2000 minhas ideias queriam")}\n${en("ganhar o mundo")}` },
  memoriesLabel: both("Memórias dos anos 2000 — role para explorar"),
  memories: [
    item("nickname", "E coloquei a arte no corpo com as tatuagens", "Marca Gutto com ilustração"),
    item("blog", "Botei meu blog na rua com HTML mal feito e música de fundo", "Página de um blog dos primeiros anos da internet"),
    item("tuning", "Fiz tuning virtual em vários carros no Photoshop 7", "Carro prata com modificações visuais"),
    item("projector", "Na igreja eu era o garoto do projetor e dos “computers”", "Projetor"),
    item("imac", "Me apaixonei pelo design colorido da Apple 00's", "iMac azul translúcido com teclado e mouse"),
  ],
  orbitLabel: both("As ferramentas também mudaram"),
  orbit: [
    ["flipphone", "Celular flip", "Usei celular de flip..."],
    ["smartphone", "iPhone · 2007", "...e vi o celular virar smartphone."],
    ["monitor", "Computador bege", "Meu computador era bege..."],
    ["imac", "iMac G3", "...ficou colorido..."],
    ["notebook", "MacBook Pro · 2008", "...e depois virou de alumínio."],
    ["tv", "TV de tubo", "Assisti muita TV de tubo..."],
    ["television", "TV de tela plana", "...e vi a tela ficar cada vez mais fina."],
  ].map(([key, label, caption]) => ({ key, label: both(label), caption: both(caption) })),
  galleryTitle: both("E o trabalho foi ganhando espaço na minha vida"),
  galleryLabel: both("Seleção de trabalhos dos primeiros anos de carreira"),
  gallery: [
    ["regatta", "Projeto de site e interfaces móveis para Regatta"],
    ["project11", "Projeto de Tabela Fipe para Webmotors"],
    ["chevrolet", "Projeto digital Chevrolet — GM"],
    ["webmotors", "Projeto de comunicação para Webmotors"],
    ["carclick", "Projeto de site CarClick"],
    ["philco", "Hotsite do Philco Slimbook"],
    ["webProject6", "Projeto de site em tablet e celular"],
    ["project7", "Interface de produto digital"],
    ["project8", "Projeto de site em um notebook"],
    ["project10", "Projeto de interface em azul e verde"],
    ["project9", "Projeto de um construtor de sites"],
  ].map(([image, alt]) => ({ image, alt: both(alt) })),
  pizzaTitle: both("Eu comi muita pizza virando a noite nas agências digitais!"),
  pizzaAlt: both("Uma pizza para acompanhar as noites nas agências"),
  museumTitle: both("Na faculdade modernizamos um dos museus mais importantes de São Paulo"),
  museumBody: both("Foram várias idas e vindas, mudanças de grupo e noites mal dormidas. Mas consegui encontrar um grupo de TCC e nós conseguimos criar um projeto referência de modernização para o Museu do Ipiranga."),
  museumAlt: both("Fachada do Museu do Ipiranga"),
  hobbiesTitle: both("Ficar trancado em casa me fez aprender várias coisas novas"),
  hobbiesLabel: both("Memórias de 2020 — role para explorar"),
  hobbies: [
    item("key", "Segurei meus pais", "Uma chave antiga"),
    item("apartment", "Fui morar sozinho", "O prédio do meu apartamento"),
    item("alexa", "Automatizei a casa", "Uma assistente Alexa"),
    item("bread", "Aprendi a fazer pão", "Pão caseiro fatiado"),
    item("weights", "Treinei em casa", "Halteres para treinar em casa"),
    item("woodwork", "Descobri marcenaria", "Ferramentas de marcenaria"),
    item("dance", "Aprendi a dançar", "Uma aula de dança"),
    item("meet", "Fiz muitas calls...", "Ilustração de uma chamada no Google Meet"),
  ],
  leadershipTitle: both("Foi nessa era, no meio das várias reuniões online, que a liderança de design apareceu na minha carreira"),
  chatLabel: both("Uma conversa no PicPay"),
  chat: [
    ["Meu gestor:", "O que você quer aqui na empresa?"],
    ["", "Pô, eu quero me testar na liderança de design"],
    ["Meu gestor:", "Isso é bacana, vamos trabalhar isso como se você estivesse aprendendo a andar de bike. Aos pouquinhos..."],
    ["", "Andar de bike, como assim?"],
    ["Meu gestor:", "Pode deixar que no caminho eu te explico, só continua pedalando"],
  ].map(([speaker, text]) => ({ speaker: speaker ? both(speaker) : both("", ""), text: both(text) })),
  principlesTitle: both("E nas pedaladas fui construindo meu jeito de liderar"),
  principlesBody: both("Pedalando nessa bike, percebi rápido que com gente eu ouço e construo junto, porque, se eu tento controlar, dá ruim. Foi errando, ouvindo e ajustando a rota a cada pedalada que cheguei nesses combinados que guiam meu jeito de liderar até hoje."),
  principles: [
    ["Trato adultos como adultos", "Cada designer é responsável pelo próprio tempo, por suas entregas e pelas conversas que precisa ter. Não preciso gerenciar pelo time."],
    ["Designer é par na construção", "Produto, negócio e tecnologia são pares dos designers. Procuro fortalecer isso nos meus times. Designers precisam de olhar holístico."],
    ["Autonomia com responsabilidade", "Tenho confiança no que o time é capaz. Com isso vem a expectativa de que o time saiba quando pedir ajuda. E que conte comigo quando precisar."],
    ["O líder não é o centro do time", "Meu time não é minha extensão. Cada pessoa tem voz, perspectiva e talento próprio. Meu papel é abrir espaço pra isso aparecer."],
    ["Eu sirvo para desbloquear", "Trabalho para que o time não precise de mim o tempo todo. Mas quando precisar, estarei disponível pra somar e fazer junto."],
    ["Transparência pra que o time apareça", "Quero que cada pessoa do time se destaque. Meu sucesso acontece quando o time aparece."],
  ].map(([title, body]) => ({ title: both(title), body: both(body) })),
  lifeTitle: both("Não está sendo uma era fácil, mas o caminho tá sendo interessante"),
  lifeBody: both("Tem sido um período de muito aprendizado. Descobrindo como usar o repertório, as vivências, memórias e aprendizados como parte de quem eu sou, para construir o Gutto 30+. Isso vale para o design e para todas as outras áreas da vida. Essa era me fez aprender que não dá para separar o meu pessoal do profissional. A jornada é longa, mas dá para parar e aproveitar o que a vida reserva pelo caminho, enquanto o futuro bate à porta."),
  bikeLabel: both("Bicicleta em movimento, um passo de cada vez"),
  mountainAlt: both("Uma montanha nevada: a vista compensa o esforço"),
  works: [
    { company: "SulAmérica", role: "Design Manager", date: both("Setembro de 2025 — Atual"), href: "/curriculo", title: both("Design em uma empresa de 130 anos"), metrics: [{ value: both("400%"), label: both("De aumento no time das minhas frentes") }, { value: both("Primeiro"), label: both("Designer promovido nos últimos anos") }] },
    { company: "Creator Ads", role: "Head of Design", date: both("Maio de 2023 — Julho de 2024"), href: "/cases/brandlovers", title: both("Creators ganhando mais dinheiro"), metrics: [{ value: both("+99%"), label: both("Creators ganhando na plataforma") }, { value: both("+48%"), label: both("Participação em novas campanhas") }] },
    { company: "Loft", role: "Design Manager", date: both("Março de 2022 — Março de 2023"), href: "/cases/loft-design", title: both("Liderança que aparece nos números"), metrics: [{ value: both("4 designers"), label: both("Reconhecidos e promovidos") }, { value: both("+452%"), label: both("Crescimento em buscas no app") }] },
  ],
  resumeNote: both("Ah! Além dos trabalhos de liderança, estou no design desde 2009."),
  resumeLink: both("Veja todas as experiências no meu currículo."),
  visionLabel: both("Uma viagem para o futuro — role para explorar"),
  visionQuestion: both("O que você quer fazer hoje?"),
  visionResponse: both("Vamos para o futuro"),
  visionRestart: both("Reiniciar"),
};

// The shared parts kept their texts in lib/i18n/metadata.ts, PrimaryNav and the 404 page until now.
const seo = {
  home: ["Gutto Rocha — Design para pessoas", "Designer com mais de 18 anos de experiência. Produtos que funcionam, impacto para negócios."],
  sobre: ["Sobre — O mundo muda. Eu continuo curioso.", "Designer brasileiro com mais de 18 anos de experiência. Liderança de design em produtos digitais."],
  cases: ["Cases — trabalhos selecionados · Gutto Rocha", "Cases de design de produto e liderança de design em Creator Ads, PicPay, Loft, Banco PAN, Webmotors e Plenno: o problema, o processo e os resultados de cada projeto."],
  curriculo: ["Currículo — Gutto Rocha", "Resumo profissional, experiência, formação e habilidades — Gutto Rocha."],
  contato: ["Contato — Gutto Rocha", "Entre em contato por e-mail, telefone ou redes sociais. Guarulhos, SP, Brasil."],
};
const site: PageValues = {
  nav: [
    ["/", "Ir para o início", "Início"],
    ["/sobre", "Descubra minha história", "História"],
    ["/cases", "Meus Cases", "Cases"],
    ["/contato", "Fale comigo", "Fale"],
  ].map(([href, label, short]) => ({ href, label: both(label), short: both(short) })),
  notFoundKicker: both("Erro 404 · modo caça-fantasmas"),
  notFoundTitle: both("Esta página atravessou um portal e não voltou."),
  notFoundBody: both("Não precisa ligar para Nova York: aqui não tem fantasma, só uma URL que não existe."),
  notFoundButton: both("Voltar ao início"),
  notFoundAlt: both("Ilustração estilo Stay Puft — nada de fantasmas nesta rota"),
  ...Object.fromEntries(Object.entries(seo).flatMap(([page, [title, description]]) => [[`${page}Title`, both(title)], [`${page}Description`, both(description)]])),
  personDescription: both("Designer com mais de 18 anos de experiência. Resolvo problemas. Com design e com quem faz acontecer."),
};

export const PAGE_DEFAULTS: Record<string, PageValues> = { home, cases, sobre, contato, curriculo, rodape, site };
