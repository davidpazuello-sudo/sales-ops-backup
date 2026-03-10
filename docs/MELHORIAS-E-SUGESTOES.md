# Nota de Melhoria e Sugestoes

## 1) Melhorias de curto prazo (1 a 2 sprints)

1. Modularizar `dashboard-shell.js` por dominio:
   - views de relatorios
   - views de vendedores
   - views de negocios
   - notificacoes e busca global
2. Adicionar testes de regressao visual para pipeline e topbar
3. Adicionar testes E2E para fluxos:
   - abrir perfil de negocio
   - mover card de etapa
   - abrir anexo em popup
4. Padronizar nomenclaturas em todas as telas

## 2) Melhorias de medio prazo

1. Introduzir schema de validacao para payload HubSpot
2. Criar camada de cache para reduzir chamadas repetidas
3. Criar controle de permissao por perfil de usuario
4. Evoluir notificacoes para backend real com estados persistidos

## 3) Melhorias de UX

1. Exibir feedback de salvamento em acoes criticas
2. Adicionar skeleton loading para cards e tabelas
3. Melhorar acessibilidade de modais e navegacao por teclado
4. Revisar microcopys para objetividade e padrao unico

## 4) Melhorias de design system

1. Extrair tokens para pacote de design central
2. Definir escala tipografica documentada por nivel
3. Definir biblioteca de componentes base (Button, Card, Modal, Input)
4. Criar guideline de espacamentos e grid com exemplos

## 5) Melhorias de operacao

1. CI com etapas:
   - lint
   - check:copy
   - build
   - smoke test
2. Estrategia de rollback documentada
3. Checklist de release para Vercel e dominio customizado
4. Rotina automatica de backup semanal

## 6) Riscos atuais e mitigacao

- Risco: concentracao de codigo em arquivo unico.
  Mitigacao: quebrar por modulos e responsabilidades.

- Risco: dependencias de integracao sem teste de contrato.
  Mitigacao: testes de contrato para payload da HubSpot.

- Risco: regressao de layout em ajustes rapidos.
  Mitigacao: snapshot visual e checklist de QA por tela.
