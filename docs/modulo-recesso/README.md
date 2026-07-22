# Módulo Gestão de Recesso — Base de Conhecimento (RAG)

> Documentação para agentes de IA implementarem o **módulo de Gestão de Recesso** do projeto
> **nf-pjs**. Complementa a base principal em `docs/` — **não a substitui**.

## Diferença fundamental (leia antes de tudo)

Todo o sistema construído até aqui é **somente leitura**: os dados nascem no **Tomticket** e no **HCM**,
e o dashboard apenas os exibe.

**Este módulo é o oposto:** o nf-pjs passa a ser o **sistema de origem** — o usuário **lança
ocorrências** de recesso, e o sistema **credita saldo automaticamente**. Isso traz três exigências
inéditas na base:

| Exigência nova | Por quê |
|---|---|
| **Persistência de escrita** | Não há de onde "re-buscar" o dado; se perder, perdeu |
| **Identidade do usuário** | A coluna "quem lançou" exige saber quem está logado — o app **não tem autenticação hoje** |
| **Idempotência do crédito automático** | Creditar 30 dias duas vezes corrompe o saldo de forma silenciosa |

## Índice

| Arquivo | Conteúdo |
|---|---|
| [01-visao-geral-e-glossario.md](01-visao-geral-e-glossario.md) | O que é, atores, glossário, escopo |
| [02-regras-de-negocio-saldo.md](02-regras-de-negocio-saldo.md) | **Normativo**: crédito automático, período aquisitivo, cálculo de saldo |
| [03-modelo-de-dados.md](03-modelo-de-dados.md) | Entidades, Value Objects, tabela no DB City (DDL) |
| [04-frontend-view-e-modal.md](04-frontend-view-e-modal.md) | Nova view, HUD, colunas, modal RLT, formulário |
| [05-backend-endpoints.md](05-backend-endpoints.md) | Endpoints na CITY API (inclui **POST** — primeiro módulo de escrita) |
| [06-pendencias-e-decisoes.md](06-pendencias-e-decisoes.md) | **Pendências R-xx** — ler antes de implementar |
| [07-plano-de-implementacao.md](07-plano-de-implementacao.md) | Etapas, checklist e critérios de aceite |

## Como usar (para agentes)

1. Leia `01` (glossário) e depois **`06` (pendências)** — há decisões de negócio **em aberto** que
   mudam o cálculo do saldo. **Não invente**: implemente parametrizável e sinalize.
2. `02` é **normativo** — o motor de saldo é o coração do módulo.
3. Siga a arquitetura e os padrões já estabelecidos: `docs/14` (React+TS, Ports & Adapters) e
   `docs/15` (SOLID + Object Calisthenics). Este módulo **não** cria arquitetura nova.
4. Reaproveite o que já existe: `Cnpj`, `Email`, `Fornecedor`, `Contrato`, o HUD de filtros e os
   tokens de marca (`docs/11`).

## Aviso de colisão de nomes

A base principal já define `Competencia` como **mês+ano (`MM-AAAA`)**, usada no módulo de NF.
A "competência" do recesso é um **ano de vigência** — conceito **diferente**.
Para evitar confusão, este módulo usa **`PeriodoAquisitivo`** (ver `01` §3 e `03` §2).
**Não reutilizar o VO `Competencia` para recesso.**
