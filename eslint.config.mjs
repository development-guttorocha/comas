import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  /**
   * `react-hooks/set-state-in-effect` (React Compiler / hooks extras) acusa padrões
   * comuns e seguros: hidratação de tema, reset ao mudar rota, medição em layout,
   * transição de página. Refatorar para `useSyncExternalStore` ou microtasks em
   * tudo traria risco sem ganho claro no portfólio.
   */
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
