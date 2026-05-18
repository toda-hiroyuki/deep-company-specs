// Custom error type for API responses, so callers can localize by error.code
// instead of displaying the server's English message verbatim.
//
// Usage on the call site:
//   try { await guestFetch(...) }
//   catch (e) {
//     if (e instanceof ApiError && e.code) {
//       const key = `someNamespace.errors.${e.code}`;
//       const t = useI18n().t;
//       const localized = t(key);
//       setError(localized === key ? e.message : localized);
//     }
//   }
export class ApiError extends Error {
  readonly code: string | null;
  readonly status: number;
  readonly details?: { field: string; message: string }[];

  constructor(
    message: string,
    code: string | null,
    status: number,
    details?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Helper for components: takes a thrown error and returns a localized message.
// Falls back to the server's English text if no translation exists, then to
// the generic fallback string.
export function localizeApiError(
  err: unknown,
  keyPrefix: string,
  t: (key: string) => string,
  fallback: string
): string {
  if (err instanceof ApiError) {
    if (err.code) {
      const key = `${keyPrefix}.${err.code}`;
      const translated = t(key);
      if (translated !== key) return translated;
    }
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
