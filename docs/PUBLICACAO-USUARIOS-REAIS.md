# Publicacao para Usuarios Reais

## 1) Objetivo

Este documento descreve o passo a passo para levar o `sales-ops-backup` do estado atual para um ambiente pronto para uso real por usuarios da equipe comercial.

## 2) O que precisa estar pronto antes da publicacao

Checklist minimo:
- repositorio principal atualizado no GitHub
- projeto criado no Vercel
- variavel `HUBSPOT_ACCESS_TOKEN` configurada
- dominio definido
- fluxo principal validado por negocio e vendas
- notificacoes e dados da HubSpot carregando sem erro
- lider comercial e 1 ou 2 usuarios piloto aprovando a experiencia

## 3) Ambientes recomendados

Idealmente manter 3 ambientes:
- `Development`: trabalho local e testes do dia a dia
- `Preview`: homologacao antes de publicar
- `Production`: ambiente real da equipe

No Vercel:
- `Production` deve apontar para a branch principal de publicacao
- `Preview` deve ser usado para validar cada ajuste importante

## 4) Preparacao tecnica

### 4.1 Repositorio

1. Confirmar que o repo original e `sales-ops-backup`
2. Confirmar que o `origin` aponta para o GitHub correto
3. Garantir que o `main` tenha a versao aprovada para publicacao
4. Garantir backup atualizado em `sales-ops-backup-2`

### 4.2 Variaveis de ambiente

Obrigatoria:
- `HUBSPOT_ACCESS_TOKEN`

Recomendacao:
- configurar a mesma variavel em `Development`, `Preview` e `Production`
- usar token de private app com escopo minimo necessario

### 4.3 Integracao HubSpot

Antes de publicar, validar:
- leitura de owners
- leitura de deals
- preenchimento correto de nome, email e cargo
- pipeline vindo da HubSpot com etapas esperadas
- comportamento de fallback quando HubSpot nao responde

## 5) QA funcional antes do go-live

Executar validacao manual nessas areas:

### 5.1 Login

- abrir tela de login
- entrar
- sair
- recuperar senha visualmente
- solicitar acesso visualmente

### 5.2 Relatorios

- abrir `/relatorios`
- validar cards e tabela principal
- validar leitura em desktop e notebook

### 5.3 Vendedores

- abrir `/vendedores`
- usar filtro por nome
- abrir perfil do vendedor
- abrir reunioes internas
- abrir detalhe de reuniao

### 5.4 Negocios

- abrir `/negocios`
- filtrar por proprietario
- filtrar por ultima atividade
- recolher e expandir etapas
- mover card de etapa
- abrir perfil do negocio clicando no card
- validar popup de anexos

### 5.5 Perfil e configuracoes

- abrir `/perfil`
- validar foto
- validar nome, email e cargo
- navegar em configuracoes

### 5.6 IA

- abrir `/ai-agent`
- validar sidebar
- validar campo de envio
- validar anexo e microfone no browser principal

## 6) Passo a passo para publicar no Vercel

### 6.1 Criar ou revisar o projeto

1. Entrar no Vercel
2. Importar o repo `sales-ops-backup`
3. Escolher preset `Next.js`
4. Confirmar branch de producao

### 6.2 Configurar variaveis

1. Abrir `Settings > Environment Variables`
2. Cadastrar `HUBSPOT_ACCESS_TOKEN`
3. Aplicar em `Production`, `Preview` e `Development`
4. Fazer redeploy se necessario

### 6.3 Configurar dominio

1. Abrir `Settings > Domains`
2. Adicionar dominio principal
3. Configurar DNS no provedor
4. Esperar SSL ficar ativo
5. Acessar o dominio final e validar carregamento

## 7) Passo a passo para liberar para usuarios reais

### Etapa 1: piloto interno

1. Selecionar 2 a 5 usuarios da equipe
2. Validar login, navegacao e pipeline
3. Coletar feedback de usabilidade
4. Corrigir os problemas bloqueadores

### Etapa 2: homologacao com lideranca

1. Apresentar o fluxo fim a fim
2. Confirmar que dados da HubSpot batem com a operacao
3. Validar nomenclaturas comerciais
4. Aprovar o ambiente para producao

### Etapa 3: go-live controlado

1. Definir data e horario de publicacao
2. Evitar janela de pico comercial
3. Publicar no Vercel
4. Validar rotas principais apos deploy
5. Liberar acesso para a equipe

### Etapa 4: acompanhamento pos-publicacao

Nas primeiras 24 a 72 horas:
- monitorar falhas de integracao
- monitorar lentidao
- acompanhar feedback dos usuarios
- registrar problemas por prioridade

## 8) Checklist de pronto para producao

Marcar tudo antes do go-live:
- build funcionando sem erro
- `npm run check:copy` sem falha
- deploy do Vercel concluido
- dominio ativo com SSL
- token HubSpot funcionando
- pipeline com dados reais
- perfil com email e cargo vindos da HubSpot
- anexo abrindo em popup
- navegacao entre paginas funcionando
- responsividade validada

## 9) Recomendacoes operacionais para usuarios reais

- definir um dono de produto interno
- definir um responsavel tecnico
- criar canal de suporte rapido
- documentar mudancas importantes por versao
- publicar melhorias em lote, nao em horarios criticos

## 10) Sugestao de ordem ideal para chegar no go-live

1. Consolidar codigo no `main`
2. Rodar QA manual
3. Validar Preview no Vercel
4. Ajustar dominio
5. Fazer piloto com poucos usuarios
6. Corrigir problemas encontrados
7. Publicar em Production
8. Acompanhar uso real e feedback

## 11) O que ainda recomendo antes de uso massivo

- adicionar testes E2E dos fluxos mais criticos
- adicionar monitoramento de erro
- criar rotina de backup automatizado
- documentar suporte e rollback
- separar melhor o `dashboard-shell.js` para facilitar manutencao
