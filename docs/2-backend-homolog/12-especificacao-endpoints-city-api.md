---
titulo: Especificação de Implementação — Endpoints na CITY API + Worker de Alertas
dominio: backend
fase: 2
tags: [especificacao, endpoints, ddl, sql-server, schemas, tomticket, gateway, worker, scheduler, mock, city-api, email, marker]
status: normativo-para-implementacao
---

# Especificação de Implementação — Domínio "Notas Fiscais PJ"

> **Público-alvo:** agentes de IA que vão implementar. O backend de dados é um **novo domínio na CITY
> API** (`docker/api-city`, FastAPI); a **automação de alertas** é um **worker Python** separado
> (Scheduler), que compartilha a camada de dados. Seguir os padrões de
> `web/.context/backend/api-city-context/` e o alinhamento em `06-backend-api.md`.
> Payloads reais de HCM/Tomticket e o template de e-mail estão em `13-referencia-payloads-mock.md`.
> Nomes de tabela/rota foram revisados e ajustados pelo DBA conforme a política de governança do banco CITY.

## 0. Resumo do que criar

**Na CITY API (dados + endpoints):**
- **Rotas**: `app/api/v2/notas_fiscais.py` (prefixo `/v2/notas-fiscais`, JWT obrigatório).
- **Repositórios**: `NotaFiscalRepository` (Fato), `PjRepository`, `AlertaRepository`.
- **Serviços/Use cases**: `TomticketSyncUseCase`, `StatusService`.
- **Integração**: `ConnectionTomticket` + `ITomticketGateway` + `TomticketRepository` (gateway).
- **Fonte HCM**: `IFontePj` + `FonteHCM` + suporte no `FonteMock`.
- **Tabelas SQL Server** (schema `APP`, DB City) — **3 tabelas**, DDL na §2.
- **DI**: novos injetores em `app/dependencies.py`.

**Worker de alertas (serviço Python separado — `05`):**
- Scheduler 2x/dia (UTC-3), cálculo de elegibilidade, envio via **Office 365**, gravação na Tabela de Alerta.
- Reutiliza os repositórios/camada de dados (mesmo SQL Server).

> **Foco imediato (P-01):** **frontend mockado** com os payloads de `13`, sem integração HCM real,
> mas com **interface modular** (Strategy `FONTE_DADOS=MOCK|HCM|UAU`) guardando o retorno como padrão.

## 1. Origem da Lista de PJ (HCM → DB City)

> 📐 **Design detalhado da fonte plugável em [`19-fonte-de-cadastro-modular.md`](19-fonte-de-cadastro-modular.md).**
> Enquanto a personalização do HCM está em debate, o backend depende de um **contrato JSON estável**
> (não do HCM); a fonte troca em `dependencies.py` e o HCM, quando pronto, é **forçado** ao contrato
> pela validação Pydantic. Esta seção fica como a visão resumida.

- Criar `IFontePj` (interface) + `FonteHCM` (real) + `FonteMock` (payload `13` §1).
- Sincronizar os PJ ativos → `APP.TB_DPE_GPJ_PRESTADOR` (fonte da verdade do Left Join).
- **Chave de casamento com o Tomticket (A-14):** **e-mail** (normalizado trim + lowercase). Garantir
  **unicidade do e-mail** no cadastro.
- **CNPJ**: guardado no cadastro (origem HCM), usado só como **desambiguador** — lido do **campo
  customizado "CNPJ" do próprio chamado no Tomticket** (A-31) quando a pessoa tem >1 contrato
  (`03` §3.1). Não é a chave de junção.

> PENDÊNCIA P-06: endpoint/credenciais/campos do HCM. Formato de retorno já fixado (`13` §1).

## 2. DDL das **3 tabelas** (schema APP, DB City) — *ajustadas pelo DBA*

Padrão CITY API: chave única, `is_delete BIT DEFAULT 0`, `data_inclusao DATETIME2(7) DEFAULT CURRENT_TIMESTAMP`.
Competência **`mes_ano_referencia VARCHAR(10)` no formato sistêmico `"MM-AAAA"`** (A-19).

### 2.1 Prestador (Lista de PJ) — `APP.TB_DPE_GPJ_PRESTADOR`
```sql
CREATE TABLE APP.TB_DPE_GPJ_PRESTADOR (
    id_pj                    INT IDENTITY(1,1) NOT NULL,
    cod_empresa              VARCHAR(20) NOT NULL,  -- Chave natural do PJ (HCM/Planilha)
    nome                     VARCHAR(255) NOT NULL, -- HCM: Empresa
    apelido                  VARCHAR(255),          -- HCM: Apelido
    email                    VARCHAR(255) NOT NULL, -- CHAVE DE CASAMENTO (A-14)
    cnpj                     VARCHAR(14),           -- 14 dígitos, sem máscara (desambiguação/relatório)
    tipo_inscricao           VARCHAR(5),            -- HCM: Tipo_Inscricao
    tipo_lancamento_esperado VARCHAR(40),
    origem_hcm_id            VARCHAR(50),
    is_delete                BIT CONSTRAINT DF_GPJ_PRESTADOR_IS_DELETE DEFAULT 0, -- 0 = ativo; 1 = soft-deleted
    data_inclusao            DATETIME2(7) CONSTRAINT DF_GPJ_PRESTADOR_DATA_INCLUSAO DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_GPJ_PRESTADOR PRIMARY KEY (id_pj),
    CONSTRAINT UQ_GPJ_PRESTADOR_COD_EMPRESA UNIQUE (cod_empresa), -- Acumulativa (UNIQUE absoluta)
    CONSTRAINT UQ_GPJ_PRESTADOR_EMAIL UNIQUE (email)              -- e-mail é a chave de casamento
);
```

### 2.1.A Contrato — `APP.TB_DPE_GPJ_CONTRATO`
```sql
CREATE TABLE APP.TB_DPE_GPJ_CONTRATO (
    id_contrato              INT IDENTITY(1,1) NOT NULL,
    cod_empresa              VARCHAR(20) NOT NULL,  -- FK para APP.TB_DPE_GPJ_PRESTADOR.cod_empresa
    cod_contrato             VARCHAR(50) NOT NULL,  -- Código do contrato no ERP
    nome_contrato            VARCHAR(255),
    data_inicio              DATE NOT NULL,
    data_fim                 DATE NULL,             -- NULL permite vigência indeterminada
    valor_mensal             DECIMAL(10,2),
    empresa_vinculada_codigo VARCHAR(20) NOT NULL,  -- Ex.: '001'
    empresa_vinculada_nome   VARCHAR(255) NOT NULL, -- Ex.: 'CITY INCORPORADORA LTDA'
    is_delete                BIT CONSTRAINT DF_GPJ_CONTRATO_IS_DELETE DEFAULT 0, -- 0 = ativo; 1 = soft-deleted
    data_inclusao            DATETIME2(7) CONSTRAINT DF_GPJ_CONTRATO_DATA_INCLUSAO DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_GPJ_CONTRATO PRIMARY KEY (id_contrato),
    CONSTRAINT FK_GPJ_CONTRATO_PRESTADOR FOREIGN KEY (cod_empresa) REFERENCES APP.TB_DPE_GPJ_PRESTADOR (cod_empresa),
    CONSTRAINT CK_GPJ_CONTRATO_DATAS CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);
-- Chave natural composta com índice único FILTRADO (permite histórico soft-deleted sem conflito)
CREATE UNIQUE INDEX UQ_GPJ_CONTRATO_EMPRESA_COD
    ON APP.TB_DPE_GPJ_CONTRATO (cod_empresa, cod_contrato)
    WHERE is_delete = 0;
```

### 2.2 Fato (recepção de NF) — `APP.TB_DPE_GPJ_RECEPCAO_NF`
```sql
CREATE TABLE APP.TB_DPE_GPJ_RECEPCAO_NF (
    id_recepcao        INT IDENTITY(1,1) NOT NULL,
    id_tomticket       VARCHAR(64) NOT NULL,        -- GUID `id` do chamado (idempotência do upsert)
    numero_chamado     VARCHAR(50) NOT NULL,        -- `protocol` (número exibido)
    mes_ano_referencia VARCHAR(10) NOT NULL,        -- "MM-AAAA"
    nome               VARCHAR(255),                -- `name`
    email              VARCHAR(255) NOT NULL,       -- CHAVE DE CASAMENTO (A-14)
    cnpj               VARCHAR(14),                 -- campo customizado do chamado (cenário 2, A-31)
    assunto            VARCHAR(500),                -- `subject`
    data_abertura      DATETIME2(7),                -- `creation_date`
    data_finalizacao   DATETIME2(7),                -- `end_date` (NULL enquanto aberto)
    status             VARCHAR(20) NOT NULL,        -- 'Enviado' | 'Recebido'
    link_chamado       VARCHAR(500),                -- derivado
    tipo_lancamento    VARCHAR(40) NOT NULL,        -- 'Ambas' | 'Contratual' | 'Reembolso plano de saúde'
    is_delete          BIT CONSTRAINT DF_GPJ_RECEPCAO_NF_IS_DELETE DEFAULT 0, -- 0 = ativo; 1 = soft-deleted
    data_inclusao      DATETIME2(7) CONSTRAINT DF_GPJ_RECEPCAO_NF_DATA_INCLUSAO DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_GPJ_RECEPCAO_NF PRIMARY KEY (id_recepcao),
    -- Cada chamado tem ID único (A-05). Um mesmo email pode ter N linhas na competência.
    CONSTRAINT UQ_GPJ_RECEPCAO_NF_TOMTICKET UNIQUE (id_tomticket),
    CONSTRAINT CK_GPJ_RECEPCAO_NF_STATUS CHECK (status IN ('Enviado', 'Recebido'))
);
CREATE INDEX IX_GPJ_RECEPCAO_NF_EMAIL_COMP ON APP.TB_DPE_GPJ_RECEPCAO_NF (email, mes_ano_referencia);
```

### 2.3 Alerta (log de disparos) — `APP.TB_DPE_GPJ_ALERTA_NF`
```sql
CREATE TABLE APP.TB_DPE_GPJ_ALERTA_NF (
    id_alerta          INT IDENTITY(1,1) NOT NULL,
    id_pj              INT NULL,                    -- vínculo quando resolvido
    mes_ano_referencia VARCHAR(10) NOT NULL,        -- "MM-AAAA"
    email              VARCHAR(255) NOT NULL,       -- destinatário
    nome               VARCHAR(255),
    cnpj               VARCHAR(14),
    regra              VARCHAR(10) NOT NULL,        -- 'D-3' | 'D' | 'D+1' | 'D+3'
    data_hora_envio    DATETIME2(7) NOT NULL,
    is_delete          BIT CONSTRAINT DF_GPJ_ALERTA_NF_IS_DELETE DEFAULT 0, -- 0 = ativo; 1 = soft-deleted
    data_inclusao      DATETIME2(7) CONSTRAINT DF_GPJ_ALERTA_NF_DATA_INCLUSAO DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_GPJ_ALERTA_NF PRIMARY KEY (id_alerta),
    CONSTRAINT UQ_GPJ_ALERTA_NF_EMAIL_REGRA_COMP UNIQUE (email, regra, mes_ano_referencia)  -- idempotência (05 §5)
);
```

> **Não há tabela de "fila".** Os elegíveis são calculados sob demanda: `PRESTADOR − RECEPCAO_NF − ALERTA_NF`.

## 3. Endpoints (`/v2/notas-fiscais`, JWT obrigatório)

| Método | Rota | Status | Consumidor | Descrição |
|---|---|---|---|---|
| GET | `/status` | 200 | Dashboard | Status por `(email, tipo_lancamento)` na competência (Left Join) |
| GET | `/status/resumo` | 200 | Dashboard | Contagem `Pendente`/`Enviado`/`Recebido` (rollup) |
| GET | `/comunicados` | 200 | Dashboard | Histórico de alertas por PJ (`id_pj` ou `email`) |
| GET | `/export` | 200 | Dashboard | Exportação **Excel `.xlsx`** (§3.4) |
| GET | `/fornecedores` | 200 | Dashboard | Lista de PJ ativos |
| POST | `/sync/tomticket` | 202 | worker/admin | Dispara sincronização de chamados |
| POST | `/fornecedores/sync-hcm` | 202 | worker/admin | Sincroniza Lista de PJ a partir do HCM |

> O **worker de alertas** (`05`) usa os **repositórios diretamente** (mesma camada de dados), então
> **não** depende de endpoints para calcular a fila ou registrar o alerta. Os endpoints acima servem
> o **Dashboard**.

**Competência nos query params:** `mesAnoReferencia` (sistêmico `"MM-AAAA"`, ex.: `07-2026`) **ou**
`ano` + `mes`. Validar e compor.

### 3.1 `GET /v2/notas-fiscais/status`
```
GET /v2/notas-fiscais/status?mesAnoReferencia=07-2026
→ 200
{
  "status": "sucesso", "version": "v2", "accesed_by": "nf-pjs-dashboard",
  "data": [
    {
      "id_pj": 12, "nome": "João Silva", "email": "joao.silva@cityinc.com.br", "cnpj": "…|null",
      "status": "Pendente|Enviado|Recebido",
      "numero_chamado": "19164|null", "id_tomticket": "…|null",
      "data_abertura": "ISO|null", "data_finalizacao": "ISO|null",
      "tipo_lancamento": "Contratual|null", "link_chamado": "URL|null"
    }
  ]
}
```

### 3.2 `GET /v2/notas-fiscais/comunicados`
```
GET /v2/notas-fiscais/comunicados?id_pj=12          # ou ?email=...
→ 200 { ..., "data": [ { "regra": "D-3", "data_hora_envio": "ISO", "mes_ano_referencia": "07-2026" } ] }
```
Deve retornar histórico **mesmo sem registro na Fato** (Tarefa 3.2). Fonte = `APP.TB_DPE_GPJ_ALERTA_NF`.

### 3.3 `GET /v2/notas-fiscais/fornecedores`
Lista PJ ativos (para o mock-first e para o Dashboard). Reflete o DTO `FornecedorPJ` (`13` §1.4).

### 3.4 `GET /v2/notas-fiscais/export`
```
GET /v2/notas-fiscais/export?mesAnoReferencia=07-2026
```
**Somente Excel `.xlsx`** (A-25) — sem CSV/PDF. Colunas (mesmas da tabela) e aba de contratos:
ver `07-frontend-dashboard.md` §3.

## 4. SQL do motor de status (Left Join — ver `04`)
```sql
SELECT pj.id_pj, pj.nome, pj.email, pj.cnpj,
       f.id_tomticket, f.numero_chamado, f.data_abertura, f.data_finalizacao,
       f.tipo_lancamento, f.link_chamado,
       CASE
         WHEN f.id_recepcao IS NULL          THEN 'Pendente'
         WHEN f.data_finalizacao IS NOT NULL THEN 'Recebido'
         ELSE                                     'Enviado'
       END AS status
FROM APP.TB_DPE_GPJ_PRESTADOR pj
LEFT JOIN APP.TB_DPE_GPJ_RECEPCAO_NF f
       ON f.email = pj.email                  -- A-14: EMAIL é a chave (trim+lowercase)
      AND f.mes_ano_referencia = :mesAnoReferencia
      AND f.is_delete = 0
WHERE EXISTS (
  SELECT 1 FROM APP.TB_DPE_GPJ_CONTRATO c
  WHERE c.cod_empresa = pj.cod_empresa
    AND c.is_delete = 0
    AND c.data_inicio <= GETDATE()
    AND (c.data_fim IS NULL OR c.data_fim >= GETDATE())
)
ORDER BY pj.nome;
```

## 5. Gateway Tomticket (contrato de classe)

> Endpoints reais confirmados em 2026-08-04 (A-33): `GET /ticket/list` (sem `custom_fields`) e
> `GET /ticket/detail?ticket_id=` (com `custom_fields`) — ver `03` §2/§7. **Duas chamadas**: `listar`
> roda uma vez para toda a categoria; `obter_detalhe` só para chamados já casados por e-mail.

```python
# app/services/interfaces/tomticket_gateway.py
class ITomticketGateway(ABC):
    @abstractmethod
    def listar_chamados_nf(self, categoria_id: str, mes_ano_referencia: str | None = None) -> list[ChamadoResumo]:
        """GET /ticket/list — sem custom_fields (03 §2.1)."""
        ...
    @abstractmethod
    def obter_detalhe_chamado(self, id_tomticket: str) -> DetalheChamado:
        """GET /ticket/detail?ticket_id= — custom_fields (tipo_de_lancamento, mes_referente, cnpj), 03 §2.2."""
        ...
```

**Variáveis de ambiente:**
```
TOMTICKET_BASE_URL=https://api.tomticket.com/v2.0
API_KEY_TOMTICKET_HUB=...          # secret já provisionado no GitHub Secrets — NÃO remapear o nome
TOMTICKET_CATEGORIA_NF=38ae7388ab732f568bfe9193c60165ed   # confirmado, A-33
```
> Header confirmado contra a API real (A-35, 2026-08-04): `Authorization: Bearer <token>`.

## 6. Dependency Injection (`app/dependencies.py`)
```python
get_pj_repository()          # DataSource(APP.TB_DPE_GPJ_PRESTADOR) + FonteHCM/Mock
get_nota_fiscal_repository() # DataSource(APP.TB_DPE_GPJ_RECEPCAO_NF)
get_alerta_repository()      # DataSource(APP.TB_DPE_GPJ_ALERTA_NF)  — log de disparos
get_tomticket_gateway()      # ConnectionTomticket ou FonteMock (Strategy FONTE_DADOS)
get_status_service()         # PjRepository + NotaFiscalRepository (Left Join por email)
```

## 8. Checklist de implementação (para o agente)

**CITY API (dados/endpoints):**
- [ ] DDLs das tabelas (`models/create_tables_nf_pj.sql`) aplicadas no DB City.
- [ ] `IFontePj` + `FonteHCM` + mock; sync HCM→`PRESTADOR` com **e-mail normalizado** (único).
- [ ] `ConnectionTomticket` + `ITomticketGateway` + `TomticketRepository` + mock.
- [ ] `TomticketSyncUseCase` — upsert idempotente por **`id_tomticket`**; casamento por **email** (A-14).
- [ ] `StatusService` (Left Join da §4, junção por **email**) + `/status` e `/status/resumo`.
- [ ] `AlertaRepository` + `GET /comunicados` (lê `ALERTA_NF`; funciona sem Fato).
- [ ] Exportação `/export` em **Excel `.xlsx`**; abas: Status Notas Fiscais, Contratos e Mensagens Enviadas.
- [ ] `GET /fornecedores`; rotas em `main.py` (tag "Notas Fiscais PJ", JWT); injetores em `dependencies.py`.
