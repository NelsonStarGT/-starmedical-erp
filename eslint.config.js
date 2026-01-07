import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    ignores: ["node_modules", ".next", "prisma/migrations", "dist"]
  },
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "warn",
      "import/no-anonymous-default-export": "off"
    }
  }
];
