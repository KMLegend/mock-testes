---
titulo: Integração com Tomticket
dominio: integracao
fase: 2
tags: [tomticket, integracao, api, chamados, categoria, campo-customizado, mes-referente]
status: normativo-com-pendencias
---

# Integração com Tomticket

> **Endpoints reais confirmados (2026-08-04 — A-33, ver `09-pendencias-e-decisoes.md`):**
> `GET https://api.tomticket.com/v2.0/ticket/list` e
> `GET https://api.tomticket.com/v2.0/ticket/detail?ticket_id=`. Testados contra a conta real da
> City, com payload de resposta real (não mais mockado) — ver §2 e §7.
>
> ⚠️ **Três correções importantes que o teste real revelou:**
> 1. **`custom_fields` (CNPJ, Tipo de Lançamento) só vêm no `/detail`, nunca no `/list`.** A
>    integração precisa de **duas chamadas** por chamado candidato — ver §1 e §7.
> 2. **A categoria real da conta é diferente da que os mocks assumiam.** `category_id =
>    38ae7388ab732f568bfe9193c60165ed`, `category_name = "Lançamento de Notas Fiscais"` — **não**
>    `8b9a123fcd09bd585714b53d5370f1a2`/"Recebimento de Notas - PJ" (valor hipotético anterior). Ver §3.
> 3. **"Mês Referente" nunca foi um campo a ler (A-34).** A competência é sempre o mês/ano de
>    `creation_date` — já vem no `/list`, sem depender de custom field nem de `/detail`. Ver §6.
>
> **Correção (2026-07-29):** o CNPJ **não** vem de extração de PDF via Marker — é um **campo
> customizado do próprio chamado no Tomticket**. P-09 (Marker) e a interface `INotaCnpjExtractor`
> estão **descontinuados** — ver §3.1 e `09-pendencias-e-decisoes.md`.
>
> **Autenticação:** a credencial já existe no **GitHub Secrets** da `api-city` com o nome
> `API_KEY_TOMTICKET_HUB` — o app deve ler **essa mesma variável** (sem remapear para outro nome),
> por convenção de secret já estabelecida na arquitetura da CITY API. **Ainda pendente:** o esquema
> exato do header HTTP (`Authorization: Bearer <key>`? header customizado?) — ver §9.

## 1. Objetivo da integração

Duas rotinas principais (Tarefa 2.1), agora em **duas chamadas HTTP por ciclo** (§7):

1. **Leitura (`/ticket/list`)** — lista os chamados da **categoria correta** (lançamento de NF) e
   casa por `customer.email` com a Lista de PJ. O `/list` **não** traz `custom_fields`.
2. **Enriquecimento (`/ticket/detail?ticket_id=`)** — **só para os chamados casados** (evita N+1
   desnecessário em chamados de outros solicitantes/categorias), busca o detalhe para extrair
   `custom_fields` (Tipo de Lançamento, CNPJ). O ciclo de vida (`end_date` → Enviado/Recebido) e a
   competência (`creation_date` → Mês Referente, §6) **já vêm no `/list`**, não dependem do `/detail`.

> Os nomes de campo, categoria e valores concretos deste documento vêm de um payload **real**
> testado contra a conta da City em 2026-08-04 (não mais mockado) — ver §7 para os DTOs completos.

## 2. Dados a extrair de cada chamado

### 2.1 Vêm do `/ticket/list` (sempre disponíveis, uma chamada só para todos os chamados da categoria)

| Dado (Tomticket) | Uso no sistema | Campo alvo na Fato |
|---|---|---|
| `id` (GUID) | **Idempotência** do upsert (único) | `id_tomticket` |
| `protocol` | Número exibido do chamado | `numero_chamado` |
| `customer.email` | **Chave de casamento** com a Lista de PJ (A-14) | `email` |
| `customer.name` | Snapshot | `nome` |
| `creation_date` | Ciclo de vida; **deriva a competência** — mês/ano de abertura = Mês Referente (A-34, §6) | `data_abertura` → `mes_ano_referencia` |
| `end_date` (se finalizado) | Deriva `status` — ver §4 | `data_finalizacao` |
| `subject` | Contexto (não mais necessário como fallback de competência — §6) | `assunto` |
| `category.id`/`category.name` | Filtro (só NF-PJ) — ver §3 | — (filtro) |

### 2.2 Vêm do `/ticket/detail?ticket_id=` (só para chamados já casados por e-mail, §1)

| Dado (Tomticket) | Uso no sistema | Campo alvo na Fato |
|---|---|---|
| `custom_fields.open[label="Tipo de Lançamento"].value` | `Ambas`/`Contratual`/`Reembolso plano de saude` | `tipo_lancamento` |
| `custom_fields.open[label="CNPJ"].value` | Desambiguação de contrato (§3.1) — **vem com máscara** (`46.340.700/0001-26`), normalizar para 14 dígitos crus | `cnpj` |
| *(derivado do `id`/`protocol` do list)* | Link ao chamado | `link_chamado` |

> `situation` (`id`/`description`, ex.: "Sem atendente vinculado"), `status` (array) e
> `current_status` **também existem no `/detail`, mas não são usados** — representam atribuição de
> atendente/workflow interno do Tomticket, não o ciclo de vida Enviado/Recebido que este sistema
> precisa. O sinal usado é **só `end_date`** (§4).

## 3. Casamento chamado → fornecedor (normativo — A-14)

**A chave de casamento é o `email`** (não há chave de fallback fixa). Fluxo:

1. Filtrar só a **categoria de NF-PJ** — valor real confirmado em 2026-08-04 (A-33):
   `category.name = "Lançamento de Notas Fiscais"` / `category.id =
   38ae7388ab732f568bfe9193c60165ed`. (Departamento associado: "Departamento Pessoal",
   `d205d6b925f991da5c70586a262b3692` — informativo, não usado como filtro.)
2. Casar `customer.email` (do `/list`) com um fornecedor **ativo** da Lista de PJ (normalizar trim + lowercase).
3. Resolver a competência (`mes_ano_referencia` = mês/ano de `creation_date`, A-34, §6) — já disponível no `/list`.
4. **Só para os chamados casados**, buscar `/detail?ticket_id=` para obter `custom_fields` (§2.2).

### 3.1 Desambiguação por contrato (cenários A-14)

Consultando o **endpoint de Contratos do HCM** (`13` §1.2) para o fornecedor casado:

- **Cenário 1 — 1 contrato vinculado à pessoa:** envio normal (qualquer `tipo_de_lancamento`). O
  lançamento é atribuído diretamente a esse contrato. **Sem** necessidade de ler o CNPJ.
- **Cenário 2 — mais de 1 contrato vinculado à pessoa:** ler o **campo customizado "CNPJ"** do
  `/detail` do chamado (junto de "Tipo de Lançamento", §2.2) e **validar a qual contrato** o
  lançamento se refere.

> **Correção (2026-07-29):** este cenário previa extrair o CNPJ do **anexo da NF em PDF** via
> **Marker** (biblioteca OSS de extração), atrás de uma interface `INotaCnpjExtractor` com
> implementação real (Marker) e mock (`MockNotaCnpjExtractor`) — ver P-09/A-21 em
> `09-pendencias-e-decisoes.md`. **Isso não é mais necessário:** o CNPJ é um campo customizado do
> chamado. Não há PDF, não há Marker, não há interface de extração — é leitura direta de campo.
>
> Implicação: o CNPJ continua sendo um **desambiguador**, não a chave de junção (essa é o e-mail,
> A-14) — só que lido do payload do chamado, não extraído de anexo. Ver `04` §4.

> **Formato (confirmado no payload real):** o campo customizado "CNPJ" vem **com máscara**
> (ex.: `"46.340.700/0001-26"`), não como 14 dígitos crus. **Normalizar** (remover tudo que não é
> dígito) antes de comparar com o CNPJ do tomador (`Empresa_Responsavel` do HCM) ou de persistir.

## 4. Mapeamento de estado do chamado → status

> **Correção (2026-08-04 — A-33):** a versão anterior desta seção usava `situation_description`
> como sinal de Aberto/Finalizado. O payload real mostrou que **`situation` não é isso** — é sobre
> **atendente vinculado** (`"Sem atendente vinculado"` mesmo em chamado recém-criado, aberto).
> `status` (array) e `current_status` também existem, mas ficam vazios/nulos até o Tomticket
> processar um fluxo de status configurado. O sinal principal continua **`end_date`**.
>
> **Correção parcial de A-33 (2026-08-04 — A-36):** "`situation` não é usado" era **quase** certo,
> mas não totalmente — existe **um** valor de `situation.description` que importa: **`"Cancelado"`**.
> Quando um atendente cancela manualmente um chamado (corte de dia 10, ver abaixo), o chamado
> **continua aparecendo** no `/list`/`/detail`, no mesmo formato — só que com
> `situation.description = "Cancelado"`. Esse valor específico **precisa** ser checado; o resto de
> `situation`/`status`/`current_status` continua irrelevante.

| Condição | `status` na Fato |
|---|---|
| Sem chamado casado por e-mail na competência | `Pendente` |
| Chamado casado, `situation.description = "Cancelado"` | `Pendente` (chamado não conta — A-36) |
| Chamado casado, `creation_date` depois do **dia 10** do mês da competência | `Pendente` (ignorado — corte de dia 10, A-36) |
| Chamado casado, válido, `end_date = null` | `Enviado` |
| Chamado casado, válido, `end_date` preenchido | `Recebido` |

> Ver regra completa (incluindo o pré-seed mensal) em `04-regras-de-negocio-status.md` e A-36 em
> `09-pendencias-e-decisoes.md`.

## 5. Tratamento do campo `tipo_de_lancamento`

- Vem de `custom_fields.open[]` no `/detail`, procurando o item com `label = "Tipo de Lançamento"`
  e lendo seu `value` (não é campo top-level — §2.2).
- Valores do Tomticket (P-04, confirmado no payload real): `Ambas`, `Contratual`, `Reembolso plano de saude`.
- Normalização → canônico interno (persistir com acento): `Reembolso plano de saude` → `Reembolso plano de saúde`. Ver `13` §2.3.
- Quando um mesmo solicitante abre **dois chamados** (um `Contratual` e um `Reembolso`), são **dois `id`/`protocol` distintos** → **duas linhas** na Fato (A-05). Nunca duas linhas com o mesmo chamado.
- `Ambas` num único chamado indica que aquela NF cobre serviços contratuais **e** reembolso (ex.: `protocol 19166`).

## 6. Interpretação do "Mês Referente" → Competência

> **Simplificado (2026-08-04 — A-34, ver `09-pendencias-e-decisoes.md`).** "Mês Referente" **não é
> um campo a ler** — nunca foi um custom field confiável (nunca apareceu em nenhum chamado testado,
> §2.1.1) nem precisa ser. A competência de um chamado é **sempre o mês/ano de `creation_date`**
> (data de abertura) — o mesmo mês em que a pessoa abriu o chamado. Isso já vem no **`/list`**, então
> **não depende do `/detail`** — uma simplificação real do fluxo de sincronização.

- `mes_ano_referencia` = mês/ano de `creation_date`, convertido para o formato **sistêmico
  `MM-AAAA`** (ex.: chamado aberto em `2026-07-28` → competência `07-2026`); a UI exibe `MM/AAAA`
  (ex.: `07/2026`). Ver `13` §2.4 e A-19.
- **Não há fallback de parser de texto** (`subject`, campo customizado) — a fonte é só `creation_date`,
  sempre disponível, sempre confiável. As seções de "Parser Mês Referente" em `08` §3 continuam
  úteis apenas para o cenário legado (chamados antigos importados com texto livre), não para o fluxo
  novo do Tomticket real.
- **Validação obrigatória (Tarefa 4.2):** `creation_date` ausente/inválido quebra a classificação de
  status e os alertas — mas isso é um campo sempre presente no `/list` (não opcional, ao contrário
  do antigo campo customizado).

## 7. Contrato de integração (interface interna)

> Endpoints e payload **reais**, testados contra a conta da City em 2026-08-04 (A-33). A
> implementação concreta é o Gateway `ITomticketGateway` / `TomticketRepository` na CITY API — ver
> `12-especificacao-endpoints-city-api.md` §5.

```
GET https://api.tomticket.com/v2.0/ticket/list
GET https://api.tomticket.com/v2.0/ticket/detail?ticket_id={id}

listarChamadosNF(params: {
  categoriaId: string,        // "38ae7388ab732f568bfe9193c60165ed" (A-33)
  mesAnoReferencia?: string   // "MM-AAAA"
}): ChamadoResumo[]            // do /list — sem custom_fields

obterDetalheChamado(idTomticket: string): DetalheChamado   // do /detail — só p/ chamados já casados por email

// ChamadoResumo (mapeado do /list — ver §2.1)
{
  idTomticket: string,        // GUID `id` — chave de idempotência
  numeroChamado: string,      // `protocol`
  nome: string,               // `customer.name`
  email: string,              // `customer.email` — chave de casamento (A-14)
  subject: string,
  dataAbertura: string,       // `creation_date` (ISO -03:00)
  dataFinalizacao: string | null,  // `end_date` — único sinal de status (§4)
  mesReferente: string,       // mês/ano de dataAbertura → "MM-AAAA" (A-34, §6) — não é custom field
  categoriaId: string,        // `category.id`
}

// DetalheChamado (mapeado do /detail — ver §2.2; enriquece o ChamadoResumo casado)
{
  link: string,                // derivado de idTomticket/numeroChamado
  tipoLancamento: 'Ambas' | 'Contratual' | 'Reembolso plano de saude',  // custom_fields "Tipo de Lançamento"
  cnpj: string | null          // custom_fields "CNPJ", normalizado (só dígitos) — usado no cenário 2 (§3.1)
}
```

> `ChamadoTomticket` (nome usado nas seções anteriores/em `12` §5) é a **junção** de `ChamadoResumo`
> + `DetalheChamado` depois do enriquecimento — a fronteira de duas chamadas é um detalhe do
> gateway, não deve vazar para o `LeitorDeCadastro`/`StatusService` que consomem o resultado já unido.

## 8. Robustez e boas práticas

- **Paginação e rate limit:** iterar com paginação no `/list`; respeitar limites da API; retentar com backoff em erros transitórios.
- **Duas chamadas por ciclo, não por chamado:** `/list` é **uma** chamada para todos os chamados da
  categoria; `/detail` só roda para os **já casados por e-mail** (§1) — evita explosão de requests
  contra chamados de outras categorias/solicitantes.
- **Idempotência:** upsert pela chave **`id`** do Tomticket (GUID, `id_tomticket`).
- **Casamento por e-mail** (A-14): normalizar trim + lowercase dos dois lados.
- **Autenticação:** variável **`API_KEY_TOMTICKET_HUB`** (já provisionada no GitHub Secrets da
  `api-city`, mesmo nome, sem remapear); header **`Authorization: Bearer <token>`** — testado
  contra a API real em 2026-08-04, HTTP 200 (A-35).
- **Observabilidade:** logar chamados lidos, casados, ignorados (e por quê) e upserts realizados.
- **Mock primeiro** (P-03): desenvolver com o payload de `13` §2.1 antes do acesso real à API.

## 9. Pendências desta integração

- **Resolvido (A-33, 2026-08-04):** endpoints reais (`/ticket/list`, `/ticket/detail`), categoria
  real, formato do CNPJ (mascarado), e que `custom_fields` só vêm no `/detail`.
- **Resolvido (A-34, 2026-08-04):** "Mês Referente" não é campo a ler — é `creation_date` (§6). Não
  há mais pendência de "campo customizado ausente" para competência.
- **Resolvido (A-35, 2026-08-04):** testado com a chave real contra `api.tomticket.com`.
  - Auth: `Authorization: Bearer <token>` — HTTP 200. Os headers alternativos testados
    (`access-token`, `token`, `api-key`, `X-API-KEY`) devolveram 401.
  - `category_id` **filtra de verdade** na query do `/list` (confirmado, não é só decoração).
  - Paginação usa o campo **`pages`** do envelope de resposta (junto de `size`, `next_page`,
    `previous_page`). Pedir `page` além do total devolve **HTTP 404**, não uma lista vazia com 200
    — `TomticketConnection.listar_chamados_nf` para em `pagina > pages`, nunca chama a página extra.
- **Rate limit real** da API do Tomticket — ainda não testado sob carga (não confundir com o teste
  pontual feito para A-35, que foi um punhado de requisições).
- **Resolvido (A-36, 2026-08-04):** pré-seed mensal (viés de histórico/auditoria — a Fato precisa
  registrar o que aconteceu em cada mês, mesmo sem chamado), timing (job no dia 1), corte de dia 10
  (chamado tardio é ignorado no status, mesmo que exista/esteja aberto no Tomticket) e chamado
  Cancelado (`situation.description = "Cancelado"`, não conta) — todos confirmados pelo usuário.
  Ver §4 e A-36 em `09-pendencias-e-decisoes.md` para a regra completa.

  > **Ainda em aberto dentro de A-36 (proposta minha, não confirmada):** a tabela
  > `TB_DPE_GPJ_RECEPCAO_NF` tem `id_tomticket VARCHAR(64) NOT NULL` com `UNIQUE (id_tomticket)` —
  > uma linha pré-semeada (sem chamado real ainda) precisa de um `id_tomticket` sintético para
  > satisfazer essas constraints sem alterar o schema. Proposta: chave determinística
  > `"PENDENTE-{cod_empresa}-{mes_ano_referencia}"`; quando o sync encontra um chamado real casado
  > por e-mail para aquele PJ+competência, ele **substitui** a linha placeholder (localizada por
  > `cod_empresa` + `mes_ano_referencia`, não por `id_tomticket`) em vez de criar uma linha nova.
  > Precisa de confirmação antes de implementar — é uma escolha técnica, não algo que o usuário
  > tenha decidido explicitamente.

Ver `09-pendencias-e-decisoes.md`. (Categoria, campo `tipo_de_lancamento`, "Mês Referente" e CNPJ
via campo customizado já **confirmados** — P-03/P-04/P-05/P-09/A-33/A-34. Auth e paginação também
já **confirmados** — P-10/P-17/A-35. **P-09 mudou de escopo**: deixou de ser "Marker + anexo PDF"
e passou a ser "garantir o campo customizado CNPJ no chamado". **P-18 resolvida (A-36)** — só a
chave sintética da linha pré-semeada segue como detalhe técnico a confirmar antes de implementar.)
