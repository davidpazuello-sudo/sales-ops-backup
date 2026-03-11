# Data Source Map

## Dados reais

- `app/api/hubspot/dashboard/route.js`
- `lib/hubspot.js`
- Dashboard principal quando `HUBSPOT_ACCESS_TOKEN` estiver configurado

Blocos que podem usar dados reais hoje:

- resumo executivo
- cards de KPIs comerciais
- lista de vendedores
- lista de negocios
- relatorios resumidos por vendedor
- pipeline por etapas usando labels reais da HubSpot
- diretorio de owners para cruzamento por email

## Dados mockados ou derivados localmente

- conteudo da NORA
- notificacoes do painel lateral
- reunioes internas e detalhes de reuniao
- boa parte das configuracoes e preferencias
- parte do comportamento da pipeline quando nao houver retorno suficiente da HubSpot

## Observacoes

- A shell ja suporta fallback visual quando a HubSpot nao responde.
- A NORA ainda e uma experiencia de interface, nao um backend funcional.
- O proximo passo para producao e reduzir blocos mockados nas areas operacionais.
- A Sprint 2 passa a explicitar entidades de dominio e um payload mais rico (`pipeline`, `states`, `ownerDirectory`) sem quebrar o contrato base do dashboard.
