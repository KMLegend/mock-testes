---
titulo: Módulo Recesso — Modelo de Dados
dominio: recesso
tags: [modelo-de-dados, entidades, value-objects, ddl, sql-server, auditoria, competencia-mensal, vigencia]
status: normativo
---

# Modelo de Dados — Módulo Recesso

> **Modelo vigente (2026-07-27).** Acúmulo **mensal por contrato** (2,5 dias/mês a partir de 2025),
> **sem proporção**, status derivado da **vigência**, com **rescisão + encerramento automáticos** no
> fim da vigência. Ver `02` (regras). Este doc descreve as entidades, VOs e DDL correspondentes.

## 1. Visão

O módulo introduz **uma única entidade persistida**: a **Ocorrência de Recesso**.
Saldo e status do contrato são **derivados** — **nunca** armazenados como campo materializado.

> **Regra:** saldo é **calculado**, não guardado. Guardar saldo cria duas fontes da verdade e abre a
> porta para divergência silenciosa entre o extrato e o total.

| Conceito | Persistido? | Origem |
|---|---|---|
| Ocorrência de Recesso | ✅ Sim | Usuário (manual) ou Sistema (automático) |
| Saldo (linha e atual) | ❌ Não | Derivado do extrato (`02` §3) |
| Status do contrato (Ativo/Inativo) | ❌ Não | Derivado da **vigência** `[dataInicio, dataFim]` (`02` §1.1) |
| Competência mensal | ❌ Não | Derivada da data e do dia base do contrato (`02` §2.1) |
| Fornecedor / Contrato | ✅ (já existe) | HCM / carga por planilha — reaproveitar, **não duplicar** |

## 2. Value Objects

Seguem `frontend/15` §2 (Regra 3 — encapsular primitivos).

| VO | Encapsula | Comportamento |
|---|---|---|
| **`CompetenciaDeRecesso`** | Data mensal (aniversário do contrato), com **dia base** preservado em meses curtos | `apartirDe(data)`, `contendo(data, inicio)`, `proxima()`, `data()`, `paraExibicao()` (`dd/mm/aaaa`), `equals()` |
| **`TipoOcorrencia`** | `Crédito` \| `Débito` | `ehCredito()`, `ehDebito()`, `sinal()` (+1/−1), `paraExibicao()` |
| **`QuantidadeDeDias`** | Número **fracionário > 0** (guardado em **centésimos de dia**, inteiro) | `de(valor)`, `nenhuma()` (= 0, só na rescisão sem direito), `emCentesimos()`, `obterValor()`, `paraExibicao()` |
| **`SaldoDeDias`** | Número fracionário (centésimos; pode ser 0; negativo só se R-05 permitir) | `aplicar(tipo, qtd)`, `suporta()`, `ehNegativo()`, `paraExibicao()` |
| **`AutorDoLancamento`** | Usuário **ou** `SISTEMA` | `ehSistema()`, `paraExibicao()` |
| **`OrigemDaOcorrencia`** | `MANUAL` \| `AUTOMATICO` | Base da idempotência (`02` §2.4) |

> **Reaproveitar** de `frontend/14` §5: `Cnpj`, `Email`, `DataHora`.
> **Não existe mais** `PeriodoAquisitivo` (modelo anual) nem `ProporcaoDeRecesso` (removida — um PJ
> nunca tem dois contratos ativos ao mesmo tempo). **Não confundir** `CompetenciaDeRecesso` com o VO
> `Competencia` (`MM-AAAA`) do módulo de NF.

> **⚠️ Aritmética fracionária:** 2,5 dias/mês. Somar em ponto flutuante acumula erro ao longo de
> dezenas de meses. Guardar em **centésimos de dia (inteiro)** no domínio e **`DECIMAL(10,2)`** no
> banco — **nunca `FLOAT`**.

## 3. Entidade — `OcorrenciaDeRecesso`

O saldo é **por CONTRATO** (não por PJ): a chave é `codContrato = cod_empresa-cod_contrato`.

```ts
export interface PropsOcorrenciaDeRecesso {
  readonly id: string;                    // determinístico p/ automáticos (idempotência)
  readonly codContrato: string;           // "cod_empresa-cod_contrato" — a quem pertence
  readonly dataDoCalculo: Date;           // quando foi calculado/registrado (ordena o extrato)
  readonly competencia: CompetenciaDeRecesso; // mês de competência (aniversário)
  readonly descricao: string;             // obrigatória, não vazia
  readonly tipo: TipoOcorrencia;          // Crédito | Débito
  readonly quantidade: QuantidadeDeDias;  // > 0 (0 só na rescisão sem direito)
  readonly autor: AutorDoLancamento;      // usuário ou SISTEMA
  readonly origem: OrigemDaOcorrencia;    // MANUAL | AUTOMATICO
  readonly criadoEm: Date;                // auditoria (desempate de ordenação)
}
```

> A entidade **não** carrega `saldo` — responsabilidade da **coleção** (`ExtratoDeRecesso`),
> conforme `frontend/15` §2 (Regra 4 — first-class collections).

### 3.1 IDs determinísticos dos lançamentos automáticos (idempotência)

O motor (`02` §2/§4) gera automáticos com **id determinístico** — reprocessar não duplica:

| Lançamento | `id` | Quando |
|---|---|---|
| Crédito mensal | `auto-<codContrato>-<AAAAMM>` | 1 por competência mensal vencida (a partir de 2025) |
| Rescisão contratual | `auto-rescisao-<codContrato>` | 1 quando a vigência expira (`+2,5` se ≥15 dias, senão `+0`) |
| Encerramento | `auto-zeramento-<codContrato>` | 1 débito que zera o saldo remanescente do contrato |

## 4. Coleção — `ExtratoDeRecesso`

```ts
export class ExtratoDeRecesso {
  constructor(private readonly ocorrencias: readonly OcorrenciaDeRecesso[]) {}

  ordenadoCronologicamente(): ExtratoDeRecesso;                 // por dataDoCalculo, desempate criadoEm
  comSaldoCorrente(): readonly LinhaDeExtrato[];                // running balance (02 §3.2)
  saldoAtual(): SaldoDeDias;                                    // 02 §3.3
  temCreditoAutomaticoDe(competencia: CompetenciaDeRecesso): boolean; // idempotência mensal (02 §2.4)
  doContrato(codContrato: string): ExtratoDeRecesso;           // filtra por contrato
  suportaDebito(tipo, quantidade): boolean;                    // R-05
}
```

> **Único lugar** onde saldo é calculado. UI, modal e exportação consomem daqui — o mesmo princípio
> que eliminou as 4 cópias do filtro no módulo de NF.

## 5. Tabela no DB City (Fase 2) — *nome proposto*

Segue as convenções da CITY API (`../backend/06` §10, `../backend/12` §2): schema `APP`, `is_delete`, `data_inclusao`.

```sql
CREATE TABLE APP.TB_GER_NF_PJ_RECESSO_OCORRENCIA (
    id_ocorrencia    INT IDENTITY(1,1) NOT NULL,
    cod_empresa      VARCHAR(20)  NOT NULL,        -- PJ (FK lógica → FORNECEDOR)
    cod_contrato     VARCHAR(50)  NOT NULL,        -- contrato (numerado por empresa: "101","102")
    data_calculo     DATE         NOT NULL,        -- quando foi calculado/registrado
    competencia      DATE         NOT NULL,        -- mês de competência (aniversário)
    descricao        VARCHAR(500) NOT NULL,
    tipo             VARCHAR(10)  NOT NULL,        -- 'Credito' | 'Debito'
    quantidade_dias  DECIMAL(10,2) NOT NULL,       -- fracionário (2,5); 0 só na rescisão sem direito
    origem           VARCHAR(12)  NOT NULL,        -- 'MANUAL' | 'AUTOMATICO'
    chave_auto       VARCHAR(120) NULL,            -- id determinístico (só AUTOMATICO) — idempotência
    lancado_por      VARCHAR(255) NOT NULL,        -- usuário ou 'SISTEMA'
    is_delete        VARCHAR(50),
    data_inclusao    DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_Recesso_Ocorrencia PRIMARY KEY (id_ocorrencia),
    CONSTRAINT CK_Recesso_Qtd    CHECK (quantidade_dias >= 0),
    CONSTRAINT CK_Recesso_Tipo   CHECK (tipo IN ('Credito','Debito')),
    CONSTRAINT CK_Recesso_Origem CHECK (origem IN ('MANUAL','AUTOMATICO'))
);

-- IDEMPOTÊNCIA (02 §2.4): a chave determinística é única entre os AUTOMÁTICOS.
-- Cobre crédito mensal (auto-<contrato>-<AAAAMM>), rescisão e encerramento com uma só regra.
CREATE UNIQUE INDEX UQ_Recesso_Auto
    ON APP.TB_GER_NF_PJ_RECESSO_OCORRENCIA (chave_auto)
    WHERE origem = 'AUTOMATICO' AND is_delete IS NULL;

CREATE INDEX IX_Recesso_Contrato
    ON APP.TB_GER_NF_PJ_RECESSO_OCORRENCIA (cod_empresa, cod_contrato, data_calculo);
```

> A constraint de idempotência é **a defesa mais importante do módulo**. Sem ela, uma reexecução do
> motor duplica o saldo — e não há fonte externa para reconstruir o valor correto.

## 6. Auditoria e imutabilidade

- `lancado_por` + `data_inclusao` formam a trilha de auditoria — **obrigatórios**.
- Ocorrências são **imutáveis**: sem `UPDATE` de valor, sem `DELETE` físico. Correção manual = **estorno**
  (nova ocorrência de tipo oposto). Ver **R-07**.
- **Recarga do cadastro:** quando a base de PJs é recarregada (planilha/HCM), os lançamentos
  **AUTOMÁTICOS** devem ser descartados e recalculados sobre os contratos novos (no mock, o método
  `limparAutomaticos()`). Os **MANUAIS** permanecem.
- `is_delete` existe por convenção da CITY API; **não** usar para "apagar" ocorrência de negócio.

## 7. Cardinalidade

```
Fornecedor (1) ───< (1..N) Contrato          [carga por planilha / HCM]
Contrato   (1) ───< (0..N) OcorrenciaDeRecesso   [por cod_empresa + cod_contrato]
Competência mensal — derivada de Contrato.dataInicio (dia base); não persistida
Status do contrato (Ativo/Inativo) — derivado da vigência; não persistido
```

## 8. Fase 1 (mock) — persistência

O módulo é de **escrita**, então o mock **guarda** o que o usuário lançar e o que o motor calcula.

- Repositório **em memória** implementando o mesmo port da Fase 2, espelhado em **`localStorage`**
  (R-12) para sobreviver ao refresh. Chave `nf-pjs:recesso:ocorrencias:v2`.
- `limparAutomaticos()` descarta só os automáticos (usado ao recarregar a base — `06` §6).
- Os dados de exemplo cobrem os cenários de `07` §4 (contrato ativo, contrato com vigência expirada
  gerando rescisão+encerramento, PJ inativo).
