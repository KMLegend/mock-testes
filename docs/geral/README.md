# Base de Conhecimento (RAG) — App de Gestão de Notas Fiscais (Integração Tomticket)

> **Propósito deste diretório:** servir como base de recuperação de contexto (RAG) para agentes de IA responsáveis pela implementação do sistema. Cada arquivo é autocontido, cobre um domínio específico e usa terminologia padronizada. Ao implementar uma tarefa, recupere primeiro o(s) arquivo(s) do domínio correspondente e depois o `backend/02-dicionario-de-dados.md` e o `geral/09-pendencias-e-decisoes.md`.

## Organização das pastas

Os documentos são separados por **camada** para não misturar preocupações de backend e frontend:

| Pasta | Contém |
|---|---|
| [`geral/`](.) | Transversais: visão geral, arquitetura, regras de status, mocks/testes, pendências, roadmap, hospedagem. Este README (índice) vive aqui. |
| [`backend/`](../backend) | CITY API (Python/FastAPI/SQL Server): modelo de dados, integração Tomticket, endpoints, DI, fonte de cadastro. |
| [`automacao-alertas/`](../automacao-alertas) | **Worker/scheduler de alertas** — deployable separado da API (Airflow + Microsoft Graph). Regras e desenho. |
| [`frontend/`](../frontend) | Dashboard React+TS: identidade visual, arquitetura, padrões SOLID/Calisthenics, refatoração. |
| [`../modulo-recesso/`](../modulo-recesso/README.md) | Módulo **Gestão de Recesso** (frontend + backend do módulo, coesos). |
| [`../spfx-sharepoint/`](../spfx-sharepoint/README.md) | Hospedagem SPFx no SharePoint, identidade Entra ID. |

## Arquitetura em uma frase

Frontend (Dashboard, marca City) → **novos endpoints `/v2/notas-fiscais` na CITY API existente**
(FastAPI/SQL Server, JWT M2M) → integração **Tomticket** (gateway, casamento por **e-mail**) + Lista
de PJ vinda do **ERP HCM** → automação de alertas em **worker Python + Scheduler** (2x/dia, UTC-3),
enviando por **Office 365**. Modelo com **3 tabelas** (fornecedor, fato, alerta).
O contexto da API existente está em `web/.context/backend/api-city-context/` (referência externa).

## Fases de desenvolvimento (A-22)

- **Fase 1 — Frontend mockado (interativo):** dashboard que mostra os PJ **Pendente / Enviado /
  Recebido** de forma interativa, com **dados mockados** (`backend/13`) sobre uma **interface modular**.
  **Não depende de backend.** É o foco imediato.
- **Fase 2 — Backend:** endpoints na CITY API + integrações reais (Tomticket/HCM) + worker de
  alertas, mantendo a **mesma interface** — a UI da Fase 1 não muda.
- **Fase 3 — Validação e Documentação.**

Detalhamento em [10-roadmap-fases-tarefas.md](10-roadmap-fases-tarefas.md).

## Como usar esta base (para agentes)

1. **Sempre** carregue `geral/00-visao-geral-e-glossario.md` para fixar terminologia.
2. Consulte o arquivo do domínio da tarefa (`backend/…`, `frontend/…`, integração, etc.).
3. Cruze com `backend/02-dicionario-de-dados.md` para nomes de tabelas/campos.
4. Antes de assumir qualquer valor externo (IDs de categoria, templates, prazos), verifique `geral/09-pendencias-e-decisoes.md`. Pendências **não** devem ser inventadas — devem ser sinalizadas.
5. Regras de tempo e status são a parte mais sensível: `geral/04-regras-de-negocio-status.md` e `backend/05-automacao-alertas.md` são normativos.

## Índice dos documentos

### Transversais — [`geral/`](.)
| Arquivo | Domínio | Fase |
|---|---|---|
| [00-visao-geral-e-glossario.md](00-visao-geral-e-glossario.md) | Visão geral, atores, glossário | Todas |
| [01-arquitetura-e-stack.md](01-arquitetura-e-stack.md) | Arquitetura, componentes, stack | Todas |
| [04-regras-de-negocio-status.md](04-regras-de-negocio-status.md) | Motor de status (Pendente/Enviado/Recebido) | Fase 1 (mock) → 2 (real) |
| [08-mocks-e-testes.md](08-mocks-e-testes.md) | Mocks, cenários e validação | Fases 1–3 |
| [09-pendencias-e-decisoes.md](09-pendencias-e-decisoes.md) | Pendências (P-xx), decisões (A-xx), registro | Todas |
| [10-roadmap-fases-tarefas.md](10-roadmap-fases-tarefas.md) | Mapa de fases/tarefas → documentos | Todas |
| [18-hospedagem-sharepoint-e-identidade.md](18-hospedagem-sharepoint-e-identidade.md) | Publicação no **SharePoint (iframe)**, identidade/autenticação e impacto no backend | Fases 1–2 |

### Backend — [`backend/`](../backend)
| Arquivo | Domínio | Fase |
|---|---|---|
| [02-dicionario-de-dados.md](../backend/02-dicionario-de-dados.md) | Modelo de dados, 3 tabelas, cardinalidade | **Fase 2** |
| [03-integracao-tomticket.md](../backend/03-integracao-tomticket.md) | Integração com Tomticket (casamento por e-mail) | **Fase 2** |
| [06-backend-api.md](../backend/06-backend-api.md) | Backend = novo domínio na CITY API (arquitetura) | **Fase 2** |
| [12-especificacao-endpoints-city-api.md](../backend/12-especificacao-endpoints-city-api.md) | Spec: rotas, DDL (3 tabelas), gateway, worker, DI | **Fase 2** |
| [13-referencia-payloads-mock.md](../backend/13-referencia-payloads-mock.md) | Payloads mock HCM/Tomticket, mapeamentos, template e-mail | **Fase 1** (base do mock) |
| [19-fonte-de-cadastro-modular.md](../backend/19-fonte-de-cadastro-modular.md) | **Contrato JSON estável** + fonte plugável (HCM/JSON/HTTP) via `dependencies.py` | **Fase 2** |

### Automação de Alertas — [`automacao-alertas/`](../automacao-alertas)
> Worker/scheduler que **dispara os e-mails de cobrança**. Deployable **separado** da CITY API (roda no Airflow), embora reuse a camada de dados dela.

| Arquivo | Domínio | Fase |
|---|---|---|
| [05-automacao-alertas.md](../automacao-alertas/05-automacao-alertas.md) | Regras dos alertas (D-3, D, D+1, D+3), elegibilidade, idempotência | **Fase 2** |
| [20-scheduler-de-alertas.md](../automacao-alertas/20-scheduler-de-alertas.md) | **Scheduler + worker** que dispara os e-mails (Airflow/Graph, SOLID) | **Fase 2** |

### Frontend — [`frontend/`](../frontend)
| Arquivo | Domínio | Fase |
|---|---|---|
| [07-frontend-dashboard.md](../frontend/07-frontend-dashboard.md) | Dashboard, filtros, status interativo, exportação | **Fase 1** |
| [11-identidade-visual.md](../frontend/11-identidade-visual.md) | Marca City: paleta, tipografia, logo, tokens | **Fase 1** |
| [14-frontend-react-ts-arquitetura.md](../frontend/14-frontend-react-ts-arquitetura.md) | Arquitetura alvo React+TS (Ports & Adapters, Value Objects) | **Fase 1** |
| [15-padroes-solid-e-object-calisthenics.md](../frontend/15-padroes-solid-e-object-calisthenics.md) | Padrões de código: SOLID, Object Calisthenics, lint | **Fase 1** |
| [16-plano-refatoracao-frontend.md](../frontend/16-plano-refatoracao-frontend.md) | Plano de migração + **checklist de paridade** (não regredir) | **Fase 1** |
| [17-correcoes-pos-validacao-refatoracao.md](../frontend/17-correcoes-pos-validacao-refatoracao.md) | **Backlog de correção** da refatoração (C-01 a C-05) | **Fase 1** |
| [21-carga-base-pj-ui.md](../frontend/21-carga-base-pj-ui.md) | **Upload/download da base de PJs** por planilha (fonte paliativa até o HCM) | Fases 1–2 |

## Módulos

| Módulo | Documentação | Natureza |
|---|---|---|
| **Notas Fiscais (PJ)** | pastas `geral/` + `backend/` + `frontend/` | **Leitura** — dados vêm de Tomticket + HCM |
| **Gestão de Recesso** | [`../modulo-recesso/`](../modulo-recesso/README.md) | **Escrita** — o nf-pjs é o sistema de origem |

### Entrega e hospedagem

| Assunto | Documentação |
|---|---|
| **SPFx / SharePoint** (A-29) | [`../spfx-sharepoint/`](../spfx-sharepoint/README.md) — migração, identidade Entra ID, token de usuário na CITY API |

## Convenções de terminologia (canônica)

- **Lista de PJ** — storage/fonte da verdade dos fornecedores (PJ) ativos.
- **Tabela Fato** (Main) — registros transacionais de NF/chamados.
- **Tabela de Alerta** — log de alertas/comunicados enviados (unifica o "Comunicado" do plano — A-18); a fila de elegíveis é calculada sob demanda.
- **Tipo de Lançamento** — `Ambas` | `Contratual` | `Reembolso plano de saúde`.
- **Status** — `Pendente` | `Enviado` | `Recebido`.
- **Regras de tempo** — `D-3`, `D`, `D+1`, `D+3`.
- **Ano/Mês** — competência (período de referência) da NF.

> Regras de escrita destes documentos: manter os nomes canônicos acima; marcar suposições com `> SUPOSIÇÃO:`; marcar pendências com `> PENDÊNCIA:` e referenciar `geral/09-pendencias-e-decisoes.md`.
