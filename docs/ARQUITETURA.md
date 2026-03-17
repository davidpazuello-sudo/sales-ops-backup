# Arquitetura do Sistema

## 1) Visao geral

O sistema usa `Next.js 15`, `React 19`, App Router e um shell central para operar as paginas principais.
As rotas continuam leves, e a maior parte da experiencia operacional acontece em:

- `DashboardShell`
- secoes por dominio em `app/dashboard-sections/`
- integracao HubSpot em `lib/hubspot.js`
- autenticacao e autorizacao com Supabase

## 2) Stack atual

- Next.js `15.5.12`
- React `19.0.0`
- React DOM `19.0.0`
- Supabase Auth + RLS + migrations formais
- HubSpot Private App + webhook validado
- Vercel para deploy
- Vitest para testes unitarios e de integracao
- Playwright para E2E

## 3) Estrutura principal

- `app/`
  - `layout.js`: layout raiz, tema inicial e bootstrap visual
  - `loading.js`: loading global de troca de rota
  - `dashboard-shell.js`: shell principal, navegacao, overlays e orquestracao
  - `dashboard-ui.js`: componentes visuais compartilhados
  - `dashboard-section-feedback.js`: estados padronizados de loading, empty, error e success
  - `dashboard-sections/`
    - `reports.js`
    - `sellers.js`
    - `deals.js`
    - `campaigns.js`
    - `tasks.js`
    - `access.js`
    - `settings.js`
  - paginas leves:
    - `relatorios/`
    - `vendedores/`
    - `negocios/`
    - `campanhas/`
    - `tarefas/`
    - `configuracoes/`
    - `perfil/`
    - `permissoes-e-acessos/`
    - `ai-agent/`
  - `api/`
    - auth
    - admin
    - notifications
    - health
    - deals/stage
    - meetings
    - hubspot/dashboard
    - hubspot/webhooks

- `lib/`
  - `hubspot.js`: integracao principal com HubSpot
  - `hubspot-runtime.js`: resolucao de token por ambiente
  - `hubspot-webhooks.js`: validacao e tratamento de webhook
  - `dashboard-domain.js`: normalizacao do dominio do dashboard
  - `dashboard-fallback.ts`: fallback tipado do dashboard
  - `services/`
    - `dashboard-campaigns.js`
    - `dashboard-deals.js`
    - `dashboard-sellers.js`
    - `dashboard-tasks.js`
  - `operational-data.js`: enriquecimento com dados operacionais do Supabase
  - `audit-log-store.js`, `idempotency-store.js`, `api-observability.js`
  - `supabase/`: clients, middleware, admin, MFA, helpers

- `supabase/`
  - `migrations/`: fonte oficial do schema
  - `*.sql`: referencias historicas

## 4) Modelo de roteamento

As paginas principais usam wrappers leves que chamam `DashboardShell` com contexto inicial:

- `/relatorios` -> `initialNav="reports"`
- `/vendedores` -> `initialNav="sellers"`
- `/negocios` -> `initialNav="deals"`
- `/campanhas` -> `initialNav="campaigns"`
- `/tarefas` -> `initialNav="tasks"`
- `/configuracoes` -> `initialNav="settings"`
- `/perfil` -> `initialNav="profile"`
- `/permissoes-e-acessos` -> `initialNav="access"`

Rotas especializadas:

- `/vendedores/[sellerId]`
- `/vendedores/[sellerId]/reunioes`
- `/vendedores/[sellerId]/reunioes/[meetingId]`
- `/negocios/[dealId]`
- `/ai-agent`

## 5) Fluxo de dados

### Dashboard e HubSpot

1. A pagina entra pelo `DashboardShell`.
2. O shell chama `GET /api/hubspot/dashboard`.
3. A rota delega para `lib/hubspot.js`.
4. `lib/hubspot.js` busca, pagina, normaliza e monta o payload bruto.
5. `lib/dashboard-domain.js` e `lib/services/*` refinam as metricas por dominio.
6. `lib/operational-data.js` adiciona dados operacionais do Supabase quando necessario.
7. A UI renderiza resumo leve primeiro e busca detalhes sob demanda em pontos mais pesados.

### Campanhas

- A pagina trabalha com campanha selecionada e, opcionalmente, filtro por proprietario.
- O filtro principal suporta campanhas baseadas em listas e segmentos reais da HubSpot.
- Cards e popups usam a campanha selecionada, com detalhe buscado sob demanda.

### Tarefas

- A tela de tarefas carrega o universo visivel e filtra depois.
- Os cards e listagens agrupam meetings, calls e tasks por recorte operacional.

## 6) Autenticacao e autorizacao

- Supabase Auth com cookies HTTP-only
- Google login configurado via callback server-side
- MFA suportado
- middleware de protecao por sessao e papel
- autorizacao por papel em helpers centrais
- rotas sensiveis com rate limit e logging estruturado

## 7) Banco e governanca

- `supabase/migrations/` e a fonte oficial do schema
- tabelas operacionais principais:
  - `user_roles`
  - `tasks`
  - `meetings`
  - `audit_logs`
  - `system_events`
  - `idempotency_keys`
- scripts SQL fora de `migrations/` sao historicos e nao devem ser usados como fluxo principal

## 8) Operacao e deploy

- `npm run verify`: gate principal de qualidade
- `npm run release:check`: gate mais completo com E2E
- workflows versionados em `.github/workflows/`
- health endpoint em `/api/health`

## 9) Riscos e dividas atuais

- `dashboard-shell.js` ainda concentra muita responsabilidade
- `lib/hubspot.js` ainda esta grande e mistura coleta com parte da regra operacional
- documentacao historica ainda convive com documentacao viva
- existem arquivos historicos no banco e no dominio que nao comandam mais o runtime

## 10) Direcao recomendada

- modularizar mais a integracao HubSpot por dominio
- manter Supabase como caminho oficial de persistencia e schema
- reduzir arquivos historicos ou sinaliza-los melhor
- continuar trocando cargas pesadas por resumo leve + detalhe sob demanda
- manter documentacao viva separada de material historico
