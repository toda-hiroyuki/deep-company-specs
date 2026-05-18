import { Platform } from "react-native";

// Resolution order:
//   1. EXPO_PUBLIC_API_BASE_URL (override for any environment — staging, prod, ngrok tunnel, etc.)
//   2. Local-dev fallback: Android emulator → 10.0.2.2:8001, iOS sim / Expo Go → localhost:8001
// EXPO_PUBLIC_* vars are inlined at build time by Expo and exposed to the JS bundle.
const ENV_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

const LOCAL_BASE =
  Platform.OS === "android"
    ? "http://10.0.2.2:8001"
    : "http://localhost:8001";

export const API_BASE = ENV_BASE
  ? ENV_BASE.replace(/\/$/, "")
  : `${LOCAL_BASE}/api/v1`;

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  // Only set Content-Type for requests with a body (POST/PUT/DELETE)
  const headers: Record<string, string> = { ...options?.headers as Record<string, string> };
  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || `Request failed: ${res.status}`);
  }

  return data as T;
}
