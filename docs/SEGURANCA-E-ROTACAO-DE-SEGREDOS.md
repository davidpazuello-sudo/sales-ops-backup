# Seguranca e Rotacao de Segredos

Este documento define onde cada segredo deve morar, como rotacionar e o que revisar depois da troca.

## Principios

- Nunca salvar segredo em codigo fonte, commit, issue, chat ou documento compartilhado.
- Usar sempre os cofres nativos da plataforma:
  - GitHub: `Actions secrets` ou gerenciador corporativo aprovado
  - Vercel: `Project Settings -> Environment Variables`
  - Supabase: `Project Settings` e secrets do projeto
  - HubSpot: Private App Token no portal da conta
- Manter `.env.local` apenas para desenvolvimento local e fora do git.
- Tratar `NEXT_PUBLIC_*` como configuracao publica, nao como segredo.

## Mapa de segredos

### Runtime da aplicacao

- `HUBSPOT_ACCESS_TOKEN`
  - Onde guardar: Vercel e `.env.local`
  - Uso: sincronizacao com HubSpot
- `HUBSPOT_ACCESS_TOKEN_STAGING`
  - Onde guardar: Vercel Preview/Staging e `.env.local` seguro
  - Uso: homologacao isolada da integracao HubSpot
- `HUBSPOT_ACCESS_TOKEN_PRODUCTION`
  - Onde guardar: Vercel Production
  - Uso: integracao oficial em producao
- `SUPABASE_SERVICE_ROLE_KEY`
  - Onde guardar: Vercel e `.env.local`
  - Uso: operacoes administrativas do Supabase no servidor
- `NEXT_PUBLIC_SUPABASE_URL`
  - Configuracao publica
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - Configuracao publica
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Configuracao publica legada
- `SUPER_ADMIN_EMAILS`
  - Onde guardar: Vercel e `.env.local`
- `CORPORATE_EMAIL_DOMAINS`
  - Onde guardar: Vercel e `.env.local`
- `NEXT_PUBLIC_APP_URL`
  - Configuracao publica por ambiente

### Tokens operacionais

- GitHub PAT ou token de integracao
  - Onde guardar: gerenciador de segredos aprovado ou GitHub Actions secrets
- `VERCEL_TOKEN`
  - Onde guardar: gerenciador de segredos aprovado ou secret do CI
- `SUPABASE_ACCESS_TOKEN`
  - Onde guardar: gerenciador de segredos aprovado ou secret do CI

## Checklist de rotacao

### GitHub

1. Criar novo token com escopo minimo necessario.
2. Atualizar o token no gerenciador de segredos e nos pipelines que usam GitHub API/CLI.
3. Testar uma operacao real:
   - `git fetch`
   - `git push` em branch de teste
4. Revogar o token antigo.
5. Registrar data, responsavel e motivo da rotacao.

### Vercel

1. Criar um novo `VERCEL_TOKEN` na conta responsavel.
2. Atualizar o token no CI ou no gerenciador de segredos.
3. Rodar um teste simples:
   - `vercel pull`
   - `vercel deploy --prod --yes`
4. Revogar o token anterior.
5. Confirmar que o projeto continua vinculado ao ambiente correto.

### Supabase

1. Rotacionar `SUPABASE_ACCESS_TOKEN` quando usado em CLI/automacao.
2. Rotacionar `SUPABASE_SERVICE_ROLE_KEY` no projeto quando houver exposicao ou troca programada.
3. Atualizar o novo valor na Vercel e no ambiente local seguro.
4. Validar:
   - login
   - consulta de sessao
   - APIs administrativas
   - operacoes que usam service role
5. Revogar o segredo anterior e registrar a troca.

### HubSpot

1. Criar ou regenerar o token da Private App usada pelo sistema.
2. Atualizar `HUBSPOT_ACCESS_TOKEN` na Vercel e no ambiente local seguro.
2.1. Se houver separacao por ambiente, atualizar tambem:
   - `HUBSPOT_ACCESS_TOKEN_STAGING`
   - `HUBSPOT_ACCESS_TOKEN_PRODUCTION`
3. Validar:
   - `/api/hubspot/dashboard`
   - carregamento de relatorios
   - pipeline e tarefas dependentes da integracao
4. Revogar o token antigo.
5. Registrar a troca.

## Pos-rotacao

- Rodar `npm run lint`
- Rodar `npm test`
- Rodar `npm run build`
- Validar login, notificacoes, dashboard HubSpot e rotas admin
- Conferir logs de erro da Vercel e do Supabase nas primeiras horas

## Incidentes e exposicao

Se qualquer segredo for enviado por chat, print, email ou ticket:

1. Considerar o segredo comprometido.
2. Rotacionar imediatamente.
3. Atualizar os ambientes oficiais.
4. Revogar o valor antigo.
5. Registrar o incidente e o horario da troca.
