---
titulo: Módulo Recesso — Plano de Implementação
dominio: gestao
tags: [plano, etapas, checklist, testes, criterios-de-aceite, recesso]
status: normativo-para-implementacao
---

# Plano de Implementação — Módulo Recesso

> Arquitetura: `docs/14`. Padrões: `docs/15`. Regras: `02`. Pendências: **ler `06` antes de começar**.

## 1. Ordem de execução

Mesma estratégia que deu certo na refatoração: **de dentro para fora**, domínio primeiro.

| # | Etapa | Entregável | Pronto quando |
|---|---|---|---|
| 1 | **Value Objects** | `CompetenciaDeRecesso`, `TipoOcorrencia`, `QuantidadeDeDias`, `SaldoDeDias`, `AutorDoLancamento`, `OrigemDaOcorrencia` | Testes unitários de §4.A |
| 2 | **Entidade + Coleção** | `OcorrenciaDeRecesso`, `ExtratoDeRecesso` | Saldo calculado **em um único lugar** |
| 3 | **Motor de crédito automático** | `MotorDeCreditoMensal` | Testes de §4.B, **incluindo idempotência** |
| 4 | **Ports + mock com escrita** | `OcorrenciaDeRecessoRepository` (com `salvar`), `UsuarioAtual` + adapters | Lançar e reler funciona; persiste (R-12) |
| 5 | **Casos de uso** | `ListarContratosParaRecesso`, `LancarOcorrenciaDeRecesso`, `ExportarRecesso` | Validações de `02` §4 aplicadas |
| 6 | **UI — HUD de módulos** | `HudDeModulos` + roteamento entre NF e Recesso | Alternar módulos sem perder estado indevidamente |
| 7 | **UI — tabela + modal** | `TabelaDeRecesso`, `ModalRlt`, `SaldoAtual` | Checklist §3 |
| 8 | **UI — formulário** | `FormularioDeOcorrencia` | Lançamento reflete no extrato e no saldo na hora |
| 9 | **Backend (Fase 2)** | Tabela + endpoints de `05` | Checklist de `05` §6 |

> Etapas 1–3 **não dependem** de decisão de UI e podem começar já. As regras de direito (marco 2025,
> 2,5/mês, regra dos 15 dias na rescisão) estão **fechadas** em `02` — R-02/R-03/R-08/R-17 já foram
> superadas (`06` §1). O saldo é fracionário: guardar em **centésimos/DECIMAL**, nunca `FLOAT`.

## 2. Reaproveitamento obrigatório (não recriar)

| Item | Onde já existe |
|---|---|
| `Cnpj`, `Email`, `DataHora` | `src/domain/value-objects/` |
| `Fornecedor`, `Contrato` | `src/domain/entities/` |
| Busca por CNPJ (máscara ≡ dígitos) | `Cnpj.contem()` — **não escrever outro filtro** |
| HUD de filtros | componente existente, com props para **quais filtros/opções** exibir (`04` §2) |
| Modal (X / clique fora / ESC) | padrão do `ModalDeMensagens` |
| Tokens de marca | `public/brand/brand.css` (`docs/11`) |

> A base já teve o mesmo filtro duplicado 4 vezes. **Qualquer** lógica de busca/filtro aqui deve
> reusar o que existe ou virar método de coleção — nunca uma cópia nova.

## 3. Checklist de aceite (funcional)

### Tabela de PJs
- [ ] Colunas: **Razão Social · Nº do Contrato · Empresa Vinculada · Status · Informações**.
- [ ] Coluna **Informações** com os 3 botões de ação: `📄 Extrato`, `ⓘ Informações` e `🔄 Atualizar`.
- [ ] **Inativos aparecem** (com indicador de status inativo) — diferente do módulo de NF.
- [ ] Uma linha por contrato.
- [ ] Busca por CNPJ e Razão Social funciona **com e sem máscara**.
- [ ] Botão **`🔄 Atualizar`** re-consulta e atualiza os dados daquele fornecedor a partir da Base de PJs.

### Modal RLT
- [ ] Colunas: **Data da Ocorrência · ID · Descrição · Tipo · Qtd · Saldo · Quem Lançou · Competência**.
- [ ] Ordem **cronológica ascendente**.
- [ ] **Saldo Atual fora da grade**, igual ao saldo da última linha.
- [ ] Créditos automáticos aparecem com autor **`SISTEMA`** e são distinguíveis.
- [ ] Fecha no X, clique fora e ESC.
- [ ] PJ **sem ocorrências** → saldo `0` e estado vazio (não erro).

### Crédito automático
- [ ] Créditos mensais de 2,5 dias acumulam **a partir do ano de 2025**.
- [ ] Para contratos iniciados antes de 2025 (ex: `15/03/2023`), o primeiro crédito ocorre em `15/03/2025`.
- [ ] Nenhum crédito para período **futuro**.
- [ ] **Idempotente**: reprocessar N vezes **não** altera o saldo.
- [ ] Contrato vencido (`dataFim <= hoje`): lança a rescisão (regra dos 15 dias) **e o débito de encerramento** que zera o saldo acumulado (saldo final = 0).
- [ ] Um PJ tem no máximo **um contrato ativo** por vez (sempre 100%).

### Lançamento manual
- [ ] Quantidade **> 0** (aceita fração, ex. `2,5`).
- [ ] Descrição obrigatória.
- [ ] Débito além do saldo **bloqueado** (default R-05), com mensagem clara.
- [ ] "Quem lançou" **não é campo do formulário**.
- [ ] Competência **derivada** da data, não digitada.
- [ ] Após salvar, extrato e saldo atualizam **sem recarregar** e **sem duplicar** linha.
- [ ] Erro ao salvar **preserva** o formulário preenchido.

## 4. Testes automatizados exigidos

Mesma exigência da base (`docs/16` §4): domínio testado antes de UI.

### A. Value Objects
- [ ] `QuantidadeDeDias` rejeita `0` e negativo (aceita fração, ex. 2,5).
- [ ] `CompetenciaDeRecesso` preserva o dia base em meses curtos (inclusive **29/02**).
- [ ] `TipoOcorrencia.sinal()` = +1 / −1.

### B. Motor de crédito mensal
- [ ] Contrato `15/03/2023`, hoje `17/07/2026` → **42,5 dias** (17 créditos mensais **a partir de 2025**).
- [ ] Primeiro crédito em **`15/03/2025`** (marco 2025), não na data de início.
- [ ] Reprocessar N× → **continua 42,5** (idempotência por chave determinística).
- [ ] Contrato com início/competência **futura** → **0**.
- [ ] Contrato fora da vigência (`dataFim <= hoje`) → gera **rescisão (+2,5 ou +0)** e **encerramento** (débito) que zera o saldo.
- [ ] Um PJ tem no máximo **um contrato ativo** por vez (proporção removida).

### C. Saldo
- [ ] Running balance do exemplo trabalhado de `02` §3.5 (créditos mensais → rescisão → encerramento = saldo `0`).
- [ ] Aritmética **fracionária** sem erro de ponto flutuante (centésimos de dia).
- [ ] **Invariante:** `saldoAtual == última linha == Σcréditos − Σdébitos`.
- [ ] Extrato vazio → `0`.

### D. Lançamento
- [ ] Débito acima do saldo é rejeitado (R-05).
- [ ] Data futura rejeitada (R-10).
- [ ] Autor gravado como o usuário atual, **ignorando** qualquer valor vindo do formulário.

### E. UI (RTL)
- [ ] Tabela, modal e formulário conforme §3.
- [ ] Lançar ocorrência atualiza saldo na tela.

## 5. Riscos

| Risco | Mitigação |
|---|---|
| **Data ISO sem hora lida como UTC** desloca o cálculo de competência em 1 ano | Ver §5.1 — bug real encontrado na validação da Fase 1 |
| **Crédito duplicado** corrompe saldo silenciosamente | Índice único filtrado (`03` §5) + teste de idempotência |
| Saldo fracionário em `FLOAT` acumula erro ao longo de dezenas de meses | Centésimos de dia no domínio, `DECIMAL(10,2)` no banco (`03` §2) |
| Auditoria inútil por falta de identidade de usuário | Resolver **R-04** antes de liberar em produção |
| Saldo divergente entre tela e futura exportação | Saldo só existe em `ExtratoDeRecesso` — nunca recalculado na UI |
| Filtro/busca duplicado (repetir o erro do CNPJ) | Reusar `Cnpj.contem()` e métodos de coleção |
| HUD reaproveitado mostrar filtros sem sentido | Filtros e opções **por props** (`04` §2) |

### 5.1 Armadilha de fuso horário (encontrada na validação da Fase 1)

`dataInicio` / `dataFim` de contrato chegam como data **sem hora** (`"2023-01-01"`). Nesse formato
o JavaScript aplica parse **UTC**: em UTC-3 o valor vira `31/12/2022 21:00` local. O efeito é
silencioso e grave — toda a competência desliza um ano:

| | Antes do fix | Correto |
|---|---|---|
| 1º período | `2022/2023` | `2023/2024` |
| Data do crédito | `31/12/2023` | `01/01/2024` |

O saldo total continuava certo (90 dias), então **só a competência denunciava o erro** — motivo pelo
qual passou pelos testes iniciais, que construíam datas com `new Date(2023, 0, 1)` (já local).

**Regra:** nunca fazer `new Date(stringDeData)` com data sem hora. No frontend a conversão é
responsabilidade de `DataHora.paraDataLocal()`. Vale o mesmo alerta para a Fase 2: ao ler
`DATE` do SQL Server e serializar em JSON, garantir que o backend não introduza deslocamento
de fuso (`date` puro, sem `datetime` em UTC).

Regressão coberta em `tests/unit/recesso.test.ts` → *"data ISO sem hora é lida no fuso local"*.

## 6. Definition of Done

1. [ ] Checklist §3 completo **com evidência**.
2. [ ] Testes de §4 passando; `npm run typecheck`, `lint` e `test` limpos.
3. [ ] Nenhuma regra de negócio em componente React (lint de fronteiras verde).
4. [ ] Pendências 🔴 de `06` §1 **decididas** ou explicitamente aceitas como provisórias, com o
       default sinalizado no código.
5. [ ] Documentação atualizada: decisões movidas para `06` §5 e refletidas em `02`.
