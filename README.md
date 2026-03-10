# sales-ops-backup

Projeto Next.js preparado para deploy no Vercel.

## Repositório oficial

- GitHub: `https://github.com/davidpazuello-sudo/sales-ops-backup`
- Remote git esperado: `origin`

## Ambiente

Crie um arquivo `.env.local` com:

```bash
HUBSPOT_ACCESS_TOKEN=seu_token_de_private_app_hubspot
```

## Rodando local

```bash
npm install
npm run dev
```

## Deploy no Vercel

1. Importe este repositório `sales-ops-backup` no Vercel.
2. Framework preset: `Next.js`.
3. Defina a variável de ambiente `HUBSPOT_ACCESS_TOKEN` (Production/Preview/Development).
4. Faça deploy da branch desejada.

## Domínio customizado

1. No projeto Vercel, abra `Settings -> Domains`.
2. Adicione seu domínio.
3. Configure os registros DNS solicitados pelo Vercel no seu provedor.
4. Aguarde validação SSL automática.
