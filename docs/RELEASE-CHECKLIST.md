# Release Checklist

## Ambientes

- `development`: execucao local com `.env.local`
- `staging`: validacao antes de publicar, usando Vercel Preview e variaveis de preview
- `production`: dominio oficial `https://opssales.com.br`

## Validacao obrigatoria antes de deploy

Rodar localmente:

```bash
npm run release:check
```

Esse comando cobre:

- `check:copy`
- `lint`
- `test`
- `build`
- `e2e`

## Checklist de release

- Confirmar branch correta e rebase com `main`
- Revisar variaveis do ambiente alvo
- Confirmar migrations do Supabase revisadas
- Rodar `npm run release:check`
- Validar rotas criticas:
  - `/login`
  - `/relatorios`
  - `/negocios`
  - `/campanhas`
  - `/ai-agent`
- Validar endpoint de saude:
  - `/api/health`
- Revisar logs estruturados apos smoke test
- Publicar em `staging`
- Validar smoke em `staging`
- Publicar em `production`

## Gates automatizados

GitHub Actions:

- `CI`: qualidade geral do projeto
- `Deploy Staging`: push em `codex/**`
- `Deploy Production`: push em `main`

## Observacao operacional

Se o projeto ainda estiver com auto deploy nativo do Git integration da Vercel habilitado, voce pode ver deploy duplicado. O caminho recomendado e manter um unico fluxo oficial:

- ou Git integration da Vercel
- ou GitHub Actions com `deploy-staging.yml` e `deploy-production.yml`

Para gates formais antes do deploy automatico, prefira deixar GitHub Actions como fluxo oficial.
