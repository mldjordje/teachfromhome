import { HttpError } from "./http.ts";

export function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, `${field} is required`);
  }
  return value.trim();
}

export function requireMaxLength(value: string, max: number, field: string): string {
  if (value.length > max) {
    throw new HttpError(400, `${field} must be <= ${max} characters`);
  }
  return value;
}

export function requireEmail(value: unknown): string {
  const email = requireNonEmptyString(value, "email").toLowerCase();
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(email)) {
    throw new HttpError(400, "email is invalid");
  }
  return email;
}

export function requirePhone(value: unknown): string {
  const phone = requireNonEmptyString(value, "phone");
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    throw new HttpError(400, "phone length is invalid");
  }
  return phone;
}

export function requireDate(value: unknown, field: string): string {
  const dateValue = requireNonEmptyString(value, field);
  if (Number.isNaN(Date.parse(dateValue))) {
    throw new HttpError(400, `${field} is invalid`);
  }
  return dateValue;
}

export function requireAllowed<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  const parsed = requireNonEmptyString(value, field) as T;
  if (!allowed.includes(parsed)) {
    throw new HttpError(400, `${field} is invalid`);
  }
  return parsed;
}

export function requireVideoPath(value: unknown, field = "video_path"): string {
  const path = requireNonEmptyString(value, field);
  if (!path.includes("/")) {
    throw new HttpError(400, `${field} must include bucket/object path`);
  }
  return path;
}
