---
titulo: Mocks e Testes
dominio: qualidade
fase: [1, 4]
tags: [mock, testes, validacao, cenarios, left-join, mes-referente, qa]
status: normativo
---

# Mocks e Testes

> Cobre os **mocks** (base da Fase 1) e a **validação** (Fase 3 do roadmap `10`). Documento **normativo** dos cenários que precisam passar.

## 1. Mock do Tomticket (Tarefa 1.4)

Objetivo: isolar o desenvolvimento das fases 2+ antes do acesso real à API.

- O mock expõe a **mesma interface** de `TomticketSyncService`/cliente (ver contrato em `03-integracao-tomticket.md` §7).
- Retorna chamados fixos/parametrizáveis cobrindo os cenários abaixo.
- Deve ser trocável por configuração (flag `USE_TOMTICKET_MOCK` ou injeção de dependência).

### Dataset mínimo do mock

| Cenário | Chamado (`id`/`protocol`) | Situação | Tipo Lançamento | Mês Referente | Resultado esperado |
|---|---|---|---|---|---|
| Sem chamado | — | — | — | — | PJ → **Pendente** |
| Chamado aberto | `#1001` | Em Andamento | Contratual | 07-2026 | PJ → **Enviado** |
| Chamado finalizado | `#1002` | Finalizado | Reembolso plano de saude | 07-2026 | PJ → **Recebido** |
| 2 chamados, mesmo e-mail | `#1003` **e** `#1004` (IDs distintos) | 1 aberto + 1 finalizado | Contratual + Reembolso | 07-2026 | **2 linhas**; status por tratativa (A-05) |
| Competência = mês de abertura (A-34) | `#1005` | Aberto 28/06, ainda sem `end_date` | Contratual | *(derivado de `creation_date`)* | Competência `06-2026` (mês de abertura) — **Enviado** em julho seria incorreto |
| E-mail com caixa diferente | `#1006` | Em Andamento | Contratual | 07-2026 | `Joao.Silva@…` casa com `joao.silva@…` → **Enviado** (risco nº 1) |
| Competência divergente | `#1007` | Finalizado | Contratual | 06-2026 | NÃO afeta 07-2026 (PJ segue Pendente em julho) |
| Pessoa com >1 contrato | `#1008` | Em Andamento | Ambas | 07-2026 | Campo customizado "CNPJ" do chamado resolve o contrato (`03` §3.1, A-31) |

## 2. Testes do Motor de Status (Tarefa 4.1 — crítico)

Focar em **evitar falsos positivos de "Pendente"**. Casos obrigatórios:

1. PJ com chamado no período **não** pode aparecer como Pendente.
2. Filtro de competência (e `is_delete`) deve estar no `ON` do Left Join (mover para `WHERE` faz Pendentes sumirem).
3. **E-mail com caixa/espaços diferentes** casa após normalização trim + lowercase — risco nº 1 (A-14).
4. **E-mail duplicado** na Lista de PJ não deve multiplicar linhas.
5. PJ com **2 chamados** (Contratual + Reembolso, `id_tomticket` distintos) → **2 linhas**, status por tratativa (A-05).
6. **Pessoa com >1 contrato (A-31):** status por e-mail permanece correto; a desambiguação atribui a NF ao contrato certo (não afeta a contagem de status). Ver §2.6.
7. Invariante do rollup: `Pendente + Enviado + Recebido = total de PJ ativos`.

### 2.6 Desambiguação de contrato — campo customizado "CNPJ" (A-31, 1 PJ em >1 contrato)
Dataset em `13` §4. Fornecedor `carlos.santos@cityinc.com.br` com **2 contratos** (101 → CITY
`14489313000160`; 102 → SPE Praça do Sol `17928511000170`).

1. **Cenário 1 (1 contrato):** e-mail com 1 contrato → NF atribuída direto, **sem** ler o campo `cnpj`.
2. **Cenário 2 (>1 contrato):** chamado `19166` → campo `cnpj` do chamado = `17928511000170` →
   resolve **Contrato 102** (SPE Praça do Sol).
3. **Trocar o campo** no mock (`19166 → cnpj = "14489313000160"`) → resolve **Contrato 101** (CITY).
4. **Sem match:** campo vazio ou CNPJ não bate com nenhum contrato → marcar **tratamento manual** (não
   atribuir contrato aleatório); sinalizar no Dashboard.

## 3. Teste da derivação de competência (A-34 — não é mais parser de texto)

> **Simplificado (2026-08-04 — A-34):** "Mês Referente" não é um campo de texto a fazer parse —
> é sempre o mês/ano de `creation_date` (data de abertura, um campo ISO estruturado, sempre
> presente no `/list`). A tabela de entradas de texto abaixo (`07/2026`, `Julho/2026`…) descrevia um
> parser que **não é mais necessário** — não há campo customizado nem `subject` a interpretar.

Teste único e direto: `creation_date` → `mes_ano_referencia` (**sistêmico `MM-AAAA`**):

| `creation_date` (chamado) | `mes_ano_referencia` esperado |
|---|---|
| `2026-07-28 09:15:00-03:00` | `07-2026` |
| `2026-06-30 23:50:00-03:00` (aberto no fim do mês, finalizado só em julho) | `06-2026` — mês de **abertura**, não de finalização |
| `2026-01-05 10:00:00-03:00` | `01-2026` |

## 4. Testes de Automação de Alertas (worker)

### 4.1 Elegibilidade (worker — sem tabela de fila)
1. **Exclusão:** PJ que consta na Fato no período **não** é elegível.
2. **Idempotência:** PJ com `(email, regra, competência)` já na Tabela de Alerta **não** é reselecionado — é isso que faz a **tarde** não reenviar o da **manhã** (A-16).
3. **Cobrança só para não-entregues:** PJ `Enviado`/`Recebido` não é elegível a `D+1`/`D+3`.
4. Gravação na Tabela de Alerta duplicada → bloqueada por `UNIQUE (email, regra, competência)`.

### 4.2 Cálculo das datas das regras (A-20) — `D` do `.env`, dias corridos
Dado `D` = dia 1 do mês **seguinte** à competência:

| Competência | D-3 | D | D+1 | D+3 |
|---|---|---|---|---|
| `07-2026` | **29/07/2026** | 01/08/2026 | 02/08/2026 | 04/08/2026 |
| `02-2026` | **26/02/2026** | 01/03/2026 | 02/03/2026 | 04/03/2026 |
| `12-2026` | **29/12/2026** | 01/01/2027 | 02/01/2027 | 04/01/2027 |

5. **Mês curto:** competência `02-2026` → `D-3` = **26/02** (não 28/29). Nunca fixar o dia do mês.
6. **Virada de ano:** competência `12-2026` → `D` = **01/01/2027**.
7. **`D` configurável:** alterar `PRAZO_*` no `.env` recalcula todas as regras.

### 4.3 Worker de envio (O365)
8. **Registro só após sucesso:** falha no envio O365 → **não** grava na Tabela de Alerta → a tarde retenta.
9. **Entrega entre seleção e envio:** se o PJ entrega no intervalo, revalidação da Fato impede o disparo.

## 5. Testes de Exportação

1. Colunas obrigatórias presentes e na ordem definida (`07-frontend-dashboard.md` §3).
2. **Somente Excel `.xlsx`** gerado (botão "EXCEL"); aba principal + aba de contratos (A-25).
3. Datas formatadas; `Link` clicável (xlsx/pdf).
4. Exportação respeita os filtros atuais (Ano/Mês e demais).

## 6. Testes de Integração (pós acesso real ao Tomticket)

- Paginação e rate limit.
- Upsert idempotente pela chave **`id_tomticket`** (GUID do chamado — A-05).
- Casamento por **e-mail**; desambiguação pelo **campo customizado "CNPJ"** do chamado quando >1 contrato (A-31).
- Confirmar `mes_ano_referencia` derivado de `creation_date` com dados reais de produção (A-34).

## 7. Dados de teste da Lista de PJ e Carga de Cadastro

Criar uma Lista de PJ de teste com pelo menos: um PJ que entrega, um que não entrega, um com `Ambas`, um com **e-mail em caixa diferente** do chamado, um com **>1 contrato** (para exercitar o campo customizado "CNPJ", A-31), e um inativo (sem contrato em vigência) para validar a derivação de status.

### 7.1 Cenários de teste de importação e ciclo de vida (A-32 — substituição total)

> Reescrito em 2026-07-30: a carga manual deixou de ser acumulativa/soft-delete (`19` §8) e passou a
> **substituir a base inteira** a cada envio bem-sucedido — ver A-32 em `09-pendencias-e-decisoes.md`.

1. **Fornecedor ausente na planilha nova é removido:** Subir planilha sem um fornecedor que constava
   na anterior → fornecedor **não existe mais** no cadastro após o import (comportamento invertido
   do antigo "acumulativo").
2. **Contrato ausente na planilha nova é removido:** Subir planilha sem um contrato de um PJ →
   contrato **não existe mais** na base após o import (removido, não soft-deletado).
3. **Recesso não quebra com o truncar-e-recriar:** Um contrato com ocorrências de recesso lançadas é
   removido/recriado (novo `id_contrato`) numa importação seguinte que ainda o inclui na planilha →
   `ExtratoDeRecesso.doContrato(codContrato)` continua retornando as ocorrências antigas, porque
   `RECESSO_MOVIMENTO` referencia `cod_empresa`/`cod_contrato` (chave de negócio), não o `id_contrato`
   (surrogate) que mudou. Este é o teste crítico de A-32 — prova que a troca de estratégia não perde
   histórico de recesso.
4. **PJ torna-se inativo por ausência na planilha ou falta de contrato:** Um fornecedor que não veio
   na planilha nova simplesmente não existe mais (item 1); um fornecedor presente mas sem nenhum
   contrato em vigência é classificado **inativo** (não aparece como Pendente na competência de NF).
5. **Substituição idempotente no resultado:** Importar a mesma planilha 2 vezes consecutivas →
   resultado final idêntico (mesmos fornecedores/contratos), mas **cada** envio bem-sucedido trunca e
   recarrega — não é um upsert incremental que "não faz nada" na segunda vez.
6. **Erro em qualquer linha aborta antes de truncar:** Planilha com erro de validação em qualquer
   linha → **nada é truncado nem gravado** (regra tudo-ou-nada continua valendo; truncar só acontece
   depois da validação completa passar).

