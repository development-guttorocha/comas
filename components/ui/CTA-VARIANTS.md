# CTAs e variantes de botão

Toda a superfície de **botão / link com aparência de botão** deve passar por `buttonClassName()` em `buttonStyles.ts` ou pelo componente `<Button>` (que o utiliza internamente).

## Variantes (`ButtonVariant` / `CtaVariant`)

| Variante | Uso | Elemento típico |
|----------|-----|-------------------|
| `outline` | Ação secundária em superfície clara (ex.: “Ver case” em slide) | `<Button href>` |
| `pill` | Botão flutuante / chip grande (ex.: “Alternar Cases”) | `motion.button` + `buttonClassName({ variant: "pill" })` |
| `solidAccent` | Preenchimento accent, mono (ex.: voltar / CTA sólido) | `<Button href>` |
| `solidAccentSans` | Igual em sans, texto maior (ex.: 404 “Voltar ao início”) | `<Button href>` |
| `outlineOnAccent` | Contorno claro sobre fundo accent (ex.: contato “Voltar”) | `<Button href>` |
| `accentFill` | Bloco largo accent (ex.: cards IA “Acessar projeto”) | `<Button href>` |
| `footerPill` | Link branco com hover cinza claro no rodapé (contacto / social) | `motion.a` + `buttonClassName` |
| `fullBleedCta` | CTA redondo no hero full-bleed (15px semibold branco) | `<a href="#…">` + `buttonClassName`; opção `fullBleedUseAccentBg` |

## Opção `fullBleedUseAccentBg`

- Só aplica a **`fullBleedCta`**.
- `true` (default): inclui `bg-accent`.
- `false`: sem fundo na classe — usar `style={{ backgroundColor }}` (cor de marca em `CaseHeroFullBleed`).

## Home hero (pílula partida)

Não é uma única variante: é um **composto** de três classes exportadas:

- `homeHeroCtaShellClass` — `<Link>` wrapper + focus ring.
- `homeHeroCtaLeadClass` — texto à esquerda.
- `homeHeroCtaActionClass` — segmento accent (“Ver experiências”).

Ver `HomeHeroCta.tsx`.

## Focus rings

- **`focusRingSurface`** — superfície normal do site.
- **`focusRingOnBlack`** — hero escuro / 404 / full-bleed.
- **`outlineOnAccent`** — usa ring claro com `ring-offset-accent`.

## Tamanhos (`ButtonSize`)

`sm` | `md` (default) | `nav` — ignorados nas variantes que já fixam padding (`pill`, `solidAccent`, `fullBleedCta`, etc.).
