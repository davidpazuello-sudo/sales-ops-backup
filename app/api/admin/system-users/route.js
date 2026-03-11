import { NextResponse } from "next/server";
import { requireSuperAdmin } from "lib/admin-access";
import { logAuthRouteError } from "lib/auth-logging";
import {
  listSystemUsers,
  MANAGED_ROLE_OPTIONS,
  saveSystemUserRole,
} from "lib/system-users";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const users = await listSystemUsers();
    return NextResponse.json({
      ok: true,
      users,
      roleOptions: MANAGED_ROLE_OPTIONS,
    });
  } catch (error) {
    logAuthRouteError("api/admin/system-users", "list-users", error, {
      actorEmail: auth.user.email,
    });

    const message = error instanceof Error ? error.message : "";

    return NextResponse.json(
      {
        ok: false,
        error: message === "SUPABASE_ADMIN_UNAVAILABLE"
          ? "O modo admin do Supabase nao esta configurado para listar usuarios."
          : "Nao foi possivel carregar os usuarios do sistema.",
      },
      { status: 503 },
    );
  }
}

export async function POST(request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const userId = String(body?.userId || "");
  const email = String(body?.email || "");
  const role = String(body?.role || "");

  if (!userId || !email || !role) {
    return NextResponse.json(
      { ok: false, error: "Informe o usuario, email e cargo desejado." },
      { status: 400 },
    );
  }

  try {
    const savedRole = await saveSystemUserRole({
      userId,
      email,
      role,
    });

    return NextResponse.json({
      ok: true,
      message: "Cargo atualizado com sucesso.",
      user: savedRole,
    });
  } catch (error) {
    logAuthRouteError("api/admin/system-users", "save-role", error, {
      actorEmail: auth.user.email,
      targetEmail: email,
      userId,
      role,
    });

    const message = error instanceof Error ? error.message : "Nao foi possivel atualizar o cargo.";
    const status = message === "SYSTEM_USER_ROLE_LOCKED" || message === "SYSTEM_USER_ROLE_INVALID" || message === "SYSTEM_USER_INVALID"
      ? 400
      : 503;

    const errorMessage = message === "SUPABASE_ADMIN_UNAVAILABLE"
      ? "O modo admin do Supabase nao esta configurado para atualizar cargos."
      : message === "SYSTEM_USER_ROLE_LOCKED"
      ? "Esse usuario tem cargo Admin fixo e nao pode ser alterado por aqui."
      : message === "SYSTEM_USER_ROLE_INVALID"
        ? "Selecione um cargo valido para continuar."
        : message === "SYSTEM_USER_INVALID"
          ? "Nao foi possivel identificar esse usuario."
          : "Nao foi possivel atualizar o cargo do usuario.";

    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status },
    );
  }
}
