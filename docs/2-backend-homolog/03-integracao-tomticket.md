---
titulo: Integração com Tomticket
dominio: integracao
fase: 2
tags: [tomticket, integracao, api, chamados, categoria, campo-customizado, mes-referente]
status: normativo-com-pendencias
---

# Integração com Tomticket

> **Categoria, situação, campo `tipo_de_lancamento`, formato do "Mês Referente" e CNPJ já estão
> confirmados** (P-03/P-04/P-05/P-09) e consolidados com payload real em
> `13-referencia-payloads-mock.md` §2. Resta pendência de **endpoints/autenticação reais**. Este
> documento define **o quê** a integração faz; identificadores concretos ficam parametrizados por
> configuração.
>
> **Correção (2026-07-29):** o CNPJ **não** vem de extração de PDF via Marker — é um **campo
> customizado do próprio chamado no Tomticket**, do mesmo jeito que "Mês Referente" já é. P-09 (Marker)
> e a interface `INotaCnpjExtractor` estão **descontinuados** — ver §3.1 e `09-pendencias-e-decisoes.md`.

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
| Campo **"CNPJ"** (customizado) | Desambiguação de contrato quando a pessoa tem >1 contrato (§3.1) | `cnpj` |
| *(derivado)* | Link ao chamado | `link_chamado` |

> O CNPJ vem do **campo customizado "CNPJ"** do próprio chamado — mesma natureza do "Mês Referente"
> (§6): um campo que o Tomticket já expõe no payload, sem depender de PDF nem de biblioteca externa.

## 3. Casamento chamado → fornecedor (normativo — A-14)

**A chave de casamento é o `email`** (não há chave de fallback fixa). Fluxo:

1. Filtrar só a **categoria de NF-PJ** (`category_name = "Recebimento de Notas - PJ"` /
   `category_id = 8b9a123fcd09bd585714b53d5370f1a2`).
2. Casar `chamado.email` com um fornecedor **ativo** da Lista de PJ (normalizar trim + lowercase).
3. Resolver a competência do "Mês Referente" (§6).

### 3.1 Desambiguação por contrato (cenários A-14)

Consultando o **endpoint de Contratos do HCM** (`13` §1.2) para o fornecedor casado:

- **Cenário 1 — 1 contrato vinculado à pessoa:** envio normal (qualquer `tipo_de_lancamento`). O
  lançamento é atribuído diretamente a esse contrato. **Sem** necessidade de ler o CNPJ.
- **Cenário 2 — mais de 1 contrato vinculado à pessoa:** ler o **campo customizado "CNPJ"** do
  próprio chamado (já vem no payload do Tomticket, junto de `tipo_de_lancamento` e "Mês Referente")
  e **validar a qual contrato** o lançamento se refere.

> **Correção (2026-07-29):** este cenário previa extrair o CNPJ do **anexo da NF em PDF** via
> **Marker** (biblioteca OSS de extração), atrás de uma interface `INotaCnpjExtractor` com
> implementação real (Marker) e mock (`MockNotaCnpjExtractor`) — ver P-09/A-21 em
> `09-pendencias-e-decisoes.md`. **Isso não é mais necessário:** o CNPJ é um campo customizado do
> chamado, lido do mesmo payload que já traz "Mês Referente" e `tipo_de_lancamento`. Não há PDF,
> não há Marker, não há interface de extração — é leitura direta de campo, igual aos demais.
>
> Implicação: o CNPJ continua sendo um **desambiguador**, não a chave de junção (essa é o e-mail,
> A-14) — só que lido do payload do chamado, não extraído de anexo. Ver `04` §4.

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
  mesReferente: string,       // bruto; parser → "MM-AAAA"
  cnpj?: string                // campo customizado "CNPJ"; usado só na desambiguação (§3.1, cenário 2)
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
- **"Mês Referente" e "CNPJ":** garantir os dois campos customizados no chamado (o payload de exemplo
  de `13` §2.1 ainda não os traz — §6, §3.1).

Ver `09-pendencias-e-decisoes.md`. (Categoria, campo `tipo_de_lancamento`, formato de "Mês Referente"
e CNPJ via campo customizado já **confirmados** — P-03/P-04/P-05/P-09. **P-09 mudou de escopo**:
deixou de ser "Marker + anexo PDF" e passou a ser "garantir o campo customizado CNPJ no chamado".)
