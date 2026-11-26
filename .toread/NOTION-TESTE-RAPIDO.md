# Teste rápido (Notion simples)

Leia primeiro **`NOTION-SIMPLES.md`**. Aqui só o mínimo para validar.

## `.env.local`

```bash
NOTION_TOKEN=secret_...
NOTION_CASES_DATABASE_ID=id_ou_url_da_tabela
```

Reinicie o `npm run dev` depois de salvar.

## No Notion

1. Tabela **Cases** com a integração conectada.
2. Uma linha com coluna **slug** = `teste-notion-api` (ou outro slug sem espaço).
3. Abra a linha como **página**, escreva qualquer texto **no corpo** (embaixo das propriedades).
4. **Compartilhe** a página com a mesma integração.

## No navegador

`http://localhost:3000/cases/teste-notion-api` (troque pelo seu slug).

Você deve ver o hero + o texto que colocou no corpo da página da linha.

Não precisa de coluna extra com link: o site usa o ID da própria página da linha.
