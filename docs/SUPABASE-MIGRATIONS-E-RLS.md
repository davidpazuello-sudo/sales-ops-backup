# Supabase, Migrations e RLS

Este documento define a fonte oficial do banco, o modelo de autorizacao por papel e o fluxo seguro de migrations do projeto.

## Fonte oficial

O estado oficial do banco agora fica em:

- `supabase/migrations/20260311110000_access_control_baseline.sql`
- `supabase/migrations/20260311111000_operational_tables_audit_and_events.sql`

Os arquivos soltos em `supabase/*.sql` passam a ser referencia historica e nao devem mais ser usados como processo principal de publicacao.

## Papel oficial de autorizacao

`public.user_roles` e a fonte oficial de autorizacao do workspace.

Regras:

- `user_roles.role` e o cargo oficial de acesso.
- `resolveAuthorizedRole()` consulta primeiro `user_roles`.
- o fallback por email de super admin continua apenas como bootstrap operacional, nao como fonte principal de governanca.
- qualquer usuario administrativo definitivo deve existir em `user_roles`.

Hierarquia:

- `Admin`
- `Gerente`
- `Supervisor`
- `Vendedor`

## Tabelas principais

### Controle de acesso

- `public.user_roles`
- `public.access_requests`
- `public.admin_notifications`
- `public.auth_rate_limits`

### Operacao comercial base

- `public.meetings`
- `public.tasks`

### Auditoria e observabilidade

- `public.audit_logs`
- `public.system_events`
- `public.idempotency_keys`

## Politicas RLS por tabela

### `public.user_roles`

- `Vendedor`: pode ler apenas a propria linha.
- `Admin`: pode ler e administrar todas as linhas.
- escrita operacional normal continua sendo feita pelo backend com `service role`.

### `public.access_requests`

- acesso direto permitido apenas para `Admin` em leitura e update.
- criacao e resolucao continuam centralizadas nas rotas server-side.

### `public.admin_notifications`

- acesso direto permitido apenas para `Admin`.
- leitura e resolucao operacional continuam acontecendo via backend.

### `public.auth_rate_limits`

- sem acesso direto para usuarios autenticados.
- uso exclusivo do backend para protecao de rotas.

### `public.meetings`

- `Vendedor`: pode ler apenas reunioes em que `owner_user_id = auth.uid()`.
- `Supervisor`, `Gerente` e `Admin`: podem ler todas.
- escrita direta de usuario nao e o fluxo padrao; sincronizacao continua via backend.

### `public.tasks`

- `Vendedor`: pode ler apenas tarefas em que `owner_user_id = auth.uid()`.
- `Supervisor`, `Gerente` e `Admin`: podem ler todas.
- escrita direta de usuario nao e o fluxo padrao; sincronizacao continua via backend.

### `public.audit_logs`

- leitura permitida apenas para `Admin`.
- escrita feita pelo backend para aprovacoes, recusas, login sensivel e mudancas administrativas.

### `public.system_events`

- leitura permitida para `Supervisor`, `Gerente` e `Admin`.
- escrita feita pelo backend para eventos estruturados de auth, seguranca e operacao.

### `public.idempotency_keys`

- sem acesso direto para usuarios autenticados.
- uso exclusivo do backend para deduplicar escritas sensiveis e retries controlados.

## Trilha de auditoria implementada

Hoje o sistema grava:

- `access_request.created` em `system_events`
- `access_request.approved` em `audit_logs` e `system_events`
- `access_request.rejected` em `audit_logs` e `system_events`
- `access_request.approval_failed` em `system_events`
- `auth.login_succeeded` em `system_events`
- `auth.mfa_challenge_required` em `system_events`
- `auth.login_sensitive` em `audit_logs`
- `system_user.role_updated` em `audit_logs` e `system_events`
- falhas, negacoes e rate limit de auth via `system_events`
- `hubspot.rate_limited` em `system_events`
- `hubspot.request_failed` em `system_events`
- chaves de idempotencia para escritas sensiveis em `idempotency_keys`

## Fluxo seguro de migrations

### Desenvolvimento local

1. Iniciar stack local do Supabase:

```bash
npx supabase@latest start
```

2. Criar nova migration:

```bash
npx supabase@latest migration new nome_da_mudanca
```

3. Aplicar tudo no ambiente local:

```bash
npx supabase@latest db reset
```

4. Validar a aplicacao:

```bash
npm run lint
npm test
npm run build
```

### Staging

1. Linkar o projeto de staging:

```bash
npx supabase@latest link --project-ref <staging-project-ref>
```

2. Revisar migrations pendentes:

```bash
npx supabase@latest migration list
```

3. Aplicar somente depois de revisar SQL e impacto:

```bash
npx supabase@latest db push
```

4. Validar smoke tests da aplicacao e logs.

### Producao

1. Garantir que a migration ja passou em local e staging.
2. Abrir janela curta de publicacao.
3. Fazer backup logico antes da mudanca.
4. Linkar o projeto de producao:

```bash
npx supabase@latest link --project-ref <production-project-ref>
```

5. Conferir migrations pendentes:

```bash
npx supabase@latest migration list
```

6. Aplicar:

```bash
npx supabase@latest db push
```

7. Validar:

- login
- autorizacao por papel
- fila de acessos
- notificacoes admin
- trilha em `audit_logs`
- trilha em `system_events`

## Regras operacionais

- nunca aplicar SQL manual em producao se a mudanca puder virar migration.
- nunca usar chat como armazenamento de segredo.
- qualquer ajuste de papel deve refletir `user_roles`.
- qualquer mudanca administrativa sensivel deve ter reflexo em `audit_logs` ou `system_events`.
