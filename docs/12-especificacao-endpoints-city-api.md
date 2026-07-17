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
> Nomes de tabela/rota são *propostas* (D-11) — confirmar padrão com o owner da API.

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

- Criar `IFontePj` (interface) + `FonteHCM` (real) + `FonteMock` (payload `13` §1).
- Sincronizar os PJ ativos → `APP.TB_GER_NF_PJ_FORNECEDOR` (fonte da verdade do Left Join).
- **Chave de casamento com o Tomticket (A-14):** **e-mail** (normalizado trim + lowercase). Garantir
  **unicidade do e-mail** no cadastro.
- **CNPJ**: guardado no cadastro (origem HCM), usado só como **desambiguador** via Marker quando a
  pessoa tem >1 contrato (`03` §3.1). Não é a chave de junção.

> PENDÊNCIA P-06: endpoint/credenciais/campos do HCM. Formato de retorno já fixado (`13` §1).

## 2. DDL das **3 tabelas** (schema APP, DB City) — *nomes propostos*

Padrão CITY API: chave única, `is_delete VARCHAR(50)`, `data_inclusao DATETIME2 DEFAULT CURRENT_TIMESTAMP`.
Competência **`mes_ano_referencia VARCHAR(10)` no formato sistêmico `"MM-AAAA"`** (A-19).

### 2.1 Fornecedor (Lista de PJ) — `APP.TB_GER_NF_PJ_FORNECEDOR`
```sql
CREATE TABLE APP.TB_GER_NF_PJ_FORNECEDOR (
    id_pj                    INT IDENTITY(1,1) NOT NULL,
    cod_empresa              VARCHAR(20),           -- HCM: Cod_Empresa
    nome                     VARCHAR(255) NOT NULL, -- HCM: Empresa
    apelido                  VARCHAR(255),          -- HCM: Apelido
    email                    VARCHAR(255) NOT NULL, -- CHAVE DE CASAMENTO (A-14)
    cnpj                     VARCHAR(14),           -- 14 dígitos, sem máscara (desambiguação/relatório)
    tipo_inscricao           VARCHAR(5),            -- HCM: Tipo_Inscricao
    tipo_lancamento_esperado VARCHAR(40),
    ativo                    BIT NOT NULL DEFAULT 1,
    origem_hcm_id            VARCHAR(50),
    is_delete                VARCHAR(50),
    data_inclusao            DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_Nf_Pj_Fornecedor PRIMARY KEY (id_pj),
    CONSTRAINT UQ_Nf_Pj_Fornecedor UNIQUE (email)    -- e-mail é a chave de casamento
);
```

### 2.2 Fato (recepção de NF) — `APP.TB_GER_NF_PJ_RECEPCAO`
```sql
CREATE TABLE APP.TB_GER_NF_PJ_RECEPCAO (
    id_recepcao        INT IDENTITY(1,1) NOT NULL,
    id_tomticket       VARCHAR(64) NOT NULL,        -- GUID `id` do chamado (idempotência do upsert)
    numero_chamado     VARCHAR(50) NOT NULL,        -- `protocol` (número exibido)
    mes_ano_referencia VARCHAR(10) NOT NULL,        -- "MM-AAAA"
    nome               VARCHAR(255),                -- `name`
    email              VARCHAR(255) NOT NULL,       -- CHAVE DE CASAMENTO (A-14)
    cnpj               VARCHAR(14),                 -- via casamento/Marker (cenário 2)
    assunto            VARCHAR(500),                -- `subject`
    data_abertura      DATETIME2,                   -- `creation_date`
    data_finalizacao   DATETIME2,                   -- `end_date` (NULL enquanto aberto)
    status             VARCHAR(20) NOT NULL,        -- 'Enviado' | 'Recebido'
    link_chamado       VARCHAR(500),                -- derivado
    tipo_lancamento    VARCHAR(40) NOT NULL,        -- 'Ambas' | 'Contratual' | 'Reembolso plano de saúde'
    is_delete          VARCHAR(50),
    data_inclusao      DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_Nf_Pj_Recepcao PRIMARY KEY (id_recepcao),
    -- Cada chamado tem ID único (A-05). Um mesmo email pode ter N linhas na competência.
    CONSTRAINT UQ_Nf_Pj_Recepcao UNIQUE (id_tomticket)
);
CREATE INDEX IX_Nf_Pj_Recepcao_Email_Comp ON APP.TB_GER_NF_PJ_RECEPCAO (email, mes_ano_referencia);
```

### 2.3 Alerta (log de disparos) — `APP.TB_GER_NF_PJ_ALERTA`
> Consolida o antigo "Comunicado" (A-18): registra **cada alerta enviado**; é a fonte do Histórico do Dashboard.
```sql
CREATE TABLE APP.TB_GER_NF_PJ_ALERTA (
    id_alerta          INT IDENTITY(1,1) NOT NULL,
    id_pj              INT NULL,                    -- vínculo quando resolvido
    mes_ano_referencia VARCHAR(10) NOT NULL,        -- "MM-AAAA"
    email              VARCHAR(255) NOT NULL,       -- destinatário
    nome               VARCHAR(255),
    cnpj               VARCHAR(14),
    regra              VARCHAR(10) NOT NULL,        -- 'D-3' | 'D' | 'D+1' | 'D+3'
    data_hora_envio    DATETIME2 NOT NULL,
    is_delete          VARCHAR(50),
    data_inclusao      DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_Nf_Pj_Alerta PRIMARY KEY (id_alerta),
    CONSTRAINT UQ_Nf_Pj_Alerta UNIQUE (email, regra, mes_ano_referencia)  -- idempotência (05 §5)
);
```

> **Não há tabela de "fila".** Os elegíveis são calculados sob demanda: `FORNECEDOR − RECEPCAO − ALERTA`.

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
> o **Dashboard**. (Se o worker for isolado da API, expor opcionalmente `GET /alertas/fila` e
> `POST /comunicados` com a mesma lógica — ver histórico em `09`.)

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
Deve retornar histórico **mesmo sem registro na Fato** (Tarefa 3.2). Fonte = `APP.TB_GER_NF_PJ_ALERTA`.

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
FROM APP.TB_GER_NF_PJ_FORNECEDOR pj
LEFT JOIN APP.TB_GER_NF_PJ_RECEPCAO f
       ON f.email = pj.email                  -- A-14: EMAIL é a chave (trim+lowercase)
      AND f.mes_ano_referencia = :mesAnoReferencia
      AND f.is_delete IS NULL
WHERE pj.ativo = 1 AND pj.is_delete IS NULL
ORDER BY pj.nome;
```
> - Competência e `is_delete` da Fato ficam no **`ON`** (não no `WHERE`) para preservar Pendentes (`04` §4, `08` §2).
> - Normalizar e-mail (trim+lowercase) **na escrita** (sync/HCM), para não perder índice.
> - 1 email com 2 chamados (Contratual + Reembolso) → **2 linhas** (esperado, A-05); Dashboard exibe por tratativa.

## 5. Gateway Tomticket (contrato de classe)
```python
# app/services/interfaces/tomticket_gateway.py
class ITomticketGateway(ABC):
    @abstractmethod
    def listar_chamados_nf(self, categoria_id: str, mes_ano_referencia: str | None = None) -> list[ChamadoTomticket]: ...
    @abstractmethod
    def obter_chamado(self, id_tomticket: str) -> ChamadoTomticket: ...

# ChamadoTomticket (mapeado do payload — 13 §2.2):
#   id_tomticket, numero_chamado(protocol), nome(name), email, subject,
#   data_abertura(creation_date), data_finalizacao(end_date),
#   situacao('Em Andamento'|'Finalizado'), link, tipo_lancamento,
#   mes_referente (bruto → parser → "MM-AAAA")
```
Env vars: `TOMTICKET_BASE_URL`, `TOMTICKET_TOKEN`,
`TOMTICKET_CATEGORIA_NF=8b9a123fcd09bd585714b53d5370f1a2` (confirmado, P-03),
`TOMTICKET_PORTAL_URL` (para o template de e-mail).

> **Desambiguação por contrato (cenário 2, `03` §3.1):** quando o e-mail casado tiver >1 contrato no
> HCM, extrair o CNPJ do tomador via **`INotaCnpjExtractor`** e resolver o contrato.
> Implementação atual = **`MockNotaCnpjExtractor`** (mapa fixo, `13` §4); real = `MarkerNotaCnpjExtractor` (P-09).
> Seleção por config `CNPJ_EXTRACTOR=MOCK|MARKER`.

## 6. Dependency Injection (`app/dependencies.py`)
```python
get_pj_repository()          # DataSource(APP.TB_GER_NF_PJ_FORNECEDOR) + FonteHCM/Mock
get_nota_fiscal_repository() # DataSource(APP.TB_GER_NF_PJ_RECEPCAO)
get_alerta_repository()      # DataSource(APP.TB_GER_NF_PJ_ALERTA)  — log de disparos
get_tomticket_gateway()      # ConnectionTomticket ou FonteMock (Strategy FONTE_DADOS)
get_cnpj_extractor()         # MockNotaCnpjExtractor ou MarkerNotaCnpjExtractor (CNPJ_EXTRACTOR)
get_status_service()         # PjRepository + NotaFiscalRepository (Left Join por email)
```

## 7. Mock (`FONTE_DADOS=MOCK`) — prioridade (P-01)
Estender `FonteMock`/`variaveis_mock.py` com os payloads de `13` (HCM Empresa/Contratos, Tomticket
§2.1) cobrindo os cenários de `08` §1 (aberto/finalizado, 2 chamados por email, "Mês Referente" em
texto, e-mail com caixa diferente, competência divergente, 1 vs. >1 contrato). Permite entregar o
**frontend mockado** sem Tomticket/HCM reais.

## 8. Checklist de implementação (para o agente)

**CITY API (dados/endpoints):**
- [ ] DDLs das **3 tabelas** (`models/create_tb_ger_nf_pj_*.sql`) aplicadas no DB City.
- [ ] `IFontePj` + `FonteHCM` + mock; sync HCM→`FORNECEDOR` com **e-mail normalizado** (único).
- [ ] `ConnectionTomticket` + `ITomticketGateway` + `TomticketRepository` + mock (payload `13` §2.1).
- [ ] `TomticketSyncUseCase` — upsert idempotente por **`id_tomticket`**; casamento por **email** (A-14).
- [ ] `StatusService` (Left Join da §4, junção por **email**) + `/status` e `/status/resumo`.
- [ ] `AlertaRepository` + `GET /comunicados` (lê `ALERTA`; funciona sem Fato).
- [ ] Exportação `/export` em **Excel `.xlsx`** (`07` §3); aba principal + aba de contratos.
- [ ] `GET /fornecedores`; rotas em `main.py` (tag "Notas Fiscais PJ", JWT); injetores em `dependencies.py`.
- [ ] Envelope de resposta padrão (`06` §5) e Soft Delete em todas as leituras.

**Worker de alertas (Python + Scheduler — `05`):**
- [ ] Scheduler 2x/dia (UTC-3); cálculo de `D` via `.env` (`PRAZO_*`); regras D-3/D/D+1/D+3 (dias corridos).
- [ ] Elegibilidade `FORNECEDOR − RECEPCAO − ALERTA`; envio via **Office 365** (`IEmailSender`).
- [ ] Gravar `ALERTA` **só após sucesso** do envio (idempotência `UNIQUE(email, regra, competência)`).
- [ ] Template de e-mail com identidade City (`13` §3, `11`).

**Desambiguação (cenário 2 — `03` §3.1, `13` §4):**
- [ ] `INotaCnpjExtractor` + **`MockNotaCnpjExtractor`** (mapa fixo) — habilita o teste de 1 PJ com >1 contrato **agora**.
- [ ] Algoritmo `resolver_contrato` (1 contrato → direto; >1 → extrator → match por CNPJ do tomador).
- [ ] Sem match → marcar **tratamento manual** (não atribuir contrato aleatório).
- [ ] (Depois) `MarkerNotaCnpjExtractor` real — P-09.

**Testes (`08`)** e confirmação de nomes de tabela/rota com o owner (D-11).
