---
titulo: CITY API — Validação de Token de Usuário (Entra ID)
dominio: backend
tags: [city-api, fastapi, entra-id, jwt, rs256, jwks, autorizacao, auditoria, cors]
status: normativo-para-implementacao
---

# CITY API — Aceitar Token de Usuário do Entra ID

> **Capacidade nova.** Hoje a CITY API valida **JWT M2M (HS256)** com segredo compartilhado
> (`docs/06` §1) — identifica a **integração**, não a pessoa. Para o SPFx e para a auditoria do
> módulo de Recesso, ela precisa **também** validar **token de usuário do Entra ID (RS256)**.

## 1. Os dois tipos de token convivem

| Token | Algoritmo | Identifica | Usado por |
|---|---|---|---|
| **M2M** (atual) | HS256 (segredo) | A integração | Airflow, worker de alertas, integrações existentes |
| **Usuário** (novo) | **RS256** (chave pública/JWKS) | **A pessoa** | **SPFx web part** |

> **Não substituir** o M2M — as integrações existentes dependem dele. É uma **dependency de
> autenticação dupla**: aceitar os dois e saber qual está em uso.

## 2. Validação do token de usuário

Endpoints do Entra ID (v2.0), por tenant:

- **JWKS:** `https://login.microsoftonline.com/<TENANT_ID>/discovery/v2.0/keys`
- **Issuer esperado:** `https://login.microsoftonline.com/<TENANT_ID>/v2.0`

**Verificações obrigatórias (todas):**

| Item | Regra |
|---|---|
| **Assinatura** | RS256, chave pública obtida do **JWKS** (com cache e rotação por `kid`) |
| **`iss`** | Igual ao issuer do tenant |
| **`aud`** | O **client id** (ou App ID URI) da CITY API — rejeitar token emitido para outra audiência |
| **`exp` / `nbf`** | Dentro da validade |
| **`scp`** | Contém o scope exposto (ex.: `user_impersonation`) |

Esqueleto (FastAPI, alinhado ao `app/core/security.py` existente):

```python
from jwt import PyJWKClient
import jwt

_jwks = PyJWKClient(f"https://login.microsoftonline.com/{TENANT_ID}/discovery/v2.0/keys")

def validar_token_de_usuario(token: str) -> dict:
    chave = _jwks.get_signing_key_from_jwt(token).key
    return jwt.decode(
        token,
        chave,
        algorithms=["RS256"],
        audience=ENTRA_API_AUDIENCE,
        issuer=f"https://login.microsoftonline.com/{TENANT_ID}/v2.0",
    )
```

> `PyJWT` já é dependência do projeto (usado no M2M) — o acréscimo é o `PyJWKClient` e o cache do JWKS.
> **Não** buscar o JWKS a cada requisição.

## 3. Identidade para auditoria

| Claim | Uso |
|---|---|
| `preferred_username` | **`lancado_por`** (login/e-mail) — legível na auditoria |
| `oid` | Identificador **estável** do usuário no tenant — recomendável guardar junto |
| `name` | Exibição |

**Regras:**
1. `lancado_por` vem **exclusivamente** da claim — **ignorar** qualquer valor no payload.
2. Preferir **guardar também o `oid`**: `preferred_username` pode mudar (troca de e-mail/sobrenome);
   `oid` não. Sem ele, auditoria antiga fica órfã. → **S-07**
3. Sem token de usuário válido → **401**, nunca gravar com autor genérico.

## 4. Autorização (não é opcional)

Conforme `02` §3.3, o token do SPFx é emitido para um **service principal compartilhado do tenant** —
ou seja, **qualquer** SPFx do tenant consegue obter token para a CITY API.

> **Portanto: "ter token válido" ≠ "pode executar".** A CITY API **precisa** de autorização própria.

Opções (decidir em **S-06**):
- **(a)** Lista/grupo de usuários autorizados (grupo do Entra ID, via claim `groups` ou consulta ao Graph);
- **(b)** Tabela de permissões no DB City (perfil por usuário: consulta × lançamento);
- **(c)** Restringir por **scope** dedicado (ex.: `recesso.write`) concedido só a quem deve.

Mínimo aceitável para o módulo de Recesso: **quem pode lançar ocorrência** precisa ser verificado no
servidor, não presumido pela presença do token.

## 5. Endpoints afetados

| Endpoint | Token aceito |
|---|---|
| `/v2/notas-fiscais/*` (leitura) | Usuário **ou** M2M |
| `/v2/recesso/*` (leitura) | Usuário **ou** M2M |
| **`POST /v2/recesso/ocorrencias`** | **Somente token de usuário** (precisa de autor) |
| `/v2/notas-fiscais/sync/*` | M2M (worker/agendador) |

> O `POST` de ocorrência **não deve** aceitar M2M: sem pessoa identificada, não há auditoria — que é
> o motivo de o campo existir.

## 6. CORS

Adicionar `https://<tenant>.sharepoint.com` a `CORS_ALLOW_ORIGINS`, permitindo o header
`Authorization` e o preflight `OPTIONS` (`02` §5).

## 7. Checklist de implementação (backend)

- [ ] Variáveis: `ENTRA_TENANT_ID` (já existe), `ENTRA_API_AUDIENCE`, `ENTRA_API_SCOPE`.
- [ ] `PyJWKClient` com **cache** de JWKS e suporte a rotação de chave (`kid`).
- [ ] Dependency FastAPI que aceita **M2M ou usuário**, expondo qual foi usado.
- [ ] Validar `iss`, `aud`, `exp`/`nbf` e `scp` — **todos**.
- [ ] `lancado_por` (e `oid`) derivados **só** das claims; ignorar payload.
- [ ] Autorização de escrita implementada (**S-06**), não apenas autenticação.
- [ ] `POST /v2/recesso/ocorrencias` **rejeita** token M2M.
- [ ] CORS liberado para a origem do SharePoint.
- [ ] Testes: token expirado, audiência errada, issuer errado, assinatura inválida, scope ausente,
      e tentativa de forjar `lancadoPor` no corpo (deve ser **ignorado**).
