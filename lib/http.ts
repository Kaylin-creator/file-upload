import "server-only";

import { NextResponse } from "next/server";

import { UnauthorizedError } from "@/lib/auth";

// Every route returns { data } or { error: { code, message } }.
export function jsonData<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function toErrorResponse(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return jsonError(err.code, err.message, err.status);
  }
  console.error(err);
  return jsonError("INTERNAL_ERROR", "Something went wrong.", 500);
}
