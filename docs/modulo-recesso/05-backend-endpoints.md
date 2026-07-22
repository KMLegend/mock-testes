---
titulo: Módulo Recesso — Backend (CITY API, endpoints de escrita)
dominio: backend
tags: [backend, city-api, endpoints, post, escrita, idempotencia, auditoria, transacao]
status: normativo-para-implementacao
---

# Backend — Módulo Recesso na CITY API (Fase 2)

> Segue a arquitetura de `docs/06` e o padrão de spec de `docs/12`. **Novidade estrutural:** este é o
> **primeiro módulo de escrita** da base — todos os anteriores eram somente leitura.

## 1. O que muda por ser escrita

| Aspecto | Módulos anteriores (leitura) | **Recesso (escrita)** |
|---|---|---|
| Recuperação de erro | Re-sincronizar da fonte (Tomticket/HCM) | **Não existe fonte** — o dado nasce aqui |
| Validação | Best-effort na exibição | **Obrigatória no backend** (o front não é confiável) |
| Auditoria | Não aplicável | **Obrigatória** (quem, quando) |
| Idempotência | Alertas | **Crédito automático** — corrompe saldo se falhar |

> **Regra:** validar **no backend**, sempre. A validação do formulário é conveniência de UX; a
> integridade do saldo é responsabilidade do servidor.

## 2. Endpoints (`/v2/recesso`, JWT obrigatório) — *rotas propostas*

| Método | Rota | Status | Descrição |
|---|---|---|---|
| GET | `/pjs` | 200 | Lista de PJs para a view (**inclui inativos**; ver `04` §3) |
| GET | `/ocorrencias` | 200 | Extrato de um PJ (`?idPj=`) — já com saldo corrente e saldo atual |
| **POST** | **`/ocorrencias`** | **201** | **Lança** uma ocorrência manual |
| POST | `/creditos-automaticos/processar` | 202 | Executa o motor de crédito (idempotente) |

### 2.1 `GET /v2/recesso/ocorrencias?idPj=15`
```json
{
  "status": "sucesso", "version": "v2", "accesed_by": "nf-pjs-dashboard",
  "data": {
    "saldoAtual": 80,
    "ocorrencias": [
      { "id": 1201, "dataOcorrencia": "2024-01-01", "descricao": "Crédito anual (2023)",
        "tipo": "Credito", "quantidade": 30, "saldo": 30,
        "lancadoPor": "SISTEMA", "periodoAquisitivo": 2023, "origem": "AUTOMATICO" }
    ]
  }
}
```
> O **saldo corrente por linha** e o **saldo atual** são calculados **no backend**, para que UI,
> exportação e qualquer outro consumidor vejam o mesmo número (mesma lição das 4 cópias do filtro).

### 2.2 `POST /v2/recesso/ocorrencias`
```json
{ "idPj": 15, "dataOcorrencia": "2026-07-20", "descricao": "Recesso gozado",
  "tipo": "Debito", "quantidade": 10 }
```
**Regras obrigatórias no servidor:**
1. `quantidade` inteiro **> 0**; `tipo` ∈ `Credito|Debito`; `descricao` não vazia.
2. `periodoAquisitivo` **derivado** da data — **ignorar** se vier no payload.
3. `lancadoPor` = **usuário do JWT** — **ignorar** se vier no payload (senão é falsificável).
4. Débito que deixe saldo negativo → **422** (default de R-05).
5. Data futura → **422** (default de R-10).

| Resposta | Quando |
|---|---|
| `201` | Criada (retorna o registro e o **novo saldo**) |
| `422` | Violação de regra de negócio (saldo, data, quantidade) |
| `401/403` | Sem JWT válido |

### 2.3 `POST /v2/recesso/creditos-automaticos/processar`
Executa o motor de `02` §2. **Idempotente**: rodar N vezes = rodar 1 vez.
Retorna quantos créditos foram criados e quantos foram ignorados por já existirem.

## 3. Identidade do usuário (R-04 → A-28)

**Direção definida:** o app roda **embarcado no SharePoint** (iframe) e os usuários e o controle de
acesso são os do **SharePoint / Entra ID**. Não haverá cadastro próprio de usuários.
Detalhamento completo em **`docs/18-hospedagem-sharepoint-e-identidade.md`**.

O que isso significa **para este backend**:

1. **O SharePoint autentica a pessoa**, mas isso **não basta** para o servidor: a CITY API precisa de
   um **token de usuário verificável** (Entra ID, RS256 — validar assinatura via JWKS, `issuer`,
   `audience` e expiração). O **JWT M2M atual (HS256)** identifica a *integração*, não a pessoa.
2. **`lancado_por` vem SEMPRE das claims do token validado** — nunca do corpo da requisição, da query
   string ou de `postMessage`. Identidade enviada pelo cliente é **falsificável** e anularia a
   auditoria, que é a razão de existir do campo.
3. **Autorização** (quem pode lançar × só consultar) é decisão à parte: a permissão da **página** do
   SharePoint **não chega** ao backend — ver **P-12** em `docs/18`.

> Enquanto **P-11** (SPFx × MSAL) não for decidida, implementar o port `UsuarioAtual`
> (`docs/18` §7) e manter a Fase 1 com usuário fixo. O backend **não deve** aceitar `lancadoPor`
> no payload em nenhuma hipótese.

## 4. Integridade e concorrência

1. **Validação de saldo com concorrência:** duas requisições simultâneas de débito podem, cada uma,
   ler saldo suficiente e ambas gravarem, estourando o saldo. Validar **dentro de transação**, com
   leitura consistente do extrato do PJ.
2. **Idempotência do crédito automático:** garantida pelo índice único filtrado (`03` §5) — tratar a
   violação como **sucesso** (já existia), não como erro.
3. **Sem `UPDATE`/`DELETE`** de ocorrência: correção por **estorno** (R-07).
4. **Transação** no processamento em lote de créditos automáticos.

## 5. Fase 1 × Fase 2

| Camada | Fase 1 (mock) | Fase 2 (real) |
|---|---|---|
| `OcorrenciaDeRecessoRepository` | Em memória (+ `localStorage`, R-12) | HTTP → `/v2/recesso/ocorrencias` |
| `UsuarioAtual` | Usuário fixo de demonstração | Usuário autenticado (R-04) |
| Motor de crédito | Roda no cliente, sob demanda | Roda no servidor (endpoint/job, R-09) |

> Como nos demais módulos, a troca é **apenas no Composition Root** (`docs/14` §8) — desde que o motor
> de crédito e o cálculo de saldo estejam no `domain/`, e não na UI.

## 6. Checklist de implementação (backend)

- [ ] DDL de `03` §5 aplicada, **com o índice único filtrado** de idempotência.
- [ ] `GET /pjs` retorna **também inativos** (diferente do módulo de NF).
- [ ] `GET /ocorrencias` devolve saldo corrente **e** saldo atual calculados no servidor.
- [ ] `POST /ocorrencias` valida as 5 regras de §2.2 **no servidor**.
- [ ] `lancadoPor` derivado do token — **nunca** do payload.
- [ ] Motor de crédito idempotente e transacional.
- [ ] Validação de saldo protegida contra concorrência.
- [ ] Envelope de resposta padrão da CITY API (`docs/06` §5).
- [ ] Nomes de tabela/rota confirmados com o owner da API (mesma pendência D-11 da base).
