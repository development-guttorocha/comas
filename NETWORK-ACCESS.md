# Acesso do portfólio em redes corporativas

Diagnóstico de 13/10/2026. O usuário informou bloqueio do site inteiro com a mensagem: **Matched Categories: Media File Download, Sites that enable download of media content**. O domínio investigado foi o configurado no projeto: `www.guttorocha.com.br`.

## Causa confirmada na consulta pública

O Site Lookup da Forcepoint classificou `https://www.guttorocha.com.br/` como **Media File Download**, tanto em **URL Database Category** quanto em **Real-time Category**. A definição oficial da Forcepoint corresponde exatamente à descrição informada pelo usuário. A Fortinet usa a nomenclatura diferente **Streaming Media and Download**. O fornecedor do equipamento da rede não foi confirmado; a correspondência com a base Forcepoint está confirmada na consulta pública.

Essa classificação é incompatível com o propósito principal observado do site: portfólio profissional com biografia, currículo, contato e estudos de caso. A recomendação imediata é revisão da classificação; não foi demonstrado qual sinal ou histórico levou o classificador a essa categoria.

Consulta oficial: https://support.forcepoint.com/s/site-lookup

Definições oficiais: https://www.forcepoint.com/product/feature/forcepoint-url-database

Orientação oficial para bloqueios: https://www.forcepoint.com/company/blocked-by-forcepoint

Evidência: [captura da consulta](notion/forcepoint-category-evidence.png).

## Evidências verificadas

- `https://www.guttorocha.com.br`: HTTP 200, servido pela Vercel.
- `https://guttorocha.com.br`: HTTP 307 para `https://www.guttorocha.com.br/`.
- As duas versões HTTP: HTTP 308 para HTTPS.
- As duas versões HTTPS: certificado aceito pela validação TLS do Node, conexão TLS 1.3, HSTS `max-age=63072000`.
- Certificado de `www`: Let's Encrypt, válido de 20/08/2026 a 18/11/2026; cobre `*.guttorocha.com.br` e `guttorocha.com.br`.
- Certificado do domínio sem `www`: Let's Encrypt, válido de 10/10/2026 a 08/01/2027.
- Consulta pública do FortiGuard: HTTP 403 nesta ferramenta. **Categoria não confirmada.** Esse 403 pertence à consulta do FortiGuard e não é evidência do bloqueio do portfólio.
- Home, `/sobre2` e `/cases`: HTTP 200, `Content-Type: text/html; charset=utf-8`, sem `Content-Disposition` e sem links HTML com atributo `download` nas respostas inspecionadas.
- `/sobre2/futuro-scroll.mp4`: `Content-Type: video/mp4`, `Content-Disposition: inline; filename="futuro-scroll.mp4"`.
- `/home/about-img.webp`: `Content-Type: image/webp`, `Content-Disposition: inline; filename="about-img.webp"`.

As respostas inspecionadas não indicam que as páginas estejam sendo entregues como anexos. A presença de uma imagem ou vídeo por si só não prova por que o domínio recebeu a categoria. Não atribuir a causa a MIME, extensão, cache, CDN ou ao Notion sem evidência do classificador.

Os testes partiram de uma conexão externa à rede afetada. Não reproduzem o bloqueio corporativo nem excluem problemas de inspeção TLS ou DNS nessa rede.

## Intervenção que resolve cada causa

1. **Categoria incorreta:** solicitar revisão à Forcepoint com a descrição factual do portfólio e o resultado confirmado no Site Lookup. Sugerir **Business and Economy** pelo propósito profissional, permitindo que o avaliador determine a categoria correta. Não escolher outra categoria apenas porque ela é permitida pela empresa. O formulário da Home inclui no comentário um pedido de revisão também da versão sem `www`; essa segunda URL ainda não foi consultada separadamente.
2. **Categoria correta bloqueada por política, ou bloqueio local:** pedir ao administrador da rede avaliação e liberação específica dos nomes do domínio. A revisão global da categoria pode não alterar a política local.
3. **DNS Filter, IP bloqueado ou erro de inspeção/certificado:** o administrador precisa consultar o evento e a regra correspondente; um pedido de recategorização Web Filter pode não resolver.

Quando o domínio inteiro é bloqueado antes de servir a página, JavaScript, uma página alternativa dentro do mesmo domínio e alterações em imagens não conseguem reparar esse acesso. Primeiro identificar a causa no evento de bloqueio.

## Texto preparado para revisão Forcepoint

**Formulário preenchido; não enviado.** Categoria sugerida: **Business and Economy**. O checkbox Site Owner ficou desmarcado. A revisão não exige informar email; receber resposta por email exige login em uma conta Forcepoint. Nenhuma conta foi criada e nenhum contato pessoal foi preenchido.

> Please review the classification of https://www.guttorocha.com.br/ and https://guttorocha.com.br/. This is Gutto Rocha's professional product design portfolio, presenting his design experience, résumé, contact page and case studies for clients and employers. Its primary purpose is to present professional work, not to provide a media download service. Images and videos are supporting illustrations of the portfolio. The Home, About and Cases pages respond as text/html and do not force an attachment download. Your Site Lookup currently reports Media File Download in both the URL Database and Real-time categories for the Home. Business and Economy is suggested for the professional purpose of the website; please independently assess the public content and assign the accurate category. Thank you.

Evidência: [formulário preenchido](notion/forcepoint-review-draft.png).

Caso outra rede também bloqueie via FortiGuard, consultar separadamente https://www.fortiguard.com/webfilter. Corrigir a base Forcepoint não altera automaticamente as bases de outros fornecedores.

## Texto preparado para o administrador da rede

**Rascunho; não enviado. Confirmar o domínio afetado antes de usar.**

> O portfólio profissional https://www.guttorocha.com.br/ está sendo bloqueado nesta rede com a mensagem Matched Categories: Media File Download. A consulta pública da Forcepoint em 13/10/2026 também retornou Media File Download na base de URLs e na análise em tempo real. O site apresenta trabalhos e experiência profissional de design; imagens e vídeos ilustram os cases. Poderiam verificar o evento e avaliar a liberação específica de www.guttorocha.com.br e guttorocha.com.br enquanto a classificação é revista? No teste externo, as páginas responderam como HTML e os certificados TLS foram aceitos. A versão sem www redireciona para www.

## Desempenho e dependências do site

Corrigir a classificação ou liberar o domínio na rede não acrescenta processamento à aplicação, requisições durante a visita ou custo por acesso.

Na inspeção do código, há uma questão separada: imagens de blocos do Notion usam `<img>` com endereço remoto, e embeds de Figma/YouTube/Vimeo dependem de terceiros. As capas S3 já têm uma rota no próprio domínio, mas ela consulta o Notion e transmite a imagem com `no-store` em cada acesso direto.

Para uma segunda etapa, publicar as mídias essenciais sob URLs estáveis com cache de CDN e invalidar somente quando o conteúdo mudar. Importar as mídias do CMS na atualização/publicação evita consultar o Notion para cada imagem. Manter previews locais para conteúdo interativo e carregar embeds opcionais sob demanda reduz dependências e tráfego inicial. Um host próprio de mídia pode organizar a distribuição, mas sua adoção deve considerar a política da rede; separar em subdomínio não garante classificação independente nem remove a classificação existente do site. Isso melhora desempenho e resiliência das páginas acessíveis, mas não libera um domínio bloqueado. Essa etapa **não foi implementada** neste diagnóstico.

## Validação da resolução

- Categoria/mensagem recebida do usuário: **Media File Download**. Para o teste final, registrar também a URL e o horário da tentativa na rede afetada.
- Verificar a classificação de ambos os nomes do domínio e guardar o resultado do pedido, se houver.
- Após a correção, abrir a mesma URL na rede afetada e conferir o evento do filtro com o administrador.
- Só considerar o bloqueio resolvido após esse teste. HTTP 200 fora dessa rede não comprova resolução.
