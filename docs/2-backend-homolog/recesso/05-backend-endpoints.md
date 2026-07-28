---
titulo: Módulo Recesso — Backend (CITY API, endpoints de escrita)
dominio: backend
tags: [backend, city-api, endpoints, post, escrita, idempotencia, auditoria, transacao]
status: normativo-para-implementacao
---

# Backend — Módulo Recesso na CITY API (Fase 2)

> Segue a arquitetura de `docs/06` e o padrão de spec de `docs/12`. **Novidade estrutural:** este é o
> **primeiro módulo de escrita** da base — todos os anteriores eram somente leitura.

> ⚠️ **Atualização de modelo (2026-07-27).** As rotas abaixo descrevem o modelo conceitual da Fase 2.
> O frontend/domínio opera em **acúmulo mensal de 2,5 dias por contrato**, iniciado a partir de **2025**.
> Proporção foi removida (sempre 100%, um PJ nunca presta serviço a duas empresas simultaneamente).
> Status do contrato é derivado da vigência (`dataInicio`/`dataFim`). Ao expirar a vigência (`dataFim <= hoje`),
> o sistema gera automaticamente a rescisão (regra dos 15 dias) e o débito de encerramento de contrato (zera o saldo).
>
> 📐 O **cadastro** (fornecedores + contratos) entra por
> [`docs/backend/19-fonte-de-cadastro-modular.md`](../19-fonte-de-cadastro-modular.md) — contrato JSON estável,
> fonte plugável em `dependencies.py`.

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

> **Granularidade = CONTRATO.** O saldo é por contrato (`codContrato = cod_empresa-cod_contrato`),
> não por PJ. A grade lista **um contrato por linha**, incluindo os fora da vigência (marcados Inativo).

| Método | Rota | Status | Descrição |
|---|---|---|---|
| GET | `/contratos` | 200 | Grade de recesso: um contrato por linha (**inclui inativos**), com saldo e status por vigência |
| GET | `/ocorrencias` | 200 | Extrato de um contrato (`?contratoId=`) — saldo corrente e saldo atual |
| **POST** | **`/ocorrencias`** | **201** | **Lança** uma ocorrência manual |
| POST | `/creditos-automaticos/processar` | 202 | Executa o motor mensal + rescisão/encerramento (idempotente) |

### 2.1 `GET /v2/recesso/ocorrencias?contratoId=015-102`
```json
{
  "status": "sucesso", "version": "v2", "accesed_by": "nf-pjs-dashboard",
  "data": {
    "saldoAtual": 42.5,
    "ocorrencias": [
      { "id": "auto-015-102-202503", "dataDoCalculo": "2025-03-15", "competencia": "2025-03-15",
        "descricao": "Crédito mensal de recesso", "tipo": "Credito", "quantidade": 2.5, "saldo": 2.5,
        "lancadoPor": "SISTEMA", "origem": "AUTOMATICO" }
    ]
  }
}
```
> - `quantidade` e `saldo` são **fracionários** (`DECIMAL(10,2)`) — 2,5 dias/mês. Nunca `FLOAT` (`03` §2).
> - `competencia` é a **data mensal** (aniversário do contrato), formato `AAAA-MM-DD`.
> - O **saldo corrente por linha** e o **saldo atual** são calculados **no backend**, para UI,
>   exportação e qualquer consumidor verem o mesmo número.

### 2.2 `POST /v2/recesso/ocorrencias`
```json
{ "contratoId": "015-102", "dataDaOcorrencia": "2026-07-20", "descricao": "Recesso gozado",
  "tipo": "Debito", "quantidade": 2.5 }
```
**Regras obrigatórias no servidor:**
1. `quantidade` **> 0** (aceita fração, ex. `2.5`); `tipo` ∈ `Credito|Debito`; `descricao` não vazia.
2. `competencia` **derivada** da data e do dia base do contrato — **ignorar** se vier no payload.
3. `lancadoPor` = **usuário do JWT** — **ignorar** se vier no payload (senão é falsificável).
4. **Contrato fora da vigência** (`hoje ∉ [dataInicio, dataFim]`) → **422** (não se lança em contrato inativo).
5. Débito que deixe saldo negativo → **422** (R-05).
6. Data futura → **422** (R-10).

| Resposta | Quando |
|---|---|
| `201` | Criada (retorna o registro e o **novo saldo**) |
| `422` | Violação de regra (vigência, saldo, data, quantidade) |
| `401/403` | Sem JWT válido |

### 2.3 `POST /v2/recesso/creditos-automaticos/processar`
Executa o motor de `02` §2 e §4. **Idempotente** (chave determinística — `03` §3.1): rodar N vezes = rodar 1 vez.
Para cada contrato, gera:
- **Créditos mensais** de 2,5 dias, a partir de **2025**, até `min(hoje, dataFim)`;
- Ao expirar a vigência (`dataFim <= hoje`): **rescisão** (`+2,5` se ≥15 dias desde o último cálculo, senão `+0`) **e** **encerramento** (débito que zera o saldo).

Retorna quantas ocorrências foram criadas e quantas foram ignoradas por já existirem.

> **Não há endpoint de encerramento manual.** O encerramento é **consequência automática** da vigência.

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
   leitura consistente do extrato do contrato.
2. **Idempotência do automático:** garantida pelo índice único em `chave_auto` (`03` §5) — tratar a
   violação como **sucesso** (já existia), não como erro. Cobre crédito mensal, rescisão e encerramento.
3. **Sem `UPDATE`/`DELETE`** de ocorrência: correção manual por **estorno** (R-07).
4. **Recarga do cadastro** (planilha/HCM) descarta e recalcula os AUTOMÁTICOS; os MANUAIS permanecem (`03` §6).
5. **Transação** no processamento em lote do motor.

## 5. Fase 1 × Fase 2

| Camada | Fase 1 (mock) | Fase 2 (real) |
|---|---|---|
| `OcorrenciaDeRecessoRepository` | Em memória (+ `localStorage`, R-12) | HTTP → `/v2/recesso/ocorrencias` |
| `UsuarioAtual` | Usuário fixo de demonstração | Usuário autenticado (R-04) |
| Motor de crédito | Roda no cliente, sob demanda | Roda no servidor (endpoint/job, R-09) |

> Como nos demais módulos, a troca é **apenas no Composition Root** (`docs/14` §8) — desde que o motor
> de crédito e o cálculo de saldo estejam no `domain/`, e não na UI.

## 6. Checklist de implementação (backend)

- [ ] DDL de `03` §5 aplicada (**`quantidade_dias DECIMAL(10,2)`**, índice único em `chave_auto`).
- [ ] `GET /contratos` retorna **um contrato por linha**, incluindo fora de vigência, com status derivado.
- [ ] `GET /ocorrencias?contratoId=` devolve saldo corrente **e** saldo atual (fracionários) do servidor.
- [ ] `POST /ocorrencias` valida as 6 regras de §2.2 **no servidor** (incl. bloqueio fora da vigência).
- [ ] `competencia` derivada no servidor; `lancadoPor` do token — **nunca** do payload.
- [ ] Motor gera crédito mensal (marco 2025) **+ rescisão + encerramento** por vigência; idempotente e transacional.
- [ ] Recarga do cadastro descarta e recalcula os automáticos (`03` §6).
- [ ] Validação de saldo protegida contra concorrência; envelope padrão da CITY API (`../backend/06` §5).
- [ ] **Sem** endpoint/ação de encerramento manual.
- [ ] Nomes de tabela/rota confirmados com o owner da API (D-11).
