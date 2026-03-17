import { getAuthSecret } from "@/lib/runtime-secrets";

export async function register() {
  if (process.env.NODE_ENV !== "development") {
    getAuthSecret();
  }
}
