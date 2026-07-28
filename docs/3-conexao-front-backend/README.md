---
titulo: Fase 3 — Conexão do Frontend ao Backend
dominio: integracao
fase: 3
tags: [integracao, composition-root, http, adaptadores, autenticacao]
status: normativo-para-implementacao
---

# Fase 3 — Conexão do Frontend ao Backend

> **Pré-requisitos:** Fase 1 (`1-frontend-mockado/`) e Fase 2 (`2-backend-homolog/`) concluídas e
> a API rodando em `homolog`. Esta fase **não** escreve regra de negócio nova — só troca a origem
> dos dados.

## 1. O que muda

O frontend foi construído em **Ports & Adapters** (`1-frontend-mockado/14-frontend-react-ts-arquitetura.md`)
justamente para este momento: trocar o adaptador **mock** pelo adaptador **HTTP**, sem tocar em
domínio, casos de uso ou componentes React.

```
UI / hooks / casos de uso   ─────► NÃO MUDAM
        │
        ▼
   Portas (interfaces)      ─────► NÃO MUDAM
        │
        ▼
Adaptador MOCK (memória/localStorage)  →  Adaptador HTTP (fetch para /v2/...)
        └── troca acontece em UM lugar: CompositionRoot.tsx
```

## 2. Onde mexer

Um único arquivo escolhe os adaptadores: `src/ui/providers/CompositionRoot.tsx`. Para cada porta
listada abaixo, criar o adaptador HTTP correspondente em `src/infrastructure/http/` e trocar a
instanciação no Composition Root (por trás de uma flag/env, para poder alternar em dev).

| Porta (interface) | Adaptador mock atual | Adaptador HTTP a criar | Endpoint (Fase 2) |
|---|---|---|---|
| `FornecedorRepository` | `FornecedorRepositoryEmMemoria` | `FornecedorRepositoryHttp` | `GET /v2/notas-fiscais/fornecedores` |
| `ContratoRepository` | `ContratoRepositoryEmMemoria` | `ContratoRepositoryHttp` | via cadastro (`2-backend-homolog/19`) |
| `ChamadoRepository` | `ChamadoRepositoryEmMemoria` | `ChamadoRepositoryHttp` | `GET /v2/notas-fiscais/status` |
| `AlertaRepository` | `AlertaRepositoryEmMemoria` | `AlertaRepositoryHttp` | `GET /v2/notas-fiscais/comunicados` |
| `OcorrenciaDeRecessoRepository` | `OcorrenciaDeRecessoRepositoryEmMemoria` | `OcorrenciaDeRecessoRepositoryHttp` | `2-backend-homolog/recesso/05` |
| `CargaDeCadastro` | `CargaDeCadastroMock` | `CargaDeCadastroHttp` | `/v2/cadastro/importar`, `/template`, `/exportar` (`2-backend-homolog/19` §8.1) |
| `UsuarioAtual` | `UsuarioAtualFixo` | adaptador real de identidade | ver §3 |
| `ExportadorDePlanilha` / `ExportadorDeRecesso` | geram `.xlsx` no cliente | manter client-side **ou** mover para `/export` do backend | `2-backend-homolog/12` §3.4 |

> **Nenhuma porta muda de assinatura.** Se um adaptador HTTP exigir um método a mais que o mock não
> tinha, a porta está mal desenhada — revisar a interface, não vazar detalhe de transporte para o domínio.

## 3. Identidade do usuário

Nesta fase o backend ainda não valida token de usuário real (isso amadurece na Fase 5, com SPFx/Entra
ID — `5-deploy-producao/spfx-sharepoint/02`). Dois caminhos possíveis:

- **Caminho simples (recomendado para esta fase):** manter `UsuarioAtualFixo` até a Fase 5 decidir
  SPFx × iframe; o backend aceita o **JWT M2M** (integração) e não distingue pessoa.
- **Caminho antecipado:** se a Fase 5 já tiver decidido por SPFx, implementar aqui o port real de
  `UsuarioAtual` lendo `context.pageContext.user` — mas isso acopla esta fase à decisão de hospedagem.

> **Não aceitar identidade do payload em nenhum adaptador** — mesma regra de `2-backend-homolog/recesso/05` §3.

## 4. Checklist

- [ ] Um adaptador HTTP por porta da tabela acima, implementando a mesma interface do mock.
- [ ] Envelope de resposta da CITY API (`2-backend-homolog/06` §5) tratado no adaptador — a UI não vê o envelope, só os dados.
- [ ] Erros de rede/HTTP mapeados para os mesmos tipos de erro que o mock já lançava (`LancamentoInvalido`, etc.) — a UI não deve saber que a origem mudou.
- [ ] Flag de ambiente (`.env` do frontend) selecionando mock × HTTP, para continuar rodando a demo sem backend.
- [ ] Suite de testes do frontend (Fase 1) **continua verde** sem alteração — prova de que a troca foi só de adaptador.
- [ ] Testar os fluxos ponta-a-ponta: listar, lançar ocorrência de recesso, importar planilha, exportar `.xlsx`.
