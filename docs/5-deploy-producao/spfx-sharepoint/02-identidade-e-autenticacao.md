---
titulo: SPFx — Identidade e Autenticação (Entra ID → CITY API)
dominio: seguranca
tags: [spfx, entra-id, aadhttpclient, token, oauth, app-registration, permissoes, auditoria]
status: normativo
---

# Identidade e Autenticação

> Resolve **R-04** do módulo de Recesso (auditoria de "quem lançou") e **P-11** de `docs/18`.

## 1. Fluxo do token

```
Usuário logado no M365
      │
      ▼
Página do SharePoint  ──► SPFx Web Part (mesma origem)
                              │  context.aadHttpClientFactory.getClient(<App ID URI da CITY API>)
                              ▼
                        Entra ID emite token DE USUÁRIO (RS256) para a CITY API
                              │  Authorization: Bearer <token>
                              ▼
                        CITY API valida assinatura/issuer/audience  (ver 03)
                              │
                              ▼
                        lancado_por = claim do token   ← auditoria confiável
```

**Ponto central:** o `lancado_por` **nunca** vem do corpo da requisição. Vem da claim de um token que
o servidor **validou** — é isso que torna a auditoria do módulo de Recesso confiável
(`modulo-recesso/05` §3).

## 2. Uso do `AadHttpClient`

```ts
// infrastructure/http/ClienteHttpCityApi.ts
export class ClienteHttpCityApi {
  constructor(
    private readonly fabrica: AadHttpClientFactory,
    private readonly appIdUri: string,   // ex.: api://<client-id-da-city-api>
    private readonly baseUrl: string
  ) {}

  private async cliente(): Promise<AadHttpClient> {
    return this.fabrica.getClient(this.appIdUri);
  }

  async obter<T>(rota: string): Promise<T> {
    const cliente = await this.cliente();
    const resposta = await cliente.get(`${this.baseUrl}${rota}`, AadHttpClient.configurations.v1);
    if (!resposta.ok) throw new ErroDeApi(resposta.status);
    return resposta.json() as Promise<T>;
  }

  async enviar<T>(rota: string, corpo: unknown): Promise<T> { /* POST, mesma configuração */ }
}
```

- Os **adapters de repositório** (`FornecedorRepositoryHttp`, `OcorrenciaDeRecessoRepositoryHttp`…)
  usam este cliente e implementam **os mesmos ports** dos mocks — a UI não percebe a troca.
- Tratar erro por **status**: `401/403` (sessão/permissão), `422` (regra de negócio — ex.: saldo
  insuficiente), `5xx` (indisponibilidade). Mensagem ao usuário deve distinguir esses casos.

## 3. Configuração necessária (fora do código)

### 3.1 App Registration da CITY API no Entra ID (**S-02**)
- Expor um **scope** (ex.: `user_impersonation` ou `access_as_user`).
- Definir o **Application ID URI** (ex.: `api://<client-id>`).
- Anotar `tenant id`, `client id` e o URI — necessários no SPFx e na validação do backend (`03`).

### 3.2 Permissão declarada no pacote SPFx
```jsonc
// config/package-solution.json
"webApiPermissionRequests": [
  { "resource": "<nome-do-app-registration-da-city-api>", "scope": "user_impersonation" }
]
```

### 3.3 Aprovação pelo administrador (**S-03**)
Após o deploy do `.sppkg`, um admin precisa **aprovar** a permissão em
**SharePoint Admin Center → Advanced → API access**. Sem isso, `getClient()` falha em runtime.

> ⚠️ **Implicação de segurança que precisa ser conhecida:** no SPFx, os tokens são emitidos para o
> **SharePoint Online Client Extensibility Web Application Principal** — um *service principal
> compartilhado do tenant*. A permissão aprovada vale para **qualquer SPFx do tenant**, não só para
> esta solução. Ou seja: outra web part instalada no tenant também conseguiria pedir token para a
> CITY API.
>
> **Consequência prática:** a **autorização não pode depender só do token existir**. A CITY API
> precisa validar **quem é o usuário** e **se ele pode** executar aquela operação (`03` §4 e **S-06**).

## 4. Port `UsuarioAtual` — implementação SPFx

Contrato já definido em `docs/18` §7; agora ganha o adapter real:

```ts
// infrastructure/spfx/UsuarioAtualSpfx.ts
export class UsuarioAtualSpfx implements UsuarioAtual {
  constructor(private readonly usuario: { displayName: string; email: string; loginName: string }) {}

  async identificar(): Promise<{ login: string; nome: string }> {
    return { login: this.usuario.email || this.usuario.loginName, nome: this.usuario.displayName };
  }
}
```

| Ambiente | Implementação |
|---|---|
| Dev / testes | `UsuarioAtualFixo` (mock) |
| SharePoint | `UsuarioAtualSpfx` (`context.pageContext.user`) |

> Este valor serve à **UI** ("Olá, Fulano", pré-preenchimento). O `lancado_por` **gravado** vem do
> token validado no servidor — os dois **não** se substituem.

## 5. CORS

Mesmo com o SPFx sendo *same-origin* com a página, a **CITY API está em outro domínio**
(`api.city-solucoes.com`) — então **CORS se aplica**.

- Incluir `https://<tenant>.sharepoint.com` em `CORS_ALLOW_ORIGINS` da CITY API.
- Permitir o header `Authorization` e os métodos usados (`GET`, `POST`).
- Responder corretamente ao **preflight `OPTIONS`**.

## 6. Ambientes

| Ambiente | Base URL da API | Observação |
|---|---|---|
| Dev (hosted workbench) | homologação | `https://<tenant>.sharepoint.com/_layouts/15/workbench.aspx` |
| Homologação | homologação | Site/página de teste no SharePoint |
| Produção | `https://api.city-solucoes.com` | — |

A URL base é **propriedade da web part** (`01` §3) — trocar ambiente **não** exige rebuild.

## 7. O que NÃO fazer

- ❌ Enviar `lancadoPor` no corpo do POST (falsificável — `docs/18` §2).
- ❌ Usar o **JWT M2M** (HS256) da CITY API a partir do frontend: além de não identificar a pessoa,
  exigiria embutir o segredo no bundle — que é **público**.
- ❌ Guardar token em `localStorage`. O `AadHttpClient` gerencia o ciclo de vida; não replicar.
- ❌ Confiar em `context.pageContext.user` no **backend** — é dado do cliente.
