import { NextResponse } from "next/server";

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  details?: { field: string; message: string }[]
) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export function notFound(message = "Resource not found") {
  return jsonError("NOT_FOUND", message, 404);
}

export function validationError(
  details: { field: string; message: string }[]
) {
  return jsonError("VALIDATION_ERROR", "Validation failed", 400, details);
}
