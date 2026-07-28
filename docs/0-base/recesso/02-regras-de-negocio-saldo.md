---
titulo: Módulo Recesso — Regras de Negócio (Saldo e Acúmulo Mensal)
dominio: recesso
tags: [regras, saldo, credito-mensal, competencia, rescisao, idempotencia, normativo]
status: normativo
---

# Regras de Negócio — Saldo e Acúmulo Mensal

> **Documento normativo.** É o coração do módulo. Qualquer implementação deve reproduzir
> exatamente estas regras. Itens marcados **(R-xx)** têm decisão pendente em `06-pendencias-e-decisoes.md`
> — implementar **parametrizável** e sinalizar; **não inventar**.

> ⚠️ **Revisão de modelo (2026-07-22).** O saldo passou a ser **por contrato**, acumulado
> **mensalmente**. Isto substitui o modelo anterior (30 dias por período aquisitivo anual, saldo
> único por PJ). Ficam **superadas** as decisões ~~R-02~~ (momento do crédito anual) e
> ~~R-03~~ (série única ancorada no contrato mais antigo).

## 1. Unidade de controle: o CONTRATO

O saldo de recesso é mantido **por contrato**, não por PJ.

> **Regra de negócio:** um fornecedor PJ **nunca** presta serviço a duas empresas ao mesmo
> tempo — ao mudar de empresa, **rescinde** o contrato anterior e **gera** um novo. Portanto,
> cada PJ tem no máximo **um contrato ativo** por vez, e o direito de recesso é **sempre
> 100%** daquele contrato.

### 1.1 Status do contrato (derivado da vigência)

O status de um contrato é **derivado automaticamente** da vigência (`dataInicio` / `dataFim`):

| Condição | Status |
|---|---|
| Hoje está dentro de `[dataInicio, dataFim]` | **Ativo** |
| Hoje está fora de `[dataInicio, dataFim]` | **Inativo** |

> **Não existe encerramento manual.** O contrato torna-se inativo automaticamente quando
> `dataFim` é ultrapassada. O acúmulo de recesso para naturalmente nessa data (§2.3).

## 2. Acúmulo mensal

A cada **aniversário mensal da data de início do contrato**, o sistema credita:

```
crédito do mês = 2,5 dias
```

- **Dia base** = dia da `Contrato.dataInicio`. Contrato iniciado em 15/03 credita todo dia 15.
- **Marco inicial de crédito**: Os créditos mensais de recesso passam a ser acumulados a partir do ano de **2025**. Para contratos iniciados antes de 2025 (ex.: `15/03/2023`), o acúmulo inicia no mesmo dia/mês em 2025 (`15/03/2025`).
- **O primeiro crédito nasce um mês DEPOIS do início** — mês incompleto não gera direito.
- 2,5 × 12 = 30 dias/ano, equivalente ao modelo anual anterior.

### 2.1 Competência

A **competência** de um lançamento é a **data mensal** a que ele se refere (`dd/mm/aaaa`),
não mais um período anual. Para lançamento manual, é a competência **que contém** a data
informada, ancorada no dia base.

### 2.2 Meses curtos

O dia base é preservado: um contrato iniciado em **31/01** credita em 28/02 (ou 29/02) e
**volta para 31/03**. A competência nunca "trava" no dia menor.

### 2.3 Limite do acúmulo

Para de creditar no **primeiro** destes: hoje, `Contrato.dataFim`, ou a **data da rescisão**.

### 2.4 Idempotência (crítico — não negociável)

Chave: **(contrato, competência mensal)**. Nunca pode haver dois créditos automáticos para
o mesmo par. Reexecutar a rotina **não altera** o saldo.

### 2.5 Última data de cálculo

É o **MAX** da coluna de data de cálculo entre os lançamentos automáticos do contrato.
É a referência da regra dos 15 dias (§4).

### 2.6 Quando o motor executa (R-09)
> **Default:** sob demanda, ao listar/ler o extrato — determinístico e idempotente.
> A UI expõe um botão **Atualizar** que dispara a mesma rotina.
> Alternativa: job agendado. Se a Fase 2 adotar job, manter a mesma chave de idempotência.

## 3. Cálculo do saldo

### 3.1 Ordenação
Por **data de cálculo (ascendente)**; empate resolvido por **data de criação** (`criado_em`),
garantindo ordem estável e reproduzível.

### 3.2 Saldo por linha (running balance)
```
saldo(0) = 0
saldo(n) = saldo(n-1) + (tipo == Crédito ? +quantidade : -quantidade)
```

### 3.3 Saldo atual
```
saldoAtual = Σ(créditos) − Σ(débitos)
```
Exibido **fora da grade** do modal, ao lado do **dia/mês base** do contrato (`04` §4.3).
Deve ser **o mesmo valor** do saldo da última linha — **invariante**, coberto por teste.

### 3.4 Aritmética de frações

Quantidades são **fracionárias** (2,5 · 1,5 · 1,0). Somar em ponto flutuante acumula erro ao
longo de dezenas de meses e o saldo deixa de fechar.

> **Regra:** guardar em **centésimos de dia (inteiro)** e converter só na exibição.
> Na Fase 2, usar `DECIMAL(10,2)` — nunca `FLOAT`.

### 3.5 Exemplo (contrato iniciado em 29/02/2024, fim da vigência 31/10/2025)
| # | Cálculo | Competência | Descrição | Tipo | Qtd | Saldo |
|---|---|---|---|---|---|---|
| 1 | 28/02/2025 | 28/02/2025 | Crédito mensal de recesso | Crédito | 2,5 | **2,5** |
| … | … | … | … | … | … | … |
| 8 | 29/09/2025 | 29/09/2025 | Crédito mensal de recesso | Crédito | 2,5 | **20** |
| 9 | 31/10/2025 | 31/10/2025 | Rescisão contratual (+2,5 crédito) — 32 dia(s) | Crédito | 2,5 | **22,5** |
| 10 | 31/10/2025 | 31/10/2025 | Encerramento de contrato (zera o saldo atual) | Débito | 22,5 | **0** |

## 4. Fim da vigência e rescisão

O contrato torna-se **inativo automaticamente** quando a `dataFim` é ultrapassada (`dataFim <= hoje`).
O acúmulo mensal para naturalmente nessa data (§2.3). Não há ação manual de encerramento.

Quando a `dataFim` do contrato é atingida ou ultrapassada, o sistema executa **dois lançamentos automáticos na `dataFim`**, nesta ordem:

**1. Rescisão contratual** — fecha o mês quebrado:
```
dias = data da rescisão (dataFim) − última data de cálculo
crédito = dias >= 15 ? 2,5 : 0
```
A linha é gravada **mesmo com crédito zero** — é ela que documenta que a regra foi aplicada.
Descrição: `Rescisão contratual (+0 crédito) — X dia(s)` ou `Rescisão contratual (+2,5 crédito) — X dia(s)`.

**2. Encerramento de contrato** — débito do saldo acumulado remanescente, **zerando** o saldo final do contrato:
```
débito = saldo acumulado total após a rescisão
```
Descrição: `Encerramento de contrato (zera o saldo atual)`.
É este lançamento de débito que zera o saldo do contrato encerrado.

Após o encerramento: o contrato **para de acumular**, **bloqueia** novos lançamentos e o
histórico **permanece** visível.

## 5. Regras de lançamento manual

1. **Quantidade** deve ser **> 0** (aceita fração, passo de 0,5). O sinal vem do **tipo**.
2. **Tipo** obrigatório: `Crédito` ou `Débito`.
3. **Descrição** obrigatória — é o que dá rastreabilidade.
4. **Data da ocorrência** obrigatória. Data futura: **R-10** (default: **bloquear**).
5. **Competência**: derivada da data e do dia base; o usuário **não digita**.
6. **Lançado por** = usuário autenticado. **Nunca** aceitar do formulário — ver **R-04**.
7. **Saldo negativo**: **R-05** (default: bloquear débito que deixe o saldo negativo).
8. **Contrato fora da vigência**: bloqueia novos lançamentos.
9. **Imutabilidade**: ocorrência lançada **não é editada nem excluída** — corrige-se por
   **estorno**. Ver **R-07**.

## 6. Invariantes (devem sempre valer)

- `saldoAtual == saldo da última linha do extrato`.
- `saldoAtual == Σcréditos − Σdébitos`.
- Nenhum `(contrato, competência)` tem **mais de um** crédito automático.
- Toda ocorrência tem **autor** (usuário ou `SISTEMA`) e **data de criação**.
- Quantidade é **> 0**, exceto a rescisão sem direito, que é **0**.
- Reexecutar o motor **não altera** o saldo.

## 7. Casos de borda

| Caso | Tratamento |
|---|---|
| PJ **sem contrato** no HCM | Não aparece na grade (a linha é o contrato). |
| Contrato com `dataInicio` **futura** | Nenhum mês completo → sem crédito. |
| Contrato com **menos de um mês** | Saldo 0 até o primeiro aniversário mensal. |
| Contrato **inativo** (`dataFim` passada) | Para de acumular no fim da vigência. Status derivado automaticamente. |
| PJ **inativo** no cadastro | Contrato aparece com ícone de status; novos lançamentos bloqueados; histórico visível. |
| **29/02** como dia base | Cai em 28/02 nos anos não bissextos e **volta** para 29/02. |
| Extrato **vazio** | Saldo atual = **0**; exibir estado vazio, não erro. |
| Data ISO **sem hora** (`2023-01-01`) | Interpretar no fuso **local** — ver `07` §5.1. |
