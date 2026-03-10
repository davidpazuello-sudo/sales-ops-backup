# Data Source Map

## Dados reais

- `app/api/hubspot/dashboard/route.js`
- `lib/hubspot.js`
- Dashboard principal quando `HUBSPOT_ACCESS_TOKEN` estiver configurado

Blocos que podem usar dados reais hoje:

- resumo executivo
- cards de KPIs comerciais
- lista de vendedores
- lista de negócios
- relatórios resumidos por vendedor

## Dados mockados ou derivados localmente

- conteúdo do agente de IA
- notificações do painel lateral
- reuniões internas e detalhes de reunião
- boa parte das configurações e preferências
- parte do comportamento da pipeline quando não houver retorno suficiente da HubSpot

## Observações

- A shell já suporta fallback visual quando a HubSpot não responde.
- O agente de IA ainda é uma experiência de interface, não um backend funcional.
- O próximo passo para produção é reduzir blocos mockados nas áreas operacionais.
