# Layout e Interface

## 1) Estrutura base

Grid principal da aplicacao:
- Sidebar fixa (expandida/recolhida)
- Topbar fixa (menu, notificacao, busca, IA, sair)
- Conteudo principal com cards e tabelas

## 2) Design tokens

Definidos em `app/globals.css`:

- Cores:
  - `--bg`
  - `--panel`
  - `--panel-soft`
  - `--border`
  - `--text`
  - `--muted`
  - `--heading`
  - `--accent`
  - `--accent-soft`
- Escalas:
  - `--font-scale`
  - `--density-scale`
- Superficie:
  - `--surface-radius`
  - `--surface-shadow`
- Motion:
  - `--motion-fast`
  - `--motion-normal`

## 3) Fontes

Carregadas via `next/font/google`:
- Manrope (padrao)
- IBM Plex Sans
- Source Sans 3
- Montserrat
- Nunito Sans
- Work Sans

A fonte ativa e aplicada por dataset em `html[data-font]`.

## 4) Nomenclaturas de layout

Principais classes globais (modulo principal):
- `appShell`, `sidebar`, `topbar`, `content`
- `settingsLayout`, `settingsSidebar`, `settingsContent`
- `pipelineBoard`, `pipelineColumn`, `pipelineDealCard`
- `notificationsPanel`, `globalSearchPanel`

## 5) Regras de responsividade

Breakpoints usados no modulo CSS principal:
- ~1180px: ajuste de colunas de configuracao
- ~980px: grids viram coluna unica

## 6) Padrao visual atual

- bordas suaves e superficies claras
- destaque primario em azul institucional e acento laranja
- cards com contraste moderado
- tipografia de alto peso em titulos e metricas

## 7) Estados de interface

- Hover: realce leve de fundo
- Focus: borda e sombra de foco em campos
- Active: estados de botoes e badges
- Empty state: texto simples sem box pesado (pipeline)
- Modal: overlay + painel central para anexos

## 8) Guia de consistencia

Sempre manter:
- altura consistente de controles semelhantes
- labels curtas e sem ambiguidade
- mesma semantica visual para acoes primarias e secundarias
- alinhamento vertical de icones do topbar
