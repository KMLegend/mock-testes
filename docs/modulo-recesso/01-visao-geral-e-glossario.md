---
titulo: Módulo Recesso — Visão Geral e Glossário
dominio: recesso
tags: [recesso, ferias, rlt, ocorrencia, saldo, glossario, visao-geral]
status: normativo
---

# Módulo Gestão de Recesso — Visão Geral e Glossário

## 1. Objetivo

Controlar o **saldo de recesso (dias)** de cada fornecedor **PJ**, com:

- **Crédito automático** de **30 dias** a cada **1 ano de vigência do contrato**;
- **Lançamento manual** de ocorrências de **crédito** e **débito** pelo usuário;
- **Extrato auditável** por PJ (quem lançou, quando, quanto, saldo resultante);
- **Saldo atual** visível fora da grade.

## 2. O que muda em relação ao resto do sistema

| Aspecto | Módulo NF (existente) | **Módulo Recesso (novo)** |
|---|---|---|
| Origem do dado | Tomticket + HCM (externo) | **O próprio nf-pjs** (sistema de origem) |
| Operação | Somente leitura | **Leitura + escrita** (insert de ocorrências) |
| Efeito de um bug | Exibição errada (corrigível ao re-sincronizar) | **Corrupção de saldo** (não há fonte para reconstruir) |
| Identidade do usuário | Não necessária | **Obrigatória** (campo "quem lançou") |

> Consequência prática: **validação e idempotência deixam de ser desejáveis e passam a ser críticas.**

## 3. Glossário (canônico deste módulo)

- **RLT** — Rótulo da **primeira coluna** da tabela de PJs; é um **botão** que abre o **modal com o
  extrato de recesso** (ocorrências + saldo) daquele PJ.
  > ⚠️ O **significado da sigla** não foi definido — ver **R-01** em `06`. A **função** está definida.
- **Ocorrência de Recesso** — Um lançamento no extrato. Tem data, descrição, tipo, quantidade, autor
  e período aquisitivo. É a **unidade de escrita** do módulo.
- **Tipo da ocorrência** — **`Crédito`** (aumenta o saldo) ou **`Débito`** (reduz o saldo).
- **Quantidade** — Número de **dias** da ocorrência. Sempre **positivo**; quem define o sinal é o *tipo*.
- **Saldo (linha)** — Saldo **acumulado** após aquela ocorrência (running balance), em ordem cronológica.
- **Saldo Atual** — Saldo final do PJ, exibido **fora da grade** do modal.
- **Período Aquisitivo** — Janela de **1 ano de vigência do contrato** que dá direito aos 30 dias.
  Ancorado na **data inicial do contrato**. É o que o usuário chama de "competência" neste módulo.
  > **Não confundir** com o VO `Competencia` (`MM-AAAA`) do módulo de NF — ver README.
- **Crédito Automático** — Os 30 dias lançados **pelo sistema** (não por pessoa) ao completar um
  período aquisitivo. Autor registrado como **`SISTEMA`**.
- **Lançado por** — Quem registrou a ocorrência: um **usuário** (lançamento manual) ou **`SISTEMA`**
  (crédito automático).

## 4. Atores

| Ator | Faz o quê |
|---|---|
| **Usuário (DP/Financeiro)** | Consulta o extrato e **lança** ocorrências (crédito/débito) |
| **Sistema** | Gera os **créditos automáticos** de 30 dias por período aquisitivo |
| **Fornecedor PJ** | Sujeito do saldo (não acessa o sistema) |

## 5. Fluxo de alto nível

```
Contrato (HCM: dataInicio/dataFim)
        │
        ├─► Motor de Crédito Automático ──► Ocorrências tipo Crédito (autor: SISTEMA, 30 dias/ano)
        │                                            │
Usuário ─► lança Ocorrência (Crédito/Débito) ────────┤
                                                     ▼
                                          Extrato ordenado por data
                                                     │
                                          Saldo corrente por linha
                                                     ▼
                                        SALDO ATUAL (fora da grade)
```

## 6. Escopo

**No escopo:**
- Nova **view** ("Gestão de Recesso") com **HUD de seleção**, reaproveitando o hub de filtros existente.
- Tabela de PJs com as colunas definidas em `04` §3.
- **Modal RLT** com o extrato e o saldo atual.
- **Inserção** de novas ocorrências.
- **Crédito automático** de 30 dias por ano de vigência.

**Fora do escopo (salvo decisão posterior):**
- Aprovação/workflow de ocorrências (não há etapa de aprovação definida).
- Edição/exclusão de ocorrências já lançadas — ver **R-07** em `06` (recomendação: **estorno**, não edição).
- Integração do recesso com folha, pagamento ou o módulo de NF.
- Notificação/e-mail sobre saldo (o worker de alertas de `docs/05` é do módulo de NF).

## 7. Onde este módulo se encaixa

- **Arquitetura e padrões:** exatamente os de `docs/14` (React + TS, Ports & Adapters) e `docs/15`
  (SOLID + Object Calisthenics). **Nenhuma arquitetura nova.**
- **Reaproveita do domínio existente:** `Cnpj`, `Email`, `DataHora`, `Fornecedor`, `Contrato`.
- **Reaproveita da UI:** HUD de filtros, tokens de marca (`docs/11`), padrão de modal e de tabela.
- **Backend (Fase 2):** novo domínio na CITY API, seguindo `docs/06` e `docs/12` — porém com
  **endpoints de escrita**, o que é inédito na base (ver `05`).
