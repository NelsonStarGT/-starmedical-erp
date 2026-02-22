import nextConfig from "eslint-config-next";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  ...nextConfig,
  {
    ignores: ["node_modules", ".next", "prisma/migrations", "dist", "**/dist/**"]
  },
  {
    plugins: {
      "react-hooks": reactHooks
    },
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "warn",
      "import/no-anonymous-default-export": "off"
    }
  }
];
