---
titulo: Fonte de Cadastro Modular — Contrato JSON estável e fonte plugável
dominio: backend
fase: 2
tags: [backend, city-api, fonte, hcm, contrato-de-dados, json, ports-adapters, dip, solid, object-calisthenics, pydantic, dependency-injection]
status: normativo-para-implementacao
---

# Fonte de Cadastro Modular — Contrato JSON estável e fonte plugável

> **Problema que este documento resolve.** Os dados cadastrais (fornecedores PJ + contratos) hoje
> viriam do **HCM**, mas a personalização do HCM ainda está **em debate no Dep. de Sistemas**. Não se
> pode travar o backend esperando essa decisão. A saída é **inverter a dependência**: o backend passa
> a depender de um **contrato JSON estável**, não do HCM. Qualquer fonte que emita esse contrato serve,
> e a troca de fonte acontece em **um único arquivo** (`dependencies.py`).
>
> Quando o HCM ficar pronto, você escreve **um** adaptador novo e o **força a obedecer ao contrato** —
> nada mais no sistema muda.

> **Escopo.** Este doc cobre a **entrada de cadastro** (fornecedores + contratos). Não cobre as
> *ocorrências* de recesso (essas nascem no próprio app — ver `modulo-recesso/03` e `05`). Alinha-se a
> `06` §2 (camadas), `12` §1/§6 (fonte e DI) e formaliza o "contrato interno" embrionário de `13` §1.4.

---

## 1. Princípio: a fonte é um detalhe, o contrato é a fronteira

```
                       ┌──────────────────────────────────────────┐
   fonte varia  ─────► │  CONTRATO JSON CANÔNICO (estável, versionado) │ ◄──── o resto do
   (JSON/HTTP/HCM/…)   └──────────────────────────────────────────┘       sistema depende DAQUI
                                        │
                                        ▼
                      validação Pydantic = "forçar a fonte a obedecer"
                                        │
                                        ▼
                       mapeamento para o domínio (VOs) → upsert no DB City
```

- **Dependency Inversion (o "D" do SOLID).** O caso de uso de sincronização depende de uma
  **abstração** (`FonteDeCadastro`), nunca do HCM concreto. HCM, arquivo e HTTP são intercambiáveis.
- **O contrato é a *anti-corruption layer*.** Nenhum formato bruto de fonte vaza para dentro do
  sistema: tudo passa pela validação do contrato. Fonte que não obedece **falha na fronteira**, alto e
  claro, em vez de corromper o cadastro silenciosamente.
- **Ponto único de troca.** Escolher a fonte é responsabilidade **exclusiva** de `dependencies.py`.
  Repositórios, serviços e rotas **não sabem** de onde o cadastro veio.

---

## 2. O contrato JSON canônico (v1.0)

Este é **o** formato. É o que a fonte-mock emite hoje e o que o HCM será **obrigado** a emitir depois.

```json
{
  "versaoContrato": "1.0",
  "geradoEm": "2026-07-24T10:15:00-03:00",
  "fonte": "MOCK",
  "fornecedores": [
    {
      "codEmpresa": "012",
      "razaoSocial": "KEVIN MAYKEL AGOSTINHO GOMES LTDA",
      "nomeFantasia": "KEVIN MAYKEL",
      "responsavelLegal": "Kevin Maykel",
      "email": "kevin.maykel@cityinc.com.br",
      "cnpj": "12345678901234",
      "tipoInscricao": "1",
      "ativo": true
    }
  ],
  "contratos": [
    {
      "codEmpresa": "012",
      "codContrato": "CONTRATO-012-A",
      "nomeContrato": "CONTRATO KEVIN - ADMIN",
      "dataInicio": "2023-03-15",
      "dataFim": "2026-12-31",
      "valorMensal": 5000,
      "empresaVinculada": { "codigo": "001", "nome": "CITY INCORPORADORA LTDA" },
      "proporcaoDeRecesso": 100
    }
  ]
}
```

### 2.1 Envelope

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `versaoContrato` | string `"MAJOR.MINOR"` | ✅ | O leitor **rejeita** MAJOR diferente do que suporta (§6). |
| `geradoEm` | ISO-8601 com fuso | ✅ | Quando a fonte gerou o lote. Auditoria do sync. |
| `fonte` | string | ✅ | Rótulo livre (`MOCK`, `HCM`, `UAU`…). Só p/ rastreio; **não** muda comportamento. |
| `fornecedores` | array | ✅ | Pode ser vazio, nunca ausente. |
| `contratos` | array | ✅ | Pode ser vazio, nunca ausente. |

### 2.2 Fornecedor

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `codEmpresa` | string | ✅ | Chave do PJ; liga fornecedor↔contrato **dentro do lote**. |
| `razaoSocial` | string | ✅ | Exibida em negrito na grade. |
| `nomeFantasia` | string | ➖ | Legenda sob a razão social. Ausente → usa a razão social. |
| `responsavelLegal` | string | ➖ | **R-16** em aberto no HCM; fonte pode não ter (mock preenche). |
| `email` | string | ✅ | **Chave de casamento (A-14)**; normalizada `trim`+`lower` na ingestão; **única**. |
| `cnpj` | string (14 díg.) | ✅ | Sem máscara. Desambiguação/relatório. |
| `tipoInscricao` | string | ➖ | Passa-através do HCM. |
| `ativo` | boolean | ✅ | Inativo aparece na grade de recesso com ícone de status. |

### 2.3 Contrato

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `codEmpresa` | string | ✅ | FK p/ o fornecedor **do mesmo lote**. |
| `codContrato` | string | ✅ | Numerado por empresa no ERP (`101`, `102`) — **não** é único isolado. |
| `nomeContrato` | string | ➖ | Descritivo. |
| `dataInicio` | string `YYYY-MM-DD` | ✅ | **Dia base** do acúmulo mensal (`modulo-recesso/02` §2). |
| `dataFim` | string `YYYY-MM-DD` | ✅ | Limite superior do acúmulo. |
| `valorMensal` | number | ➖ | Informativo. |
| `empresaVinculada.codigo` | string | ✅ | Código da tomadora (exibido sob o nome na grade). |
| `empresaVinculada.nome` | string | ✅ | Nome da tomadora. |
| `proporcaoDeRecesso` | number 0–100 \| null | ➖ | Fatia do direito de recesso deste contrato (`modulo-recesso/02` §1.1). Ver §2.4. |

### 2.4 `proporcaoDeRecesso` — o campo sob debate no HCM

É exatamente um dos campos que o HCM ainda não sabe fornecer. O contrato o trata como **opcional
com regra de preenchimento determinística** — assim a fonte pode omiti-lo hoje sem quebrar nada:

| Situação na ingestão | Ação |
|---|---|
| Veio preenchido (0–100) | Usa o valor. |
| Ausente/`null` **e** o PJ tem **1** contrato | Assume **100%**. |
| Ausente/`null` **e** o PJ tem **N>1** contratos | **Não** inventa rateio: grava `NULL` e **sinaliza para definição manual** (Σ precisa dar 100%). |

> **Invariante de cadastro (a validar na Fase 2):** para cada PJ, `Σ(proporções dos contratos ativos) = 100%`.
> Registrado como **R-17** em `modulo-recesso/06`.

### 2.5 Regra de ouro do contrato

> **camelCase no fio, `snake_case` no Python.** O JSON usa camelCase (vocabulário do domínio/frontend);
> o Pydantic converte para `snake_case` via *alias generator* (§4). O nome do campo no HCM bruto
> (`Data_Inico`, `Cod_Empresa`…) **nunca** aparece fora do adaptador HCM.

---

## 3. A porta (Dependency Inversion)

A porta é **mínima** (Interface Segregation): a fonte só sabe **obter os bytes**. Ela **não** valida,
**não** conhece o formato final, **não** fala com banco.

```python
# app/services/interfaces/fonte_de_cadastro.py
from typing import Protocol

class FonteDeCadastro(Protocol):
    """Origem bruta de um lote de cadastro. O QUE varia entre fontes é só isto."""

    def obter(self) -> dict:
        """Devolve o payload no formato do contrato §2 (ainda NÃO validado)."""
        ...
```

> Por que `obter() -> dict` e não `-> LoteDeCadastro` já validado? Para que a **validação seja
> centralizada e inescapável** (§5). Se cada fonte validasse por conta própria, a futura `FonteHcm`
> poderia "esquecer" de validar e furar a fronteira. Validação mora **num lugar só**.

---

## 4. O contrato como código — DTOs Pydantic (a fronteira que *força* a fonte)

Os modelos Pydantic **são** o contrato executável. Validar o payload contra eles é o que significa,
na prática, "forçar a fonte a seguir o contrato".

```python
# app/services/schemas/contrato_cadastro.py
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

class _Base(BaseModel):
    # Aceita camelCase no fio; expõe snake_case no Python. ACL de nomenclatura.
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")

class EmpresaVinculadaDTO(_Base):
    codigo: str
    nome: str

class FornecedorDTO(_Base):
    cod_empresa: str
    razao_social: str
    nome_fantasia: str | None = None
    responsavel_legal: str | None = None
    email: str
    cnpj: str = Field(min_length=14, max_length=14, pattern=r"^\d{14}$")
    tipo_inscricao: str | None = None
    ativo: bool

class ContratoDTO(_Base):
    cod_empresa: str
    cod_contrato: str
    nome_contrato: str | None = None
    data_inicio: date
    data_fim: date
    valor_mensal: float | None = None
    empresa_vinculada: EmpresaVinculadaDTO
    proporcao_de_recesso: float | None = Field(default=None, ge=0, le=100)

class PayloadDeCadastro(_Base):
    versao_contrato: str
    gerado_em: datetime
    fonte: str
    fornecedores: list[FornecedorDTO]
    contratos: list[ContratoDTO]
```

- **`extra="forbid"`** — campo desconhecido é **erro**, não é ignorado. Se o HCM mandar lixo a mais, a
  fronteira acusa. É o coração do "forçar a obedecer".
- **`pattern`/`ge`/`le`/tipos** — CNPJ com 14 dígitos, proporção 0–100, datas reais. A fonte não
  escolhe o formato; o contrato escolhe.

---

## 5. Validação centralizada e mapeamento para o domínio

Um único ponto lê a fonte, valida contra o contrato e **traduz para os Value Objects** do domínio.
Nenhum adaptador escapa disto.

```python
# app/services/cadastro/leitor_de_cadastro.py
from app.services.interfaces.fonte_de_cadastro import FonteDeCadastro
from app.services.schemas.contrato_cadastro import PayloadDeCadastro
from app.domain.cadastro.lote_de_cadastro import LoteDeCadastro

MAJOR_SUPORTADO = 1

class ContratoIncompativel(Exception):
    """A fonte emitiu uma versão MAJOR que este backend não entende."""

class LeitorDeCadastro:
    def ler(self, fonte: FonteDeCadastro) -> LoteDeCadastro:
        payload = PayloadDeCadastro.model_validate(fonte.obter())   # ← enforcement
        self._garantir_versao(payload.versao_contrato)
        return LoteDeCadastro.a_partir_do_contrato(payload)

    def _garantir_versao(self, versao: str) -> None:
        major = int(versao.split(".")[0])
        if major != MAJOR_SUPORTADO:
            raise ContratoIncompativel(f"contrato v{versao}; suportado: v{MAJOR_SUPORTADO}.x")
```

> `LoteDeCadastro` é uma **first-class collection** (Object Calisthenics regra 4): agrupa os
> fornecedores e contratos já como entidades de domínio e responde perguntas do domínio
> (`contratos_do(cod_empresa)`, `validar_proporcoes()`), em vez de expor duas listas cruas.

---

## 6. Os adaptadores (Open/Closed + Liskov)

Cada fonte implementa a **mesma** porta. Adicionar uma fonte = **adicionar uma classe**, sem tocar em
nada existente.

### 6.1 `FonteJsonEstatica` — serve HOJE, antes do HCM
```python
# app/services/fonts/fonte_json.py
import json
from pathlib import Path

class FonteJsonEstatica:
    """Lê o contrato de um arquivo .json versionado no repo. Zero dependência externa."""
    def __init__(self, caminho: Path) -> None:
        self._caminho = caminho

    def obter(self) -> dict:
        return json.loads(self._caminho.read_text(encoding="utf-8"))
```

### 6.2 `FonteHttpContrato` — qualquer serviço que já emita o contrato
```python
# app/services/fonts/fonte_http.py
import httpx

class FonteHttpContrato:
    def __init__(self, url: str, token: str) -> None:
        self._url = url
        self._token = token

    def obter(self) -> dict:
        resposta = httpx.get(self._url, headers={"Authorization": f"Bearer {self._token}"}, timeout=30)
        resposta.raise_for_status()
        return resposta.json()
```

### 6.3 `FonteHcm` — VOCÊ escreve quando o HCM ficar pronto
```python
# app/services/fonts/fonte_hcm.py   (ESQUELETO — a implementar na Fase 2)
class FonteHcm:
    """
    Única classe que conhece o HCM cru. Sua ÚNICA responsabilidade é traduzir o
    retorno do HCM (Data_Inico, Cod_Empresa, …) para o contrato canônico §2.
    Toda a esquisitice do HCM começa e TERMINA aqui.
    """
    def __init__(self, cliente_hcm: "ClienteHcm") -> None:
        self._hcm = cliente_hcm

    def obter(self) -> dict:
        empresas = self._hcm.listar_empresas()
        contratos = self._hcm.listar_contratos()
        return {
            "versaoContrato": "1.0",
            "geradoEm": _agora_iso(),
            "fonte": "HCM",
            "fornecedores": [self._mapear_fornecedor(e) for e in empresas],
            "contratos": [self._mapear_contrato(c) for c in contratos],
        }
    # _mapear_fornecedor / _mapear_contrato: HCM cru → chaves do contrato §2
```

> **Liskov na prática:** o `LeitorDeCadastro` trata as três exatamente igual. Se `FonteHcm` devolver
> algo fora do contrato, quem reprova é a validação (§4) — não há caminho para furar a fronteira.

### 6.4 `FonteExcel` — a carga paliativa por planilha (a fonte usada HOJE)

Enquanto o HCM não expõe endpoint (P-06), a base entra por **planilha carregada pelo usuário**
(decisão deliberada — ver §12). Para o software isso é **só mais uma fonte**: um `LeitorDePlanilha`
traduz as abas para o **mesmo** contrato §2, e nada de Excel passa da fronteira. As **colunas da
planilha = os campos do contrato**; a validação (§4) é quem garante os tipos.

**Contrato da planilha (2 abas):**

| Aba `Fornecedores` | Aba `Contratos` |
|---|---|
| `cod_empresa` · `razao_social` · `nome_fantasia` · `responsavel_legal` · `email` · `cnpj` · `tipo_inscricao` · `ativo` | `cod_empresa` · `cod_contrato` · `nome_contrato` · `data_inicio` · `data_fim` · `valor_mensal` · `empresa_vinculada_codigo` · `empresa_vinculada_nome` · `proporcao_de_recesso` |

```python
# app/services/cadastro/leitor_de_planilha.py
import io
from datetime import datetime
import openpyxl                                   # já está no requirements da CITY API

class LeitorDePlanilha:
    """
    Traduz o .xlsx (abas Fornecedores/Contratos) para o contrato canônico §2.
    Só sabe PLANILHA → dict; validar tipos/campos é do contrato (§4), não daqui.
    """
    def ler(self, conteudo: bytes) -> dict:
        wb = openpyxl.load_workbook(io.BytesIO(conteudo), data_only=True)
        return {
            "versaoContrato": "1.0",
            "geradoEm": datetime.now().astimezone().isoformat(),
            "fonte": "PLANILHA",
            "fornecedores": [self._fornecedor(l) for l in self._linhas(wb, "Fornecedores")],
            "contratos": [self._contrato(l) for l in self._linhas(wb, "Contratos")],
        }
    # _linhas: dict {cabeçalho: valor} por linha preenchida
    # _fornecedor / _contrato: colunas da aba → chaves camelCase do contrato §2

# app/services/fonts/fonte_excel.py — expõe a planilha pela porta FonteDeCadastro
class FonteExcel:
    """Adaptador de arquivo, para o caminho headless (ops). O upload do frontend usa
    o LeitorDePlanilha diretamente sobre os bytes recebidos (§8.1)."""
    def __init__(self, caminho: "Path", leitor: LeitorDePlanilha) -> None:
        self._caminho, self._leitor = caminho, leitor

    def obter(self) -> dict:
        return self._leitor.ler(self._caminho.read_bytes())
```

> O `LeitorDePlanilha` é **compartilhado**: a rota de upload (§8.1) o usa sobre os bytes que chegam do
> frontend, e o `FonteExcel` o usa sobre um arquivo em disco. Um único lugar entende planilha.

---

## 7. O ponto único de troca — `dependencies.py`

Um **registro** (dict) em vez de `if/elif` encadeado: trocar/adicionar fonte é **uma linha**, e não há
`else` (Object Calisthenics regra 2). Este é o arquivo — e o **único** — que você mexe para plugar o HCM.

```python
# app/dependencies.py  (trecho)
from functools import lru_cache
from app.core.config import settings
from app.services.fonts.fonte_json import FonteJsonEstatica
from app.services.fonts.fonte_http import FonteHttpContrato
# from app.services.fonts.fonte_hcm import FonteHcm     # ← descomente quando o HCM ficar pronto
from app.services.interfaces.fonte_de_cadastro import FonteDeCadastro

class FonteNaoConfigurada(Exception): ...

# Registro de fontes. Adicionar fonte = adicionar UMA entrada.
_FONTES: dict[str, "Callable[[], FonteDeCadastro]"] = {
    "JSON": lambda: FonteJsonEstatica(settings.CADASTRO_JSON_PATH),
    "HTTP": lambda: FonteHttpContrato(settings.CADASTRO_URL, settings.CADASTRO_TOKEN),
    "EXCEL": lambda: FonteExcel(settings.CADASTRO_XLSX_PATH, LeitorDePlanilha()),  # carga por arquivo
    # "HCM": lambda: FonteHcm(ClienteHcm(settings.HCM_BASE_URL, settings.HCM_TOKEN)),
}

@lru_cache
def obter_fonte_de_cadastro() -> FonteDeCadastro:
    fabrica = _FONTES.get(settings.FONTE_CADASTRO)   # env: FONTE_CADASTRO=JSON|HTTP|HCM
    if fabrica is None:
        raise FonteNaoConfigurada(settings.FONTE_CADASTRO)
    return fabrica()
```

`.env`:
```
FONTE_CADASTRO=JSON                         # fonte do SYNC headless (JSON | HTTP | EXCEL | HCM)
CADASTRO_JSON_PATH=./seed/cadastro_v1.json
CADASTRO_XLSX_PATH=./seed/cadastro.xlsx     # usado se FONTE_CADASTRO=EXCEL
# FONTE_CADASTRO=HCM                         # um dia — só isto muda
```
> O **upload pelo frontend** (§8.1) **não** depende de `FONTE_CADASTRO`: a rota recebe os bytes e usa o
> `LeitorDePlanilha` direto. `FONTE_CADASTRO` só governa o **sync headless** (arquivo/HTTP/HCM).

---

## 8. Onde isso encaixa no fluxo de sincronização

A ingestão continua sendo o `SincronizarCadastroUseCase` (evolução do sync HCM de `12` §1):

```
FonteDeCadastro.obter()  →  LeitorDeCadastro.ler()  →  LoteDeCadastro (domínio)
        │                          │                          │
   bytes brutos            valida + traduz            upsert idempotente:
 (varia por fonte)         (contrato §4/§5)     FORNECEDOR (e-mail normalizado, único)
                                                CONTRATO   (chave cod_empresa+cod_contrato)
```

Regras da ingestão (herdadas de `06` §9 / `12`):
1. **E-mail normalizado** (`trim`+`lower`) na escrita; único no cadastro (A-14).
2. **Upsert idempotente** — reprocessar o mesmo lote não duplica; some quem sumiu da fonte
   (soft-delete `is_delete`, nunca `DELETE` físico).
3. **Proporção** aplicada conforme §2.4; PJ com N>1 contratos e Σ≠100% entra em **relatório de
   pendência**, não é corrigido no chute.
4. **Transação** por lote; falha de validação **aborta o lote** (não grava meia-sincronização).

> DDL: a tabela `APP.TB_GER_NF_PJ_FORNECEDOR` de `12` §2.1 já serve. Contratos precisam da sua própria
> tabela com `data_inicio`, `data_fim`, `empresa_vinculada_codigo/nome` e `proporcao_recesso DECIMAL(5,2) NULL`
> — DDL proposta no checklist §13.

### 8.1 Carga manual pelo usuário — upload/download (Opção A)

O **upload é feito no frontend pelo próprio usuário** (é assim que a ferramenta é usada enquanto o HCM
não existe). O backend expõe três rotas; a tela é desenhada em
[`frontend/21-carga-base-pj-ui.md`](../frontend/21-carga-base-pj-ui.md).

| Método | Rota | O que faz |
|---|---|---|
| **POST** | `/v2/cadastro/importar` | Recebe o `.xlsx` (multipart), valida, faz upsert, devolve **relatório** |
| GET | `/v2/cadastro/template` | Baixa a **planilha-modelo** vazia (cabeçalhos das 2 abas) |
| GET | `/v2/cadastro/exportar` | Baixa a **base atual** em `.xlsx` (editar em ciclo / auditoria) |

**Fluxo do import** (reusa tudo de §5/§8, só muda a origem dos bytes):
```
UploadFile → LeitorDePlanilha.ler(bytes) → PayloadDeCadastro.model_validate (linha-a-linha)
           → SincronizarCadastroUseCase (upsert idempotente, 1 transação) → RelatorioDeImportacao
```

```python
# app/api/v2/cadastro.py
@router.post("/importar")
async def importar(arquivo: UploadFile = File(...), _=Depends(verify_integration_token)):
    relatorio = importar_cadastro.executar(await arquivo.read())
    return envelope_mutacao(data=relatorio.para_dict())      # envelope padrão (06 §5)
```

**Relatório** (o que a tela mostra):
```json
{ "statusCode": 200, "version": "v2", "accessed_by": "nf-pjs-dashboard",
  "data": {
    "inseridos": 12, "atualizados": 3, "ignorados": 0,
    "erros": [ { "aba": "Contratos", "linha": 7, "campo": "cnpj", "motivo": "deve ter 14 dígitos" } ]
  } }
```

**Regras da carga manual:**
1. **Tudo-ou-nada com relatório completo.** Valida **todas** as linhas e coleta **todos** os erros; se
   houver **qualquer** erro, **não grava nada** e devolve a lista inteira — a pessoa corrige de uma vez.
   (Difere do erro-e-para: numa carga manual, apanhar um erro por vez é péssima UX.)
2. **Idempotente** — subir a mesma planilha 2× não duplica (upsert por chave, `08` §8).
3. **Só perfil administrativo** sobe base — a autorização é **R-04/P-12** (identidade do usuário via
   token; ver `geral/18`). Fase 1 (mock) sem auth.
4. **Σ das proporções por PJ** validada aqui: PJ com N>1 contratos e Σ≠100% vira **erro de linha** no
   relatório (não é "corrigido no chute") — R-17.

> O `template` e o `exportar` são **downloads** — já eram permitidos (a regra proibia Excel de
> *entrada*, não de saída). A mesma planilha que sai do `exportar` volta corrigida pelo `importar`.

---

## 9. SOLID — onde cada letra aparece

| Princípio | Onde |
|---|---|
| **S** — Responsabilidade única | `FonteX` só **obtém bytes**; `LeitorDeCadastro` só **valida+traduz**; `SincronizarCadastroUseCase` só **persiste**. Três motivos de mudança, três classes. |
| **O** — Aberto/Fechado | Nova fonte = nova classe + 1 linha no registro `_FONTES`. Nenhum código existente é tocado. |
| **L** — Liskov | Qualquer `FonteDeCadastro` é substituível: o leitor não distingue JSON de HCM. |
| **I** — Segregação de interface | A porta tem **um** método (`obter`). A fonte não é obrigada a conhecer validação, banco nem domínio. |
| **D** — Inversão de dependência | O caso de uso depende da **abstração** `FonteDeCadastro`; o concreto é injetado em `dependencies.py`. O domínio não importa `httpx` nem o HCM. |

## 10. Object Calisthenics — adaptado ao Python

Segue a mesma disciplina de `15` (frontend), com as adaptações pragmáticas de Python:

| Regra | Como se aplica aqui |
|---|---|
| 1. Um nível de indentação | Métodos curtos; dispatch por dict no lugar de `if/elif` aninhado. |
| 2. Sem `else` | Guard-clauses com `return`/`raise` (ver `LeitorDeCadastro`, `obter_fonte_de_cadastro`). |
| 3. Envolver primitivos | `Cnpj`, `Email`, `Proporcao`, `Competencia` como VOs no domínio — string crua só existe **dentro** do adaptador e do DTO de fronteira. |
| 4. First-class collections | `LoteDeCadastro` encapsula as listas e responde perguntas do domínio. |
| 5. Um ponto por linha | Evitar `payload.contratos[0].empresa_vinculada.nome` espalhado; o VO expõe o que precisa. |
| 6. Não abreviar | `cod_empresa`, não `cod_emp`; `responsavel_legal`, não `resp`. |
| 7. Entidades pequenas | Uma classe por fonte; DTOs enxutos; use cases focados. |
| 8. Adaptada (≤2 atributos*) | *Pragmática:* **DTOs de fronteira são a exceção declarada** — espelham o contrato e podem ter vários campos. A restrição vale para **serviços e VOs de domínio**, que ficam pequenos. |
| 9. Adaptada (getters/setters) | DTOs Pydantic são dados imutáveis de fronteira (sem setters); **VOs de domínio expõem comportamento**, não estado cru. |

> As exceções (regras 8 e 9) são as **mesmas** já documentadas em `15` para o frontend — mantê-las
> alinhadas evita que "SOLID no back" e "SOLID no front" signifiquem coisas diferentes.

---

## 11. Como VOCÊ pluga o HCM depois (passo a passo)

1. Escreva `app/services/fonts/fonte_hcm.py` implementando **um** método: `obter() -> dict`.
   Toda a tradução do HCM cru (`Data_Inico` → `dataInicio`, etc.) mora **só aqui**.
2. Descomente a linha do `FonteHcm` no registro `_FONTES` de `dependencies.py`.
3. Troque `FONTE_CADASTRO=HCM` no `.env`.
4. Rode o sync. Se o HCM emitir algo fora do contrato §2, a validação (§4) **reprova na hora**, com a
   mensagem do campo exato — em vez de gravar cadastro corrompido.

**Nada além disso muda.** Repositórios, motor de recesso, endpoints e frontend não sabem — nem
precisam saber — que a fonte deixou de ser o arquivo JSON.

> Teste recomendado: um **teste de contrato** que roda o payload da `FonteHcm` (capturado do HCM real)
> por `PayloadDeCadastro.model_validate`. É a rede de segurança que garante "o HCM segue o contrato".

---

## 12. Pendências

| ID | Pendência | Situação |
|---|---|---|
| **P-06** | Endpoint/credenciais/campos do HCM | Em debate no Dep. de Sistemas. **Este design não depende disso** para andar: a fonte de hoje é a **planilha** (§6.4/§8.1). |
| **A-30** | Excel como **entrada** | ✅ **Exceção deliberada** (decisão do usuário): permitida **só** para a carga de cadastro (§8.1), enquanto o HCM não expõe endpoint. Não vale para o fluxo transacional de NF. |
| **R-16** | Origem do `responsavelLegal` | Opcional no contrato; mock preenche; HCM define depois. |
| **R-17** | Validação Σ(proporções)=100% por PJ | Vira **erro de linha** no relatório de importação (§8.1); regra de bloqueio a confirmar. |
| **P-12/R-04** | Autorização de quem pode subir base | Só perfil administrativo. Depende da identidade via token (`geral/18`). |
| **D-11** | Nomes de tabela/rota | Confirmar com o owner da CITY API. |

## 13. Checklist de implementação (backend)

- [ ] `PayloadDeCadastro` + DTOs (§4) com `extra="forbid"` e `alias_generator=to_camel`.
- [ ] Porta `FonteDeCadastro` (§3) e `LeitorDeCadastro` com checagem de versão (§5).
- [ ] `LoteDeCadastro` (first-class collection) com `contratos_do()` e `validar_proporcoes()`.
- [ ] Adaptadores `FonteJsonEstatica`, `FonteHttpContrato` e `FonteExcel`; **esqueleto** `FonteHcm`.
- [ ] `LeitorDePlanilha` (§6.4) — `.xlsx` (abas Fornecedores/Contratos) → contrato §2, com `openpyxl`.
- [ ] Registro `_FONTES` + `obter_fonte_de_cadastro()` em `dependencies.py`; `FONTE_CADASTRO` no `.env`.
- [ ] `seed/cadastro_v1.json` espelhando os mocks do frontend (incl. PJ 40%/60% e casos de `07` §4).
- [ ] DDL da tabela de contrato com `proporcao_recesso DECIMAL(5,2) NULL` e `data_inicio/fim DATE`.
- [ ] `SincronizarCadastroUseCase`: upsert idempotente, e-mail normalizado, soft-delete, transação/lote.
- [ ] **Rotas `/v2/cadastro/importar` · `/template` · `/exportar`** (§8.1) com `RelatorioDeImportacao`.
- [ ] Import **tudo-ou-nada** com relatório de erros por linha (aba/linha/campo/motivo); só admin (P-12).
- [ ] Aplicação da regra de proporção §2.4 + Σ≠100% como erro de linha no relatório.
- [ ] Teste de contrato validando o payload da fonte contra `PayloadDeCadastro`.
- [ ] Confirmar nomes de tabela/rota com o owner (D-11).
