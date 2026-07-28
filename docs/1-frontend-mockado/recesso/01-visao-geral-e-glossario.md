---
titulo: Módulo Recesso — Visão Geral e Glossário
dominio: recesso
tags: [recesso, ferias, rlt, ocorrencia, saldo, glossario, visao-geral]
status: normativo
---

# Módulo Gestão de Recesso — Visão Geral e Glossário

## 1. Objetivo

Controlar o **saldo de recesso (dias)** de cada fornecedor **PJ**, por contrato, com:

- **Crédito automático** de **2,5 dias por mês de vigência**, acumulado a partir do ano de **2025**;
- **Lançamento automático de encerramento** na `dataFim` do contrato (rescisão + débito que zera o saldo);
- **Lançamento manual** de ocorrências de **crédito** e **débito** pelo usuário;
- **Extrato auditável** por contrato (quem lançou, quando, quanto, saldo resultante);
- **Saldo atual** visível fora da grade.

---

## 2. O que muda em relação ao resto do sistema

| Aspecto | Módulo NF (existente) | **Módulo Recesso (novo)** |
|---|---|---|
| Origem do dado | Tomticket + HCM (externo) | **O próprio nf-pjs** (sistema de origem) |
| Operação | Somente leitura | **Leitura + escrita** (insert de ocorrências) |
| Efeito de um bug | Exibição errada (corrigível ao re-sincronizar) | **Corrupção de saldo** (não há fonte para reconstruir) |
| Identidade do usuário | Não necessária | **Obrigatória** (campo "quem lançou") |

> Consequência prática: **validação e idempotência deixam de ser desejáveis e passam a ser críticas.**

---

## 3. Glossário (canônico deste módulo)

- **Ocorrência de Recesso** — Um lançamento no extrato do contrato. Tem data, descrição, tipo, quantidade, autor
  e competência mensal. É a **unidade de escrita** do módulo.
- **Tipo da ocorrência** — **`Crédito`** (aumenta o saldo) ou **`Débito`** (reduz o saldo).
- **Quantidade** — Número de **dias** da ocorrência. Sempre **positivo**; quem define o sinal é o *tipo*.
- **Saldo (linha)** — Saldo **acumulado** após aquela ocorrência (running balance), em ordem cronológica.
- **Saldo Atual** — Saldo final do contrato, exibido **fora da grade** do modal.
- **Competência Mensal** — Data mensal de aniversário do contrato (`DD/MM/AAAA`). Os créditos iniciam a partir do ano de **2025**.
- **Crédito Automático** — Os 2,5 dias lançados mensalmente **pelo sistema** (autor `SISTEMA`).
- **Rescisão e Encerramento Automáticos** — Ao expirar a vigência (`dataFim <= hoje`), o sistema gera a rescisão (ajuste dos dias remanescentes pelo critério dos 15 dias) e o débito de encerramento de contrato que zera o saldo.
- **Lançado por** — Quem registrou a ocorrência: um **usuário** (lançamento manual) ou **`SISTEMA`**
  (crédito/débito automático).

---

## 4. Atores

| Ator | Faz o quê |
|---|---|
| **Usuário (DP/Financeiro)** | Consulta o extrato, **lança** ocorrências (crédito/débito) e atualiza dados do fornecedor |
| **Sistema** | Gera os **créditos automáticos** de 2,5 dias por mês a partir de 2025 e o encerramento na `dataFim` |
| **Fornecedor PJ** | Sujeito do saldo (não acessa o sistema) |

---

## 5. Fluxo de alto nível

```
Contrato (Base de PJs: dataInicio/dataFim)
        │
        ├─► Motor de Crédito Automático ──► Ocorrências tipo Crédito (autor: SISTEMA, 2,5 dias/mês a partir de 2025)
        │                                └─► Rescisão + Débito de Encerramento (na dataFim, zera o saldo)
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
- **Crédito automático** mensal de 2,5 dias por contrato (a partir de 2025); rescisão e encerramento automáticos no fim da vigência.

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
