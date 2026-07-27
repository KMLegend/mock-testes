---
titulo: Integração com Tomticket
dominio: integracao
fase: 2
tags: [tomticket, integracao, api, chamados, categoria, campo-customizado, mes-referente]
status: normativo-com-pendencias
---

# Integração com Tomticket

> **Categoria, situação, campo `tipo_de_lancamento` e formato do "Mês Referente" já estão confirmados**
> (P-03/P-04/P-05) e consolidados com payload real em `13-referencia-payloads-mock.md` §2. Restam
> pendências de **endpoints/autenticação reais** e do **anexo PDF + Marker** (P-09). Este documento
> define **o quê** a integração faz; identificadores concretos ficam parametrizados por configuração.

## 1. Objetivo da integração

Duas rotinas principais (Tarefa 2.1):

1. **Leitura** — para cada e-mail da Lista de PJ, verificar se existe **chamado aberto** na **categoria correta** (lançamento de NF).
2. **Atualização** — verificar se o chamado correspondente foi **encerrado**, para evoluir o ciclo de vida da NF (Enviado → Recebido).

> Os nomes de campo, categoria, situação e valores concretos deste documento estão consolidados em
> `13-referencia-payloads-mock.md` §2 (payload real de exemplo).

## 2. Dados a extrair de cada chamado

| Dado (Tomticket) | Uso no sistema | Campo alvo na Fato |
|---|---|---|
| `id` (GUID) | **Idempotência** do upsert (único) | `id_tomticket` |
| `protocol` | Número exibido do chamado | `numero_chamado` |
| `email` do solicitante | **Chave de casamento** com a Lista de PJ (A-14) | `email` |
| `name` | Snapshot | `nome` |
| `creation_date` | Ciclo de vida | `data_abertura` |
| `end_date` (se finalizado) | Ciclo de vida / status Recebido | `data_finalizacao` |
| `situation_description` | Deriva `status` (`Finalizado`→Recebido) | `status` |
| `subject` | Contexto / fallback do "Mês Referente" | `assunto` |
| `category_name`/`category_id` | Filtro (só NF-PJ) | — (filtro) |
| Campo **`tipo_de_lancamento`** | `Ambas`/`Contratual`/`Reembolso plano de saude` | `tipo_lancamento` |
| Campo **"Mês Referente"** | Deriva a competência | `mes_ano_referencia` |
| *(derivado)* | Link ao chamado | `link_chamado` |

> O CNPJ **não** vem no payload do chamado — é resolvido no casamento (§3), e só via Marker no cenário 2.

## 3. Casamento chamado → fornecedor (normativo — A-14)

**A chave de casamento é o `email`** (não há chave de fallback fixa). Fluxo:

1. Filtrar só a **categoria de NF-PJ** (`category_name = "Recebimento de Notas - PJ"` /
   `category_id = 8b9a123fcd09bd585714b53d5370f1a2`).
2. Casar `chamado.email` com um fornecedor **ativo** da Lista de PJ (normalizar trim + lowercase).
3. Resolver a competência do "Mês Referente" (§6).

### 3.1 Desambiguação por contrato (cenários A-14)

Consultando o **endpoint de Contratos do HCM** (`13` §1.2) para o fornecedor casado:

- **Cenário 1 — 1 contrato vinculado à pessoa:** envio normal (qualquer `tipo_de_lancamento`). O
  lançamento é atribuído diretamente a esse contrato. **Sem** necessidade de extrair CNPJ.
- **Cenário 2 — mais de 1 contrato vinculado à pessoa:** extrair o **CNPJ do tomador**
  (Empresa_Responsavel) do **anexo da NF em PDF** e **validar a qual contrato** o lançamento se refere.
  A extração é abstraída pela interface **`INotaCnpjExtractor`**:
  - Implementação real (futura): **Marker** (biblioteca OSS de extração de PDF) — P-09.
  - **Implementação atual: mock** (`MockNotaCnpjExtractor`) que devolve um CNPJ pré-definido por
    chamado — ver `13` §4. Permite testar o cenário ponta a ponta já agora.

> Implicação: o CNPJ é um **desambiguador derivado do PDF**, não a chave de junção. Ver `04` §4.
> Algoritmo de resolução e dataset de teste em `13` §4. P-09 fica **mockada** por enquanto.

## 4. Mapeamento de estado do chamado → status

| Situação no Tomticket | `status` na Fato | Presença na Fato |
|---|---|---|
| Aberto / em andamento | `Enviado` | Cria/mantém linha |
| Finalizado / encerrado | `Recebido` | Atualiza `data_finalizacao` e `status` |
| (sem chamado no período) | — | Ausência → **Pendente** (derivado no Left Join) |

> Ver regra completa de status em `04-regras-de-negocio-status.md`.

## 5. Tratamento do campo `tipo_de_lancamento`

- Valores do Tomticket (P-04): `Ambas`, `Contratual`, `Reembolso plano de saude`.
- Normalização → canônico interno (persistir com acento): `Reembolso plano de saude` → `Reembolso plano de saúde`. Ver `13` §2.3.
- Quando um mesmo solicitante abre **dois chamados** (um `Contratual` e um `Reembolso`), são **dois `id`/`protocol` distintos** → **duas linhas** na Fato (A-05). Nunca duas linhas com o mesmo chamado.
- `Ambas` num único chamado indica que aquela NF cobre serviços contratuais **e** reembolso (ex.: `protocol 19166`).

## 6. Interpretação do "Mês Referente" → Competência

- Converter o "Mês Referente" para o formato **sistêmico `MM-AAAA`** (ex.: `07-2026`); a UI exibe `MM/AAAA` (ex.: `07/2026`). Ver `13` §2.4 e A-19.
- **O payload de exemplo não traz o campo "Mês Referente"** — no mock, adicioná-lo; na ausência, derivar do `subject` (ex.: "Junho 2026" → `06-2026`) ou do mês de `creation_date` (fallback).
- **Validação obrigatória (Tarefa 4.2):** mês/ano errados quebram a classificação de status e os alertas.
- Parser tolerante a formatos: `07/2026`, `07-2026`, `Julho/2026`, `2026-07` → saída `MM-AAAA` (ver `08`).

## 7. Contrato de integração (interface interna)

> Assinaturas ilustrativas. A implementação concreta é o Gateway `ITomticketGateway` /
> `TomticketRepository` na CITY API — ver `12-especificacao-endpoints-city-api.md` §5.

```
listarChamadosNF(params: {
  categoriaId: string,        // "8b9a123fcd09bd585714b53d5370f1a2"
  mesAnoReferencia?: string   // "MM-AAAA"
}): ChamadoTomticket[]

// ChamadoTomticket (DTO interno; mapeado do payload — ver 13 §2.2)
{
  idTomticket: string,        // GUID `id` — chave de idempotência
  numeroChamado: string,      // `protocol`
  nome: string,               // `name`
  email: string,              // chave de casamento (A-14)
  subject: string,
  dataAbertura: string,       // `creation_date` (ISO -03:00)
  dataFinalizacao?: string,   // `end_date` ou null
  situacao: 'Em Andamento' | 'Finalizado',
  link: string,               // derivado
  tipoLancamento: 'Ambas' | 'Contratual' | 'Reembolso plano de saude',
  mesReferente: string        // bruto; parser → "MM-AAAA"
}
```

## 8. Robustez e boas práticas

- **Paginação e rate limit:** iterar com paginação; respeitar limites da API; retentar com backoff em erros transitórios.
- **Idempotência:** upsert pela chave **`id`** do Tomticket (GUID, `id_tomticket`).
- **Casamento por e-mail** (A-14): normalizar trim + lowercase dos dois lados.
- **Autenticação:** token/credenciais via configuração/secret manager.
- **Observabilidade:** logar chamados lidos, casados, ignorados (e por quê) e upserts realizados.
- **Mock primeiro** (P-03): desenvolver com o payload de `13` §2.1 antes do acesso real à API.

## 9. Pendências desta integração

- **Endpoints, autenticação e limites reais** da API do Tomticket (o formato de retorno já está em `13`).
- **P-09:** acesso ao **anexo PDF** do chamado + integração do **Marker** para extração de CNPJ (cenário 2 do casamento, §3.1).
- **"Mês Referente":** garantir o campo customizado no chamado (o payload de exemplo não o traz — §6).

Ver `09-pendencias-e-decisoes.md`. (Categoria, campo `tipo_de_lancamento` e formato de "Mês Referente" já **confirmados** — P-03/P-04/P-05.)
