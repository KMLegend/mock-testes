---
titulo: SPFx — Pendências e Decisões
dominio: gestao
tags: [pendencias, decisoes, spfx, bloqueios, rastreador]
status: rastreador
---

# Pendências e Decisões — SPFx

> **Regra para agentes:** não inventar valores de tenant, IDs ou versões. Parametrizar e sinalizar
> (`// PENDÊNCIA S-xx`). Itens 🔴 **bloqueiam** etapas do plano (`04` §1).

## 1. Bloqueiam o início 🔴

| ID | Pendência | Bloqueia | Quem resolve |
|---|---|---|---|
| **S-01** | **Versão do SPFx a adotar.** O ambiente já validado (`CORRECAO-SPFX.md`) é **SPFx 1.11 → TypeScript 3.3 / React 16.8 / Node 10**, **incompatível** com o código atual (TS 5.4; `?.`/`??` em **15 arquivos**; 3 flags de `strict`). **Recomendação: versão moderna do SPFx** (Node 18+, TS 4.7+, React 17) → zero reescrita de sintaxe. Ver `06` §4 | Etapas 1–3 (**precede tudo**) | Time + TI |
| **S-02** | **App Registration** da CITY API no Entra ID: `client id`, **Application ID URI**, **scope** exposto | Etapas 5–6 | TI / owner da CITY API |
| **S-03** | Acesso ao **App Catalog** e aprovação de **API access** no SharePoint Admin Center | Etapa 7 | Admin do SharePoint |

> S-02 e S-03 **não são resolvíveis pelo time de desenvolvimento**. Encaminhar em paralelo às
> etapas 1–4, que rodam com mock e não dependem deles.

## 2. Decisões de arquitetura 🟠

| ID | Decisão | Default | Ref. |
|---|---|---|---|
| **S-04** | **Uma** web part com HUD interno **ou duas** (NF e Recesso separadas)? | **Uma** — o HUD já existe; menos deploy e menos permissão | `01` §4 |
| **S-06** | **Autorização**: token válido ≠ pode executar. Como decidir quem lança ocorrência? | Grupo do Entra ID **ou** perfil no DB City — **precisa existir** | `03` §4 |
| **S-07** | Guardar **`oid`** além de `preferred_username` na auditoria? | **Sim** — `preferred_username` muda, `oid` não | `03` §3 |
| **S-08** | Onde ficam os **assets de marca** (fontes/logos): no pacote ou em biblioteca do SharePoint? | **No pacote** — garante origem própria (`docs/11` §2) | `04` §3 |

## 2.1 Ambiente (premissa implícita)

As regras de `06` (Node portátil, nunca `npm audit fix`, `isDomainIsolated: false`, workbench **hospedado** para testar identidade) são **pressupostas em todas as tarefas** — não precisam ser repetidas em cada etapa.

## 3. Operacionais 🟡

| ID | Pendência | Situação |
|---|---|---|
| **S-05** | Conflito entre estilos do **tema do SharePoint** e o CSS da app | Verificar na etapa 3 |
| **S-09** | **Tenant, site e página** onde a web part será publicada | Aberto (era P-13 em `docs/18`) |
| **S-10** | Ambiente de **homologação** no SharePoint (site/página separados) | Aberto |
| **S-11** | **CI/CD** do `.sppkg`: build manual ou GitHub Actions (já usado na CITY API)? | Aberto |
| **S-12** | Estratégia de **versionamento** da solução e atualização em produção | Aberto |

## 4. Herdadas de `docs/18` (reclassificadas)

| Antes | Agora |
|---|---|
| **P-11** (SPFx × MSAL) | ✅ **Resolvida** → **SPFx** (A-29) |
| **P-12** (autorização) | → **S-06** |
| **P-13** (tenant/site/página) | → **S-09** |
| **P-14** (App Registration) | → **S-02** |
| **P-15** (hospedagem da SPA) | ❌ **Não se aplica** — o SPFx é servido pelo SharePoint |
| **P-16** (validar token de usuário na CITY API) | → `03` (documentado); segue **aberto para execução** |

## 5. Registro de decisões

| Data | ID | Decisão tomada | Responsável |
|---|---|---|---|
| 2026-07-17 | **A-29** | Frontend será **SPFx web part** no SharePoint, com **CITY API** como backend e identidade via **Entra ID** (`AadHttpClient`). Resolve **P-11** e a direção de **R-04**. | kevin.maykel@cityinc.com.br |

> Ao fechar um item, mover para cá com a justificativa e atualizar o documento normativo
> correspondente — doc e código não podem divergir.
