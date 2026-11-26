# Gutto · Enviar para o admin — plugin do Figma

Manda telas do Figma direto para a mídia de um case no admin, já exportadas em alta.

## Instalar (uma vez, no Figma para desktop)

1. Menu do Figma → Plugins → Development → **Import plugin from manifest…**
2. Escolha `tools/figma-plugin/manifest.json` deste projeto.

## Usar

1. Deixe o admin rodando neste Mac (`localhost:3000`).
2. No Figma, selecione uma ou mais telas (frames) e rode **Gutto · Enviar para o admin**.
3. Na primeira vez, abra "Conexão com o admin" e cole a chave do plugin
   (Admin → Ferramentas → Figma → Copiar chave). Ela fica guardada no Figma.
4. Escolha o case, o formato (PNG, JPG ou SVG) e a escala (2× por padrão) e clique em **Enviar**.

As imagens são gravadas em `public/cases/<case>/`, com o nome da tela no Figma, e aparecem na
mídia do case no admin. O plugin só fala com `localhost:3000` (permitido apenas para plugins
em desenvolvimento) e usa uma chave própria, guardada em `.admin/figma-plugin.json`.

Ainda dá para importar um layout da ferramenta experimental "Imagem para layout" em
"Importar um layout (.json)".
