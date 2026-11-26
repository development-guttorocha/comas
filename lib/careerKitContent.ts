/**
 * Author-original content for "Trilha de carreira em design".
 * Built around network progression (never a rigid Y-ladder), 4 journey moments in a role,
 * 3 competency axes across 7 roles, and 10 practical design skills in natural Portuguese.
 */

export const ROLE_IDS = [
  "junior",
  "pleno",
  "senior",
  "staff",
  "lead",
  "manager",
  "head",
] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export type CareerRole = {
  id: RoleId;
  name: string;
  marketTitle?: string;
  scope: string;
  summary: string;
  nextPaths: Array<{ roleId: RoleId; why: string }>;
};

export const CAREER_ROLES: CareerRole[] = [
  {
    id: "junior",
    name: "Júnior",
    scope: "Uma tarefa",
    summary: "Executa fluxos e telas em cima de problemas já recortados, aprendendo o ritmo de produto e time.",
    nextPaths: [
      { roleId: "pleno", why: "Ganhar autonomia para resolver uma funcionalidade do começo ao fim, sem tutela constante." },
    ],
  },
  {
    id: "pleno",
    name: "Pleno",
    scope: "Uma funcionalidade",
    summary: "Conduz funcionalidades completas com autonomia, conecta decisão a métrica e debate com produto e engenharia.",
    nextPaths: [
      { roleId: "senior", why: "Lidar com problemas ambíguos, responder por uma frente inteira e elevar o padrão do time." },
    ],
  },
  {
    id: "senior",
    name: "Sênior",
    scope: "Uma frente do produto",
    summary: "Define qual problema atacar antes de desenhar, resolve ambiguidades e desenvolve designers próximos.",
    nextPaths: [
      { roleId: "staff", why: "Aprofundar o ofício e criar padrões, arquitetura e métodos adotados por vários times." },
      { roleId: "lead", why: "Cuidar do crescimento e dos rituais de um time de designers, seguindo perto das entregas." },
      { roleId: "manager", why: "Migrar para gestão formal de pessoas, contratação e estratégia de múltiplos times." },
    ],
  },
  {
    id: "staff",
    name: "Especialista",
    marketTitle: "Staff / Principal",
    scope: "Vários times",
    summary: "Referência técnica da área. Resolve problemas transversais de alta complexidade e molda padrões sem gestão direta.",
    nextPaths: [
      { roleId: "lead", why: "Experimentar liderança direta de pessoas mantendo atuação técnica próxima do time." },
      { roleId: "head", why: "Responder pela estratégia de design da companhia inteira na liderança executiva." },
    ],
  },
  {
    id: "lead",
    name: "Líder de Design",
    marketTitle: "Design Lead",
    scope: "Um time de designers",
    summary: "Une direção de produto e cuidado com pessoas. Faz 1:1, calibra entregas e protege o foco do time.",
    nextPaths: [
      { roleId: "manager", why: "Escalar a gestão para múltiplos times e desenvolver outras lideranças." },
      { roleId: "staff", why: "Voltar ao ofício em profundidade para liderar por técnica e influência, sem gestão direta." },
    ],
  },
  {
    id: "manager",
    name: "Gerente de Design",
    marketTitle: "Design Manager",
    scope: "Vários times",
    summary: "Constrói organização, desenvolve líderes e designers, contrata e conecta design aos objetivos do negócio.",
    nextPaths: [
      { roleId: "head", why: "Definir a visão, a cultura e o orçamento de design na mesa executiva." },
      { roleId: "staff", why: "Retornar para contribuição individual sênior em problemas críticos da empresa." },
    ],
  },
  {
    id: "head",
    name: "Direção de Design",
    marketTitle: "Head de Design",
    scope: "A empresa",
    summary: "Traduz estratégia de negócio em direção de experiência, forma lideranças e responde pela reputação da área.",
    nextPaths: [
      { roleId: "head", why: "Ampliar o peso do design nas apostas da empresa, formar sucessores e influenciar fora dela." },
    ],
  },
];

export const MOMENT_IDS = ["onboarding", "performing", "mastering", "transitioning"] as const;
export type MomentId = (typeof MOMENT_IDS)[number];

export type JourneyMoment = {
  id: MomentId;
  name: string;
  tagline: string;
  summary: string;
  signals: [string, string, string];
  howToAct: [string, string, string];
  commonTrap: string;
  oneOnOneQuestion: string;
  consultingNudge: string;
};

export const JOURNEY_MOMENTS: JourneyMoment[] = [
  {
    id: "onboarding",
    name: "Chegada",
    tagline: "Lendo o terreno da cadeira atual",
    summary: "Você acabou de assumir o papel ou o escopo atual. Antes de querer mostrar tudo, o foco é ler o contexto e alinhar o que significa entregar bem aqui.",
    signals: [
      "Ainda gasta energia entendendo regras de negócio, rituais e quem decide o quê.",
      "Depende mais de contexto da liderança ou de pares antigos para fechar soluções.",
      "Está construindo confiança nas primeiras entregas da cadeira.",
    ],
    howToAct: [
      "Mapeie com sua liderança o que define sucesso nos primeiros 90 dias.",
      "Compartilhe trabalho inacabado cedo para calibrar expectativa antes da passagem para engenharia.",
      "Anote dúvidas recorrentes sobre o produto e o usuário: elas viram repertório rápido.",
    ],
    commonTrap: "Querer provar valor mudando processos ou redesenhando fluxos grandes antes de entender por que funcionam assim hoje.",
    oneOnOneQuestion: "O que preciso acertar com consistência neste primeiro ciclo para você sentir que a minha base nesta cadeira está sólida?",
    consultingNudge: "Mudou de empresa ou de cargo e quer encurtar os primeiros 90 dias sem tropeçar no novo contexto?",
  },
  {
    id: "performing",
    name: "Consistência",
    tagline: "Entregando com previsibilidade na posição atual",
    summary: "Você já opera o papel com previsibilidade. O trabalho aqui é transformar boas entregas pontuais em confiança contínua para o time.",
    signals: [
      "Consegue resolver o escopo combinado no prazo sem precisar de resgate no fim.",
      "Recebe retorno pontual de ajuste, não sobre falhas básicas de processo.",
      "Equilibra bem descoberta, desenho e acompanhamento até produção.",
    ],
    howToAct: [
      "Torne seu raciocínio visível em revisões de design e documentações, não apenas as telas finais.",
      "Meça o que foi para o ar depois do lançamento em vez de virar a página após a entrega.",
      "Comece a registrar suas entregas e retornos recebidos toda quinzena enquanto a memória está fresca.",
    ],
    commonTrap: "Achar que entregar bem o próprio papel durante 6 meses já equivale a operar o papel seguinte.",
    oneOnOneQuestion: "Onde você vê mais constância no meu trabalho hoje, e qual comportamento ainda oscila quando o prazo aperta?",
    consultingNudge: "Quer acelerar a passagem de consistência para impacto visível sem cair em esgotamento por excesso de trabalho?",
  },
  {
    id: "mastering",
    name: "Domínio",
    tagline: "Operando com folga e ampliando o raio de ação",
    summary: "O que a cadeira exige já sai com segurança. Sobra fôlego para puxar problemas mais abertos, destravar colegas e assumir desafios além do quadrado inicial.",
    signals: [
      "Resolve no cotidiano problemas que antes exigiam ajuda de alguém mais experiente.",
      "Pares de produto, engenharia e outros designers já te procuram como referência.",
      "Começa a sentir teto no escopo atual ou repete soluções já dominadas.",
    ],
    howToAct: [
      "Combine explicitamente um projeto de teste com escopo da próxima posição que você mira.",
      "Documente impacto em métricas de usuário e negócio para tirar a conversa do achismo.",
      "Passe a multiplicar seu critério por meio de mentoria, revisões de design e padrões do time.",
    ],
    commonTrap: "Assumir trabalho acima da cadeira no silêncio, esperar que percebam sozinhos e acumular frustração na avaliação.",
    oneOnOneQuestion: "Quais entregas concretas nos próximos 3 a 6 meses provariam que já opero de forma consistente no próximo papel?",
    consultingNudge: "Está em fase de domínio faz meses e a conversa sobre reconhecimento não sai do lugar?",
  },
  {
    id: "transitioning",
    name: "Transição",
    tagline: "Pronto para virar de papel ou ciclo",
    summary: "Você já reúne evidências recorrentes acima da cadeira, ou decidiu mover na rede para outra especialidade ou empresa. Hora de formalizar ou decidir.",
    signals: [
      "Tem casos fechados que sustentam sua atuação no próximo nível ou em outra área.",
      "Já está sendo cobrado por responsabilidades de um papel diferente do seu título.",
      "Precisa escolher entre disputar movimento interno com prazo ou buscar uma nova empresa.",
    ],
    howToAct: [
      "Monte um pedido de reconhecimento objetivo de 1 página com números, entregas e visão de pares.",
      "Leve para o 1:1 com pedido claro de retorno e data marcada, sem indiretas.",
      "Se o ciclo na empresa fechou, alinhe portfólio e narrativa para vagas no papel certo.",
    ],
    commonTrap: "Aceitar promessas vagas sem data nem critério objetivo, ou topar gestão por falta de perspectiva como especialista.",
    oneOnOneQuestion: "Dado o histórico que construí aqui, existe espaço e orçamento para essa movimentação acontecer nos próximos meses?",
    consultingNudge: "Precisa montar seu pedido de promoção, decidir entre gestão e especialista ou preparar a virada para fora?",
  },
];

export type CompetencyDimension = {
  id: string;
  name: string;
  question: string;
  levels: Record<RoleId, string>;
};

export type CompetencyAxis = {
  id: "execucao" | "comportamento" | "negocio";
  title: string;
  subtitle: string;
  dimensions: CompetencyDimension[];
};

export const COMPETENCY_AXES: CompetencyAxis[] = [
  {
    id: "execucao",
    title: "1. Execução e ofício",
    subtitle: "Como você investiga o problema, explora caminhos e garante qualidade real em produção.",
    dimensions: [
      {
        id: "descoberta",
        name: "Descoberta e contexto",
        question: "Como levanta evidências antes de ir para a tela?",
        levels: {
          junior: "Apoia entrevistas e lê dados já organizados para entender quem usa a tarefa.",
          pleno: "Planeja e conduz testes e pesquisas leves para validar hipóteses da funcionalidade.",
          senior: "Define perguntas de pesquisa para temas abertos e cruza dados qualitativos e quantitativos antes do escopo.",
          staff: "Estrutura práticas de descoberta usadas por vários times e evita projetos construídos em achismo.",
          lead: "Garante que o time não pule etapas de descoberta mesmo sob pressão de entrega.",
          manager: "Alinha pesquisa, dados e design para orientar apostas de produto em vários times.",
          head: "Institui a escuta de cliente e dados como critério obrigatório das decisões da empresa.",
        },
      },
      {
        id: "exploracao",
        name: "Exploração e ofício",
        question: "Qual é o nível das soluções, fluxos e sistema de design no trabalho?",
        levels: {
          junior: "Monta telas e estados principais usando corretamente o sistema de design existente.",
          pleno: "Explora alternativas de fluxo e cobre bordas, estados de erro e acessibilidade básica.",
          senior: "Eleva a barra visual e de interação do time e contribui com a evolução do sistema de design.",
          staff: "Cria padrões, arquiteturas e princípios de interação adotados por múltiplos times.",
          lead: "Mantém a consistência visual e de fluxo do grupo com revisões frequentes de design e exemplo técnico.",
          manager: "Define o padrão de qualidade entre times e estrutura rituais de revisão que sustentam a barra.",
          head: "Estabelece o que significa excelência de design na companhia e posiciona a marca pelo produto.",
        },
      },
      {
        id: "entrega",
        name: "Entrega e parceria",
        question: "Como acompanha o desenvolvimento até chegar nas mãos do usuário?",
        levels: {
          junior: "Documenta telas para engenharia e responde dúvidas do que desenhou.",
          pleno: "Passa especificações claras, faz revisão antes de publicar e negocia ajustes simples com engenharia sem perder intenção.",
          senior: "Desenha junto de tecnologia desde cedo e garante fidelidade e medição após o lançamento.",
          staff: "Resolve gargalos técnicos entre sistema de design, programação de interface e arquitetura de múltiplos times.",
          lead: "Cria cadência saudável entre design, produto e engenharia e destrava dependências de entrega.",
          manager: "Remove atritos operacionais do dia a dia e assegura velocidade sem sacrificar qualidade.",
          head: "Garante fluidez entre design, produto e engenharia na cadência executiva da empresa.",
        },
      },
      {
        id: "complexidade",
        name: "Complexidade do problema",
        question: "De que tamanho e clareza são os desafios que você resolve?",
        levels: {
          junior: "Resolve problemas bem delimitados dentro de uma jornada já existente.",
          pleno: "Conduz funcionalidades completas com poucas variáveis desconhecidas e restrições claras.",
          senior: "Encara fluxos críticos, jornadas conectadas e cenários sem resposta óbvia no começo.",
          staff: "Ataca problemas sistêmicos que atravessam produtos, áreas e plataformas inteiras.",
          lead: "Ajuda o time a fatiar problemas complexos em entregas viáveis sem perder a visão final.",
          manager: "Distribui desafios certos para a maturidade de cada pessoa e garante cobertura nos temas críticos.",
          head: "Enxerga e enquadra os maiores riscos e oportunidades da companhia pelo olhar da experiência.",
        },
      },
    ],
  },
  {
    id: "comportamento",
    title: "2. Comportamento e influência",
    subtitle: "Como você se organiza, comunica escolhas, recebe retorno e multiplica pessoas ao redor.",
    dimensions: [
      {
        id: "autonomia",
        name: "Autonomia e planejamento",
        question: "Quanta direção precisa para organizar e cumprir seu trabalho?",
        levels: {
          junior: "Organiza tarefas da semana com acompanhamento próximo e avisa cedo quando trava.",
          pleno: "Gerencia o próprio cronograma dentro do ciclo e antecipa riscos para produto e liderança.",
          senior: "Planeja ciclos inteiros de descoberta e entrega na sua frente e trabalha sem microgestão.",
          staff: "Opera com agenda própria de alto impacto e antecipa problemas que ainda não entraram no radar.",
          lead: "Organiza prioridades de design de um time e mantém previsibilidade nas entregas.",
          manager: "Planeja capacidade, contratações e estrutura de times em ciclos trimestrais e anuais.",
          head: "Define governança, planejamento anual e modelo de operação de toda a área de design.",
        },
      },
      {
        id: "colaboracao",
        name: "Colaboração e comunicação",
        question: "Como apresenta escolhas, concessões e constrói acordos com o time?",
        levels: {
          junior: "Explica suas telas, ouve retorno sem defensiva e documenta decisões simples.",
          pleno: "Trabalha de igual para igual com produto e engenharia, defendendo escolhas com argumentos de usuário.",
          senior: "Facilita alinhamentos difíceis entre áreas e traduz design em conversa clara para liderança.",
          staff: "Alinha múltiplos times em torno de uma direção técnica sem depender de autoridade formal.",
          lead: "Cria espaço seguro para debate honesto no time e comunica contexto executivo com clareza.",
          manager: "Constrói parcerias maduras com lideranças de produto, engenharia e áreas parceiras.",
          head: "Representa design entre diretoria e conselho e constrói alianças estratégicas no negócio.",
        },
      },
      {
        id: "crescimento",
        name: "Crescimento e adaptabilidade",
        question: "Como reage a erros, retorno crítico e mudanças de cenário?",
        levels: {
          junior: "Busca aprender rápido, aplica retornos no trabalho seguinte e pede revisão sem medo.",
          pleno: "Reconhece lacunas próprias, adapta o ritmo quando o contexto muda e compartilha aprendizados.",
          senior: "Mantém estabilidade sob ambiguidade e transforma erro de projeto em melhoria de processo.",
          staff: "Puxa reflexão crítica na comunidade de design sobre novas tecnologias e métodos.",
          lead: "Acolhe mudanças de negócio com transparência para o time e ajuda colegas a atravessar incertezas.",
          manager: "Reorganiza escopos e pessoas com serenidade quando a estratégia da companhia vira.",
          head: "Lidera a área em momentos de virada mantendo cultura forte, confiança e retenção.",
        },
      },
      {
        id: "lideranca",
        name: "Mentoria e liderança",
        question: "Qual é a sua influência no crescimento das outras pessoas?",
        levels: {
          junior: "Cuida da própria evolução e apoia o time documentando bem o que descobre.",
          pleno: "Ajuda na integração de quem chega e troca referências práticas com pares.",
          senior: "Mentora juniores e plenos no dia a dia e lidera iniciativas técnicas sem cargo de gestão.",
          staff: "Desenvolve seniores, forma opinião na área e eleva a barra técnica sem gestão direta.",
          lead: "Conduz 1:1s recorrentes, dá retorno direto, acompanha planos individuais e cuida do foco do time.",
          manager: "Desenvolve líderes e seniores, contrata com critério e cria planos claros de crescimento.",
          head: "Desenha a cultura, a trilha de carreira e a formação da próxima geração de líderes.",
        },
      },
    ],
  },
  {
    id: "negocio",
    title: "3. Produto, negócio e impacto",
    subtitle: "O quanto suas decisões movem a vida real do cliente e os resultados que mantêm a empresa de pé.",
    dimensions: [
      {
        id: "cliente_produto",
        name: "Visão de cliente e produto",
        question: "Quanto domina quem usa o produto, os concorrentes e as métricas?",
        levels: {
          junior: "Conhece o objetivo da tarefa atual e o perfil de quem vai usá-la.",
          pleno: "Entende a jornada do seu fluxo, acompanha métricas centrais e questiona pedidos sem sentido.",
          senior: "Domina o domínio do produto, referências de mercado e dores principais do cliente.",
          staff: "Conecta oportunidades entre linhas de produto e antecipa movimentos que afetam o ecossistema.",
          lead: "Mantém o time conectado às métricas do negócio e à escuta recorrente do cliente.",
          manager: "Traduz metas de receita, retenção e custo em foco claro para múltiplos times.",
          head: "Usa leitura profunda do cliente para influenciar modelo de negócio e novas apostas.",
        },
      },
      {
        id: "estrategia",
        name: "Estratégia e priorização",
        question: "Você executa pedidos prontos ou ajuda a escolher o que construir?",
        levels: {
          junior: "Entende as prioridades recebidas e entrega dentro do recorte combinado.",
          pleno: "Sugere simplificações de escopo para testar mais rápido e evitar desperdício.",
          senior: "Participa da definição do plano de produto com produto e engenharia e propõe o que atacar primeiro.",
          staff: "Redesenha iniciativas inteiras mostrando, com evidência, um caminho mais inteligente.",
          lead: "Negocia escopo e prazo da liderança próxima e ajuda a cortar o que não traz valor real.",
          manager: "Influencia o plano trimestral da área e aloca energia de design onde há maior retorno.",
          head: "Constrói a estratégia anual junto à diretoria e decide onde o time deve investir energia.",
        },
      },
      {
        id: "criterios",
        name: "Critérios de experiência",
        question: "Como define o que é bom o bastante antes e depois do lançamento?",
        levels: {
          junior: "Usa listas simples de verificação e critérios de usabilidade para revisar a própria entrega.",
          pleno: "Define métricas de usabilidade da funcionalidade e valida pontos de atrito reais.",
          senior: "Estabelece princípios claros da jornada e sustenta o que não é negociável na experiência.",
          staff: "Cria métricas e critérios mínimos de qualidade adotados em toda a plataforma.",
          lead: "Define os acordos de qualidade do grupo para ninguém abrir mão do básico na correria.",
          manager: "Institui indicadores de qualidade percebida lado a lado com indicadores de negócio.",
          head: "Faz a qualidade da experiência entrar nos objetivos oficiais da companhia.",
        },
      },
      {
        id: "impacto",
        name: "Raio de impacto",
        question: "Até onde os efeitos do seu trabalho chegam?",
        levels: {
          junior: "As tarefas que executa no time, com revisão próxima.",
          pleno: "Uma funcionalidade inteira entregue e acompanhada em produção.",
          senior: "Uma frente relevante do produto e a qualidade das entregas de designers próximos.",
          staff: "A forma como vários times constroem produto e a coerência da plataforma inteira.",
          lead: "O desempenho, a entrega e a saúde de um time inteiro de designers.",
          manager: "Vários times, os líderes que forma e a força de atração e retenção da área.",
          head: "Os resultados da empresa e a percepção do design dentro e fora dela.",
        },
      },
    ],
  },
];

export type CompetencyStatus = "not_yet" | "inconsistent" | "consistent" | "exceeds";

export const COMPETENCY_STATUS_OPTIONS: Array<{
  id: CompetencyStatus;
  label: string;
  short: string;
}> = [
  { id: "not_yet", label: "Ainda não faço", short: "Ainda não" },
  { id: "inconsistent", label: "Faço com oscilação", short: "Oscilo" },
  { id: "consistent", label: "Faço com consistência", short: "Consistente" },
  { id: "exceeds", label: "Já opero o papel alvo", short: "Já no alvo" },
];

export type SkillLevel = {
  value: number;
  label: string;
  description: string;
};

export const SKILL_SCALE: SkillLevel[] = [
  { value: 1, label: "Em desenvolvimento", description: "Conhece o conceito, mas precisa de apoio próximo para aplicar." },
  { value: 2, label: "Em construção", description: "Já executa com roteiro claro, mas oscila quando o cenário muda." },
  { value: 3, label: "Consistente", description: "Entrega com autonomia e boa qualidade no dia a dia da cadeira." },
  { value: 4, label: "Domínio", description: "Adapta para contextos complexos e já ajuda outras pessoas." },
  { value: 5, label: "Referência", description: "Eleva o padrão do time inteiro e influencia outras áreas." },
];

export type CareerSkill = {
  id: string;
  label: string;
  hint: string;
};

export const CAREER_SKILLS: CareerSkill[] = [
  {
    id: "pesquisa-quali",
    label: "Pesquisa qualitativa",
    hint: "Entrevistas, testes de usabilidade e leitura honesta do que aparece.",
  },
  {
    id: "dados-quanti",
    label: "Dados e métricas",
    hint: "Ler funil, interpretar conversão e medir impacto depois do ar.",
  },
  {
    id: "visual-ui",
    label: "Design visual e hierarquia",
    hint: "Clareza tipográfica, contraste, ritmo de tela e acabamento.",
  },
  {
    id: "interacao-fluxos",
    label: "Design de interação e fluxos",
    hint: "Pensar caminhos, resposta de estado, erro e fluidez sem atrito.",
  },
  {
    id: "conteudo-ux-writing",
    label: "Escrita de interface e conteúdo",
    hint: "Clareza de texto na tela para a pessoa entender sem manual.",
  },
  {
    id: "arquitetura-ia",
    label: "Arquitetura de informação",
    hint: "Organizar navegação, fluxos e termos de forma lógica e previsível.",
  },
  {
    id: "design-system",
    label: "Uso e evolução de sistema de design",
    hint: "Usar padrões sem engessar e saber quando propor novos componentes.",
  },
  {
    id: "negocio-produto",
    label: "Visão de negócio e produto",
    hint: "Conectar escolhas de experiência ao modelo de receita, custo e meta.",
  },
  {
    id: "criterios-experiencia",
    label: "Critérios de qualidade e entrega",
    hint: "Sustentar acessibilidade, bordas e revisão perto da engenharia.",
  },
  {
    id: "influencia-narrativa",
    label: "Narrativa e influência no 1:1",
    hint: "Apresentar escolhas, concessões e defender o raciocínio para produto e liderança.",
  },
];

export function formatRoleLabel(role: CareerRole): string {
  return role.marketTitle ? `${role.name} (${role.marketTitle})` : role.name;
}

export function getRoleById(id: string): CareerRole {
  return CAREER_ROLES.find(r => r.id === id) ?? CAREER_ROLES[1]!;
}

export function getMomentById(id: string): JourneyMoment | null {
  return JOURNEY_MOMENTS.find(m => m.id === id) ?? null;
}
