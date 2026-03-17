# Limpeza e Consolidacao

Checklist executavel para reduzir duplicacao, ruido historico e pontos de confusao no projeto.

## Rapido

- [x] Unificar menu repetido da NORA com a configuracao central.
  Resultado: o menu superior deixou de existir em dois lugares diferentes.

- [x] Remover configuracoes que nao eram usadas pelo produto.
  Resultado: sairam blocos antigos de erro, metricas e auditoria que so ocupavam espaco.

- [x] Corrigir textos quebrados em configuracoes centrais.
  Resultado: nomes e opcoes principais ficaram mais consistentes.

- [ ] Revisar e decidir destino dos anexos HTML antigos em `public/anexos-negocio`.
  Decisao sugerida: arquivar fora do app ou remover se nao fizerem parte de nenhum fluxo ativo.

## Importante

- [ ] Decidir um caminho oficial unico para mudancas de banco.
  Hoje existem migrations formais e tambem scripts SQL historicos fora desse fluxo.

- [ ] Arquivar ou remover o modelo antigo de dados em `lib/domain-model.js`.
  Hoje ele esta mais para referencia historica do que para fonte viva do sistema.

- [ ] Atualizar `docs/ARQUITETURA.md` para refletir o sistema atual.
  O documento ainda descreve versoes e fluxos ja ultrapassados.

- [ ] Marcar explicitamente documentos historicos como historicos.
  Exemplos: `docs/ATUALIZACOES-2026-03-11-2026-03-12.md`, `docs/sprint-1-update.md`, `docs/sprint-2-update.md`.

## Pode esperar

- [ ] Reavaliar o que ainda vale manter em `dashboard-shell.js` e `hubspot.js`.
  Sao pontos vivos do sistema, mas ainda muito concentrados.

- [ ] Consolidar melhor a documentacao de operacao, handoff e historico.
  A ideia e ter menos documentos competindo entre si como "fonte principal".
