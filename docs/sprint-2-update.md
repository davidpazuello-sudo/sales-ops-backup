# Sprint 2 Update

> Historico de entrega. Nao e a fonte principal da arquitetura atual.

## Objetivo

Estruturar dominio, dados reais e payloads do dashboard para reduzir dependencia de mock operacional e alinhar a pipeline ao retorno da HubSpot.

## Checklist executado

- [x] Definicao explicita das entidades principais em `lib/domain-model.js`
- [x] Extracao da transformacao da HubSpot para `lib/dashboard-domain.js`
- [x] Centralizacao do payload do dashboard em um builder unico
- [x] Enriquecimento do payload com `pipeline`, `states` e `ownerDirectory`
- [x] Alinhamento da pipeline visual ao payload real da HubSpot em `app/dashboard-sections.js`
- [x] Alinhamento da shell real (`app/dashboard-shell.js`) ao payload de pipeline retornado pela HubSpot
- [x] Remocao do mock que forcava deals para etapas fixas na pipeline
- [x] Fallback do dashboard convertido para estados reais de `loading`, `config_required` e `error`
- [x] Atualizacao do contrato do dashboard para o shape enriquecido
- [x] Atualizacao do mapa de fontes de dados
- [x] Criacao de testes minimos para dominio, contrato e fallback

## Checklist faltando

- [ ] Persistencia em banco ainda nao implementada
- [ ] Notificacoes, meetings, tasks e audit logs ainda nao foram conectados a dados reais
- [ ] Estados de loading, empty e error ainda podem ser expandidos para todas as telas

## Validacao prevista

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`

## Impacto na Sprint 3

- Interfere no proximo sprint: sim
- Motivo: a NORA e a persistencia passam a ter um modelo de dominio mais claro para usar dados reais do sistema.

## Observacoes

- O payload do dashboard agora carrega metadados de pipeline e de estados de tela sem quebrar o contrato anterior.
- A pipeline deixa de depender de um remapeamento local de estagios para exibir o que vem da HubSpot.
- O fallback local deixa de simular vendedores e negocios operacionais quando a HubSpot falha ou ainda nao esta configurada.
- A modelagem em `lib/domain-model.js` ainda e tecnica e leve, servindo como ponte para o banco que for escolhido nas proximas entregas.
