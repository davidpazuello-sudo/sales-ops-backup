# Sprint 1 Update

> Historico de entrega. Nao e a fonte principal da arquitetura atual.

## Objetivo

Estabilizar a base tecnica do dashboard para reduzir acoplamento, criar validacoes minimas e permitir evolucao segura para a Sprint 2.

## Checklist executado

- [x] Extracao de componentes visuais reutilizados para `app/dashboard-ui.js`
- [x] Extracao das secoes `DealsContent`, `SellersContent`, `SettingsContent` e `SellerProfileContent` para `app/dashboard-sections.js`
- [x] Extracao do estado compartilhado da shell para `app/use-dashboard-shell-state.js`
- [x] Criacao de helpers puros do dashboard em `lib/dashboard-shell-helpers.js`
- [x] Criacao de contrato minimo de dados em `lib/dashboard-contracts.js`
- [x] Validacao do payload da HubSpot na API
- [x] Fallback de payload invalido no client
- [x] Registro do mapa de dados reais vs mockados em `docs/data-source-map.md`
- [x] Configuracao de ESLint do projeto
- [x] Configuracao de testes minimos com Vitest
- [x] Criacao de CI basica em `.github/workflows/ci.yml`
- [x] Documentacao de atualizacao da sprint

## Checklist faltando

- [ ] Nenhuma pendencia critica aberta para a Sprint 1

## Validacao executada

- [x] `next lint`
- [x] `vitest run`
- [x] `next build`

## Impacto no proximo sprint

- Interfere no proximo sprint: nao
- Motivo: a Sprint 1 agora entrega modularizacao minima, validacao automatizada, lint e CI basica suficientes para iniciar a Sprint 2 com menor risco de regressao.

## Observacoes

- O runtime Node continua local ao repositorio em `.tools/node-v24.14.0-win-x64`
- O helper local de verificacao esta em `scripts/run-local-checks.ps1`
- Em ambientes com politica restrita do PowerShell, execute com `powershell.exe -ExecutionPolicy Bypass -File scripts/run-local-checks.ps1 all`
- O shell principal ainda pode ser reduzido mais nas proximas sprints, mas isso nao bloqueia a Sprint 2
