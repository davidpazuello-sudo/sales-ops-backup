# Deploy e Operacao

## 1) Ambiente

Obrigatorio:
- `HUBSPOT_ACCESS_TOKEN`

Opcional (futuro):
- chaves para observabilidade e monitoramento

## 2) Pipeline de build

Scripts principais:
- `npm run dev`
- `npm run check:copy`
- `npm run build`
- `npm run start`

`build` depende de `check:copy`, evitando publicar texto com codificacao quebrada.

## 3) Vercel

Passos:
1. Importar repo no Vercel
2. Definir framework Next.js
3. Configurar env vars
4. Deploy

## 4) Diagnostico rapido de erro

Checklist:
- token HubSpot existe no ambiente?
- API retornando 503 por token ausente?
- check de copy bloqueou build?
- rotas dinamicas resolvendo params corretamente?

## 5) Observabilidade recomendada

- log estruturado no endpoint HubSpot
- metrica de latencia da API
- metrica de taxa de erro por endpoint
- alerta de token invalido/expirado

## 6) Backups

Recomendacoes:
- manter backup remoto em repo espelho
- gerar backup bundle periodico (`git bundle`)
- armazenar bundles em local seguro com versionamento de data
