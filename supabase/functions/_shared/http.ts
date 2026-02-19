export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export function handleError(error: unknown): Response {
  if (error instanceof HttpError) {
    return json(
      {
        error: error.message,
        details: error.details ?? null,
      },
      error.status,
    );
  }

  console.error("Unhandled edge function error", error);
  return json({ error: "Internal server error" }, 500);
}
