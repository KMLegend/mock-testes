# Base de Conhecimento (RAG) — App de Gestão de Notas Fiscais (Integração Tomticket)

> **Propósito deste diretório:** servir como base de recuperação de contexto (RAG) para agentes de IA responsáveis pela implementação do sistema. Cada arquivo é autocontido, cobre um domínio específico e usa terminologia padronizada. Ao implementar uma tarefa, recupere primeiro o(s) arquivo(s) do domínio correspondente e depois o `02-dicionario-de-dados.md` e o `09-pendencias-e-decisoes.md`.

## Arquitetura em uma frase

Frontend (Dashboard, marca City) → **novos endpoints `/v2/notas-fiscais` na CITY API existente**
(FastAPI/SQL Server, JWT M2M) → integração **Tomticket** (gateway, casamento por **e-mail**) + Lista
de PJ vinda do **ERP HCM** → automação de alertas em **worker Python + Scheduler** (2x/dia, UTC-3),
enviando por **Office 365**. Modelo com **3 tabelas** (fornecedor, fato, alerta).
O contexto da API existente está em `web/.context/backend/api-city-context/` (referência externa).

## Fases de desenvolvimento (A-22)

- **Fase 1 — Frontend mockado (interativo):** dashboard que mostra os PJ **Pendente / Enviado /
  Recebido** de forma interativa, com **dados mockados** (`13`) sobre uma **interface modular**.
  **Não depende de backend.** É o foco imediato.
- **Fase 2 — Backend:** endpoints na CITY API + integrações reais (Tomticket/HCM) + worker de
  alertas, mantendo a **mesma interface** — a UI da Fase 1 não muda.
- **Fase 3 — Validação e Documentação.**

Detalhamento em [10-roadmap-fases-tarefas.md](10-roadmap-fases-tarefas.md).

## Como usar esta base (para agentes)

1. **Sempre** carregue `00-visao-geral-e-glossario.md` para fixar terminologia.
2. Consulte o arquivo do domínio da tarefa (backend, frontend, integração, etc.).
3. Cruze com `02-dicionario-de-dados.md` para nomes de tabelas/campos.
4. Antes de assumir qualquer valor externo (IDs de categoria, templates, prazos), verifique `09-pendencias-e-decisoes.md`. Pendências **não** devem ser inventadas — devem ser sinalizadas.
5. Regras de tempo e status são a parte mais sensível: `04-regras-de-negocio-status.md` e `05-automacao-alertas.md` são normativos.

## Índice dos documentos

| Arquivo | Domínio | Fase |
|---|---|---|
| [00-visao-geral-e-glossario.md](00-visao-geral-e-glossario.md) | Visão geral, atores, glossário | Todas |
| [01-arquitetura-e-stack.md](01-arquitetura-e-stack.md) | Arquitetura, componentes, stack | Todas |
| [11-identidade-visual.md](11-identidade-visual.md) | Marca City: paleta, tipografia, logo, tokens | **Fase 1** |
| [13-referencia-payloads-mock.md](13-referencia-payloads-mock.md) | Payloads mock HCM/Tomticket, mapeamentos, template e-mail | **Fase 1** (base do mock) |
| [14-frontend-react-ts-arquitetura.md](14-frontend-react-ts-arquitetura.md) | Arquitetura alvo React+TS (Ports & Adapters, Value Objects) | **Fase 1** |
| [15-padroes-solid-e-object-calisthenics.md](15-padroes-solid-e-object-calisthenics.md) | Padrões de código: SOLID, Object Calisthenics, lint | **Fase 1** |
| [16-plano-refatoracao-frontend.md](16-plano-refatoracao-frontend.md) | Plano de migração + **checklist de paridade** (não regredir) | **Fase 1** |
| [17-correcoes-pos-validacao-refatoracao.md](17-correcoes-pos-validacao-refatoracao.md) | **Backlog de correção** da refatoração (C-01 a C-05) | **Fase 1** |
| [18-hospedagem-sharepoint-e-identidade.md](18-hospedagem-sharepoint-e-identidade.md) | Publicação no **SharePoint (iframe)**, identidade/autenticação e impacto no backend | Fases 1–2 |
| [07-frontend-dashboard.md](07-frontend-dashboard.md) | Dashboard, filtros, status interativo, exportação | **Fase 1** |
| [04-regras-de-negocio-status.md](04-regras-de-negocio-status.md) | Motor de status (Pendente/Enviado/Recebido) | Fase 1 (mock) → 2 (real) |
| [02-dicionario-de-dados.md](02-dicionario-de-dados.md) | Modelo de dados, 3 tabelas, cardinalidade | **Fase 2** |
| [03-integracao-tomticket.md](03-integracao-tomticket.md) | Integração com Tomticket (casamento por e-mail) | **Fase 2** |
| [05-automacao-alertas.md](05-automacao-alertas.md) | Alertas em worker Python (D-3, D, D+1, D+3) | **Fase 2** |
| [06-backend-api.md](06-backend-api.md) | Backend = novo domínio na CITY API (arquitetura) | **Fase 2** |
| [12-especificacao-endpoints-city-api.md](12-especificacao-endpoints-city-api.md) | Spec: rotas, DDL (3 tabelas), gateway, worker, DI | **Fase 2** |
| [08-mocks-e-testes.md](08-mocks-e-testes.md) | Mocks, cenários e validação | Fases 1–3 |
| [09-pendencias-e-decisoes.md](09-pendencias-e-decisoes.md) | Pendências (P-xx), decisões (A-xx), registro | Todas |
| [10-roadmap-fases-tarefas.md](10-roadmap-fases-tarefas.md) | Mapa de fases/tarefas → documentos | Todas |

## Módulos

| Módulo | Documentação | Natureza |
|---|---|---|
| **Notas Fiscais (PJ)** | esta pasta (`00`–`17`) | **Leitura** — dados vêm de Tomticket + HCM |
| **Gestão de Recesso** | [`modulo-recesso/`](modulo-recesso/README.md) | **Escrita** — o nf-pjs é o sistema de origem |

### Entrega e hospedagem

| Assunto | Documentação |
|---|---|
| **SPFx / SharePoint** (A-29) | [`spfx-sharepoint/`](spfx-sharepoint/README.md) — migração, identidade Entra ID, token de usuário na CITY API |

## Convenções de terminologia (canônica)

- **Lista de PJ** — storage/fonte da verdade dos fornecedores (PJ) ativos.
- **Tabela Fato** (Main) — registros transacionais de NF/chamados.
- **Tabela de Alerta** — log de alertas/comunicados enviados (unifica o "Comunicado" do plano — A-18); a fila de elegíveis é calculada sob demanda.
- **Tipo de Lançamento** — `Ambas` | `Contratual` | `Reembolso plano de saúde`.
- **Status** — `Pendente` | `Enviado` | `Recebido`.
- **Regras de tempo** — `D-3`, `D`, `D+1`, `D+3`.
- **Ano/Mês** — competência (período de referência) da NF.

> Regras de escrita destes documentos: manter os nomes canônicos acima; marcar suposições com `> SUPOSIÇÃO:`; marcar pendências com `> PENDÊNCIA:` e referenciar `09-pendencias-e-decisoes.md`.
