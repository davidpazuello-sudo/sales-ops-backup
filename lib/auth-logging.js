export function logAuthRouteError(route, stage, error, meta = {}) {
  const message = error instanceof Error ? error.message : String(error || "UNKNOWN_ERROR");
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[${route}] ${stage}`, {
    message,
    stack,
    ...meta,
  });
}
