# Cases e traduções

Os cases vivem no repositório, em `content/cases/<slug>/` (`case.json` com os dados, `body.json` com o corpo em blocos e `en.json` com a tradução), com a mídia em `public/cases/<slug>/`. Eles são editados no admin local (`/admin`), não mais no Notion, que ficou só como arquivo. O inglês de cada case é uma tradução revisada desse português. Os textos das páginas, do menu, da 404 e dos metadados são editados em **Páginas** no admin (veja **Páginas editáveis**); o Sobre2 e os rótulos de acessibilidade usam traduções fixas salvas no projeto. Os dois idiomas compartilham os mesmos componentes e layout.

## Idioma na entrada do site

A Home `/` escolhe o idioma pela preferência `portfolio-locale` salva no select. Sem preferência salva, negocia `Accept-Language`, respeitando prioridade e variantes como `pt-BR` e `en-US`. Inglês redireciona temporariamente para `/en`; português e navegadores sem idioma suportado usam `/`.

O select salva a escolha por um ano em cookie do próprio site. Links diretos preservam o idioma da URL. A detecção não redireciona POSTs, administração, APIs ou outras rotas. O redirecionamento mantém a query string e não permite cache compartilhado por idioma.

## Admin (`/admin`, só no localhost)

- **Pendências:** uma faixa no topo de todas as telas lista o que precisa ser resolvido, lida na hora de cada tela (`lib/admin/notices.ts`): chave da OpenAI vencendo (21 dias antes; a data fica em `lib/admin/keyExpiry.ts`) ou ausente, Resend sem chave, Blob suspenso (checado com uma gravação mínima, no máximo a cada 12 horas), Calendly sem link, textos das páginas sem inglês ou para revisar e cases com o inglês publicado desatualizado. Cada aviso some sozinho quando o problema é resolvido.

- **Cases:** lista com a situação de cada case (estrutura, inglês, última edição) e **Novo case**, que nasce como rascunho: fica fora do site e das listas até você desligar **Rascunho** em Dados. No localhost, `/cases/<slug>` mostra a prévia de um rascunho.
- **Conteúdo:** o corpo do case como um documento (BlockNote). Escreva em texto corrido; digite `/` para inserir seção, título, imagem, imagens lado a lado, incorporação ou um componente do case. O "texto com título lateral" se edita direto no texto; os outros componentes abrem um formulário em **Editar**. Arraste pela alça à esquerda para reordenar. Imagens enviadas vão para `public/cases/<slug>/`.
- **Dados:** título, resumo, etiquetas, destaque na Home, capa e cor, com prévia da capa.
- **Tradução:** português e inglês lado a lado, agrupados por bloco, com o que mudou ou falta em destaque. **Traduzir pendentes com o Sol** gera só os trechos novos ou alterados; também dá para escrever o inglês à mão. **Salvar rascunho** guarda sem publicar; **Publicar inglês** grava a versão aprovada em `content/cases/<slug>/en.json`, que vai para o site com o próximo deploy.
- **Páginas:** os textos, links e listas de cada página, em português e inglês (veja **Páginas editáveis**). **Home · esteira** ordena os cases da esteira e ajusta voltas e velocidade (`content/home.json`).
- **Salvar** (⌘S) grava os arquivos do case; cada salvamento guarda uma cópia anterior em `.content-history/` (fora do Git). Abrir e salvar sem editar não muda nada nos arquivos.
- Mudanças de conteúdo, dados e inglês chegam ao site com o próximo deploy.

A prévia de rascunho é exclusiva do localhost em desenvolvimento e não é indexada. Em produção, `?translation=draft` retorna 404. Sem tradução publicada válida, a página inglesa informa que está em preparação e oferece o português. Ela não apresenta português como se fosse inglês.

Métricas, marcas, IDs, URLs e configurações dos componentes não são enviados como campos traduzíveis. Números e links presentes nos textos gerados pela IA passam por validação estrita. A revisão manual permite ao autor reformular o inglês livremente, incluindo remover uma referência numérica do título. Continuam obrigatórios textos não vazios, campos completos, IDs válidos e correspondência com a versão atual do original. Campos estruturais de métricas, links e componentes permanecem preservados. O hash do original considera os textos; a renovação de uma URL assinada do Notion não força uma nova tradução. As imagens continuam vindo do original atualizado.

Ao atualizar um case, **Traduzir pendentes com o Sol** reaproveita trechos idênticos e gera apenas os alterados. Um rascunho não substitui automaticamente a versão aprovada. Mudanças no original durante a geração ou revisões concorrentes impedem sobrescritas.

## Páginas editáveis

As páginas do site saem do código para `content/pages/<página>.json` uma a uma, editadas em **Páginas** no admin. Hoje: **Home** (os textos; a esteira fica em Home · esteira), **Cases** (abertura, clientes e convite; os cases vêm dos próprios arquivos), **Sobre** (todos os textos da história, da liderança e do futuro; imagens e animações ficam no código, e cada item de lista aponta para uma imagem pelo nome), **Currículo**, **Contato**, o **Rodapé** (que aparece em todas as páginas) **Menu e 404** (os links do menu e a página de erro) e **SEO** (o título, a descrição e a imagem de compartilhamento de cada página, no mesmo arquivo `site.json`). Os rótulos de acessibilidade e o seletor de idioma seguem no catálogo de textos fixos.

- Cada página declara seus campos em `lib/pages/schemas.ts`: textos (português e inglês lado a lado), valores iguais nos dois idiomas (links, e-mails) e listas de itens. O conteúdo que a página tinha antes fica em `lib/pages/defaults.ts` (só no servidor), usado quando falta o arquivo ou surge um campo novo. A versão em Markdown (`/curriculo.md`, `/contato.md`, `llms.txt`) lê o mesmo conteúdo. A descrição da pessoa nos dados estruturados vem de **SEO**; cargo e empresas ainda saem de `lib/curriculum.ts`.
- Cada texto guarda `enFrom`, o português de onde o inglês saiu. Mudou o português, o admin marca **Mudou no português**; sem inglês, **Falta o inglês**. **Traduzir pendentes com o Sol** traduz só esses textos e devolve o inglês para revisão na tela; nada é gravado até **Salvar**. Editar o inglês à mão marca o texto como revisado.
- Sem inglês, a página em inglês mostra o português daquele texto.
- **Revisar o inglês**: marca que uma revisão apontou problema no inglês (o texto guarda `enFrom` vazio). **Traduzir pendentes com o Sol** retraduz esses também. Editar o português de um texto que ainda não registrava a origem passa a registrá-la, então a mudança aparece como **Mudou no português**.
- `node --env-file=.env.local --import tsx scripts/audit-page-translations.ts` revisa o inglês de todas as páginas com o Sol: o que estiver fiel e natural registra a origem; o que tiver problema fica como **Revisar o inglês**, com um relatório em `translation-audit.md` (`AUDIT_REPORT` muda o caminho). Não reescreve o inglês.
- Layout, animações e a estrutura das páginas continuam no código.
- Os textos que saem do código também saem do catálogo de textos fixos: depois, rode `node --import tsx scripts/translate-site.ts --extract` e `npm run site:translations-check`.

## Textos fixos do site

O português nas páginas e componentes (`t("texto em português")`) e nos dados institucionais continua sendo a fonte. `lib/i18n/pt.json` é o catálogo gerado dessa fonte; `lib/i18n/en.json` contém as traduções que o site lê. Não é necessário administrar páginas ou bases adicionais no Notion.

Depois de alterar um texto fixo:

1. Execute `npm run site:translate` (com `OPENAI_API_KEY` disponível no servidor).
2. Revise os novos valores em `lib/i18n/en.json`, especialmente frases divididas por bold ou quebras de linha. É possível corrigir o inglês diretamente nesse arquivo.
3. Execute `npm run site:translations-check` e faça o deploy normal do projeto.

O comando traduz apenas chaves novas ou alteradas, conserva traduções e revisões existentes e salva cada lote validado para retomar em caso de falha. Alterar o texto original cria uma nova chave; editar apenas o inglês não pede outra tradução. Para apenas extrair o catálogo sem usar a API, execute `node --import tsx scripts/translate-site.ts --extract`.

O seletor PT/EN mantém a página equivalente, incluindo o slug de cada case. As rotas institucionais inglesas são `/en`, `/en/sobre`, `/en/sobre2`, `/en/curriculo` e `/en/contato`. O idioma também está no HTML inicial, nos títulos, na imagem de compartilhamento e nas alternativas do sitemap.

## Configuração e estado atual

- `OPENAI_API_KEY`: configurada em `.env.local`, somente no servidor e fora do Git. A chave **Portfolio — traduções** foi criada em 09/10/2026, restrita à geração de respostas, renovada em 01/11/2026 com validade de 90 dias, até **30/01/2027**. O admin avisa em todas as telas a partir de 21 dias antes; ao renovar, atualize a data em `lib/admin/keyExpiry.ts`.
- `TRANSLATION_MODEL`: `gpt-6.1-sol`, validado com a conta.
- Regras e glossário do Sol: `TRANSLATION_INSTRUCTIONS` e `TRANSLATION_GLOSSARY` em `lib/translations/openai.ts` (voz em primeira pessoa com contrações, expressões brasileiras pelo equivalente natural, cargos em Title Case, Head of Design, case studies, resume). Valem para cases, páginas e textos fixos.
- Os seis cases (plenno, creator-ads, loft-design, banco-pan, picpay e webmotors) estão traduzidos e publicados. O usuário informou custo de US$ 0,17 para a primeira geração. Os textos fixos também foram gerados com Sol; não há custo por visita ao site.
- Armazenamento: cada tradução é um arquivo do repositório, `content/cases/<slug>/en.json`, com o rascunho e a versão publicada. O site só lê esses arquivos, gerados na hora do deploy: não há chamada de rede nem limite de uso por visita.
- Até 31/10/2026 as traduções ficavam num Vercel Blob privado (**portfolio-translations**). Cada página lia o Blob sem cache, e o limite de 10 mil operações simples por mês do plano Hobby foi atingido em três dias: o Blob ficou bloqueado até 29/11/2026. As traduções foram trazidas de `.translations/` (cópia local de 28/10); o que foi publicado no Blob depois disso precisa ser traduzido de novo no painel. `BLOB_READ_WRITE_TOKEN` não é mais usado.
- Administração: `/admin/*` e `/api/translations/*` retornam 404 em produção, inclusive os endpoints de sessão e sincronização. O bloqueio ocorre no proxy e é repetido nos handlers e na página. Senhas, sessões e `TRANSLATION_ADMIN_ENABLED=true` não habilitam o painel em produção.
- Local: `npm run dev` vincula o servidor a `127.0.0.1`. O painel aceita apenas hosts de loopback (`localhost`, `127.0.0.1`, `[::1]`) em desenvolvimento fora da Vercel. `TRANSLATION_ADMIN_ENABLED=false` também pode desabilitá-lo localmente. A variável é privada, sem prefixo `NEXT_PUBLIC_`.
- `TRANSLATION_ADMIN_TOKEN`: mantém o endpoint de sessão local existente (cookie HttpOnly, SameSite Strict e oito horas). Não libera administração remota.
- Uma publicação feita no painel local vale no site depois do commit e do deploy, junto com o resto do conteúdo. A leitura pública das traduções não depende do bloqueio do admin.

## Sincronização local preparada

O endpoint `GET /api/translations/sync` exige `Authorization: Bearer <CRON_SECRET>`. Cada execução lê os cases em `content/cases` e gera no máximo um rascunho novo ou desatualizado; não publica. O conteúdo inalterado não gera chamadas ao modelo.

O endpoint também está bloqueado em produção. Pode ser usado localmente com `CRON_SECRET`. Nenhum agendamento foi ativado; habilitar administração ou sincronização online exigirá uma mudança explícita dessa política.

Não há escrita no Notion nem criação de uma segunda base. O painel permite gerar e revisar manualmente enquanto o agendador não está ativo.

## Verificação

`node --import tsx --test lib/translations/*.test.ts` verifica preservação de componentes, formatação, métricas, links, hash, proteção de origem, assinatura da sessão e tratamento de respostas da API com fixtures. Os testes de fixtures não geram traduções reais.

Executar também `node --import tsx --test lib/i18n/*.test.ts`, TypeScript, ESLint e o build antes de publicar. As rotas PT/EN, a troca de idioma e a publicação de uma edição manual foram verificadas no localhost. Não foi realizado um novo deploy nesta etapa.
