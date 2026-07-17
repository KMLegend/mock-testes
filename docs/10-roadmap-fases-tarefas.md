---
titulo: Roadmap — Fases e Tarefas
dominio: gestao
fase: todas
tags: [roadmap, fases, tarefas, rastreabilidade, mock, frontend, backend]
status: mapa
---

# Roadmap — Fases de Desenvolvimento

> **Macro-fases (decisão A-22):**
> - **Fase 1 — Frontend mockado (interativo):** dashboard funcional que mostra, de forma interativa,
>   quais PJ estão **Pendente / Enviado / Recebido**, usando **dados mockados** sobre uma **interface
>   modular**. **Não depende de backend.**
> - **Fase 2 — Backend:** endpoints na CITY API + integrações reais (Tomticket/HCM) + worker de
>   alertas, mantendo a **mesma interface** que o frontend já consome (troca mock → real transparente).
> - **Fase 3 — Validação e Documentação:** testes de regra e entrega.
>
> Princípio de acoplamento: o frontend fala com uma **camada de dados por interface** (DTOs de
> `13-referencia-payloads-mock.md`). Na Fase 1 essa camada é **mock**; na Fase 2 passa a chamar a
> CITY API. A UI **não muda** entre as fases.
>
> **Nota de numeração:** ao longo dos demais documentos, referências como "**Tarefa 2.3**", "**Tarefa
> 3.2**" apontam para o **Plano de Implementação original** (numeração estável, descritiva). As
> **fases de desenvolvimento** abaixo (Fase 1 = front, Fase 2 = back, Fase 3 = validação) são a
> **ordem de execução** adotada — e podem cruzar tarefas de fases diferentes do plano original.

---

## Fase 1 — Frontend mockado (interativo)

**Objetivo:** abrir o app e ver a lista de fornecedores PJ com o **status calculado por competência**
(Pendente/Enviado/Recebido), podendo **filtrar e interagir** — tudo com dados mockados.

| Tarefa | Descrição | Documentos | Critério de conclusão |
|---|---|---|---|
| 1.1 | Setup do frontend + **identidade visual City** (importar `brand.css`, tokens, header, logo) | `11-identidade-visual.md` | App renderiza com a marca City; tokens de status disponíveis |
| 1.2 | **Camada de dados mock** por interface (DTOs `FornecedorPJ`, `ChamadoTomticket`; datasets de `13`) | `13` §1–§2, `06` §2 (Strategy) | Serviço mock plugável devolve os DTOs padrão; trocável por config |
| 1.3 | **Motor de status no cliente** (equivalente ao Left Join por **e-mail** + competência) | `04-regras-de-negocio-status.md` | Pendente/Enviado/Recebido corretos; granularidade por `(email, tipo_lancamento)` |
| 1.4 | **Dashboard**: filtros **Ano/Mês** (default **mês atual**) + DataGrid com **badges de status** e contadores | `07-frontend-dashboard.md` §1 | Lista todos os PJ ativos do mock com status e resumo por status |
| 1.5 | **Interatividade**: filtrar por status, buscar (nome/CNPJ/e-mail), ordenar, abrir link do chamado | `07` §1 | Interações funcionam sobre o mock, sem recarregar backend |
| 1.6 | Aba **Mensagens** (histórico) + exportação **Excel** | `07` §2–§3, `13` §3–§4 | Aba de mensagens (Nome/E-mail/CNPJ/Regra/Dt-H/Ano-Mês) e export `.xlsx` a partir do mock |

**Cenários que o mock deve exibir (dataset `13` + `08` §1):** PJ sem chamado (**Pendente**), com
chamado aberto (**Enviado**), finalizado (**Recebido**), com **2 chamados** (Contratual + Reembolso →
2 linhas) e o caso de **1 PJ com >1 contrato** (desambiguação mock — `13` §4).

**Entregável da Fase 1:** dashboard interativo de status, sem backend, pronto para validação visual.

---

## Fase 2 — Backend

**Objetivo:** implementar os endpoints na **CITY API** + integrações reais + worker de alertas, e
**trocar a camada mock do frontend** pelos endpoints reais (a UI permanece igual).

| Tarefa | Descrição | Documentos | Critério de conclusão |
|---|---|---|---|
| 2.1 | **3 tabelas** SQL Server no DB City (fornecedor, fato, alerta) | `12` §2, `02` | DDLs aplicadas; unicidade `id_tomticket`; alerta `UNIQUE(email,regra,comp)` |
| 2.2 | **Fonte HCM** → sync `FORNECEDOR` (e-mail normalizado, único) | `12` §1, `13` §1 | `FonteHCM` real (mock trocável); Lista de PJ populada |
| 2.3 | **Integração Tomticket** (gateway; casamento por **e-mail**) + upsert por `id_tomticket` | `03`, `12` §5 | Leitura + encerramento; competência do "Mês Referente" |
| 2.4 | **Desambiguação de contrato** (`INotaCnpjExtractor`: mock agora, Marker depois) | `13` §4, `03` §3.1 | 1 PJ × >1 contrato resolvido; sem match → tratamento manual |
| 2.5 | **Motor de status real** + endpoints `/status`, `/status/resumo`, `/fornecedores`, `/comunicados` | `04`, `12` §3–§4 | Left Join por e-mail; sem falsos Pendentes |
| 2.6 | **Exportação Excel** `.xlsx` (`/export`) | `07` §3, `12` §3.4 | Colunas da tabela + aba de contratos |
| 2.7 | **Worker de alertas** (Python + Scheduler, O365) | `05-automacao-alertas.md` | Regras D-3/D/D+1/D+3 (`D` via `.env`); 2x/dia UTC-3; grava na Tabela de Alerta |
| 2.8 | **Trocar o mock do frontend** pelos endpoints reais (JWT M2M) | `12` §3, `06` §5 | Mesma UI, dados reais; envelope padrão |

**Entregável da Fase 2:** dados reais de Tomticket/HCM no dashboard; alertas automáticos por e-mail.

---

## Fase 3 — Validação e Documentação Final

| Tarefa | Descrição | Documentos | Critério de conclusão |
|---|---|---|---|
| 3.1 | Validação do motor de status (falsos Pendentes; e-mail; competência) | `04` §4, `08` §2 | Suite de testes passa |
| 3.2 | Validação do parser "Mês Referente" (→ `MM-AAAA`) | `03` §6, `08` §3 | Todos os formatos cobertos |
| 3.3 | Validação de alertas (regras de tempo, idempotência) | `05`, `08` §4 | Datas D-3/D/D+1/D+3 corretas; sem reenvio |
| 3.4 | Documentação de fluxo (BPMN/fluxograma) + dicionário de dados/cardinalidade | `05`, `02` §5 | Diagramas + dicionário entregues |

---

## Ordem recomendada

```
Fase 1: 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → (1.6 opcional)
Fase 2: 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.7 → 2.8
Fase 3: 3.1 → 3.2 → 3.3 → 3.4
```

## Dependências críticas

- **Fase 1 é autossuficiente** (mock) — pode começar já, com os payloads de `13`.
- A **interface modular** (1.2) é o contrato que a Fase 2 implementa; mantê-la estável evita retrabalho de UI.
- 2.5 (status real) depende de 2.1–2.4 (dados na Fato).
- 2.7 (worker) depende de 2.5 (status) e de P-02 (templates) / P-08 (O365).
- 2.8 encerra a troca mock → real sem alterar a UI da Fase 1.
- Ordem dos jobs de backend: `sync → status` antes de o worker calcular elegibilidade (`04` §4, `06` §6).
