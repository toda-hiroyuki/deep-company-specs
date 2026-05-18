import type { StorageProvider } from "./index";
import { LocalStorageProvider } from "./local";
import { SupabaseStorageProvider } from "./supabase";

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (provider) return provider;

  const type = process.env.STORAGE_PROVIDER || "local";

  switch (type) {
    case "local":
      provider = new LocalStorageProvider();
      break;
    case "supabase":
      provider = new SupabaseStorageProvider();
      break;
    default:
      throw new Error(`Unknown STORAGE_PROVIDER: ${type}`);
  }

  return provider;
}
