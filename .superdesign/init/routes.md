# Routes

File-based (Next.js App Router). `app/(pt)` = Portuguese site at `/`; `app/en` = English at `/en`. Admin (`/admin`) is local-only.

- `app/(pt)/artigos/[slug]/page.tsx` -> `/artigos/[slug]`
- `app/(pt)/artigos/page.tsx` -> `/artigos`
- `app/(pt)/cases/[slug]/page.tsx` -> `/cases/[slug]`
- `app/(pt)/cases/modelo/page.tsx` -> `/cases/modelo`
- `app/(pt)/cases/page.tsx` -> `/cases`
- `app/(pt)/contato/page.tsx` -> `/contato`
- `app/(pt)/curriculo/page.tsx` -> `/curriculo`
- `app/(pt)/fale-comigo/page.tsx` -> `/fale-comigo`
- `app/(pt)/page.tsx` -> `/`
- `app/(pt)/recursos/consultoria-de-carreira/page.tsx` -> `/recursos/consultoria-de-carreira`
- `app/(pt)/recursos/page.tsx` -> `/recursos`
- `app/(pt)/recursos/pesquisa-salarial/page.tsx` -> `/recursos/pesquisa-salarial`
- `app/(pt)/recursos/salario-em-design/page.tsx` -> `/recursos/salario-em-design`
- `app/(pt)/recursos/trilha-de-carreira/completa/page.tsx` -> `/recursos/trilha-de-carreira/completa`
- `app/(pt)/recursos/trilha-de-carreira/page.tsx` -> `/recursos/trilha-de-carreira`
- `app/(pt)/servicos/design-system-figma/page.tsx` -> `/servicos/design-system-figma`
- `app/(pt)/servicos/head-de-design/page.tsx` -> `/servicos/head-de-design`
- `app/(pt)/servicos/page.tsx` -> `/servicos`
- `app/(pt)/servicos/prototipagem-com-ia/page.tsx` -> `/servicos/prototipagem-com-ia`
- `app/(pt)/sobre/page.tsx` -> `/sobre`
- `app/en/cases/[slug]/page.tsx` -> `/en/cases/[slug]`
- `app/en/cases/page.tsx` -> `/en/cases`
- `app/en/contato/page.tsx` -> `/en/contato`
- `app/en/curriculo/page.tsx` -> `/en/curriculo`
- `app/en/page.tsx` -> `/en`
- `app/en/sobre/page.tsx` -> `/en/sobre`

Key: `/cases/[slug]` renders `lib/caseDetailPage.tsx` (hero, cover image, case video reel, Notion-like document).
