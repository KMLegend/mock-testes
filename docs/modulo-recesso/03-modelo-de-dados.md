---
titulo: Módulo Recesso — Modelo de Dados
dominio: recesso
tags: [modelo-de-dados, entidades, value-objects, ddl, sql-server, auditoria]
status: normativo
---

# Modelo de Dados — Módulo Recesso

## 1. Visão

O módulo introduz **uma única entidade persistida**: a **Ocorrência de Recesso**.
Saldo e período aquisitivo são **derivados** — **nunca** armazenados como campo materializado.

> **Regra:** saldo é **calculado**, não guardado. Guardar saldo cria duas fontes da verdade e abre a
> porta para divergência silenciosa entre o extrato e o total.

| Conceito | Persistido? | Origem |
|---|---|---|
| Ocorrência de Recesso | ✅ Sim | Usuário (manual) ou Sistema (automático) |
| Saldo (linha e atual) | ❌ Não | Derivado do extrato (`02` §3) |
| Período Aquisitivo | ❌ Não | Derivado de `Contrato.dataInicio` (`02` §1) |
| Fornecedor / Contrato | ✅ (já existe) | HCM — reaproveitar, **não duplicar** |

## 2. Value Objects (novos)

Seguem `docs/15` §2 (Regra 3 — encapsular primitivos).

| VO | Encapsula | Comportamento |
|---|---|---|
| **`PeriodoAquisitivo`** | Ano de início do período (ex.: `2023`) + janela `[inicio, fim)` | `contem(data)`, `venceEm()`, `paraExibicao()`, `equals()` |
| **`TipoOcorrencia`** | `Crédito` \| `Débito` | `ehCredito()`, `ehDebito()`, `sinal()` (+1/−1), `paraExibicao()` |
| **`QuantidadeDeDias`** | Inteiro **> 0** | Valida no construtor; `somarA(saldo)`, `paraExibicao()` |
| **`SaldoDeDias`** | Inteiro (pode ser 0; negativo só se R-05 permitir) | `aplicar(ocorrencia)`, `ehNegativo()`, `paraExibicao()` |
| **`AutorDoLancamento`** | Usuário **ou** `SISTEMA` | `ehSistema()`, `paraExibicao()` |
| **`OrigemDaOcorrencia`** | `MANUAL` \| `AUTOMATICO` | Base da idempotência (`02` §2.5) |

> **Reaproveitar** de `docs/14` §5: `Cnpj`, `Email`, `DataHora`.
> **Não reutilizar** o VO `Competencia` (`MM-AAAA`) — conceito diferente (ver README do módulo).

## 3. Entidade — `OcorrenciaDeRecesso`

```ts
export interface PropsOcorrenciaDeRecesso {
  readonly id: IdOcorrencia;                 // identificador exibido na coluna "ID da ocorrência"
  readonly idPj: IdFornecedor;               // a quem pertence
  readonly dataDaOcorrencia: DataHora;       // dirige a ordenação e o período aquisitivo
  readonly descricao: string;                // obrigatória, não vazia
  readonly tipo: TipoOcorrencia;             // Crédito | Débito
  readonly quantidade: QuantidadeDeDias;     // sempre > 0
  readonly periodoAquisitivo: PeriodoAquisitivo;
  readonly autor: AutorDoLancamento;         // usuário ou SISTEMA
  readonly origem: OrigemDaOcorrencia;       // MANUAL | AUTOMATICO
  readonly criadoEm: DataHora;               // auditoria (desempate de ordenação)
}
```

> A entidade **não** carrega `saldo` — ele é responsabilidade da **coleção** (`ExtratoDeRecesso`),
> conforme `docs/15` §2 (Regra 4 — first-class collections).

## 4. Coleção — `ExtratoDeRecesso`

```ts
export class ExtratoDeRecesso {
  constructor(private readonly ocorrencias: readonly OcorrenciaDeRecesso[]) {}

  ordenadoCronologicamente(): ExtratoDeRecesso;
  comSaldoCorrente(): readonly LinhaDeExtrato[];  // agrega o running balance (02 §3.2)
  saldoAtual(): SaldoDeDias;                      // 02 §3.3
  temCreditoAutomaticoPara(periodo: PeriodoAquisitivo): boolean; // idempotência (02 §2.5)
}
```

> **Único lugar** onde saldo é calculado. UI, modal e qualquer exportação consomem daqui — o mesmo
> princípio que eliminou as 4 cópias do filtro no módulo de NF.

## 5. Tabela no DB City (Fase 2) — *nome proposto*

Segue as convenções da CITY API (`docs/06` §10, `docs/12` §2): schema `APP`, `is_delete`, `data_inclusao`.

```sql
CREATE TABLE APP.TB_GER_NF_PJ_RECESSO_OCORRENCIA (
    id_ocorrencia       INT IDENTITY(1,1) NOT NULL,
    id_pj               INT NOT NULL,                 -- FK → TB_GER_NF_PJ_FORNECEDOR
    data_ocorrencia     DATE NOT NULL,
    descricao           VARCHAR(500) NOT NULL,
    tipo                VARCHAR(10) NOT NULL,         -- 'Credito' | 'Debito'
    quantidade_dias     INT NOT NULL,                 -- sempre > 0
    periodo_aquisitivo  INT NOT NULL,                 -- ano de início do período (ex.: 2023)
    origem              VARCHAR(12) NOT NULL,         -- 'MANUAL' | 'AUTOMATICO'
    lancado_por         VARCHAR(255) NOT NULL,        -- usuário ou 'SISTEMA'
    is_delete           VARCHAR(50),
    data_inclusao       DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_Recesso_Ocorrencia PRIMARY KEY (id_ocorrencia),
    CONSTRAINT CK_Recesso_Qtd     CHECK (quantidade_dias > 0),
    CONSTRAINT CK_Recesso_Tipo    CHECK (tipo IN ('Credito','Debito')),
    CONSTRAINT CK_Recesso_Origem  CHECK (origem IN ('MANUAL','AUTOMATICO'))
);

-- IDEMPOTÊNCIA (02 §2.5): no máximo 1 crédito AUTOMÁTICO por (PJ, período).
-- Índice filtrado permite N lançamentos manuais no mesmo período, mas só 1 automático.
CREATE UNIQUE INDEX UQ_Recesso_Credito_Automatico
    ON APP.TB_GER_NF_PJ_RECESSO_OCORRENCIA (id_pj, periodo_aquisitivo)
    WHERE origem = 'AUTOMATICO' AND is_delete IS NULL;

CREATE INDEX IX_Recesso_Pj_Data
    ON APP.TB_GER_NF_PJ_RECESSO_OCORRENCIA (id_pj, data_ocorrencia);
```

> A constraint de idempotência é **a defesa mais importante do módulo**. Sem ela, uma reexecução do
> motor duplica 30 dias de saldo — e não há fonte externa para reconstruir o valor correto.

## 6. Auditoria e imutabilidade

- `lancado_por` + `data_inclusao` formam a trilha de auditoria — **obrigatórios**.
- Ocorrências são **imutáveis**: sem `UPDATE` de valor, sem `DELETE` físico. Correção = **estorno**
  (nova ocorrência de tipo oposto). Ver **R-07**.
- `is_delete` existe por convenção da CITY API, mas **não deve ser usado** para "apagar" ocorrência —
  apenas para casos excepcionais de expurgo administrativo, com registro.

## 7. Cardinalidade

```
Fornecedor (1) ────< (0..N) OcorrenciaDeRecesso        [por id_pj]
Fornecedor (1) ────< (1..N) Contrato                    [já existente; dirige o período aquisitivo]
PeriodoAquisitivo — derivado de Contrato.dataInicio (não persistido)
```

## 8. Fase 1 (mock) — persistência

O módulo é de **escrita**, então o mock precisa **guardar** o que o usuário lançar.

- Repositório **em memória** implementando o mesmo port da Fase 2.
- **Recomendado:** espelhar em `localStorage` para o lançamento sobreviver ao refresh — sem isso a
  demonstração perde sentido (o usuário lança e some ao recarregar). Ver **R-12**.
- Os dados de exemplo devem incluir os cenários de `07` §4.
