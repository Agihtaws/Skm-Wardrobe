import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function err(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, ...(details ? { details } : {}) },
    { status }
  );
}

export function unauthorized() {
  return err("Unauthorized", 401);
}

export function forbidden() {
  return err("Forbidden", 403);
}

export function notFound(resource = "Resource") {
  return err(`${resource} not found`, 404);
}

export function serverError(e?: unknown) {
  console.error("[SERVER ERROR]", e);
  return err("Internal server error", 500);
}