export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export const isApiError = (error) => error instanceof ApiError;

export const toErrorResponse = (error) => {
  if (isApiError(error)) {
    return Response.json(
      {
        error: error.message,
        details: error.details,
      },
      { status: error.status },
    );
  }

  console.error("Unhandled API error", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
};

export const requireNonEmptyString = (value, field) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${field} is required`);
  }
  return value.trim();
};

export const requireAllowed = (value, allowed, field) => {
  const parsed = requireNonEmptyString(value, field);
  if (!allowed.includes(parsed)) {
    throw new ApiError(400, `${field} is invalid`);
  }
  return parsed;
};

export const requireEmail = (value, field = "email") => {
  const parsed = requireNonEmptyString(value, field).toLowerCase();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed);
  if (!ok) {
    throw new ApiError(400, `${field} is invalid`);
  }
  return parsed;
};

export const jsonBody = async (request) => {
  try {
    return await request.json();
  } catch (_error) {
    throw new ApiError(400, "Invalid JSON body");
  }
};

export const parsePagination = (searchParams, defaults = { page: 1, pageSize: 20, maxPageSize: 100 }) => {
  const rawPage = Number(searchParams.get("page") || defaults.page);
  const rawSize = Number(searchParams.get("pageSize") || defaults.pageSize);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : defaults.page;
  const pageSize = Number.isFinite(rawSize) && rawSize > 0 ? Math.min(Math.floor(rawSize), defaults.maxPageSize) : defaults.pageSize;
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
};
