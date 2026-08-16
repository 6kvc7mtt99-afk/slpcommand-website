import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", ".open-next/**", ".wrangler/**", "node_modules/**", "public/admin/**"],
  },
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name='fetch'] > Literal[value=/english-learning-backend/]",
          message: "Do not fetch Render from outside lib/server/backend.ts",
        },
      ],
    },
  },
];

export default config;
