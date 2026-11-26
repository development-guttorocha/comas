# Verificação de cor do conceito (design-dna, verify.mjs)

Medido em 12/11/2026 sobre `depois-1-lista-de-cases.jpg`, recortado no quadro do admin, contra `admin-design-dna.json` (k=8).

- ΔE médio: **2,79** (limite 5, passa).
- Cartão #181818: ΔE 2,0. Cobre 83% da tela, contra 63% na referência.
- **Reprovado** no ΔE máximo (25,6, limite 20) e no desvio de cobertura (0,48, limite 0,35).
  - O ΔE máximo vem de grupos com menos de 1% da imagem: a tinta #fafafa misturada às miniaturas dos cases, e o tom #71443a, que é ruído da foto da referência (0,01%).
  - O desvio vem da composição: a lista é um cartão grande, enquanto a referência tem vários cartões pequenos com frestas #0e0e0e. Com k=8, o k-means junta as frestas ao cartão.
- Não é cor errada no token. Na implementação, convém medir de novo cada tela recortada sem fotos.
