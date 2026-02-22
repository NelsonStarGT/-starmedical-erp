import nextConfig from "eslint-config-next";

const [baseConfig, ...restConfig] = nextConfig;

export default [
  {
    ...baseConfig,
    rules: {
      ...baseConfig.rules,
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "warn",
      "import/no-anonymous-default-export": "off"
    }
  },
  ...restConfig,
  {
    ignores: ["node_modules", ".next", "prisma/migrations", "dist"]
  },
];
