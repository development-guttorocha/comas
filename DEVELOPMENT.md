# Preview local

Use `pnpm run dev` neste diretório e abra `http://127.0.0.1:3000/`. O iniciador detecta uma instância ativa deste projeto e informa o endereço, sem criar outro processo. Para encerrar a instância iniciada no terminal, use `Ctrl+C` antes de iniciar outra.

O desenvolvimento usa Webpack (`next dev --webpack`) para contornar o consumo crescente de CPU/memória e o `Map maximum size exceeded` observado no caminho de HMR do Turbopack do Next 16.2.1. O build de produção continua usando o comando original `next build`.

Use pnpm para instalar dependências, mantendo consistência com `pnpm-lock.yaml`; `npm run dev` também executa o script, mas alternar os gerenciadores para instalações reorganiza `node_modules`.

## Capas do Notion

Capas hospedadas em S3 usam `/api/case-cover/<slug>` no HTML. A rota consulta a URL atual do Notion e transmite a imagem com `Cache-Control: no-store`, funcionando tanto em `<img>` quanto em `next/image`. Assim, assinaturas temporárias diferentes não alteram o atributo `src` durante a hidratação e URLs vencidas não ficam presas no navegador.

Imagens locais e de outros CDNs mantêm seus endereços originais.

## Verificação

```sh
pnpm exec tsx --test lib/caseCover.test.ts lib/localePreference.test.ts lib/translations/*.test.ts lib/i18n/*.test.ts
pnpm exec tsc --noEmit
pnpm run build
```

Confira também a navegação pela Home, listagem, cases, Bio e troca de idioma, acompanhando os logs do servidor e o console do navegador. Um build concluído não substitui essa verificação de execução.
