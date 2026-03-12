# sales-ops-backup

Projeto Next.js preparado para deploy no Vercel, com foco em operacao comercial:
- Relatorios
- Vendedores
- Negocios (pipeline estilo CRM)
- Perfil e Configuracoes
- Painel de IA

## Repositorio oficial

- GitHub: `https://github.com/davidpazuello-sudo/sales-ops-backup`
- Remote git esperado: `origin`

## Documentacao completa

A documentacao tecnica e funcional esta em [`docs/README.md`](docs/README.md).

Principais documentos:
- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)
- [`docs/ATUALIZACOES-2026-03-11-2026-03-12.md`](docs/ATUALIZACOES-2026-03-11-2026-03-12.md)
- [`docs/UI-UX.md`](docs/UI-UX.md)
- [`docs/LAYOUT-INTERFACE.md`](docs/LAYOUT-INTERFACE.md)
- [`docs/DEPLOY-OPERACAO.md`](docs/DEPLOY-OPERACAO.md)
- [`docs/AMBIENTES-E-VARIAVEIS.md`](docs/AMBIENTES-E-VARIAVEIS.md)
- [`docs/RELEASE-CHECKLIST.md`](docs/RELEASE-CHECKLIST.md)
- [`docs/SEGURANCA-E-ROTACAO-DE-SEGREDOS.md`](docs/SEGURANCA-E-ROTACAO-DE-SEGREDOS.md)
- [`docs/SUPABASE-MIGRATIONS-E-RLS.md`](docs/SUPABASE-MIGRATIONS-E-RLS.md)
- [`docs/PUBLICACAO-USUARIOS-REAIS.md`](docs/PUBLICACAO-USUARIOS-REAIS.md)
- [`docs/MELHORIAS-E-SUGESTOES.md`](docs/MELHORIAS-E-SUGESTOES.md)

## Ambiente

Use o modelo de [`.env.example`](.env.example) e crie um arquivo `.env.local` com os valores do ambiente. Segredos operacionais nao devem ser enviados por chat ou salvos em documentos manuais; o processo de guarda e rotacao esta em [`docs/SEGURANCA-E-ROTACAO-DE-SEGREDOS.md`](docs/SEGURANCA-E-ROTACAO-DE-SEGREDOS.md).

Arquivos base por ambiente:

- [`.env.development.example`](.env.development.example)
- [`.env.staging.example`](.env.staging.example)
- [`.env.production.example`](.env.production.example)

Variaveis minimas:

```bash
HUBSPOT_ACCESS_TOKEN=seu_token_de_private_app_hubspot
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua_publishable_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_legada_opcional
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

## Autenticacao

O sistema agora usa autenticacao real com Supabase Auth e sessao HTTP-only.

Variaveis esperadas:
- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto no Supabase
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: chave publica do projeto
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: fallback para projetos antigos
- `NEXT_PUBLIC_APP_URL`: URL publica usada na recuperacao de senha

## Rodando local

```bash
npm install
npm run dev
```

## Build e qualidade de texto

O build executa validacao de copy para evitar problemas de codificacao:

```bash
npm run check:copy
npm run build
```

Checklist oficial de release:

```bash
npm run release:check
```

## Handoff recente

Se voce for retomar o sistema em outra maquina, comecar por:

- [`docs/ATUALIZACOES-2026-03-11-2026-03-12.md`](docs/ATUALIZACOES-2026-03-11-2026-03-12.md)
- [`docs/AMBIENTES-E-VARIAVEIS.md`](docs/AMBIENTES-E-VARIAVEIS.md)
- [`docs/SUPABASE-MIGRATIONS-E-RLS.md`](docs/SUPABASE-MIGRATIONS-E-RLS.md)

## Deploy no Vercel

1. Importe este repositorio `sales-ops-backup` no Vercel.
2. Framework preset: `Next.js`.
3. Defina variaveis separadas para Preview (staging) e Production.
4. Configure `VERCEL_TOKEN`, `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` nos secrets do GitHub se for usar os workflows versionados.
5. Use `npm run deploy:preview` para staging e `npm run deploy:production` para producao.

## Dominio customizado

1. No projeto Vercel, abra `Settings -> Domains`.
2. Adicione seu dominio.
3. Configure os registros DNS solicitados pelo Vercel no seu provedor.
4. Aguarde validacao SSL automatica.
