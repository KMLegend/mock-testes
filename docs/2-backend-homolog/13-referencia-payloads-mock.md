---
titulo: Referência de Payloads e Mocks (HCM, Tomticket, E-mail)
dominio: referencia
fase: [1, 2]
tags: [mock, payloads, hcm, tomticket, uau, interface, contrato-de-dados, email, template]
status: normativo-para-mock
---

# Referência de Payloads e Mocks

> Contratos de dados **reais** confirmados (P-01, P-03, P-04, P-05). O foco imediato é um **frontend
> mockado** com estas formas, **sem integração com o HCM** num primeiro momento, mas com
> **arquitetura modular**: uma **interface** guarda estes retornos como o **padrão**, independente do
> sistema plugado no endpoint (Strategy `FONTE_DADOS=MOCK|HCM|UAU`). Ver `12` §1 e `06` §2.

## 1. HCM / ERP — Lista de PJ (Fornecedores)

> A definir o endpoint (P-06); o **formato de retorno** já está fixado. Origem alimenta a tabela
> `APP.TB_GER_NF_PJ_FORNECEDOR`.

### 1.1 Retorno **Empresa** (fornecedor PJ)
```json
{
  "Cod_Empresa": "012",
  "Empresa": "KEVIN MAYKEL AGOSTINHO GOMES LTDA",
  "Apelido": "KEVIN MAYKEL AGOSTINHO GOMES",
  "Email": "kevin.maykel@cityinc.com.br",
  "Tipo_Inscricao": "1",
  "CNPJ": "12345678901234"
}
```

### 1.2 Retorno **Contratos** (por empresa)
```json
{
  "Cod_empresa": "012",
  "Empresa": "KEVIN MAYKEL AGOSTINHO GOMES LTDA",
  "Cod_Contrato": "1",
  "Nome_Contrato": "KEVIN MAYKEL AGOSTINHO GOMES",
  "Data_Inico": "2022-01-01",
  "Data_Fim": "2022-12-31",
  "Valor_Mensal": "1500",
  "Empresa_Responsavel": "002",
  "Nome_Empresa_Responsavel": "SPE RESIDENCIAL PRAÇA DO SOL EMPREENDIMENTOS LTDA"
}
```
> **Cardinalidade relevante:** uma empresa/pessoa pode ter **1..N contratos**. Isso é o que dispara a
> desambiguação por CNPJ no casamento (cenário 2, `03` §3.1) — lida diretamente do **campo
> customizado "CNPJ" do chamado no Tomticket** (§4, A-31). Sem PDF, sem Marker.

### 1.3 Retorno **Empresas do UAU** (referência de empresa responsável)
```json
{
  "Codigo_emp": 1,
  "Desc_emp": "CITY INCORPORADORA LTDA",
  "CGC_emp": "14489313000160",
  "Cidade_emp": "Goiânia", "UF_emp": "GO",
  "email_emp": "administrativo@cityinc.com.br",
  "TipoInsc_emp": 1,
  "NomeFantasia_emp": "CITY INCORPORADORA"
}
```
> Campos completos no retorno real (endereço, inscrições, etc.); acima os relevantes ao domínio.
> `CGC_emp` = CNPJ da empresa responsável (14 dígitos, sem máscara).

### 1.4 Interface/contrato interno (normativo para o mock)
Mapear qualquer fonte para um DTO estável:
```
FornecedorPJ {
  cod_empresa: string,
  nome: string,        // Empresa
  apelido: string,
  email: string,       // CHAVE DE CASAMENTO (A-14)
  tipo_inscricao: string,
  cnpj: string         // 14 dígitos, sem máscara
}
Contrato {
  cod_empresa: string, cod_contrato: string, nome_contrato: string,
  data_inicio: date, data_fim: date, valor_mensal: number,
  empresa_responsavel: string, nome_empresa_responsavel: string
}
```

## 2. Tomticket — Chamados (Recebimento de NF)

> **Payload real confirmado (A-33, 2026-08-04)** — testado contra a conta da City, não mais
> hipotético. Endpoints, categoria e formato de `custom_fields` abaixo refletem o que a API
> realmente devolve. Ver `03` §2/§7 para o raciocínio completo (duas chamadas: `/list` + `/detail`).

Categoria de lançamento de NF (P-03, valor **corrigido** em A-33):
- `category.id` = **`38ae7388ab732f568bfe9193c60165ed`**
- `category.name` = **`"Lançamento de Notas Fiscais"`**
- `department.name` = `"Departamento Pessoal"`

> **`situation`/`status`/`current_status` não são usados** para status Enviado/Recebido — só
> `end_date` (`null` = Enviado; preenchido = Recebido). Ver `03` §4 para o porquê.

Campo customizado (P-04): **"Tipo de Lançamento"** ∈ `Ambas` \| `Contratual` \| `Reembolso plano de saude`
— só existe em `custom_fields.open[]` do `/detail`, junto de "CNPJ" (mascarado). **"Mês Referente"
não é campo customizado** (A-34) — é o mês/ano de `creation_date`, já disponível no `/list`.

### 2.1 Exemplo de retorno — `GET /ticket/list` (sem custom_fields)
```json
{
  "error": false,
  "message": null,
  "data": [
    {
      "id": "8a9f8362abaaf5f90a1884d501cd6176",
      "protocol": 19164,
      "subject": "Envio de Nota Fiscal - Junho 2026",
      "creation_date": "2026-07-20 09:15:00-03:00",
      "end_date": "2026-07-20 10:30:00-03:00",
      "customer": {
        "name": "João Silva",
        "email": "joao.silva@cityinc.com.br"
      },
      "category": {
        "id": "38ae7388ab732f568bfe9193c60165ed",
        "name": "Lançamento de Notas Fiscais"
      },
      "department": { "id": "d205d6b925f991da5c70586a262b3692", "name": "Departamento Pessoal" }
    },
    {
      "id": "c73a8362abaaf5f90a1884d501cd9912",
      "protocol": 19166,
      "subject": "Nota Fiscal Julho - Serviços e Plano de Saúde",
      "creation_date": "2026-07-22 14:10:30-03:00",
      "end_date": null,
      "customer": {
        "name": "Carlos Santos",
        "email": "carlos.santos@cityinc.com.br"
      },
      "category": {
        "id": "38ae7388ab732f568bfe9193c60165ed",
        "name": "Lançamento de Notas Fiscais"
      },
      "department": { "id": "d205d6b925f991da5c70586a262b3692", "name": "Departamento Pessoal" }
    }
  ]
}
```
> Payload real tem mais campos (`priority`, `sla`, `cost`, `evaluation`, `situation`, `operator`…);
> acima só os relevantes ao domínio (`03` §2.1). **Nenhum** `custom_fields` aqui — só no `/detail`.

### 2.1.1 Exemplo de retorno — `GET /ticket/detail?ticket_id=` (com custom_fields)
```json
{
  "error": false,
  "message": null,
  "data": {
    "id": "c73a8362abaaf5f90a1884d501cd9912",
    "protocol": 19166,
    "customer": { "name": "Carlos Santos", "email": "carlos.santos@cityinc.com.br" },
    "creation_date": "2026-07-22 14:10:30-03:00",
    "end_date": null,
    "category": { "id": "38ae7388ab732f568bfe9193c60165ed", "name": "Lançamento de Notas Fiscais" },
    "situation": { "id": 0, "description": "Sem atendente vinculado" },
    "custom_fields": {
      "open": [
        { "id": "9c897d816b718dcb1070f1e3817ea169", "label": "CNPJ", "value": "17.928.511/0001-70" },
        { "id": "03d2beee453628d0a5372128bc819eb2", "label": "Tipo de Lançamento", "value": "Ambas" }
      ],
      "closed": [],
      "evaluation": []
    }
  }
}
```
> **CNPJ vem mascarado** (`"17.928.511/0001-70"`) — normalizar para 14 dígitos crus antes de comparar
> ou persistir. **Não há campo "Mês Referente" aqui, e não precisa haver** (A-34): a competência já
> foi resolvida no `/list`, a partir de `creation_date` (§2.1) — o `/detail` não participa disso.

### 2.2 Mapeamento Tomticket → Tabela Fato (`APP.TB_GER_NF_PJ_RECEPCAO`)
| Campo Tomticket | Origem | Campo Fato | Observação |
|---|---|---|---|
| `id` | `/list` | `id_tomticket` | GUID — **chave de idempotência** do upsert (único) |
| `protocol` | `/list` | `numero_chamado` | Número exibido (ex.: `19164`) |
| `subject` | `/list` | `assunto` | — |
| `customer.name` | `/list` | `nome` | Nome do solicitante |
| `customer.email` | `/list` | `email` | **Chave de casamento com a Lista de PJ (A-14)** |
| `creation_date` | `/list` | `data_abertura` | ISO com fuso `-03:00`; **também deriva `mes_ano_referencia`** (ver §2.4, A-34) |
| `end_date` | `/list` | `data_finalizacao` | `null` enquanto não finalizado; **único sinal de status** (`03` §4) |
| `category.name`/`category.id` | `/list` | filtro | só `"Lançamento de Notas Fiscais"` (A-33) |
| `custom_fields.open[label="Tipo de Lançamento"].value` | `/detail` | `tipo_lancamento` | normalizar (ver §2.3) |
| `custom_fields.open[label="CNPJ"].value` | `/detail` | `cnpj` | mascarado na origem; **só lido no cenário 2** de desambiguação (§4, A-31) |
| *(derivado)* | — | `link_chamado` | montar `TOMTICKET_BASE_URL` + `id`/`protocol` |

### 2.3 Normalização do `tipo_de_lancamento`
Valores do Tomticket → canônico interno:
- `Contratual` → `Contratual`
- `Reembolso plano de saude` → `Reembolso plano de saúde` (persistir canônico com acento)
- `Ambas` → `Ambas`

> Tolerar variação de acento/caixa; centralizar num mapeamento configurável (`03` §5).

### 2.4 "Mês Referente" e competência (P-05, resolvido por A-34)
- Formato **sistêmico (armazenado): `MM-AAAA`** (ex.: `07-2026`).
- Formato **de exibição (UI): `MM/AAAA`** (ex.: `07/2026`).
- **Não é campo customizado.** `mes_ano_referencia` é sempre o mês/ano de `creation_date` (data de
  abertura) — confirmado pelo usuário com exemplo: chamado aberto 30/06, finalizado 03/07 →
  competência **Junho** (mês da abertura, não da finalização). Já disponível no `/list`, sem
  depender do `/detail` nem de parser de `subject`. Ver `03` §6.

## 3. Template de e-mail de alerta (P-02)

> Seguir a **identidade visual da City** (`11-identidade-visual.md`) no HTML do e-mail. Placeholders
> entre `[...]` resolvidos pelo worker de alertas (`05`). Ajustar tom por regra (preventivo × cobrança).

**Assunto:** `Lembrete: Envio da Nota Fiscal de [Mês de Referência] via TomTicket`

**Corpo (base):**
```
Olá, Equipe!

Esperamos que estejam bem.

Este é um lembrete do Departamento Pessoal de que o prazo para o envio das Notas Fiscais
referentes à prestação de serviços de [Mês de Referência] se encerra no dia [Data Limite, ex: 25/08].

Para garantir a organização e o cumprimento da nossa agenda de pagamentos programada para o dia
[Data do Pagamento], reforçamos que todas as notas devem ser enviadas exclusivamente via plataforma
TomTicket.

Como enviar:
- Acesse o TomTicket pelo link: [Link para o portal TomTicket da empresa]
- Abra um novo chamado direcionado ao departamento [Nome do Departamento no TomTicket, ex: Financeiro / DP].
- No assunto, preencha: Nota Fiscal [Seu Nome/Sua Empresa] - [Mês].
- Anexe a Nota Fiscal em PDF.

O envio fora do prazo ou por outros canais (como e-mail direto ou WhatsApp) pode ocasionar atrasos
na programação do seu pagamento.

Qualquer dúvida sobre o uso da plataforma, estamos à disposição.
```

Placeholders:
| Placeholder | Origem |
|---|---|
| `[Mês de Referência]` | competência em exibição (`MM/AAAA`) |
| `[Data Limite]` | `D` (config `.env`) da competência |
| `[Data do Pagamento]` | parâmetro (a definir) |
| `[Link para o portal TomTicket]` | `TOMTICKET_PORTAL_URL` |
| `[Nome do Departamento no TomTicket]` | `DEPARTAMENTO PESSOAL` (padrão) |
| `[Seu Nome/Sua Empresa]` | `nome`/`apelido` do fornecedor |
| `[Mês]` | competência em exibição |

> Variação **cobrança** (D+1, D+3): mesmo layout, texto reforçando que a NF **não foi recebida** no prazo.

## 4. Mock da desambiguação por contrato (A-31) — 1 PJ em >1 contrato

> **Objetivo:** exercitar o **cenário 2** de `03` §3.1 (pessoa com **mais de um contrato**). O CNPJ
> vem do **campo customizado "CNPJ" do `/detail` do chamado** — junto de "Tipo de Lançamento" (`03`
> §2.2/§7). **Não há extração de PDF nem Marker** (P-09/A-21 foram descontinuados — ver
> `09-pendencias-e-decisoes.md`). O mock deste documento
> simplesmente **preenche o campo `cnpj` no payload de exemplo** (§4.3), sem simular nenhum passo de
> extração — porque não há nenhum a simular.

### 4.1 Leitura do campo (normativa)
```python
# app/services/cnpj_do_chamado.py
def cnpj_do_chamado(chamado: ChamadoTomticket) -> str | None:
    """Lê o campo customizado 'CNPJ' já presente no payload do chamado (A-31)."""
    return chamado.cnpj
```
> Sem interface de extração, sem Strategy, sem config `CNPJ_EXTRACTOR` — é leitura de um campo do
> DTO já mapeado em `03` §7, do mesmo jeito que `chamado.mesReferente` já é lido.

### 4.2 Dataset — fornecedor com 2 contratos
**Fornecedor (HCM Empresa):**
```json
{ "Cod_Empresa": "015", "Empresa": "CARLOS SANTOS SERVICOS LTDA",
  "Apelido": "CARLOS SANTOS", "Email": "carlos.santos@cityinc.com.br",
  "Tipo_Inscricao": "1", "CNPJ": "33333333000133" }
```

**Contratos (HCM Contratos) — 2 para o mesmo e-mail, com Empresas Responsáveis diferentes:**
```json
[
  { "Cod_empresa": "015", "Cod_Contrato": "101", "Nome_Contrato": "SERVIÇOS - CITY INCORP",
    "Empresa_Responsavel": "001", "Nome_Empresa_Responsavel": "CITY INCORPORADORA LTDA" },
  { "Cod_empresa": "015", "Cod_Contrato": "102", "Nome_Contrato": "SERVIÇOS - SPE PRAÇA DO SOL",
    "Empresa_Responsavel": "002", "Nome_Empresa_Responsavel": "SPE RESIDENCIAL PRAÇA DO SOL EMPREENDIMENTOS LTDA" }
]
```

**CNPJ de cada Empresa Responsável** (cruzando com UAU §1.3, `Codigo_emp` → `CGC_emp`):
| Empresa_Responsavel | Nome | CNPJ (tomador) |
|---|---|---|
| `001` | CITY INCORPORADORA LTDA | `14489313000160` |
| `002` | SPE RESIDENCIAL PRAÇA DO SOL … | `17928511000170` |

### 4.3 Payload do chamado com o campo preenchido (mock)
CNPJ que o payload de exemplo já traz no campo customizado, por chamado:
| Chamado (`protocol`) | `email` | Campo `cnpj` no chamado | Resolve para |
|---|---|---|---|
| `19166` (Carlos Santos, `Ambas`) | carlos.santos@cityinc.com.br | `17928511000170` | Contrato **102** (SPE Praça do Sol) |

> Para testar o outro ramo, basta mudar o campo do mock para `14489313000170`, que resolve para o Contrato **101**.

### 4.4 Algoritmo de desambiguação (normativo)
```
resolver_contrato(chamado):
  pj = casar_por_email(chamado.email)              # A-14
  contratos = hcm.listar_contratos(pj.cod_empresa)
  se len(contratos) == 1:
     return contratos[0]                            # cenário 1: direto
  # cenário 2: >1 contrato → ler o campo customizado "CNPJ" do próprio chamado (A-31)
  cnpj = chamado.cnpj
  return contrato cujo CNPJ(Empresa_Responsavel) == cnpj   # senão: marcar p/ tratamento manual
```

### 4.5 Resultado esperado (para o teste)
- Chamado `19166` (Carlos Santos, 2 contratos) → campo `cnpj` = `17928511000170` → **Contrato 102**
  (SPE Praça do Sol). A linha na Fato é atribuída a esse contrato.
- **Sem match** (campo vazio ou CNPJ não bate com nenhum contrato) → registrar como **pendência de
  tratamento manual** (não atribuir a um contrato aleatório). Log + sinalização no Dashboard.

> Persistir na Fato o `cnpj` resolvido e (se houver coluna) o `cod_contrato` para auditoria.
> Ver teste em `08-mocks-e-testes.md` §1 (cenário "Pessoa com >1 contrato") e §2.6.
