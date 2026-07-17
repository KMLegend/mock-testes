---
titulo: Backend — Novo Domínio na CITY API
dominio: backend
fase: 2
tags: [backend, city-api, fastapi, sql-server, jwt, repository, strategy, dependency-injection, endpoints]
status: normativo
---

# Backend — Novo Domínio na CITY API

> **Decisão de arquitetura (confirmada):** o backend do nf-pjs **não é um serviço novo**. Ele é
> implementado como um **novo domínio dentro da CITY API existente** (`docker/api-city`, FastAPI),
> reaproveitando toda a stack, padrões, autenticação e deploy já descritos em
> `web/.context/backend/api-city-context/`. O frontend (Dashboard) consome os **novos endpoints
> `/v2/...`** dessa mesma API, autenticado por **JWT M2M**.
>
> A **especificação concreta** (rotas, DDL das tabelas, schemas, gateway Tomticket, wiring de DI)
> está em `12-especificacao-endpoints-city-api.md`. Este documento cobre a **arquitetura e as
> regras** que o novo domínio deve seguir.

## 1. Stack herdada (obrigatória — não reinventar)

| Camada | Tecnologia (CITY API) |
|---|---|
| Framework | **FastAPI 0.115** + Gunicorn (Uvicorn workers) |
| Linguagem | Python 3.12 |
| Serialização | orjson (`ORJSONResponse`) |
| Banco | **SQL Server** (pyodbc + ODBC Driver 17) — **DB City** |
| Auth | **JWT M2M** (PyJWT, HS256, validade 730 dias) + blacklist `app.TB_TEC_SYS_REVOKED_KEYS` |
| Rate limit | slowapi (120 req/min default) |
| Container/CI | Docker multi-stage + GitHub Actions (self-hosted runners) |
| Agendamento (alertas) | **Worker Python + Scheduler** (APScheduler/`schedule`) — A-13 |
| Agendamento (sync, opcional) | Worker/scheduler ou Airflow já usado no Mapão (D-12) |

> A stack sugerida genérica que constava em `01-arquitetura-e-stack.md` foi **substituída** por esta.

## 2. Camadas e padrões a seguir (idênticos à CITY API)

```
ROTAS (app/api/v2/notas_fiscais.py)        → recebem request, delegam, retornam envelope JSON
SCHEMAS (app/services/schemas/…)           → validação de entrada (Pydantic)
REPOSITORIES (app/services/repositories/…) → regras de negócio + acesso a dados
SERVICES / USE CASES (…)                    → orquestração (sync Tomticket, motor de status, alertas)
INTERFACES (app/services/interfaces/…)     → contratos ABC (Strategy/Gateway)
FONTES (app/services/fonts/…)              → FonteHCM, FonteMock, DataSource
CONEXÕES (app/services/connections/…)      → MsSqlHook, ConnectionTomticket, (e-mail)
```

Padrões obrigatórios:
- **Strategy Pattern** — `FONTE_DADOS=MOCK|HCM` seleciona a fonte da Lista de PJ (mock para dev).
- **Repository Pattern** — um repositório por entidade, encapsulando SQL e regra.
- **Dependency Injection** — registrar os injetores em `app/dependencies.py`.
- **Adapter/DataSource** — CRUD genérico sobre tabela via `IDbHook`/`MsSqlHook`.
- **Gateway Pattern** — integração Tomticket como gateway HTTP (molde: `DealRepository`/Facilita e `AirflowClient`).
- **Soft Delete** — coluna `is_delete VARCHAR(50)`; leitura filtra `WHERE is_delete IS NULL`.
- **Duplicação mensal** — endpoint `POST .../duplicate` com `sourceMonthYear`/`targetMonthYear` e `run_transaction()` (aplicável à Lista de PJ e à Fato, se desejado replicar competência).
- **Envelope de resposta padrão** (ver §5).

## 3. Competência: `mes_ano_referencia` (A-19)

Formato **sistêmico (DB/API): `"MM-AAAA"`** (ex.: `07-2026`); **exibição (UI): `"MM/AAAA"`**
(ex.: `07/2026`). O parser do "Mês Referente" do Tomticket (`03` §6) produz o sistêmico `"MM-AAAA"`.

> **Nota de alinhamento:** as tabelas próprias da CITY API usam `mes_ano_referencia` com **barra**
> (`04/2026`). O nf-pjs adota **hífen** no armazenamento (decisão explícita P-05). Se o owner exigir
> padronização estrita com a CITY API, este é o ponto a revisitar (registrado em D-11).

## 4. Serviços/Use Cases do domínio (regras em outros docs)

| Componente | Responsabilidade | Regras |
|---|---|---|
| `TomticketSyncUseCase` | Ler chamados, casar com PJ (**e-mail**), upsert na Fato por `id_tomticket` | `03-integracao-tomticket.md` |
| `StatusService` | Left Join Lista de PJ × Fato por competência (**junção por e-mail**) | `04-regras-de-negocio-status.md` |
| **Worker de alertas** (fora dos endpoints) | Elegibilidade + envio O365 + gravação na Tabela de Alerta | `05-automacao-alertas.md` |
| `NotaFiscalRepository` (Fato) | Persistência/consulta da Fato | `02`, `12` |
| `PjRepository` | Lista de PJ (fonte HCM → tabela no DB City) | `02`, `12` |
| `AlertaRepository` | Log de alertas enviados (Tabela de Alerta) | `02`, `12` |

## 5. Envelope de resposta (padrão CITY API — obrigatório)

Leituras (GET):
```json
{ "status": "sucesso", "version": "v2", "accesed_by": "nf-pjs-dashboard", "data": [ ... ] }
```
Mutações (POST/PUT/DELETE):
```json
{ "statusCode": 201, "version": "v2", "message": "…", "accessed_by": "nf-pjs-dashboard" }
```
> Manter a grafia exata das chaves usadas pela CITY API (`accesed_by` no GET, `accessed_by` na mutação — sim, são diferentes no legado; seguir o existente para não quebrar contratos).

## 6. Automação de alertas — **worker Python** (A-13)

**A automação de alertas NÃO roda como endpoint da CITY API.** É um **worker/service Python** com
uma **biblioteca de Scheduler** (ex.: APScheduler/`schedule`) que agenda (2x/dia, UTC-3), calcula a
elegibilidade, **envia o e-mail via Office 365** e grava na Tabela de Alerta. Como também é Python,
**reutiliza os mesmos repositórios/camada de dados** do domínio.

| Responsabilidade | Onde |
|---|---|
| Agendamento (2x/dia, UTC-3) e regra do dia (D-3/D/D+1/D+3, `D` via `.env`) | **Worker Python** |
| Elegibilidade (`Fornecedor − Fato − Alerta`) | **Worker** (via repositórios) |
| Envio do e-mail (Office 365) | **Worker** (`IEmailSender`) |
| Registro do disparo na Tabela de Alerta | **Worker** (via repositório) |
| Sync Tomticket / sync HCM / status | **CITY API** (endpoints `/sync/*`, `/status`) |

> A API **não** implementa CRON/scheduler de alertas. O worker pode ser um processo no mesmo
> deploy/imagem ou separado. Ver `05-automacao-alertas.md` e `12` §0.
> PENDÊNCIA D-12: quem dispara o **sync** (o próprio worker, um scheduler, ou Airflow já usado no Mapão).

## 7. Integração Tomticket (Gateway)

Nova conexão HTTP seguindo o padrão Facilita/Airflow:
- `ConnectionTomticket` (`app/services/connections/tomticket.py`)
- `ITomticketGateway` (interface) + `TomticketRepository` (implementação)
- Variáveis de ambiente `TOMTICKET_*` (token, base URL, IDs de categoria/campos — ver pendências).
- `FonteMock` cobre o Tomticket em dev (`FONTE_DADOS=MOCK`).

Detalhes de contrato em `03-integracao-tomticket.md`; assinatura de classe em `12`.

## 8. Envio de e-mail — **no worker, via Office 365** (A-17)

A City **não possui serviço SMTP próprio**. O envio usa o serviço de e-mail do **Office 365** e é
executado pelo **worker Python** (`IEmailSender`), não pelos endpoints da API.

> Ver `05-automacao-alertas.md` §7.

## 9. Regras que o backend deve garantir (normativo)

1. **Left Join correto** — junção por **e-mail** (trim+lowercase); competência e `is_delete` no `ON`. Ver `04` §4.
2. **E-mail normalizado** na **escrita** (sync/HCM), dos dois lados; e-mail único no cadastro.
3. **Soft delete** em todas as leituras (`is_delete IS NULL`).
4. **Upsert idempotente** na Fato pela chave **`id_tomticket`** (GUID do chamado).
5. **Idempotência de alertas** — a Tabela de Alerta tem `UNIQUE(email, regra, competência)`; o worker grava só após envio bem-sucedido. Ver `05` §5.
6. **JWT M2M** obrigatório nos endpoints `/v2` (dependency `verify_integration_token`).
7. **Segredos** via `.env`/secret manager (nunca hardcoded).
8. **Ordem**: `sync → status` antes de o worker calcular a elegibilidade (ver §6 e `04` §4).

## 10. Convenções de nomenclatura (CITY API)

| Item | Convenção | Exemplo (nf-pjs) |
|---|---|---|
| Módulo Python | `snake_case.py` | `notas_fiscais.py` |
| Classe | `PascalCase` | `TomticketRepository`, `StatusService` |
| Schema Pydantic | `PascalCaseSchema` | `NotaFiscalCreateSchema` |
| Tabela SQL Server | `SCHEMA.TB_PREFIXO_SUFIXO` | `APP.TB_GER_NF_PJ_RECEPCAO` (ver `12`) |
| Prefixo de rota | `/v2/<dominio-kebab>` | `/v2/notas-fiscais` |

> Nomes de tabela/rota são **propostas** a confirmar com o owner da CITY API — ver `09` D-11.
