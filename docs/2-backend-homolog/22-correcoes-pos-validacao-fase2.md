---
titulo: Correções Pós-Validação — Fase 2 (api-city)
dominio: backend
fase: 2
tags: [correcoes, backend, api-city, governanca, nomenclatura, solid, object-calisthenics, bugfix, is-delete, tudo-ou-nada, microsoft-graph]
status: normativo-para-implementacao
---

# Correções Pós-Validação — Fase 2 (api-city)

> **Contexto que muda como você lê este documento.** A Fase 2 **não é um serviço novo**: é um
> **conjunto de features dentro de uma API já existente e em produção** (`api-city`), que atende
> **vários domínios de negócio** (Mapão, Deals, RH, Empreendimentos, Distratos…) e já segue
> convenções de **SOLID** e **Object Calisthenics**. Isso muda o padrão de exigência de duas formas
> concretas:
>
> 1. **Nomes importam tanto quanto comportamento.** Um arquivo ou rota mal nomeado nesta API não é
>    só "feio" — ele **quebra a navegabilidade** de quem vai dar manutenção nela daqui a um ano sem
>    ter lido nenhuma linha dos docs do nf-pjs. O nome **é** a documentação que sobrevive.
> 2. **Convenção já estabelecida > convenção nova.** Não se inventa um padrão de nomenclatura para
>    a feature nova; **se descobre o padrão que já existe** nos outros domínios da API e se segue
>    ele. Este documento faz esse levantamento antes de prescrever qualquer nome.
>
> Este documento **não é um resumo de `.md` anteriores** — é o resultado de uma auditoria real do
> código em `api-city/` (branch `homolog`, não commitado), comparado linha a linha com os docs
> normativos (`06`, `12`, `19`, `4-automacao-email/20`) e com os testes rodados de fato
> (`pytest` → 7 passed, confirmado independentemente). Três defeitos de comportamento e um problema
> de governança de nomes foram encontrados. Nenhum é cosmético.

---

## 1. Nomenclatura — por que nem `cadastro.py` nem `notas_fiscais_base_pj.py` são o nome certo

> **Esta seção passou por duas revisões.** A primeira trocou `cadastro.py`/`/v2/cadastro` por
> `notas_fiscais_base_pj.py`/`/v2/notas-fiscais/base-pj`. Essa correção **também estava errada**, e
> foi o próprio usuário quem apontou o motivo (registrado aqui por transparência, §1.3): nomear o
> recurso pelo primeiro consumidor que o implementou, em vez de pelo dado que ele realmente é.

### 1.1 O que a API já faz (evidência, não opinião)

Levantamento de `app/api/v2/*.py` e dos prefixos registrados em `main.py`:

| Arquivo existente | Prefixo de rota | Domínio de negócio |
|---|---|---|
| `empreendimentos.py` | `/v2/empreendimentos` | Empreendimentos |
| `contratos.py` | `/v2/contratos` | **Distratos de venda (UAU)** — confirmado por leitura direta do arquivo: só contém rotas `/distratos`, nada de compra/fornecedor/SharePoint |
| `calculos.py` | `/v2/calculos` | Cálculos financeiros |
| `tipologias.py` | `/v2/tipologias` | Tipologias de unidade |
| `rh.py` | `/v2/rh` | Recursos Humanos |
| `mapao.py` | `/v2/mapao` | Mapão |
| `deals.py` | `/v2/deals` | Deals |
| `planejamento/prevision/medicoes.py` | `/v2/planejamento/prevision/medicoes` | Medições (aninhado por ser sub-produto) |
| `notas_fiscais.py` | `/v2/notas-fiscais` | Acompanhamento de notas fiscais (consumidor do cadastro, não dono dele) |

**Sem exceção**, todo arquivo é nomeado pelo **substantivo do domínio de negócio que ele possui**.
Nenhum é nomeado por um verbo genérico de CRUD (`cadastro`) — mas também nenhum empresta o nome de
outro domínio que apenas o consome.

### 1.2 Por que `notas_fiscais_base_pj` também estava errado

A base de **prestadores PJ** (fornecedor + contrato) não é um dado de notas fiscais — é um dado que
**notas fiscais consome**, do mesmo jeito que **recesso também consome**. Colocar `base-pj` dentro
de `/v2/notas-fiscais/...` amarra esse cadastro ao primeiro consumidor que o usou, exatamente como
`/v2/cadastro` estava solto demais na raiz — os dois erros têm a mesma causa: **nomear pela feature
que pediu o dado, em vez de nomear pelo dono do dado.**

A modelagem correta trata o **prestador** como o **agregado raiz** (é ele quem existe
independentemente), e notas-fiscais/recesso como **sub-recursos** dele — o mesmo padrão que
`empreendimentos` já usa para tipologias/unidades. Um agregado compartilhado por N features não
pertence a nenhuma delas; ele tem rota própria, e as features que o usam expõem **visão aninhada**
por prestador (`/prestadores/{id}/notas-fiscais`) além da **visão de painel** (`/notas-fiscais`).

### 1.3 Origem dos dois erros (transparência)

Ambos os nomes anteriores (`/v2/cadastro` e depois `/v2/notas-fiscais/base-pj`) vieram do meu
próprio doc `19` — o agente implementador seguiu fielmente o que estava especificado. A correção
final abaixo nasceu de uma objeção do usuário, que identificou a raiz do problema (nomear pelo
consumidor, não pelo dono do dado) e propôs a árvore de recursos completa usada em §1.6.

### 1.4 Árvore de rotas corrigida

```
/v2
├── /prestadores                            (agregado raiz: fornecedor PJ + contrato)
│   ├── POST /importacao
│   ├── GET  /template
│   ├── GET  /exportacao
│   │
│   └── /{id_prestador}
│       ├── GET       /notas-fiscais        (visão do prestador — notas dele)
│       ├── GET, POST /recessos             (visão do prestador — histórico/lançamento)
│
├── /notas-fiscais                          (visão de painel — todos os prestadores)
│   ├── GET  /
│   └── GET  /status, /status/resumo        (já existe — 12 §3.3)
│
└── /recessos                               (visão de painel — todos os prestadores)
    ├── GET   /                             (filtros: ?situacao=&mes=)
    └── PATCH /{id_recesso}/situacao
```

- **`prestadores`** é o termo de negócio para PJ (mesmo vocabulário do domínio, evita "PJ" como
  sigla técnica na URL pública).
- **`recessos`** é o termo de negócio para o módulo de leave/férias (já usado nos docs de domínio).
- **Sem rota de sincronização.** A árvore anterior desta seção tinha um `POST
  /notas-fiscais/sincronizacao`, presumindo que a City API precisasse expor um endpoint próprio para
  disparar a leitura do Tomticket. **Não precisa.** A integração (`03-integracao-tomticket.md` §1/§7)
  já é a City API **consultando diretamente** a rota de busca de chamados do próprio Tomticket
  (`ITomticketGateway.listarChamadosNF`) — de dentro de um job/worker interno (mesmo padrão do
  `app/workers/alertas_scheduler.py`, `20`), não de uma rota pública da API. Não há webhook do
  Tomticket para a City API, e não há necessidade de a City API expor rota nenhuma para isso: é
  puramente processo interno chamando o Tomticket.
- A carga de cadastro (importação/exportação de planilha) fica em `/prestadores` porque é o CRUD do
  agregado raiz — não uma feature de notas fiscais nem de recesso.

### 1.5 Tabela de renomeação (aplicar em `api-city`)

| # | Nome atual | Nome correto | Motivo |
|---|---|---|---|
| 1 | `app/api/v2/cadastro.py` | `app/api/v2/prestadores.py` | Nomeado pelo agregado raiz que o arquivo possui (fornecedor+contrato PJ), não pelo primeiro consumidor |
| 1 | rota `/v2/cadastro/*` | `/v2/prestadores/*` | Ver árvore §1.4 |
| 2 | `app/services/status_service.py` | `app/services/notas_fiscais_status_service.py` | Outros services já são domínio-prefixados (`deal_service.py`, `import_nf_lancado_use_case.py`); `status` sozinho é ambíguo numa API com N domínios que têm "status" (deal, mapão…) |
| 3 | `app/worker/scheduler.py` | `app/workers/alertas_scheduler.py` | (a) `app/workers/` plural é o que o **próprio doc `20` §6.2 já especifica** (`app/workers/alertas.py`); a pasta singular `app/worker/` é nova e não corresponde a nada existente. (b) `scheduler.py` sozinho não diz qual régua ele agenda — o nome deve dizer "alertas". |

> **Nota de escopo:** os módulos internos `app/services/interfaces/fonte_de_cadastro.py`,
> `app/services/schemas/contrato_cadastro.py` e o subpacote `app/services/cadastro/` (doc `19` §3–7)
> **não** precisam mudar agora — não são resource-facing (não viram URL), já vivem dentro de um
> subpacote nomeado, e o risco de confusão é muito menor que o de um arquivo de rota. Alinhar esses
> nomes também é bem-vindo, mas não é bloqueante como os itens 1–3.

### 1.6 Checklist de renomeação

- [ ] Mover `app/api/v2/cadastro.py` → `app/api/v2/prestadores.py`.
- [ ] Em `main.py`: import `from app.api.v2 import prestadores as prestadores_v2`; trocar
      `prefix="/v2/cadastro"` → `prefix="/v2/prestadores"`; renomear a tag Swagger para
      `"Prestadores"` (ou `"Prestadores PJ"`), consistente com o novo agregado.
- [ ] Se `app/api/v2/notas_fiscais.py` for expor `GET /v2/prestadores/{id}/notas-fiscais` e
      `app/workers/alertas_scheduler.py`/rota de recesso expuser `/v2/prestadores/{id}/recessos`,
      registrar essas sub-rotas como **routers próprios com prefixo aninhado**
      (`APIRouter(prefix="/prestadores/{id_prestador}")`), não como métodos soltos dentro de
      `prestadores.py` — cada domínio (notas-fiscais, recesso) continua dono da sua lógica; só a
      URL é que fica aninhada sob o agregado.
- [ ] Mover `app/services/status_service.py` → `app/services/notas_fiscais_status_service.py`;
      atualizar o import em `app/dependencies.py` (`get_status_service`) e em
      `app/api/v2/notas_fiscais.py`.
- [ ] Mover `app/worker/scheduler.py` → `app/workers/alertas_scheduler.py` (criar `app/workers/`,
      apagar `app/worker/` vazio); atualizar o import em `tests/test_worker.py`
      (`from app.workers.alertas_scheduler import ...`) e em qualquer lugar que o referencie.
- [ ] Renomear `tests/test_worker.py` → `tests/test_alertas_scheduler.py` (mesmo motivo: nome do
      teste deve dizer o que testa, não o mecanismo genérico "worker").
- [ ] Rodar a suíte completa depois da renomeação (`pytest`) — deve continuar `7 passed`.

---

## 2. Defeito — Filtro de soft-delete é um no-op (repetido 6×)

### 2.1 O bug

Em `app/services/status_service.py` (3 ocorrências) e `app/worker/scheduler.py` (3 ocorrências), o
filtro usado é:

```sql
WHERE (is_delete IS NULL OR is_delete != '_deleted')
```

`is_delete` guarda um **booleano True** quando soft-deletado (`is_delete = True`,
ver `prestadores.py`), **nunca** a string literal `'_deleted'`. Logo,
`is_delete != '_deleted'` é **sempre verdadeiro** para qualquer valor — a cláusula
inteira equivale a `WHERE TRUE`, e um contrato ou fornecedor soft-deletado **continua aparecendo**
em toda consulta que usa esse padrão: no Left Join de status (`status_service.py`), e na
elegibilidade de alertas (`scheduler.py`).

A doc normativa (`12` §4, `06` §9.3) é direta: `WHERE is_delete = 0`.

### 2.2 O fix

Substituir, nos dois arquivos (6 ocorrências), `(x.is_delete IS NULL OR x.is_delete != '_deleted')`
por `x.is_delete = 0`:

```sql
-- status_service.py — antes (3 ocorrências)
AND (f.is_delete IS NULL OR f.is_delete != '_deleted')
WHERE (pj.is_delete IS NULL OR pj.is_delete != '_deleted')
AND (c.is_delete IS NULL OR c.is_delete != '_deleted')

-- depois
AND f.is_delete = 0
WHERE pj.is_delete = 0
AND c.is_delete = 0
```

```sql
-- scheduler.py (renomeado para alertas_scheduler.py) — antes (3 ocorrências)
WHERE (pj.is_delete IS NULL OR pj.is_delete != '_deleted')
AND (c.is_delete IS NULL OR c.is_delete != '_deleted')
AND (r.is_delete IS NULL OR r.is_delete != '_deleted')

-- depois
WHERE pj.is_delete = 0
AND c.is_delete = 0
AND r.is_delete = 0
```

### 2.3 Checklist

- [ ] Substituir as 6 ocorrências (3 + 3) nos dois arquivos.
- [ ] Adicionar um teste que **falharia** com o bug antigo: criar um fornecedor/contrato com
      `is_delete` definido como True e afirmar que ele **não**
      aparece no resultado de `obter_status_competencia` / `executar_processamento_alertas`. Os
      testes atuais (`test_notas_fiscais.py`, `test_worker.py`) não cobrem isso — todos os mocks
      usados não têm nenhuma linha soft-deletada no dataset.

---

## 3. Defeito — Regra "tudo-ou-nada" da importação não é respeitada

### 3.1 O bug

`19` §8.1, regra 1, é explícita: **"valida todas as linhas e coleta todos os erros; se houver
qualquer erro, não grava nada"**.

Em `app/api/v2/cadastro.py` (renomear para `prestadores.py`), a função `importar_cadastro`
processa fornecedores (linhas ~52–81) e contratos (linhas ~95–134) **gravando no banco a cada
linha, dentro do mesmo loop que valida** (`ds_fornecedor.create(...)`, `ds_contrato.update(...)`).
Só **depois** dos dois loops o código verifica `if erros:` (linha 137) e aborta com `422`.

**Consequência real:** se a planilha tem 50 linhas e a linha 40 tem um CNPJ inválido, as **linhas
1–39 já foram gravadas** no banco antes do 422 ser lançado. A regra "nada é gravado" é falsa na
prática — e o usuário, vendo o erro 422, acredita que nada aconteceu.

### 3.2 O fix

Separar em **duas fases**: (1) validar tudo sem tocar no banco, coletando os `erros`; (2) só se
`erros` estiver vazio, aplicar as escritas.

```python
# app/api/v2/prestadores.py — versão corrigida (esboço)

@router.post("/importacao", response_model=dict)
async def importar_cadastro(
    arquivo: UploadFile = File(...),
    ds_fornecedor: IDataSource = Depends(get_datasource(table_name="APP.TB_GER_NF_PJ_FORNECEDOR")),
    ds_contrato: IDataSource = Depends(get_datasource(table_name="APP.TB_GER_NF_PJ_CONTRATO")),
    token_payload: dict = Depends(verify_integration_token)
):
    if not arquivo.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Arquivo inválido. O formato deve ser exclusivamente .xlsx")

    conteudo = await arquivo.read()
    wb = openpyxl.load_workbook(filename=io.BytesIO(conteudo), data_only=True)
    if "Fornecedores" not in wb.sheetnames or "Contratos" not in wb.sheetnames:
        raise HTTPException(status_code=400, detail="Planilha inválida. As abas 'Fornecedores' e 'Contratos' são obrigatórias.")

    # ---- FASE 1: só valida, NENHUMA escrita no banco ----
    erros: list[dict] = []
    fornecedores_validos = _validar_fornecedores(wb["Fornecedores"], erros)
    contratos_validos = _validar_contratos(wb["Contratos"], erros)

    if erros:
        # Nada foi tocado no banco até aqui — a regra "não grava nada" agora é verdadeira de fato.
        raise HTTPException(
            status_code=422,
            detail={"mensagem": "Erros de validação encontrados na planilha. Nada foi gravado.", "erros": erros}
        )

    # ---- FASE 2: só roda se erros == [] — agora sim grava, em uma única passada ----
    resumo_fornecedores = _upsert_fornecedores(ds_fornecedor, fornecedores_validos)
    resumo_contratos = _upsert_contratos_com_soft_delete(ds_contrato, contratos_validos)

    return {
        "status": "sucesso",
        "version": "v2",
        "accessed_by": token_payload.get("sub", "nf-pjs-dashboard"),
        "data": {
            "fornecedores": resumo_fornecedores,
            "contratos": resumo_contratos,
            "ignorados": 0,
            "erros": []
        }
    }
```

> **Nota de arquitetura (Object Calisthenics — poucos níveis de indentação, um motivo de mudança por
> função):** extrair `_validar_fornecedores`, `_validar_contratos`, `_upsert_fornecedores` e
> `_upsert_contratos_com_soft_delete` como funções/métodos próprios, não deixar tudo dentro do
> handler da rota. O handler deve **orquestrar** (ler arquivo → validar → decidir → persistir →
> responder), não conter a lógica de linha-a-linha. Isso também resolve o `max-lines-per-function`
> que a função atual certamente estoura.

> **Idealmente, envolver a fase 2 numa transação real** (`BEGIN`/`COMMIT` no hook de SQL Server) —
> mesmo com a validação prévia eliminando o cenário mais comum de gravação parcial, uma falha de
> rede/conexão no meio da fase 2 ainda deixaria o banco inconsistente. Se o `IDbHook` atual não
> expõe transação, registrar como pendência (não bloqueia este fix, mas deve ficar sinalizado).

### 3.3 Checklist

- [ ] Reestruturar `importar_cadastro` em validar-tudo → decidir → gravar-tudo (nunca intercalado).
- [ ] Extrair as 4 funções auxiliares citadas acima (ou equivalentes), respeitando 1 nível de
      indentação por função (`frontend/15` / disciplina Object Calisthenics já usada no projeto).
- [ ] Novo teste: planilha com erro **na última linha de Contratos**, após várias linhas válidas de
      Fornecedores e Contratos — afirmar que **nenhum** `create`/`update` foi chamado (usar
      `mock_hook.run.assert_not_called()` ou equivalente). Este é o teste que o bug atual reprovaria.
- [ ] Sinalizar como pendência separada se `IDbHook` não suporta transação real (não bloqueia o fix
      acima, que já resolve o caso comum).

---

## 4. Defeito — E-mail por SMTP puro, contradizendo o design (Microsoft Graph)

### 4.1 O bug

`docs/4-automacao-email/20-scheduler-de-alertas.md` §4.1 é categórico:

> **"A City não tem SMTP** (`05` §7); o envio usa **Graph `/sendMail`** com o token client-credentials
> que o `EntraConnection` já obtém."

`app/worker/scheduler.py` (renomear para `alertas_scheduler.py`), método `enviar_email_o365`, usa
`smtplib` puro contra `smtp.office365.com` com usuário/senha em variável de ambiente — o oposto do
que o design manda, e uma segunda credencial (usuário+senha SMTP) que a City **não tem** e cuja
existência o próprio doc já descarta.

**Agravante de segurança/correção:** quando `SMTP_PASSWORD` não está configurado (é o caso hoje —
nenhuma credencial Graph nem SMTP existe ainda, `P-08` em aberto), a função **retorna `True`**
incondicionalmente (linhas 108–110). Isso significa que, no estado atual, `AlertWorker` **grava
"sucesso" na tabela `TB_GER_NF_PJ_ALERTA` para e-mails que nunca foram enviados**. Pela regra de
idempotência (`05` §5, `4-automacao-email/20` §7), esse falso-positivo é **irreversível**: uma vez
gravado, o PJ nunca mais vai ser considerado elegível para aquela régua — mesmo que o e-mail de
verdade nunca tenha saído.

### 4.2 O fix

Trocar o transporte por Graph, exatamente como o `20` §4.1 já especifica, **e** trocar o fallback
silencioso por uma falha explícita (nunca fingir sucesso):

```python
# app/services/connections/graph_email_sender.py  (novo arquivo — ver 20 §4.1)
import httpx
from app.services.connections.entra_connection import EntraConnection

class EnvioFalhou(Exception):
    """O envio não completou — o chamador NÃO deve marcar como enviado."""

class GraphEmailSender:
    """Envia via Microsoft Graph /sendMail, reusando o token do EntraConnection já existente."""
    def __init__(self, remetente: str) -> None:
        self._remetente = remetente  # ALERTAS_REMETENTE (P-08)

    def enviar(self, destinatario: str, assunto: str, corpo_html: str) -> None:
        with EntraConnection() as entra:
            resposta = httpx.post(
                f"https://graph.microsoft.com/v1.0/users/{self._remetente}/sendMail",
                headers={"Authorization": f"Bearer {entra.access_token}"},
                json={
                    "message": {
                        "subject": assunto,
                        "body": {"contentType": "HTML", "content": corpo_html},
                        "toRecipients": [{"emailAddress": {"address": destinatario}}],
                    },
                    "saveToSentItems": True,
                },
                timeout=30,
            )
            if resposta.status_code >= 400:
                raise EnvioFalhou(f"Graph {resposta.status_code}: {resposta.text[:300]}")
```

```python
# app/workers/alertas_scheduler.py — AlertWorker recebe o sender por injeção (porta), não o constrói

class AlertWorker:
    def __init__(self, ds_fornecedor, ds_recepcao, ds_alerta, email_sender: "EmailSender") -> None:
        self.ds_fornecedor = ds_fornecedor
        self.ds_recepcao = ds_recepcao
        self.ds_alerta = ds_alerta
        self._email_sender = email_sender          # porta — nunca smtplib direto aqui dentro

    def executar_processamento_alertas(self, hoje: date | None = None) -> list[dict]:
        ...
        for pj in elegiveis:
            try:
                self._email_sender.enviar(pj["email"], assunto, corpo_html)
            except EnvioFalhou as erro:
                logging.warning("Falha ao enviar alerta %s para %s: %s", regra, pj["email"], erro)
                continue                              # NÃO grava — a tarde retenta (05 §3)
            self.ds_alerta.create({...})               # só grava em caso de sucesso real
            disparados.append({...})
        return disparados
```

> **Por que isso também é uma correção de SOLID/Object Calisthenics, não só de infraestrutura:** o
> `AlertWorker` **conhecendo `smtplib`, host, porta e credenciais SMTP** é uma violação de
> Responsabilidade Única — o worker deveria saber **elegibilidade + registro**, não **protocolo de
> e-mail**. Isolar isso na porta `EmailSender`/`GraphEmailSender` (exatamente como o `20` §4 já
> desenha) devolve o worker à sua única responsabilidade e torna o envio **testável com um mock da
> porta**, sem `smtplib` real em teste nenhum.

- [ ] Nunca reintroduzir um `return True` sem tentativa real de envio — se não há como enviar
      (config ausente), **falhar explicitamente** (log + não gravar), nunca fabricar sucesso.

### 4.3 Configuração necessária (retomando `20` §9 — ainda pendente, P-08)

```
ENTRA_TENANT_ID=...       # já existe no api-city
ENTRA_CLIENT_ID=...       # já existe
ENTRA_CLIENT_SECRET=...   # já existe
ALERTAS_REMETENTE=notas-pj@cityinc.com.br   # NOVO — caixa remetente Graph, ver P-08
```

> **Pré-requisito de permissão App Registration:** `Mail.Send` (Application) no Graph + caixa
> remetente licenciada. Sem isso, `GraphEmailSender` levanta `EnvioFalhou` com `403` — o worker
> loga e **não** marca como enviado, que é o comportamento correto enquanto `P-08` não é resolvida
> (diferente do comportamento atual, que mascara a ausência de configuração como sucesso).

### 4.4 Checklist

- [ ] Criar `app/services/connections/graph_email_sender.py` (`GraphEmailSender` + `EnvioFalhou`).
- [ ] `AlertWorker` passa a receber `email_sender` por construtor (porta), remover `smtplib`,
      `enviar_email_o365` e as variáveis `SMTP_*` do worker.
- [ ] `.env`: adicionar `ALERTAS_REMETENTE`; remover `SMTP_SERVER`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`
      se não forem usados em nenhum outro lugar da API.
- [ ] Atualizar `tests/test_worker.py` (renomear para `test_alertas_scheduler.py`) para injetar um
      `EmailSender` mock (`MagicMock` com `.enviar`), não mais depender do fallback de "sem senha
      retorna True".
- [ ] Novo teste: `email_sender.enviar` levanta `EnvioFalhou` → afirmar que `ds_alerta.create` **não**
      foi chamado (prova de que falha não vira falso-positivo).

---

## 6. Adendo (2026-07-29) — validação da aplicação em `api-city` e 2 pendências novas

> **Contexto.** Uma sessão separada aplicou as correções deste documento contra `api-city`
> (branch `homolog`). Esta seção é o resultado de **validar esse trabalho** linha a linha, não um
> resumo do que foi pedido — 3 dos 4 itens originais (§1–§4) estão corretos e testados; restam
> **duas pendências reais**, uma delas um bug que **nunca chegou a entrar** neste documento (falha
> minha na primeira redação, não do agente que implementou).

### 6.1 O que já está correto (não refazer)

| Item (deste doc) | Status em `api-city` | Evidência |
|---|---|---|
| §2 — Filtro `is_delete` (6×) | ✅ Corrigido | `notas_fiscais_status_service.py` e `alertas_scheduler.py`: todas as 6 ocorrências são `IS NULL` puro |
| §3 — Tudo-ou-nada na importação | ✅ Corrigido | `notas_fiscais_base_pj.py`: fase de validação não grava nada; `test_importar_cadastro_tudo_ou_nada_com_erro_nao_grava` cobre o cenário |
| §4 — SMTP → Graph | ✅ Corrigido | `graph_email_sender.py`: `GraphEmailSender` sem fallback silencioso, falha explícita via `EnvioFalhou`; `test_executar_processamento_alertas_falha_de_envio_nao_grava_banco` prova que falha não grava falso-positivo |
| §1 — Rename `status_service.py` → `notas_fiscais_status_service.py` | ✅ Corrigido | Arquivo e imports em `dependencies.py` já refletem o nome novo |
| §1 — Rename `worker/scheduler.py` → `workers/alertas_scheduler.py` | ✅ Corrigido | `app/workers/alertas_scheduler.py` existe; `app/worker/` (singular) não existe mais |

Suíte completa rodada de novo, independentemente: `pytest tests/test_notas_fiscais.py
tests/test_notas_fiscais_base_pj.py tests/test_alertas_scheduler.py -v` → **9 passed**.

### 6.2 Pendência 1 — nomenclatura ficou na versão intermediária, não na final

Este documento (§1) passou por **duas** revisões de nome antes de estabilizar (histórico completo em
`19` §8.1 e neste doc §1.1–§1.3): `cadastro.py`/`/v2/cadastro` → (revisão 1) `notas_fiscais_base_pj.py`/
`/v2/notas-fiscais/base-pj` → (revisão 2, **final**) `prestadores.py`/`/v2/prestadores`, esta última
motivada pela observação de que a base de prestadores é um **agregado raiz compartilhado** por
notas-fiscais e recesso, não uma propriedade de notas-fiscais.

O trabalho aplicado em `api-city` implementou a **revisão 1** (`app/api/v2/notas_fiscais_base_pj.py`,
prefixo `/v2/notas-fiscais/base-pj`) — provavelmente porque a implementação começou antes da revisão 2
ser commitada nos docs. **Isso não é um bug de comportamento** (a rota funciona, os testes passam),
é uma **dívida de nomenclatura** que, se não for fechada agora, vira a mesma armadilha que motivou
todo este documento: o próximo agente lê `api-city` sem saber que o nome já mudou de novo.

**Correção — renomear em `api-city`:**

| # | Nome atual (revisão 1) | Nome final (revisão 2) |
|---|---|---|
| 1 | `app/api/v2/notas_fiscais_base_pj.py` | `app/api/v2/prestadores.py` |
| 2 | rota `/v2/notas-fiscais/base-pj/*` | `/v2/prestadores/*` |
| 3 | endpoint `POST /importar` | `POST /importacao` (ver árvore completa em §1.4) |
| 4 | tag Swagger `"Notas Fiscais PJ — Base"` | `"Prestadores"` (ou `"Prestadores PJ"`) |
| 5 | `tests/test_notas_fiscais_base_pj.py` | `tests/test_prestadores.py` |

**Checklist:**
- [ ] `git mv app/api/v2/notas_fiscais_base_pj.py app/api/v2/prestadores.py`.
- [ ] No arquivo: renomear a função `importar_base_pj` → `importar_prestadores` (opcional, mas
      consistente); trocar a rota do endpoint de `@router.post("/importar", ...)` para
      `@router.post("/importacao", ...)`.
- [ ] Em `main.py`: import `from app.api.v2 import prestadores as prestadores_v2`; trocar
      `prefix="/v2/notas-fiscais/base-pj"` → `prefix="/v2/prestadores"`; trocar a tag.
- [ ] `git mv tests/test_notas_fiscais_base_pj.py tests/test_prestadores.py`; ajustar os `import` e
      as URLs chamadas nos testes (`/importar` → `/importacao`).
- [ ] Rodar a suíte — deve continuar `9 passed` (agora com o nome/rota corretos).
- [ ] Nenhuma mudança de comportamento é esperada — é rename + endpoint path, não lógica nova.

### 6.3 Pendência 2 — envelope `accesed_by`/`accessed_by` trocado nos endpoints GET (bug novo, não estava neste doc)

`docs/2-backend-homolog/06-backend-api.md` §5 é normativo e explícito: **GET usa `accesed_by`**
(um só "s" — grafia legada intencional, não é erro de digitação a corrigir) e **mutações usam
`accessed_by`** (dois "s"). É uma convenção estranha, mas é a que a CITY API já usa em produção —
"seguir o existente para não quebrar contratos" (`06` §5).

`app/api/v2/notas_fiscais.py` usa `"accessed_by"` (dois "s") nos **dois** endpoints GET:
`GET /status` e `GET /status/resumo`. Isso diverge do contrato de envelope que o resto da API
(e o próprio `12` §3.3) espera de uma rota GET.

> **Por que isso não foi pego antes:** este bug foi identificado na validação original do
> walkthrough (antes deste documento existir), mas **não entrou na lista de correções** quando o
> documento foi escrito — omissão do autor deste doc, não do agente que implementou `api-city`. Os
> testes (`tests/test_notas_fiscais.py`) não afirmam a chave do envelope, então não pegaram a
> divergência.

**Fix:**
```python
# app/api/v2/notas_fiscais.py — nos dois GET (/status e /status/resumo)
return {
    "status": "sucesso",
    "version": "v2",
    "accesed_by": token_payload.get("sub", "nf-pjs-dashboard"),   # era "accessed_by" — corrigido
    "data": { ... }
}
```

**Checklist:**
- [ ] Trocar `"accessed_by"` → `"accesed_by"` nos dois `return` de `notas_fiscais.py` (GET apenas —
      **não** mexer em nenhum endpoint de mutação, que deve continuar `accessed_by`).
- [ ] Novo teste (ou ajuste dos existentes) em `tests/test_notas_fiscais.py`: afirmar
      `response.json()["accesed_by"] == ...` em `test_status_endpoint_com_sucesso` e
      `test_status_resumo_endpoint`, para que uma regressão futura seja pega automaticamente.
- [ ] Conferir se `app/api/v2/prestadores.py` (pós-rename de §6.2) usa `accessed_by` corretamente —
      é **mutação** (POST/GET de download conta como leitura simples, mas o `importar`/`importacao`
      é `POST`, então segue `accessed_by`; já está certo, só confirmar que o rename não mudou isso).

---

## 7. Resumo executivo (para quem só quer a lista)

| # | Item | Severidade | Status |
|---|---|---|---|
| 1 | Renomear `cadastro.py`/`/v2/cadastro` → `prestadores.py`/`/v2/prestadores` (agregado raiz, árvore §1.4) | Governança | ⚠️ Aplicado até a revisão intermediária — falta a §6.2 |
| 1 | Renomear `status_service.py`, `app/worker/` | Governança | ✅ Feito |
| 2 | Filtro `is_delete` é no-op (6×) | 🔴 Alta | ✅ Feito |
| 3 | Import não é tudo-ou-nada de fato | 🔴 Alta | ✅ Feito |
| 4 | E-mail por SMTP em vez de Graph, com falso-positivo sem credencial | 🔴 Alta (prod) / Média (homolog) | ✅ Feito |
| 5 | Envelope `accessed_by` errado nos GET de `/status` (§6.3) | 🟡 Média | ❌ Pendente |

Recomendação inalterada: cada correção nova (§6.2, §6.3) deve vir **com** o teste de regressão que
prova o defeito — não depois. Antes desta rodada de validação, os 3 defeitos de comportamento
originais (§2–§4) já tinham entrado corrigidos **com** teste; mantenha o padrão.
