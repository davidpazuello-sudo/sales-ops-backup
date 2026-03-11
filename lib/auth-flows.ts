export const FIRST_ACCESS_MODE = "first-access";

type RequestLike = {
  url: string;
};

type ErrorLike = {
  message?: string;
  code?: string;
} | null | undefined;

export function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export function buildLoginRedirectUrl(request: RequestLike, mode?: string): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
  const redirectUrl = configuredBaseUrl
    ? new URL("/login", configuredBaseUrl)
    : new URL("/login", request.url);

  if (mode) {
    redirectUrl.searchParams.set("mode", mode);
  }

  return redirectUrl.toString();
}

export function isAlreadyRegisteredError(error: ErrorLike): boolean {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("already registered")
    || message.includes("already been registered")
    || message.includes("already exists")
    || message.includes("user with this email address")
    || String(error?.code || "").toLowerCase().includes("email_exists");
}
