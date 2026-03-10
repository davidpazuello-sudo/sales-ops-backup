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
- [`docs/UI-UX.md`](docs/UI-UX.md)
- [`docs/LAYOUT-INTERFACE.md`](docs/LAYOUT-INTERFACE.md)
- [`docs/DEPLOY-OPERACAO.md`](docs/DEPLOY-OPERACAO.md)
- [`docs/MELHORIAS-E-SUGESTOES.md`](docs/MELHORIAS-E-SUGESTOES.md)

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

## Build e qualidade de texto

O build executa validacao de copy para evitar problemas de codificacao:

```bash
npm run check:copy
npm run build
```

## Deploy no Vercel

1. Importe este repositorio `sales-ops-backup` no Vercel.
2. Framework preset: `Next.js`.
3. Defina `HUBSPOT_ACCESS_TOKEN` em Production, Preview e Development.
4. Faca deploy da branch desejada.

## Dominio customizado

1. No projeto Vercel, abra `Settings -> Domains`.
2. Adicione seu dominio.
3. Configure os registros DNS solicitados pelo Vercel no seu provedor.
4. Aguarde validacao SSL automatica.
