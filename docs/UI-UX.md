# UI e UX

## 1) Objetivo de UX

Entregar uma experiencia de CRM comercial com:
- leitura rapida de status
- acao em poucos cliques
- foco em produtividade do gestor e vendedor

## 2) Principios de interface

- Clareza: informacao critica no topo e em cards
- Hierarquia: heading forte, metrica resumida, detalhe secundario
- Consistencia: mesma estrutura base em relatorios, vendedores, negocios
- Velocidade: acoes primarias sempre visiveis

## 3) Jornada principal

1. Usuario entra em relatorios para visao macro
2. Aprofunda em vendedores ou negocios
3. Move deals no pipeline
4. Abre perfil de negocio para tarefas, anexos e resumo IA
5. Usa notificacoes e busca global para triagem rapida

## 4) Comportamentos UX implementados

- Cards de negocio clicaveis para perfil
- Drag and drop de card no pipeline (segurar para arrastar)
- Colapso de etapa com layout compacto
- Modal de anexo no perfil de negocio
- Notificacoes com abas (nao lidas, todos, lixeira)
- Campo de busca global no topbar

## 5) Acessibilidade (status)

Pontos positivos:
- uso de `aria-label` em botoes criticos
- foco visual em campos e selects
- controle por teclado em interacoes basicas

Pontos a melhorar:
- revisar contraste de todos os estados
- revisar ordem de foco em modais
- adicionar skip links e landmarks adicionais

## 6) Copys e nomenclatura

A nomenclatura e orientada ao dominio comercial:
- Relatorios
- Vendedores
- Negocios
- Configuracoes
- Pipeline
- Proximas tarefas

Recomendacao:
- manter glossario unico para evitar variacoes (ex.: responsavel x proprietario)

## 7) Heuristicas de melhoria UX

- reduzir carga cognitiva com progressive disclosure
- destacar metrica mais relevante por contexto
- oferecer feedback imediato para salvar/atualizar
- manter padrao de confirmacao em acoes destrutivas
