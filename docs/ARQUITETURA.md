# Arquitetura do Sistema

## 1) Visao geral

O sistema usa Next.js (App Router) com React e uma arquitetura de frontend orientada a um shell modular.
As rotas de pagina continuam leves, mas o runtime principal agora esta dividido entre orquestracao de layout, estado compartilhado, componentes visuais e secoes de dominio.

## 2) Stack tecnica

- Next.js 15.2.6
- React 19
- React DOM 19
- API Route no proprio Next para integracao HubSpot
- Deploy alvo: Vercel

## 3) Estrutura de pastas

- `app/`
  - `layout.js`: layout raiz e fontes
  - `globals.css`: tokens globais (cores, tipografia, densidade, motion)
  - `dashboard-shell.js`: orquestracao do shell principal, layout, sidebar, topbar e overlays
  - `dashboard-ui.js`: componentes visuais e icones reutilizados do dashboard
  - `dashboard-sections.js`: secoes funcionais da aplicacao (relatorios, negocios, vendedores, configuracoes etc.)
  - `dashboard-shell-config.js`: configuracao estatica do shell e recursos de navegacao
  - `use-dashboard-shell-state.js`: estado compartilhado, efeitos e integracoes do shell
  - `page.js`: redirect para `/relatorios`
  - `ai-agent/`, `relatorios/`, `vendedores/`, `negocios/`, `perfil/`, `configuracoes/`, `login/`
  - `api/hubspot/dashboard/route.js`: endpoint interno de dashboard
- `lib/hubspot.js`: client de integracao e normalizacao de dados HubSpot
- `scripts/validate-copy.mjs`: gate de qualidade de texto/codificacao

## 4) Modelo de roteamento

As rotas de pagina sao wrappers simples que chamam `DashboardShell` com props de contexto:

- `/relatorios` -> `initialNav="reports"`
- `/vendedores` -> `initialNav="sellers"`
- `/vendedores/[sellerId]` -> perfil de vendedor
- `/vendedores/[sellerId]/reunioes` -> lista de reunioes
- `/vendedores/[sellerId]/reunioes/[meetingId]` -> detalhe de reuniao
- `/negocios` -> `initialNav="deals"`
- `/negocios/[dealId]` -> perfil do negocio
- `/configuracoes` -> `initialNav="settings"`
- `/perfil` -> `initialNav="profile"`
- `/ai-agent` -> pagina separada com shell visual proprio

## 5) Fluxo de dados

1. `DashboardShell` chama `GET /api/hubspot/dashboard`.
2. `route.js` delega para `getHubSpotDashboardData()` em `lib/hubspot.js`.
3. `lib/hubspot.js`:
   - busca owners e deals na HubSpot
   - normaliza campos
   - calcula agregados (pipeline, estagnacao, relatorios)
   - devolve payload consolidado para UI
4. UI renderiza com fallback para `defaultDashboardData` quando token ou API nao estao disponiveis.

## 6) Estado e interacao

O estado principal continua local via hooks, sem store global externa, mas agora foi consolidado no controller `app/use-dashboard-shell-state.js`.

Principais blocos de estado:
- navegacao ativa
- filtros de pipeline
- colapso de sidebar e colunas
- notificacoes e busca global
- personalizacao visual (persistida em localStorage)
- perfil, sessao e foto

## 7) Integracao HubSpot

Variavel obrigatoria:
- `HUBSPOT_ACCESS_TOKEN`

Dados retornados para frontend incluem:
- resumo de pipeline
- lista de vendedores
- lista de negocios
- alertas
- dados de integracao
- email e cargo de perfil para tela de conta (`integration.profileEmail`, `integration.profileRole`)

## 8) Qualidade e protecao de texto

`npm run build` roda antes `npm run check:copy`.

Esse script bloqueia build se detectar:
- mojibake (texto com codificacao quebrada)
- caracteres de substituicao
- variantes quebradas de palavras criticas de navegação

## 9) Riscos arquiteturais atuais

- ainda existem componentes de dominio grandes em `app/dashboard-sections.js`
- parte da interacao operacional continua local e ainda nao persiste no backend
- ausencia de testes E2E cobrindo fluxo critico

## 10) Direcao arquitetural recomendada

- continuar quebrando `app/dashboard-sections.js` em modulos por dominio
- criar camada de `services` para regras de negocio
- tipar payload de integracao (TypeScript ou schema runtime)
- adicionar testes de contrato para API HubSpot
- adicionar testes E2E de navegacao e pipeline
