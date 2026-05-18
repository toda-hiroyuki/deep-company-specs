import { ApiError } from "@/lib/api-error";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      data?.error?.message || `Request failed: ${res.status}`,
      data?.error?.code ?? null,
      res.status,
      data?.error?.details
    );
  }

  return data as T;
}
