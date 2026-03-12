# Ambientes e Variaveis

## Mapa de ambientes

| Ambiente | Objetivo | Arquivo base versionado | URL esperada |
| --- | --- | --- | --- |
| development | desenvolvimento local | `.env.development.example` | `http://localhost:3000` |
| staging | homologacao antes de producao | `.env.staging.example` | `https://staging.opssales.com.br` |
| production | ambiente oficial | `.env.production.example` | `https://opssales.com.br` |

## Variaveis comuns

Obrigatorias em `staging` e `production`:

- `APP_ENVIRONMENT`
- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_APP_URL`
- `HUBSPOT_ACCESS_TOKEN_STAGING` em `staging`
- `HUBSPOT_ACCESS_TOKEN_PRODUCTION` em `production`
- `HUBSPOT_CLIENT_SECRET_STAGING` em `staging` quando webhook estiver habilitado
- `HUBSPOT_CLIENT_SECRET_PRODUCTION` em `production` quando webhook estiver habilitado
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPER_ADMIN_EMAILS`
- `CORPORATE_EMAIL_DOMAINS`

Compativeis com projetos antigos:

- `HUBSPOT_ACCESS_TOKEN`
- `HUBSPOT_ACCESS_TOKEN_DEVELOPMENT`
- `HUBSPOT_CLIENT_SECRET`
- `HUBSPOT_CLIENT_SECRET_DEVELOPMENT`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Variaveis do GitHub Actions

Configurar como `Actions secrets`:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Regras

- Segredos reais nao devem ser commitados
- `.env.local` continua local e nao rastreado
- os arquivos `*.example` sao a referencia oficial do que cada ambiente precisa
- qualquer nova integracao externa deve atualizar este documento e o arquivo de exemplo correspondente

## Sincronizacao com Vercel

Preview/staging:

```bash
vercel pull --yes --environment=preview
```

Production:

```bash
vercel pull --yes --environment=production
```

## Sincronizacao com Supabase

- manter secrets do app no ambiente da Vercel
- manter migrations no diretorio `supabase/migrations`
- qualquer mudanca de banco precisa acompanhar rollout e rollback documentados

## Regra da HubSpot por ambiente

- `development`: preferir `HUBSPOT_ACCESS_TOKEN_DEVELOPMENT`
- `staging`: usar `HUBSPOT_ACCESS_TOKEN_STAGING`
- `production`: usar `HUBSPOT_ACCESS_TOKEN_PRODUCTION`
- `HUBSPOT_ACCESS_TOKEN` fica apenas como fallback legada
- `development`: preferir `HUBSPOT_CLIENT_SECRET_DEVELOPMENT` para webhooks
- `staging`: usar `HUBSPOT_CLIENT_SECRET_STAGING` para webhooks
- `production`: usar `HUBSPOT_CLIENT_SECRET_PRODUCTION` para webhooks
- `HUBSPOT_CLIENT_SECRET` fica apenas como fallback legado

Nao reutilize o token de producao em staging.
Nao reutilize o client secret de producao em staging.
