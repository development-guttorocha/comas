/**
 * Terms of use, legal disclaimer, and privacy summary for guttorocha.com — written in clear,
 * direct Portuguese with specific protection around the salary tools, CLT x PJ calculator,
 * anonymous salary survey, LGPD compliance, and portfolio intellectual property.
 */

export type TermsSection = {
  id: string;
  number: string;
  title: string;
  paragraphs: string[];
};

export const termsOfUse = {
  seoTitle: "Termos de uso e aviso legal | Gutto Rocha",
  seoDescription:
    "Condições de uso do site guttorocha.com, caráter informativo das ferramentas de salário e CLT x PJ, privacidade da pesquisa salarial anônima, LGPD e isenção de responsabilidade.",
  kicker: "Aviso legal · atualizado em novembro de 2026",
  title: "Termos de uso",
  continuation: "e responsabilidade.",
  intro:
    "Este site reúne o portfólio profissional, artigos, serviços para empresas e ferramentas gratuitas para designers. Ao navegar por estas páginas, usar as calculadoras ou enviar respostas na pesquisa salarial, você concorda com as regras abaixo.",
  summaryTitle: "Em resumo",
  summary: [
    "As ferramentas de salário, a calculadora CLT × PJ e os artigos têm caráter exclusivamente informativo e educacional.",
    "Nenhum número ou cálculo substitui contador, advogado trabalhista, acordo sindical ou proposta formal de contratação.",
    "Decisões de carreira, negociações salariais, troca de emprego ou escolha entre CLT e CNPJ são feitas por sua conta e risco.",
    "A pesquisa salarial é anônima e voluntária: quando você deixa e-mail para receber os resultados, ele fica isolado da resposta.",
  ],
  sections: [
    {
      id: "carater-informativo",
      number: "01",
      title: "Caráter informativo e educacional",
      paragraphs: [
        "Todo o conteúdo publicado em guttorocha.com — incluindo estudos de caso, artigos, trilhas de carreira, faixas salariais, calculadoras e respostas públicas — tem finalidade exclusivamente informativa, editorial e educacional.",
        "Nenhuma informação disponível neste site constitui recomendação vinculante, promessa de resultado ou consultoria profissional de natureza jurídica, trabalhista, tributária, fiscal, contábil, financeira ou de recursos humanos.",
      ],
    },
    {
      id: "ferramentas-de-salario",
      number: "02",
      title: "Ferramentas de salário e calculadora CLT × PJ",
      paragraphs: [
        "As faixas apresentadas em Salário em Design partem de referências públicas de mercado e da experiência prática do autor em consultoria, sendo calibradas progressivamente de forma estatística com respostas agregadas da pesquisa salarial após moderação técnica. Elas refletem aproximações gerais e podem não retratar a realidade específica de uma empresa, cidade, setor ou momento econômico.",
        "A calculadora CLT × PJ aplica premissas simplificadas — como 13º salário, adicional de um terço de férias, FGTS e estimativas médias de impostos e contador — apenas para apoiar comparações didáticas. O cálculo não contempla regras individuais de enquadramento tributário (Fator R, pró-labore, alíquotas efetivas do Simples Nacional, Lucro Presumido, INSS, IRPF), benefícios flexíveis, bônus variáveis, convenções coletivas ou particularidades contratuais.",
        "Isenção de responsabilidade: ao utilizar qualquer ferramenta ou referência numérica deste site, você declara compreender que toda decisão tomada a partir desses dados — incluindo pedidos de aumento, negociações salariais, aceitação ou recusa de ofertas, abertura ou encerramento de CNPJ, mudança de regime de contratação, pedidos de desligamento ou demandas trabalhistas — é de sua exclusiva responsabilidade. Gutto Rocha não responde, em nenhuma hipótese, por perdas financeiras, lucros cessantes, passivos fiscais, encargos trabalhistas ou quaisquer danos diretos ou indiretos decorrentes do uso, interpretação ou indisponibilidade dessas informações.",
      ],
    },
    {
      id: "pesquisa-salarial",
      number: "03",
      title: "Pesquisa salarial anônima",
      paragraphs: [
        "A participação na pesquisa salarial é inteiramente voluntária e baseada em valores autodeclarados pelos participantes. Embora as entradas passem por filtros contra envios automatizados e moderação manual para remover distorções evidentes, não há auditoria documental (como conferência de holerites, notas fiscais ou contratos). Por isso, não garantimos exatidão absoluta das declarações recebidas.",
        "Anonimato por desenho: o formulário não solicita nome, CPF, CNPJ ou nome da empresa; grava apenas a data da resposta (dia, mês e ano, sem horário); e, quando você opta por informar um e-mail para receber os resultados, o endereço é salvo em tabela separada e sem vínculo técnico com a resposta enviada. Nos recortes públicos, só entram grupos com pelo menos 5 respostas.",
        "Autorização de uso dos dados agregados: ao enviar sua resposta na pesquisa salarial, você concede licença gratuita, irrevogável, não exclusiva e por prazo indeterminado para que Gutto Rocha armazene, processe, combine e publique os dados anônimos e agregados em relatórios, ferramentas do site, artigos, palestras, mentorias e materiais educacionais.",
      ],
    },
    {
      id: "privacidade-lgpd",
      number: "04",
      title: "Privacidade e proteção de dados (LGPD)",
      paragraphs: [
        "Nos formulários de contato, solicitação de orçamento, consultoria de carreira ou envio voluntário de e-mail na pesquisa salarial, tratamos apenas os dados pessoais que você fornece diretamente (como nome, endereço de e-mail, empresa e mensagem), com a finalidade exclusiva de responder à sua solicitação ou enviar os resultados e materiais pedidos.",
        "O site utiliza métricas agregadas de audiência e desempenho por meio da plataforma Vercel Analytics, sem comercialização, aluguel ou compartilhamento de dados pessoais com terceiros para fins publicitários.",
        "Em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018), você pode solicitar a confirmação de tratamento, correção ou exclusão de seus dados pessoais identificáveis (como seu endereço de e-mail cadastrado em contato ou para recebimento dos resultados da pesquisa) a qualquer momento por meio da página Fale comigo (/fale-comigo).",
      ],
    },
    {
      id: "servicos-e-terceiros",
      number: "05",
      title: "Serviços contratados e links externos",
      paragraphs: [
        "Projetos de consultoria de carreira para designers e serviços prestados para empresas (como liderança fracionada, design systems e workshops) são regidos exclusivamente por proposta comercial e contrato específicos celebrados entre as partes, sem vínculo com os resultados automáticos das ferramentas gratuitas.",
        "Páginas deste site podem conter links para plataformas de terceiros, como LinkedIn, Calendly, Figma, GitHub ou fontes externas de referência. Não controlamos nem nos responsabilizamos pelo conteúdo, disponibilidade ou políticas de privacidade desses serviços externos.",
      ],
    },
    {
      id: "propriedade-intelectual",
      number: "06",
      title: "Propriedade intelectual e estudos de caso",
      paragraphs: [
        "Textos, ilustrações, elementos visuais, código-fonte e materiais autorais publicados neste portfólio pertencem a Gutto Rocha ou são utilizados sob autorização. Você pode citar trechos ou referenciar os dados públicos das pesquisas e ferramentas desde que dê o devido crédito com link para a página original, vedada a reprodução integral para exploração comercial sem autorização prévia.",
        "Marcas, nomes comerciais e logotipos de empresas exibidos nos estudos de caso pertencem aos seus respectivos titulares e aparecem estritamente como referência histórica e registro profissional da atuação do autor em projetos realizados para essas companhias.",
      ],
    },
    {
      id: "disposicoes-finais",
      number: "07",
      title: "Disponibilidade, alterações e foro",
      paragraphs: [
        "O site e todas as suas ferramentas são disponibilizados no estado em que se encontram, podendo ser atualizados, alterados, suspensos ou descontinuados a qualquer momento, sem necessidade de aviso prévio.",
        "Estes Termos de Uso podem ser revisados periodicamente para refletir atualizações nas ferramentas, na legislação ou na forma de operação do site. A data no topo desta página indica a revisão vigente.",
        "Estes Termos são regidos pelas leis da República Federativa do Brasil. Para dirimir eventuais controvérsias oriundas deste documento, fica eleito o foro da comarca de Guarulhos, Estado de São Paulo, com renúncia expressa a qualquer outro.",
      ],
    },
  ] satisfies TermsSection[],
  contactPrompt: "Precisa falar sobre privacidade, remoção de e-mail ou alguma dúvida sobre estes termos?",
  contactCta: "Fale comigo",
} as const;
