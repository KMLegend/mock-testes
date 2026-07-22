# Migração para SPFx (SharePoint Framework) — Base de Conhecimento

> **Decisão (A-29 / resolve P-11):** o frontend do nf-pjs será entregue como **SPFx web part**,
> publicado no **SharePoint**, com a **CITY API** como backend e **identidade do usuário via Entra ID**.
>
> Contexto e alternativas avaliadas: `docs/18-hospedagem-sharepoint-e-identidade.md`.

## O que muda e o que **não** muda

A arquitetura hexagonal (`docs/14`) foi construída exatamente para este tipo de troca. O impacto é
**periférico**:

| Camada | Migra? | Observação |
|---|---|---|
| `domain/` (VOs, entidades, coleções, serviços) | ✅ **inalterado** | TypeScript puro, sem React e sem I/O |
| `application/` (ports + casos de uso) | ✅ **inalterado** | Depende só de abstrações |
| `infrastructure/mock/` | ✅ **inalterado** | Continua servindo dev e testes |
| `infrastructure/http/` | 🔧 **novo adapter** | Passa a usar `AadHttpClient` (token do usuário) |
| `ui/` (componentes React) | 🔧 **ajuste** | JSX preservado; muda o *shell* e os estilos |
| **Build/Deploy** | ❌ **substituído** | Vite → toolchain SPFx (gulp) |
| **Estilos** | 🔧 `.module.css` → `.module.scss` | CSS válido é SCSS válido — renomeação, majoritariamente |
| **Testes de domínio** | ✅ **preservados** | Vitest continua rodando sobre `domain/`+`application/` (§ `01` §5) |

> **Regra de ouro da migração:** se um arquivo em `domain/` ou `application/` precisar mudar por
> causa do SPFx, **algo está errado** — provavelmente vazou dependência de framework para dentro.

## Índice

| Arquivo | Conteúdo |
|---|---|
| [01-arquitetura-spfx.md](01-arquitetura-spfx.md) | Estrutura da solução, o que migra, como preservar os testes |
| [02-identidade-e-autenticacao.md](02-identidade-e-autenticacao.md) | `AadHttpClient`, App Registration, permissões, fluxo do token |
| [03-backend-city-api-token-usuario.md](03-backend-city-api-token-usuario.md) | O que a **CITY API** precisa implementar (validar RS256/JWKS) |
| [04-plano-de-migracao.md](04-plano-de-migracao.md) | Etapas, checklist de paridade, riscos |
| [05-pendencias-e-decisoes.md](05-pendencias-e-decisoes.md) | **Pendências S-xx** — ler antes de começar |
| [06-ambiente-de-desenvolvimento.md](06-ambiente-de-desenvolvimento.md) | **Ambiente e versão do SPFx** — premissa implícita de tudo aqui |

## Pré-requisitos que bloqueiam o início

Confirmar **antes** de escrever código (detalhes em `05`):

1. **Acesso ao App Catalog** do tenant (publicar `.sppkg` exige admin do SharePoint).
2. 🔴 **Versão do SPFx.** O ambiente já validado é **1.11 (TS 3.3 / React 16.8 / Node 10)** — **incompatível** com o código atual (TS 5.4). **Recomendado adotar uma versão moderna.** Ver **`06` §4** e **S-01**.
3. **App Registration** da CITY API no Entra ID, expondo um *scope* (**S-02**).
4. Aprovação de **API access** no SharePoint Admin Center (**S-03**).

> Os itens 1, 3 e 4 dependem de **TI/administração do tenant** — não são resolvíveis dentro do time
> de desenvolvimento. Encaminhe em paralelo ao desenvolvimento para não virar gargalo.
