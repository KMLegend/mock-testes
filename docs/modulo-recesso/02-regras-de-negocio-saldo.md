---
titulo: Módulo Recesso — Regras de Negócio (Saldo e Acúmulo Mensal)
dominio: recesso
tags: [regras, saldo, credito-mensal, competencia, proporcao, rescisao, idempotencia, normativo]
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

O saldo de recesso é mantido **por contrato**, não por PJ. Um PJ lotado em dois contratos
tem **dois extratos e dois saldos**, e aparece em **duas linhas** da grade.

### 1.1 Proporção

Cada contrato carrega uma **proporção** — o percentual do direito da pessoa que cabe àquele
contrato. As proporções dos contratos de um mesmo PJ devem somar **100%**.

```
PJ 015 → contrato 101: 40%
       → contrato 102: 60%
```

Isso mantém o direito da **pessoa** em 2,5 dias/mês; o que muda é como ele é repartido.
Sem proporção declarada, o contrato vale **100%** (caso do PJ com contrato único).

> **Invariante de cadastro:** Σ(proporções dos contratos ativos de um PJ) = 100%.
> A Fase 2 deve validar isso na origem (HCM/DB City) — a Fase 1 confia no dado.

## 2. Acúmulo mensal

A cada **aniversário mensal da data de início do contrato**, o sistema credita:

```
crédito do mês = 2,5 dias × proporção do contrato
```

- **Dia base** = dia da `Contrato.dataInicio`. Contrato iniciado em 15/03 credita todo dia 15.
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

### 3.5 Exemplo (contrato 40%, início 29/02/2024)
| # | Cálculo | Competência | Descrição | Tipo | Qtd | Saldo |
|---|---|---|---|---|---|---|
| 1 | 29/03/2024 | 29/03/2024 | Crédito mensal (40% do direito) | Crédito | 1 | **1** |
| … | … | … | … | … | … | … |
| 28 | 29/06/2026 | 29/06/2026 | Crédito mensal (40% do direito) | Crédito | 1 | **28** |
| 29 | 22/07/2026 | 22/07/2026 | Rescisão contratual (+1 crédito) — 23 dia(s) | Crédito | 1 | **29** |
| 30 | 22/07/2026 | 22/07/2026 | Encerramento de contrato (zera o saldo atual) | Débito | 29 | **0** |

## 4. Rescisão e encerramento

O encerramento de contrato gera **dois lançamentos**, nesta ordem:

**1. Rescisão contratual** — fecha o mês quebrado:
```
dias = data da rescisão − última data de cálculo
crédito = dias >= 15 ? (2,5 × proporção) : 0
```
A linha é gravada **mesmo com crédito zero** — é ela que documenta que a regra foi aplicada.
Descrição: `Rescisão contratual (+0 crédito)` ou `Rescisão contratual (+2,5 crédito)`.

**2. Encerramento de contrato** — débito do saldo remanescente, **zerando** o saldo.
Descrição: `Encerramento de contrato (zera o saldo atual)`.
É este lançamento que marca o contrato como encerrado.

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
8. **Contrato encerrado**: bloqueia novos lançamentos.
9. **Imutabilidade**: ocorrência lançada **não é editada nem excluída** — corrige-se por
   **estorno**. Ver **R-07**.

## 6. Invariantes (devem sempre valer)

- `saldoAtual == saldo da última linha do extrato`.
- `saldoAtual == Σcréditos − Σdébitos`.
- Nenhum `(contrato, competência)` tem **mais de um** crédito automático.
- Toda ocorrência tem **autor** (usuário ou `SISTEMA`) e **data de criação**.
- Quantidade é **> 0**, exceto a rescisão sem direito, que é **0**.
- Reexecutar o motor **não altera** o saldo.
- Σ(proporções dos contratos ativos de um PJ) = 100%.

## 7. Casos de borda

| Caso | Tratamento |
|---|---|
| PJ **sem contrato** no HCM | Não aparece na grade (a linha é o contrato). |
| Contrato com `dataInicio` **futura** | Nenhum mês completo → sem crédito. |
| Contrato com **menos de um mês** | Saldo 0 até o primeiro aniversário mensal. |
| Contrato **encerrado** (`dataFim` passada) | Para de acumular no fim da vigência. |
| PJ **inativo** no cadastro | Contrato aparece com ícone de status; novos lançamentos bloqueados; histórico visível. |
| **29/02** como dia base | Cai em 28/02 nos anos não bissextos e **volta** para 29/02. |
| Extrato **vazio** | Saldo atual = **0**; exibir estado vazio, não erro. |
| Data ISO **sem hora** (`2023-01-01`) | Interpretar no fuso **local** — ver `07` §5.1. |
