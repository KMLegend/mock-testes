---
titulo: Dicionário de Dados
dominio: dados
fase: 1
tags: [modelo-de-dados, tabelas, schema, cardinalidade, dicionario, left-join]
status: normativo
---

# Dicionário de Dados

> Documento **normativo** do modelo de dados (visão de negócio). A **implementação física** em
> SQL Server (DDL, nomes de tabela `APP.TB_GER_NF_PJ_*`, tipos, constraints) está em
> `12-especificacao-endpoints-city-api.md`. As tabelas ficam no **DB City** (SQL Server), seguindo
> as convenções da CITY API: chave única, `is_delete VARCHAR(50)` (soft delete) e
> `data_inclusao DATETIME2 DEFAULT CURRENT_TIMESTAMP`.
>
> **Competência (A-19):** campo `mes_ano_referencia` — **sistêmico `"MM-AAAA"`** (ex.: `07-2026`);
> **exibição `"MM/AAAA"`** (ex.: `07/2026`). A UI converte o hífen em barra.

## 1. Visão de entidades — **3 tabelas** (A-18)

| Entidade | Tabela | Papel | Origem |
|---|---|---|---|
| **Lista de PJ (Fornecedor)** | `APP.TB_GER_NF_PJ_FORNECEDOR` | Fonte da verdade dos fornecedores ativos | **ERP HCM** → tabela no DB City |
| **Tabela Fato** | `APP.TB_GER_NF_PJ_RECEPCAO` | Registro transacional de NF/chamado | Integração Tomticket |
| **Tabela de Alerta** | `APP.TB_GER_NF_PJ_ALERTA` | **Log de alertas enviados** (audit trail + idempotência) | Worker de alertas |

> **Consolidação (A-18):** o modelo tem **3 tabelas** (fornecedor, fato, alerta). O que o plano
> chamava de "Tabela Comunicado" (log de envios) foi **unificado na Tabela de Alerta** — ela guarda
> cada disparo. A "fila de alerta" (quem falta) **não é tabela**: é calculada sob demanda
> (`Fornecedor − Fato − Alerta`). Ver `05` §4.

## 2. Lista de PJ (Storage de Usuários) — tabela `APP.TB_GER_NF_PJ_FORNECEDOR`

Fonte da verdade dos fornecedores, **populada a partir do ERP HCM** (sincronização HCM → tabela no
DB City; ver `12` §1). Cada linha = um fornecedor ativo.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id_pj` | INT IDENTITY (PK) | Sim | Identificador único do fornecedor |
| `origem_hcm_id` | string | Não | ID do fornecedor no ERP HCM (rastreabilidade) |
| `nome` | string | Sim | Razão social / nome do fornecedor |
| `email` | string | Sim | E-mail usado para casar com chamados do Tomticket e para envio de alertas |
| `cnpj` | string (14) | Sim | CNPJ do fornecedor |
| `tipo_lancamento_esperado` | enum | Não | `Ambas` \| `Contratual` \| `Reembolso plano de saúde` — o que se espera daquele PJ |
| `ativo` | bool | Sim | Se participa do período corrente |
| `criado_em` / `atualizado_em` | timestamp | Sim | Auditoria |

> **Chave de casamento com o Tomticket (A-14):** a chave é o **e-mail** (não há chave de fallback fixa). Normalizar trim + lowercase dos dois lados. O **CNPJ** é usado apenas como **desambiguador** (extraído do PDF via Marker) quando a pessoa tem **mais de um contrato** — ver `03-integracao-tomticket.md` §3.1. O CNPJ segue registrado no cadastro (origem HCM) para relatórios/export.

## 3. Tabela Fato — `APP.TB_GER_NF_PJ_RECEPCAO`

Registra cada NF/chamado do Tomticket.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id_recepcao` | INT IDENTITY (PK) | Sim | Identificador do registro |
| `id_tomticket` | string | Sim | GUID `id` do chamado — **chave de idempotência** do upsert (única) |
| `numero_chamado` | string | Sim | `protocol` (número exibido) |
| `nome` | string | Sim | Nome do solicitante (snapshot) |
| `email` | string | Sim | **Chave de casamento** com a Lista de PJ (A-14) |
| `cnpj` | string (14) | Não | Preenchido no casamento; via Marker no cenário 2 (`03` §3.1) |
| `assunto` | string | Não | `subject` |
| `data_abertura` | datetime | Sim | `creation_date` |
| `data_finalizacao` | datetime | Não | `end_date` (NULL enquanto aberto) |
| `status` | enum | Sim | `Enviado` (aberto) \| `Recebido` (finalizado) |
| `link_chamado` | string (URL) | Não | Derivado (base URL + id/protocol) |
| `tipo_lancamento` | enum | Sim | `Ambas` \| `Contratual` \| `Reembolso plano de saúde` |
| `mes_ano_referencia` | VARCHAR(10) `"MM-AAAA"` | Sim | Competência (ex.: `07-2026`). Deriva do "Mês Referente" |
| `is_delete` / `data_inclusao` | — | — | Soft delete + auditoria |

**Nota sobre `status`:** reflete o estado do chamado (aberto → `Enviado`; finalizado → `Recebido`). **Pendente** NÃO existe na Fato — é derivado da ausência de linha no Left Join (`04`).

**Unicidade (A-05):** cada chamado tem **ID único** (`id_tomticket`). Um mesmo solicitante pode abrir **2 chamados** na mesma competência (um `Contratual`, um `Reembolso`) → **2 linhas** (2 `id_tomticket`). Chave única = **`id_tomticket`**. Status granular por `(email, tipo_lancamento)` dentro da competência (`04` §2.1).

## 4. Tabela de Alerta — `APP.TB_GER_NF_PJ_ALERTA`

**Log de alertas enviados** (consolida o antigo "Comunicado" — A-18). Um registro por envio bem-sucedido; é a fonte do Histórico de Comunicação do Dashboard. O identificador humano do destinatário é o **responsável legal** (pessoa), não a razão social (A-27).

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id_alerta` | INT IDENTITY (PK) | Sim | PK |
| `id_pj` | FK → Fornecedor | Não | Vínculo com o fornecedor (quando resolvido) |
| `email` | string | Sim | E-mail destinatário (chave junto de regra/competência) |
| `responsavel_legal` | string | Sim | **Pessoa** responsável legal do PJ (não a razão social) |
| `cnpj` | string | Não | Snapshot |
| `regra` | enum | Sim | `D-3` \| `D` \| `D+1` \| `D+3` |
| `data_hora_envio` | datetime | Sim | Momento do disparo |
| `mes_ano_referencia` | VARCHAR(10) `"MM-AAAA"` | Sim | Competência |
| `is_delete` / `data_inclusao` | — | — | Soft delete + auditoria |

> **Idempotência:** `UNIQUE (email, regra, mes_ano_referencia)`. Consultável por PJ **mesmo sem registro na Fato** (Dashboard, Tarefa 3.2), por `email`/`id_pj`.
> **Não há tabela de "fila":** os elegíveis são calculados sob demanda (`Fornecedor − Fato − Alerta`) pelo worker (`05` §4).

## 5. Cardinalidade e relacionamentos (para o dicionário de entrega, Tarefa 4.2)

```
Fornecedor (1) ────< (0..N) Fato      [por email + mes_ano_referencia]
Fornecedor (1) ────< (0..N) Alerta    [por email (+ id_pj)]
```

- **Fornecedor → Fato: 1:N** — vários registros no mesmo período (por Tipo de Lançamento) e ao longo dos meses. **Zero** registros num período → Pendente.
- **Fornecedor → Alerta: 1:N** — um registro por regra disparada por competência (log).

## 6. Regra de junção para status (referência rápida)

```sql
-- Status por competência (ver 04-regras-de-negocio-status.md para a versão completa)
SELECT
  pj.id_pj, pj.nome, pj.email, pj.cnpj,
  CASE
    WHEN f.id_recepcao IS NULL                 THEN 'Pendente'
    WHEN f.data_finalizacao IS NOT NULL        THEN 'Recebido'
    ELSE                                            'Enviado'
  END AS status
FROM APP.TB_GER_NF_PJ_FORNECEDOR pj
LEFT JOIN APP.TB_GER_NF_PJ_RECEPCAO f
  ON f.email = pj.email                          -- chave de casamento: EMAIL (trim+lowercase) (A-14)
 AND f.mes_ano_referencia = :mesAnoReferencia    -- filtro de competência ("MM-AAAA")
 AND f.is_delete IS NULL
WHERE pj.ativo = 1 AND pj.is_delete IS NULL;
```

> A correção do Left Join é crítica para evitar **falsos positivos de "Pendente"** (Tarefa 4.1). Ver validação em `08-mocks-e-testes.md`.
