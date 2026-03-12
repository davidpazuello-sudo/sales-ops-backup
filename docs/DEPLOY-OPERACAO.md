# Deploy e Operacao

## 1) Ambientes oficiais

- `development`: ambiente local
- `staging`: homologacao usando Vercel Preview
- `production`: dominio oficial `https://opssales.com.br`

Consulte tambem:

- `AMBIENTES-E-VARIAVEIS.md`
- `RELEASE-CHECKLIST.md`

## 2) Gates e validacao antes do deploy

Scripts principais:

- `npm run dev`
- `npm run check:copy`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e`
- `npm run verify`
- `npm run release:check`

`release:check` e o comando oficial antes de publicar.

## 3) Deploy padronizado

Scripts locais:

- `npm run deploy:preview`
- `npm run deploy:production`

Workflows versionados:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-production.yml`

## 4) Observabilidade basica

Ja configurado no app:

- logs estruturados de seguranca e API
- trilha de eventos criticos em `system_events`
- endpoint de saude em `/api/health`
- informacoes de uptime, ambiente e checks basicos no health endpoint

Monitorar pelo menos:

- status de `/api/health`
- falhas em `/api/auth/*`
- falhas em `/api/hubspot/dashboard`
- falhas e rejeicoes em `/api/hubspot/webhooks`
- falhas em `/api/deals/stage`
- falhas em `/api/meetings`

## 5) Diagnostico rapido

Checklist:

- token HubSpot existe no ambiente?
- Supabase publico e service role configurados?
- `/api/health` retorna `ok: true`?
- `check:copy` bloqueou build?
- logs estruturados mostram aumento de status `429`, `500` ou `503`?

## 6) Rollback

### Vercel

1. Abrir o ultimo deploy estavel em Production.
2. Promover o deploy estavel anterior na Vercel ou fazer `redeploy` do commit bom.
3. Validar `/api/health`, login e dashboard principal.

### Banco / Supabase

1. Nunca aplicar migration em producao sem backup logico recente.
2. Reverter por nova migration corretiva, nao por edicao manual no historico.
3. Se a migration alterou dados, registrar script de restauracao ou compensacao.
4. Validar tabelas operacionais, RLS e auditoria apos rollback.

## 7) Backups

Recomendacoes:
- manter backup remoto em repo espelho
- gerar backup bundle periodico (`git bundle`)
- armazenar bundles em local seguro com versionamento de data

## 8) Publicacao para usuarios reais

Guia operacional completo:
- ver `PUBLICACAO-USUARIOS-REAIS.md`

Esse documento cobre:
- preparacao tecnica
- QA pre go-live
- publicacao no Vercel
- dominio
- piloto com usuarios reais
- checklist de entrada em producao
