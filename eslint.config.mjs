import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // react-hooks/immutability assumes every callback passed to a hook runs
    // inside React's render/commit cycle. react-three-fiber's useFrame does not:
    // it runs in three.js's own render loop, and mutating uniforms and object3D
    // properties there is the library's documented (and only) way to animate.
    // Routing those writes through state would re-render React 60 times a
    // second, which is precisely what this code is built to avoid.
    files: ["src/components/three/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
]);

export default eslintConfig;
