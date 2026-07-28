# Base de Conhecimento (RAG) — App de Gestão de NF-PJ + Recesso

> **Propósito.** Base de recuperação de contexto para agentes de IA que vão **implementar o sistema
> fase a fase**. A organização é **por fase de desenvolvimento**: para trabalhar numa fase, leia a
> pasta `0-base/` (vale para tudo) **+** a pasta da sua fase.

## Fases de desenvolvimento

| Pasta | Fase | O que cobre |
|---|---|---|
| [`0-base/`](0-base) | **Base (transversal)** | Vale para **todas** as fases: visão geral, arquitetura, dicionário de dados, **regras de negócio**, padrões SOLID/Calisthenics, pendências, roadmap. |
| [`1-frontend-mockado/`](1-frontend-mockado) | **Fase 1 — Frontend mockado** | Dashboard React+TS com dados mockados (sem backend). **Estado atual: implementado.** |
| [`2-backend-homolog/`](2-backend-homolog) | **Fase 2 — Backend (homolog)** | Novo domínio na CITY API: tabelas, endpoints, fonte de cadastro. Implementar na branch `homolog`. |
| [`3-conexao-front-backend/`](3-conexao-front-backend) | **Fase 3 — Conexão front↔back** | Trocar os mocks pelos endpoints reais (adaptadores HTTP no Composition Root) + auth de usuário. |
| [`4-automacao-email/`](4-automacao-email) | **Fase 4 — Automação de e-mail** | Worker/scheduler que dispara os alertas de cobrança (Airflow + Microsoft Graph). |
| [`5-deploy-producao/`](5-deploy-producao) | **Fase 5 — Deploy para produção** | Hospedagem: **decisão SPFx × iframe no SharePoint**, migração, ambiente. |

> **Módulos dentro das fases.** O módulo **Recesso** é uma feature que atravessa as fases — seus docs
> ficam em `recesso/` dentro de cada fase (regras em `0-base/recesso/`, frontend em `1-…/recesso/`,
> backend em `2-…/recesso/`). O **SPFx** fica inteiro em `5-deploy-producao/spfx-sharepoint/`.

---

## 0-base — transversal (ler sempre)

| Doc | Assunto |
|---|---|
| [00-visao-geral-e-glossario.md](0-base/00-visao-geral-e-glossario.md) | Visão geral, atores, glossário canônico |
| [01-arquitetura-e-stack.md](0-base/01-arquitetura-e-stack.md) | Arquitetura e componentes |
| [02-dicionario-de-dados.md](0-base/02-dicionario-de-dados.md) | Modelo de dados (3 tabelas NF), cardinalidade |
| [04-regras-de-negocio-status.md](0-base/04-regras-de-negocio-status.md) | Regras de status de NF (Pendente/Enviado/Recebido) |
| [08-mocks-e-testes.md](0-base/08-mocks-e-testes.md) | Mocks, cenários, estratégia de testes |
| [09-pendencias-e-decisoes.md](0-base/09-pendencias-e-decisoes.md) | Pendências (P-xx) e decisões (A-xx) da base |
| [10-roadmap-fases-tarefas.md](0-base/10-roadmap-fases-tarefas.md) | Roadmap de fases e tarefas |
| [15-padroes-solid-e-object-calisthenics.md](0-base/15-padroes-solid-e-object-calisthenics.md) | Padrões de código (SOLID, Object Calisthenics, lint) |
| **Recesso** — [recesso/02-regras-de-negocio-saldo.md](0-base/recesso/02-regras-de-negocio-saldo.md) | **Regras de saldo do recesso** (mensal 2,5/mês, vigência, rescisão+encerramento) |
| **Recesso** — [recesso/06-pendencias-e-decisoes.md](0-base/recesso/06-pendencias-e-decisoes.md) | Pendências (R-xx) do recesso |

## 1-frontend-mockado — Fase 1 (implementado)

| Doc | Assunto |
|---|---|
| [07-frontend-dashboard.md](1-frontend-mockado/07-frontend-dashboard.md) | Dashboard, filtros, status interativo, exportação |
| [11-identidade-visual.md](1-frontend-mockado/11-identidade-visual.md) | Marca City: paleta, tipografia, tokens |
| [14-frontend-react-ts-arquitetura.md](1-frontend-mockado/14-frontend-react-ts-arquitetura.md) | Arquitetura React+TS (Ports & Adapters, VOs) |
| [16-plano-refatoracao-frontend.md](1-frontend-mockado/16-plano-refatoracao-frontend.md) | Plano de migração + checklist de paridade |
| [17-correcoes-pos-validacao-refatoracao.md](1-frontend-mockado/17-correcoes-pos-validacao-refatoracao.md) | Backlog de correção pós-refatoração |
| [21-carga-base-pj-ui.md](1-frontend-mockado/21-carga-base-pj-ui.md) | Upload/download da base de PJs por planilha (fonte paliativa) |
| **Recesso** — [recesso/01-visao-geral-e-glossario.md](1-frontend-mockado/recesso/01-visao-geral-e-glossario.md) | Visão geral do módulo Recesso |
| **Recesso** — [recesso/04-frontend-view-e-modal.md](1-frontend-mockado/recesso/04-frontend-view-e-modal.md) | View e modais do recesso |
| **Recesso** — [recesso/07-plano-de-implementacao.md](1-frontend-mockado/recesso/07-plano-de-implementacao.md) | Plano de implementação do recesso |

## 2-backend-homolog — Fase 2

| Doc | Assunto |
|---|---|
| [03-integracao-tomticket.md](2-backend-homolog/03-integracao-tomticket.md) | Integração Tomticket (casamento por e-mail) |
| [06-backend-api.md](2-backend-homolog/06-backend-api.md) | Backend = novo domínio na CITY API (arquitetura) |
| [12-especificacao-endpoints-city-api.md](2-backend-homolog/12-especificacao-endpoints-city-api.md) | Spec: rotas, DDL (3 tabelas), gateway, DI |
| [13-referencia-payloads-mock.md](2-backend-homolog/13-referencia-payloads-mock.md) | Payloads mock HCM/Tomticket, mapeamentos |
| [19-fonte-de-cadastro-modular.md](2-backend-homolog/19-fonte-de-cadastro-modular.md) | **Contrato JSON + fonte plugável** (planilha/HCM) via `dependencies.py` |
| **Recesso** — [recesso/03-modelo-de-dados.md](2-backend-homolog/recesso/03-modelo-de-dados.md) | Modelo de dados / DDL do recesso (por contrato, DECIMAL) |
| **Recesso** — [recesso/05-backend-endpoints.md](2-backend-homolog/recesso/05-backend-endpoints.md) | Endpoints `/v2/recesso` (motor mensal + rescisão/encerramento) |

## 3-conexao-front-backend — Fase 3

| Doc | Assunto |
|---|---|
| [README.md](3-conexao-front-backend/README.md) | Guia da integração: trocar mocks por HTTP no Composition Root + auth |

## 4-automacao-email — Fase 4

| Doc | Assunto |
|---|---|
| [05-automacao-alertas.md](4-automacao-email/05-automacao-alertas.md) | Regras dos alertas (D-3, D, D+1, D+3), elegibilidade, idempotência |
| [20-scheduler-de-alertas.md](4-automacao-email/20-scheduler-de-alertas.md) | Scheduler + worker (Airflow, Microsoft Graph, SOLID) |

## 5-deploy-producao — Fase 5

| Doc | Assunto |
|---|---|
| [18-hospedagem-sharepoint-e-identidade.md](5-deploy-producao/18-hospedagem-sharepoint-e-identidade.md) | Hospedagem no SharePoint + identidade/auth |
| **SPFx** — [spfx-sharepoint/README.md](5-deploy-producao/spfx-sharepoint/README.md) | Decisão **SPFx × iframe**, migração, identidade Entra ID, ambiente |

---

## Convenções de terminologia (canônica)

- **Lista de PJ** — fonte da verdade dos fornecedores (PJ). Na Fase 1/2 alimentada por **planilha** (fonte paliativa até o HCM — `2-backend-homolog/19`).
- **Tabela Fato** — registros de NF/chamados. **Tabela de Alerta** — log de disparos.
- **Status (NF)** — `Pendente` \| `Enviado` \| `Recebido`. **Status (contrato)** — `Ativo` \| `Inativo`, derivado da **vigência**.
- **Recesso** — acúmulo **mensal** de 2,5 dias por contrato a partir de **2025**; rescisão + encerramento automáticos no fim da vigência.

> **Referências entre docs:** a numeração (`02`, `03`, `05`…) identifica o doc; use este índice para localizar em qual fase ele está. Ao fechar uma pendência, atualize o doc normativo **e** este mapa.
