---
titulo: Arquitetura e Stack
dominio: arquitetura
fase: todas
tags: [arquitetura, componentes, stack, jobs, cron, camadas]
status: parcialmente-normativo
---

# Arquitetura e Stack

> Este documento descreve a arquitetura lógica (normativa). **A stack e o modelo de backend foram
> definidos:** o backend é um **novo domínio de endpoints na CITY API existente** (FastAPI/SQL Server).
> Ver `06-backend-api.md` (arquitetura) e `12-especificacao-endpoints-city-api.md` (implementação).
> A "stack sugerida" que constava aqui foi substituída pela stack herdada da CITY API (§4).

## 1. Componentes lógicos (normativo)

```
┌──────────────────────────────────────────────────────────────┐
│                     FRONTEND (Dashboard)                       │
│  Abas Status / Mensagens · DataGrid por (email, Tipo)          │
│  · Export Excel (.xlsx) · Identidade visual City               │
└───────────────────────────▲──────────────────────────────────┘
                            │ HTTPS + JWT M2M
┌───────────────────────────┴──────────────────────────────────┐
│              CITY API  (novo domínio /v2/notas-fiscais)        │
│  ┌──────────────┐ ┌────────────────────┐ ┌────────────────┐  │
│  │ StatusService │ │ AlertaElegibilidade │ │ ExportService  │  │
│  │ (Left Join    │ │ (quem é elegível —  │ │ Excel (.xlsx)  │  │
│  │  por CNPJ)    │ │  NÃO envia e-mail)  │ │                │  │
│  └──────▲───────┘ └─────────▲──────────┘ └───────▲────────┘  │
│  ┌──────┴──────────────────┴───────────────────┴─────────┐  │
│  │  Gateways/Fontes:  TomticketGateway  ·  FonteHCM        │  │
│  └──────────────────────────▲──────────────────────────────┘  │
│  ┌──────────────────────────┴──────────────────────────────┐  │
│  │  Camada de Dados — SQL Server (DB City), schema APP      │  │
│  │  Fornecedor(PJ) · Recepção(Fato) · Comunicado · Alerta   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────▲───────────────────────────────────────────▲──────────────┘
     │ compartilha a MESMA camada de dados          │ POST /sync/* (D-12)
┌────┴────────────────────────────────┐   ┌─────────┴────────┐
│  Worker de Alertas (Python)          │   │ Scheduler do sync │
│  · Scheduler 2x/dia (UTC-3)          │   │ (worker/Airflow)  │
│  · regra do dia (D-3/D/D+1/D+3)      │   └───────────────────┘
│  · elegibilidade (Forn − Fato − Alerta)
│  · ENVIA e-mail ──────────────────────► Office 365
│  · grava na Tabela de Alerta         │
└──────────────────────────────────────┘

Fontes externas:   Tomticket (chamados)   ·   ERP HCM (fornecedores PJ)
```

> **Fronteira (A-13):** o **worker Python** faz agendamento + envio de e-mail (Office 365),
> reutilizando os **repositórios** do domínio. Os **endpoints** da CITY API servem o Dashboard.

## 2. Módulos e responsabilidades (normativo)

| Módulo | Responsabilidade | Documento de referência |
|---|---|---|
| **Gateway Tomticket** (CITY API) | Ler chamados da categoria de NF; verificar encerramento; extrair "Tipo de Lançamento" e "Mês Referente" | `03-integracao-tomticket.md` |
| **Fonte HCM** (CITY API) | Sincronizar a Lista de PJ do ERP HCM → tabela no DB City | `12` §1 |
| **Motor de Status** (CITY API) | Calcular Pendente/Enviado/Recebido via Left Join **por CNPJ**, por competência | `04-regras-de-negocio-status.md` |
| **Serviço de Elegibilidade de Alerta** (CITY API) | Calcular **quem é elegível** para uma regra — **não envia e-mail** | `05` §4, `12` §3.3 |
| **Serviço de Exportação** (CITY API) | Gerar **Excel `.xlsx`** (aba principal + aba de contratos) | `07-frontend-dashboard.md` §3 |
| **Camada de Dados** (CITY API) | Persistência e repositórios das **3 tabelas** (SQL Server) | `02-dicionario-de-dados.md` |
| **Worker de Alertas** (**Python + Scheduler**) | Agendar 2x/dia (UTC-3), decidir a regra do dia, **enviar via Office 365**, gravar na Tabela de Alerta | `05-automacao-alertas.md` |

## 3. Jobs agendados (normativo — parametrização em pendências)

> **A automação de alertas roda num worker Python + Scheduler** (A-13), não como endpoint da API: o
> worker agenda (2x/dia, UTC-3), calcula a elegibilidade, envia via **Office 365** e grava na Tabela
> de Alerta — reutilizando os repositórios. Os **syncs** (Tomticket/HCM) e o cálculo de status são
> **endpoints da CITY API**, disparados pelo worker/scheduler (D-12). Ver `05` e `06` §6.

| Job | Onde | Frequência | Função |
|---|---|---|---|
| `sync-tomticket` | CITY API (endpoint) | A cada X min/hora (D-12) | Sincroniza chamados (abertos e encerrados) → Tabela Fato |
| `sync-hcm` | CITY API (endpoint) | Diário (D-12) | Atualiza a Lista de PJ a partir do ERP HCM |
| **`worker-alertas`** | **Worker Python (Scheduler)** | **2x/dia (manhã + tarde), UTC-3** | Calcula elegíveis, envia via O365, grava na Tabela de Alerta. A tarde só retenta o que falhou de manhã (A-16). |

> PENDÊNCIAS: horários exatos das execuções (D-13) e quem agenda o sync (D-12). Ver `09-pendencias-e-decisoes.md`. (`D` vem do `.env`; **sem** calendário de dia útil — A-20.)

## 4. Stack (definida — herdada da CITY API)

> O backend é implementado **dentro da CITY API** (`docker/api-city`). Ver detalhes em `06` §1.

- **Backend:** **FastAPI 0.115** + Gunicorn (Uvicorn workers), **Python 3.12**, orjson.
- **Banco de dados:** **SQL Server** (pyodbc + ODBC Driver 17), no **DB City**. Tabelas `APP.TB_GER_NF_PJ_*`.
- **Autenticação:** **JWT M2M** (PyJWT HS256) — endpoints `/v2` protegidos (inclusive para o n8n).
- **Automação/agendamento dos alertas:** **worker Python + Scheduler** (fora dos endpoints) — A-13, ver §3 e `05`.
- **E-mail:** **Office 365**, disparado pelo **worker** (`IEmailSender`). A City não tem SMTP próprio (A-17).
- **Exportação:** **somente Excel `.xlsx`** gerado no backend (aba principal + aba de contratos — `07` §3, A-25).
- **Frontend:** SPA (Dashboard) consumindo `/v2/notas-fiscais/...` com JWT; DataGrid + seletores Ano/Mês; identidade visual City (`11`).

## 5. Ambientes e configuração

- Segredos (token/credenciais Tomticket, credenciais de e-mail) via variáveis de ambiente/secret manager — **nunca** hardcoded.
- Configuração parametrizável: IDs de categoria Tomticket, campos customizados, prazos das regras de tempo, remetente de e-mail, calendário de dias úteis.
- Fase 1 usa **Mocks** do Tomticket para isolar desenvolvimento (ver `08-mocks-e-testes.md`).

## 6. Princípios de arquitetura de dados (normativo)

- **Lista de PJ** é a fonte da verdade dos fornecedores ativos; o status é sempre derivado dela.
- A **Tabela Fato** permite duplicidade de número de chamado quando o Tipo de Lançamento exige tratativas distintas.
- O status **nunca** é persistido como verdade absoluta na Fato sem derivação — é calculado a partir do estado do chamado (aberto/finalizado) e do Left Join. Ver `04-regras-de-negocio-status.md`.
