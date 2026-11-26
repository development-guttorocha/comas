# Verificação do DNA aplicado (13/11/2026)

O `verify.mjs` da skill design-dna foi rodado com cada captura a 1280×800 do admin real contra `docs/admin/conceito/admin-design-dna.json`.

| Tela | Diferença média (limite 5) | Diferença máxima (limite 20) | Proporção das cores (limite 0,35) |
|---|---|---|---|
| 1. Lista de cases | **2,18** | 28,5 | 0,64 |
| 2. Páginas | **1,85** | 51,0 | 0,68 |
| 3. Mídia | **2,26** | 52,0 | 0,79 |
| Conceito aprovado (`depois-1`) | 2,79 | 25,6 | 0,48 |

O resultado formal é FAIL nas três telas. Não é cor errada.

**Diferença média.** Passa nas três telas e fica abaixo da do conceito aprovado.

**Cores medidas na página.** Foram lidas com `getComputedStyle` em /admin/cases e batem exatamente com o DNA:
- fundo `rgb(14,14,14)` = #0e0e0e;
- cartão `rgb(24,24,24)` = #181818;
- item atual do menu, aba atual e "Novo case" `rgb(34,34,34)` = #222222;
- borda da busca `rgb(107,107,107)` = #6b6b6b;
- divisória `rgb(49,50,50)` = #313232;
- resumo `rgb(153,153,153)` = #999999;
- título 24px.

O único botão branco visível é "Publicar".

**Diferença máxima.** Vem de áreas com menos de 1% da imagem:
- o texto antisserrilhado, que vira #adaaa8 na captura reduzida;
- as fotos dos cases, inclusive um azul do Banco PAN;
- na Mídia, o xadrez das miniaturas.

**Proporção das cores.** A tela é um cartão grande, com 95% de #181818. A referência tem vários cartões pequenos separados por fundo: 63% de cartão e 19% de fundo. Além disso, o JPEG reduzido funde #0e0e0e e #181818 num só grupo (#151515). Por isso a medição atribui 0% ao fundo.

As capturas estão nesta pasta: `1-lista-de-cases.jpg`, `2-paginas.jpg` e `3-midia.jpg`.
