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
> desambiguação por CNPJ no casamento (cenário 2, `03` §3.1) — **mockada** hoje via
> `MockNotaCnpjExtractor` (§4), com o Marker real depois.

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

Categoria de lançamento de NF (P-03):
- `category_id` = **`8b9a123fcd09bd585714b53d5370f1a2`**
- `category_name` = **`"Recebimento de Notas - PJ"`**
- `department_name` = `"DEPARTAMENTO PESSOAL"`

Situação (P-03):
| `situation_id` | `situation_description` | `end_date` | Status na Fato |
|---|---|---|---|
| `2` | `Em Andamento` | `null` | **Enviado** |
| `5` | `Finalizado` | preenchido | **Recebido** |

Campo customizado (P-04): **`tipo_de_lancamento`** ∈ `Ambas` \| `Contratual` \| `Reembolso plano de saude`.

### 2.1 Exemplo de retorno (mock) — 3 chamados
```json
[
  {
    "id": "8a9f8362abaaf5f90a1884d501cd6176",
    "protocol": "19164",
    "subject": "Envio de Nota Fiscal - Junho 2026",
    "creation_date": "2026-07-20 09:15:00-03:00",
    "end_date": "2026-07-20 10:30:00-03:00",
    "name": "João Silva",
    "email": "joao.silva@cityinc.com.br",
    "situation_id": "5", "situation_description": "Finalizado",
    "category_id": "8b9a123fcd09bd585714b53d5370f1a2",
    "category_name": "Recebimento de Notas - PJ",
    "tipo_de_lancamento": "Contratual"
  },
  {
    "id": "238d061bed2cff0a763dce00a0c8b586",
    "protocol": "19165",
    "subject": "NF Reembolso Convênio Médico",
    "creation_date": "2026-07-21 11:20:15-03:00",
    "end_date": "2026-07-21 14:05:22-03:00",
    "name": "Maria Souza",
    "email": "maria.souza@cityinc.com.br",
    "situation_id": "5", "situation_description": "Finalizado",
    "category_id": "8b9a123fcd09bd585714b53d5370f1a2",
    "category_name": "Recebimento de Notas - PJ",
    "tipo_de_lancamento": "Reembolso plano de saude"
  },
  {
    "id": "c73a8362abaaf5f90a1884d501cd9912",
    "protocol": "19166",
    "subject": "Nota Fiscal Julho - Serviços e Plano de Saúde",
    "creation_date": "2026-07-22 14:10:30-03:00",
    "end_date": null,
    "name": "Carlos Santos",
    "email": "carlos.santos@cityinc.com.br",
    "situation_id": "2", "situation_description": "Em Andamento",
    "category_id": "8b9a123fcd09bd585714b53d5370f1a2",
    "category_name": "Recebimento de Notas - PJ",
    "tipo_de_lancamento": "Ambas"
  }
]
```
> Payload real tem mais campos (priority, operator, sla_*, cost_*); acima os relevantes ao domínio.

### 2.2 Mapeamento Tomticket → Tabela Fato (`APP.TB_GER_NF_PJ_RECEPCAO`)
| Campo Tomticket | Campo Fato | Observação |
|---|---|---|
| `id` | `id_tomticket` | GUID — **chave de idempotência** do upsert (único) |
| `protocol` | `numero_chamado` | Número exibido (ex.: `19164`) |
| `subject` | `assunto` | — |
| `name` | `nome` | Nome do solicitante |
| `email` | `email` | **Chave de casamento com a Lista de PJ (A-14)** |
| `creation_date` | `data_abertura` | ISO com fuso `-03:00` |
| `end_date` | `data_finalizacao` | `null` enquanto não finalizado |
| `situation_description` | deriva `status` | `Finalizado`→Recebido; senão Enviado |
| `category_name`/`category_id` | filtro | só `Recebimento de Notas - PJ` |
| `tipo_de_lancamento` | `tipo_lancamento` | normalizar (ver §2.3) |
| *(Mês Referente)* | `mes_ano_referencia` | **campo customizado; ver §2.4** |
| *(derivado)* | `link_chamado` | montar `TOMTICKET_BASE_URL` + `id`/`protocol` |

### 2.3 Normalização do `tipo_de_lancamento`
Valores do Tomticket → canônico interno:
- `Contratual` → `Contratual`
- `Reembolso plano de saude` → `Reembolso plano de saúde` (persistir canônico com acento)
- `Ambas` → `Ambas`

> Tolerar variação de acento/caixa; centralizar num mapeamento configurável (`03` §5).

### 2.4 "Mês Referente" e competência (P-05)
- Formato **sistêmico (armazenado): `MM-AAAA`** (ex.: `07-2026`).
- Formato **de exibição (UI): `MM/AAAA`** (ex.: `07/2026`).
- O campo customizado "Mês Referente" **não aparece** no payload de exemplo acima — no mock, adicioná-lo;
  na ausência, derivar do `subject` (ex.: "Junho 2026") ou do mês de `creation_date` (fallback).
  Ver `03` §6.

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

## 4. Mock da desambiguação por contrato (P-09) — 1 PJ em >1 contrato

> **Objetivo:** exercitar o **cenário 2** de `03` §3.1 (pessoa com **mais de um contrato**) **sem** a
> integração real do Marker/PDF. A extração do CNPJ do anexo é abstraída por uma **interface**; a
> implementação é trocada por um **mock** que devolve um CNPJ pré-definido por chamado. Quando o
> Marker estiver disponível, só a implementação muda (arquitetura modular, A-14).

### 4.1 Interface de extração (normativa)
```python
# app/services/interfaces/nota_cnpj_extractor.py
class INotaCnpjExtractor(ABC):
    """Extrai o CNPJ do tomador (Empresa_Responsavel) a partir do anexo PDF da NF."""
    @abstractmethod
    def extrair_cnpj(self, chamado: ChamadoTomticket) -> str | None: ...

# Implementações:
#   MarkerNotaCnpjExtractor  → real (P-09, futura): roda Marker no PDF anexado ao chamado
#   MockNotaCnpjExtractor    → mock atual: consulta o mapa fixo da §4.3
```
> Seleção por config/Strategy (ex.: `CNPJ_EXTRACTOR=MOCK|MARKER`), no mesmo espírito de `FONTE_DADOS`.

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

### 4.3 Mapa do mock (`MockNotaCnpjExtractor`)
CNPJ que o mock "extrai" do PDF, por chamado:
| Chamado (`protocol`) | `email` | CNPJ extraído (mock) | Resolve para |
|---|---|---|---|
| `19166` (Carlos Santos, `Ambas`) | carlos.santos@cityinc.com.br | `17928511000170` | Contrato **102** (SPE Praça do Sol) |

> Para testar o outro ramo, basta mapear `19166 → 14489313000160`, que resolve para o Contrato **101**.

### 4.4 Algoritmo de desambiguação (normativo)
```
resolver_contrato(chamado):
  pj = casar_por_email(chamado.email)              # A-14
  contratos = hcm.listar_contratos(pj.cod_empresa)
  se len(contratos) == 1:
     return contratos[0]                            # cenário 1: direto
  # cenário 2: >1 contrato → extrair CNPJ do PDF (mock hoje, Marker depois)
  cnpj = extractor.extrair_cnpj(chamado)            # INotaCnpjExtractor
  return contrato cujo CNPJ(Empresa_Responsavel) == cnpj   # senão: marcar p/ tratamento manual
```

### 4.5 Resultado esperado (para o teste)
- Chamado `19166` (Carlos Santos, 2 contratos) → mock extrai `17928511000170` → **Contrato 102**
  (SPE Praça do Sol). A linha na Fato é atribuída a esse contrato.
- **Sem match** (CNPJ extraído não bate com nenhum contrato) → registrar como **pendência de
  tratamento manual** (não atribuir a um contrato aleatório). Log + sinalização no Dashboard.

> Persistir na Fato o `cnpj` resolvido e (se houver coluna) o `cod_contrato` para auditoria.
> Ver teste em `08-mocks-e-testes.md` §1 (cenário "Pessoa com >1 contrato") e §2.6.
