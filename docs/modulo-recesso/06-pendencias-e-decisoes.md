---
titulo: Módulo Recesso — Pendências e Decisões
dominio: gestao
tags: [pendencias, decisoes, bloqueios, recesso, rastreador]
status: rastreador
---

# Pendências e Decisões — Módulo Recesso

> **Regra para agentes:** os itens abaixo **não estão definidos**. **Não invente valores.**
> Implemente de forma **parametrizável**, use o **default** indicado e **sinalize** no código
> (`// PENDÊNCIA R-xx`). Itens 🔴 **alteram o saldo** — errar aqui produz número errado com cara de certo.

## 1. Pendências que **alteram o cálculo do saldo** 🔴

| ID | Pendência | Default adotado | Impacto se mudar |
|---|---|---|---|
| ~~**R-02**~~ | ~~Quando o crédito de 30 dias vence~~ | ⛔ **Superada (2026-07-22):** o acúmulo virou **mensal** (+2,5 dias no aniversário do contrato). Não há mais vencimento anual. Ver `02` §2 |
| ~~**R-03**~~ | ~~PJ com mais de um contrato: qual ancora o período?~~ | ⛔ **Superada (2026-07-22):** o saldo é **por contrato**, e cada contrato carrega uma **proporção** do direito (40% / 60%). Não há mais âncora única. Ver `02` §1.1 |
| **R-05** | **Débito** pode deixar o saldo **negativo**? | **Bloquear** (422 no backend) | Permitir muda validação e o VO `SaldoDeDias` |
| **R-08** | Contrato encerrado no **meio** de um mês: gera crédito **proporcional**? | ✅ **Resolvida (2026-07-22):** regra dos **15 dias** — ≥15 dias desde o último cálculo gera `2,5 × proporção`; abaixo disso, zero. Ver `02` §4 |
| **R-17** | Σ das **proporções** dos contratos de um PJ deve ser validada onde? | Fase 1 **confia no dado**. Fase 2: validar na origem (HCM/DB City) — Σ ≠ 100% distorce o direito da pessoa |

> Estes itens **não são detalhe de implementação** — são definição de direito. Recomendo
> fechá-los com o DP **antes** de a Fase 2 gravar dados reais, porque saldo errado gravado em
> produção não tem fonte externa para reconstrução.

## 2. Pendências estruturais 🟠

| ID | Pendência | Default / Situação |
|---|---|---|
| **R-04** | **Identidade do usuário** para "quem lançou" | ✅ **Resolvida (A-28 + A-29):** o app será uma **SPFx web part** no SharePoint; a identidade vem do **Entra ID** via `AadHttpClient` e o `lancado_por` é derivado do **token validado na CITY API** — nunca do payload. Ver [`docs/spfx-sharepoint/`](../spfx-sharepoint/README.md). Fase 1: usuário fixo via port `UsuarioAtual`. Resta a **autorização** (**S-06**) |
| **R-16** | **Responsável Legal** do PJ: o HCM **não fornece** esse campo hoje (`docs/13` §1.1 tem só Empresa, Apelido, Email, CNPJ) | Fase 1: mock. Fase 2: **definir a origem** (novo campo no HCM ou cadastro próprio) |
| **R-12** | Persistência do mock na Fase 1 | **`localStorage`** — sem isso o lançamento some ao recarregar e a demo perde sentido |
| **R-09** | **Quando** o motor de crédito roda | **Sob demanda na leitura** do extrato (idempotente). Alternativa: job agendado |

## 3. Pendências de produto / UX 🟡

| ID | Pendência | Default |
|---|---|---|
| **R-01** | Significado da sigla **RLT** | Função definida (botão → modal do extrato); **sigla a confirmar** |
| ~~**R-06**~~ | ~~Rótulo do período aquisitivo: `2023` ou `2023/2024`~~ | ⛔ **Superada (2026-07-22):** a competência virou **data mensal** exibida como `dd/mm/aaaa` |
| **R-07** | Correção de ocorrência: **estorno** ou edição/exclusão? | **Estorno** (imutabilidade + auditoria) |
| **R-10** | Ocorrência com **data futura** | **Bloquear** |
| **R-11** | PJ **inativo** pode receber **novos** lançamentos? | **Bloquear** novos; **manter** histórico visível |
| **R-13** | Filtros **Mês** e **Ano** no HUD do recesso | **Mês não se aplica** (recesso é anual); Ano: definir se filtra período aquisitivo ou ocorrências |
| **R-14** | Opções do filtro **Status** no recesso | **`Ativo`/`Inativo`** — domínio diferente do módulo NF (Pendente/Enviado/…) |
| **R-15** | Exportação **EXCEL** neste módulo: exporta o quê? | A definir: lista de PJs + saldo, ou extrato completo |
| **R-17** | Ordenação do extrato por outras colunas | Manter **cronológica**; se permitir outra, **ocultar a coluna Saldo** (saldo acumulado fora de ordem não tem significado) |

## 4. Como sinalizar no código

```ts
// PENDÊNCIA R-02: vencimento do crédito no FIM do período (default).
// Alternativa antecipada muda o saldo em +30 dias/PJ. Parametrizado em config.
const MOMENTO_DO_CREDITO: MomentoDoCredito = 'FIM_DO_PERIODO';
```

- Centralizar os defaults em **um** módulo de configuração — não espalhar literais pelo domínio.
- Nunca hardcodar valor "adivinhado" de regra de direito.

## 5. Registro de decisões (preencher conforme forem tomadas)

| Data | ID | Decisão tomada | Responsável |
|---|---|---|---|
| — | — | — | — |

> Ao fechar um item, mover para cá **com a justificativa** e atualizar o documento normativo
> correspondente (`02`, `03`, `04` ou `05`) — doc e código não podem divergir.
