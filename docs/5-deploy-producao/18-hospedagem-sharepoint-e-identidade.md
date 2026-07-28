---
titulo: Hospedagem no SharePoint e Identidade do Usuário
dominio: arquitetura
fase: [1, 2]
tags: [sharepoint, iframe, identidade, autenticacao, entra-id, msal, spfx, auditoria, csp, seguranca]
status: normativo-com-pendencias
---

# Hospedagem no SharePoint e Identidade do Usuário

> **Decisão (A-28):** a aplicação será publicada **dentro do SharePoint**, embarcada como **iframe**
> numa página. O **controle de acesso e os usuários são os do SharePoint** (Microsoft 365 / Entra ID) —
> o nf-pjs **não terá cadastro próprio de usuários**.
>
> Isso resolve a direção de **R-04** (identidade para "quem lançou" no módulo de Recesso), mas
> **não** encerra o assunto: falta definir **como** essa identidade chega ao backend de forma
> **verificável**. Ver §3.

## 1. O que o SharePoint resolve — e o que não resolve

| O SharePoint **resolve** | O SharePoint **não resolve** |
|---|---|
| **Quem pode abrir a página** (permissão do site/página) | **Autorização dentro do app** (quem pode lançar × só consultar) |
| O usuário **já está autenticado** no M365 → SSO sem nova tela de login | **Provar ao backend** quem é o usuário |
| Diretório de usuários (Entra ID) — sem cadastro próprio | **Identidade confiável para auditoria** |

## 2. Regra de ouro (não negociável)

> **O backend não pode confiar em identidade enviada pelo frontend.**

Passar o usuário por **query string** (`?usuario=fulano`), **postMessage** ou campo de formulário é
**falsificável**: qualquer pessoa com o endereço da API pode gravar uma ocorrência assinada como
outra pessoa. Isso **anula o propósito** da coluna "quem lançou" — que existe justamente para
auditoria.

**O `lancado_por` deve ser derivado de um token validado no servidor** (assinatura verificada,
emissor e audiência conferidos), nunca do corpo ou da URL da requisição.

## 3. Como obter a identidade (opções)

### ✅ Opção A — SPFx Web Part (recomendada se for de fato "dentro do SharePoint")
O app é empacotado como **SharePoint Framework web part**, servido na **mesma origem** da página.

- Identidade nativa: `context.pageContext.user` (login/e-mail).
- Chamada ao backend com **token de usuário do Entra ID** via `AadHttpClient` → a CITY API recebe um
  JWT **do usuário**, verificável.
- Sem problema de cookies de terceiros nem de `frame-ancestors`.
- **Custo:** o build deixa de ser Vite puro e passa a seguir o toolchain do SPFx.

### ✅ Opção B — SPA em iframe + MSAL (Entra ID)
O app continua sendo a SPA Vite atual, hospedada num domínio próprio e embarcada por iframe.

- Autentica com **MSAL.js** contra o **Entra ID** — o mesmo diretório do SharePoint, então o usuário
  já logado no M365 passa por **SSO silencioso** (`ssoSilent`/`acquireTokenSilent`), sem ver tela de login.
- Envia ao backend o **token de usuário** (não o M2M).
- **Atenção:** login **interativo não funciona dentro de iframe** (a página do Entra recusa ser
  enquadrada). Fallback obrigatório: **popup** ou **redirect na janela de topo**.
- Requer os ajustes de §5 (CSP/cookies).

### ❌ Opção C — SharePoint injeta o usuário (query string / postMessage)
- **Não aceitável para auditoria** — viola §2.
- Aceitável **apenas** para personalização visual ("Olá, Fulano"), **nunca** para gravar `lancado_por`.

> ✅ **DECIDIDO: Opção A — SPFx** (A-29). Implementação detalhada em
> [`spfx-sharepoint/`](spfx-sharepoint/README.md). As seções sobre iframe/MSAL (§5 e Opção B) ficam
> como **registro das alternativas avaliadas** — não se aplicam mais.

## 4. Impacto no backend (CITY API)

Hoje a CITY API usa **JWT M2M (HS256)** — identifica a **integração**, não a pessoa (`docs/06` §1).
Para auditoria por usuário isso é insuficiente.

| Situação | Necessário |
|---|---|
| Token atual (M2M, HS256, segredo compartilhado) | Continua válido para integrações máquina-a-máquina |
| **Novo:** token de **usuário** do Entra ID (RS256) | Validar **assinatura via JWKS**, `issuer`, `audience` e expiração |
| `lancado_por` | Extraído das **claims** do token de usuário (`preferred_username` / `oid`) |

- A CITY API **já possui credenciais Entra ID** (`ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`,
  `ENTRA_CLIENT_SECRET`) usadas em RH/Graph — há precedente, mas **validar token de usuário é uma
  capacidade nova**, diferente de *consumir* o Graph.
- **Autorização** (quem pode lançar ocorrência) precisa de decisão própria — permissão da página do
  SharePoint **não chega** ao backend. Ver **P-12**.

## 5. Restrições técnicas do iframe (Opção B)

| Item | Exigência |
|---|---|
| **Enquadramento** | Servir a SPA com `Content-Security-Policy: frame-ancestors https://<tenant>.sharepoint.com`. Remover `X-Frame-Options: DENY/SAMEORIGIN` |
| **Cookies** | Cookies de terceiros são bloqueados por padrão (Chrome/Safari). **Não** usar sessão por cookie — manter o token **em memória** |
| **Login interativo** | Bloqueado em iframe → usar **popup** ou **redirect no top window** |
| **HTTPS** | Obrigatório (SharePoint é HTTPS; conteúdo misto é bloqueado) |
| **Altura** | Iframe não redimensiona sozinho: definir altura fixa adequada ou usar postMessage para ajuste |
| **Fontes/ativos** | Continuam servidos do próprio domínio da app (regra de marca, `docs/11` §2) |

## 6. Impacto nos módulos existentes

- **Módulo de NF (leitura):** hoje funciona sem identidade de usuário. Com a mudança, passa a exigir
  **usuário autenticado** para abrir — comportamento de tela **não muda**.
- **Módulo de Recesso (escrita):** **depende** desta decisão. Sem identidade verificável, a coluna
  "quem lançou" não tem valor de auditoria (`modulo-recesso/05` §3).
- **Fase 1 (mock):** continua com **usuário fixo de demonstração**; a troca para o usuário real é no
  **Composition Root** (port `UsuarioAtual`), sem tocar em domínio nem UI (`docs/14` §8).

## 7. Port `UsuarioAtual` (contrato estável)

```ts
export interface UsuarioAtual {
  identificar(): Promise<{ readonly login: string; readonly nome: string }>;
}
```

| Fase | Implementação |
|---|---|
| Fase 1 (mock) | `UsuarioAtualFixo` — usuário de demonstração |
| Fase 2 — Opção A | `UsuarioAtualSpfx` — `context.pageContext.user` |
| Fase 2 — Opção B | `UsuarioAtualMsal` — claims do token do Entra ID |

> O backend **não** confia neste valor: ele serve à UI. O `lancado_por` gravado vem **sempre** do
> token validado no servidor (§2).

## 8. Pendências

| ID | Pendência | Situação |
|---|---|---|
| ~~P-11~~ | ~~SPFx (A) ou SPA em iframe + MSAL (B)?~~ | ✅ **RESOLVIDA → Opção A (SPFx)** — decisão **A-29**. Implementação em [`spfx-sharepoint/`](spfx-sharepoint/README.md) |
| **P-12** | **Autorização** no backend: todo usuário do SharePoint pode lançar? Há perfil só-leitura? | **Aberto** |
| **P-13** | Tenant, site e página do SharePoint onde o app será publicado | **Aberto** |
| **P-14** | Registro do app no **Entra ID** (App Registration): client id, scopes, redirect URIs | **Aberto** |
| **P-15** | Onde a SPA será **hospedada** na Opção B (domínio/servidor) | **Aberto** |
| **P-16** | CITY API passa a **validar token de usuário** (RS256/JWKS) — quem implementa e quando | **Aberto** |

> **P-11 foi resolvida: Opção A (SPFx).** As pendências derivadas migraram para
> [`spfx-sharepoint/05-pendencias-e-decisoes.md`](spfx-sharepoint/05-pendencias-e-decisoes.md) §4
> (P-12→S-06, P-13→S-09, P-14→S-02; **P-15 deixou de se aplicar** — o SPFx é servido pelo SharePoint).
