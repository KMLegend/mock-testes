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

Fonte da verdade dos fornecedores, **populada a partir do ERP HCM/planilha**. Cada linha = um fornecedor PJ.

> ℹ️ **Cadastro Permanente (Acumulativo):** A tabela de fornecedores é **acumulativa**. A importação de planilha **nunca realiza DELETE** (físico ou lógico) de fornecedores. Se um fornecedor sumir da planilha, ele **permanece** no cadastro.
>
> 🔴 **Status "Ativo" do PJ é DERIVADO:** Não existe o estado do fornecedor solto como regra única de atividade. Um PJ é considerado **ativo** no período se possuir **pelo menos um contrato não-deletado em vigência** (`is_delete IS NULL AND data_inicio <= hoje AND data_fim >= hoje`).

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id_pj` | INT IDENTITY (PK) | Sim | Identificador único surrogate do fornecedor (FK estável) |
| `cod_empresa` | string | Sim | **Chave natural do fornecedor (PJ)** — UNIQUE absoluta |
| `nome` | string | Sim | Razão social / nome do fornecedor |
| `email` | string | Sim | E-mail usado para casar com chamados do Tomticket — UNIQUE absoluta |
| `cnpj` | string (14) | Sim | CNPJ do fornecedor |
| `tipo_lancamento_esperado` | enum | Não | `Ambas` \| `Contratual` \| `Reembolso plano de saúde` — o que se espera daquele PJ |
| `criado_em` / `atualizado_em` | timestamp | Sim | Auditoria |

## 2.A Tabela de Contratos — `APP.TB_GER_NF_PJ_CONTRATO`

Registra os contratos dos fornecedores PJ. Dita a vigência e a atividade real do fornecedor.

> ⚠️ **Ciclo de vida e Soft Delete:** A importação de planilha executa **soft delete (`is_delete = <timestamp>`)** exclusivamente nesta tabela para contratos que deixarem de constar na planilha enviada. O histórico de contratos é preservado.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id_contrato` | INT IDENTITY (PK) | Sim | Identificador único surrogate |
| `cod_empresa` | string (FK) | Sim | Vínculo com `APP.TB_GER_NF_PJ_FORNECEDOR.cod_empresa` |
| `cod_contrato` | string | Sim | Código do contrato no ERP |
| `nome_contrato` | string | Não | Descrição/Nome do contrato |
| `data_inicio` | date | Sim | Data de início da vigência |
| `data_fim` | date | Sim | Data de término da vigência |
| `valor_mensal` | decimal | Não | Valor mensal do contrato |
| `empresa_vinculada_codigo` | string | Sim | Código da tomadora de serviço (ex.: `001`) |
| `empresa_vinculada_nome` | string | Sim | Nome da tomadora de serviço (ex.: `CITY INCORPORADORA LTDA`) |
| `is_delete` | VARCHAR(50) | Não | `NULL` = ativo na base; `timestamp` = soft-deleted na importação |
| `data_inclusao` | datetime | Sim | Data de cadastro |

> **Unicidade e Chave Composta:** A chave natural `(cod_empresa, cod_contrato)` possui **índice único filtrado** (`WHERE is_delete IS NULL`). Isso garante que um contrato soft-deleted possa ser historiado sem causar conflito de chave se for re-inserido futuramente.

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
Fornecedor (1) ────< (0..N) Contrato  [por cod_empresa]
Fornecedor (1) ────< (0..N) Fato      [por email + mes_ano_referencia]
Fornecedor (1) ────< (0..N) Alerta    [por email (+ id_pj)]
```

- **Fornecedor → Contrato: 1:N** — um fornecedor pode possuir N contratos históricos. Apenas contratos com `is_delete IS NULL` e dentro do período `[data_inicio, data_fim]` determinam que o PJ está **ativo**.
- **Fornecedor → Fato: 1:N** — vários registros no mesmo período (por Tipo de Lançamento) e ao longo dos meses. **Zero** registros num período → Pendente.
- **Fornecedor → Alerta: 1:N** — um registro por regra disparada por competência (log).

## 6. Regra de junção para status (referência rápida)

```sql
-- Status por competência considerando fornecedores com pelo menos 1 contrato ativo
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
WHERE EXISTS (
  SELECT 1 FROM APP.TB_GER_NF_PJ_CONTRATO c
  WHERE c.cod_empresa = pj.cod_empresa
    AND c.is_delete IS NULL
    AND c.data_inicio <= GETDATE()
    AND c.data_fim >= GETDATE()
);
```

> A correção do Left Join é crítica para evitar **falsos positivos de "Pendente"** (Tarefa 4.1). Ver validação em `08-mocks-e-testes.md`.
