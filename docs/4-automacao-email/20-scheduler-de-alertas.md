---
titulo: Scheduler de Alertas — Worker de disparo de e-mails (design)
dominio: backend
fase: 2
tags: [backend, city-api, worker, scheduler, airflow, apscheduler, alertas, email, graph, office365, solid, object-calisthenics, idempotencia]
status: normativo-para-implementacao
---

# Scheduler de Alertas — Worker que dispara os e-mails

> **O que este documento resolve.** `05-automacao-alertas.md` fixa **as regras** (D-3/D/D+1/D+3,
> elegibilidade, idempotência, Office 365). Falta o **como**: a arquitetura do **worker que dispara os
> e-mails** e do **scheduler que o aciona**. Este doc desenha isso, ancorado nos padrões **que já
> existem na CITY API** (`EntraConnection`, `AirflowClient`, Repository/DI).

> **Não repete** as regras de `05` — só as consome. Segue a disciplina SOLID + Object Calisthenics de
> `frontend/15` e `backend/19`.

---

## 1. Princípio: separar "o que roda" de "quem dispara"

O erro comum é acoplar a lógica de alerta ao mecanismo de agendamento (um `while True: sleep()` ou um
DAG cheio de regra de negócio). Aqui os dois são **camadas distintas**:

```
┌─────────────────────────────┐        aciona        ┌──────────────────────────────────────┐
│  SCHEDULER (quem dispara)    │  ───────────────►    │  WORKER (o que roda)                  │
│  — Airflow DAG (recomendado) │   2x/dia, UTC-3      │  DispararAlertasDoDia.executar(comp)  │
│  — APScheduler (alternativa) │                      │  (regra do dia → elegíveis → envio)   │
│  — cron / CLI manual         │                      └──────────────────────────────────────┘
└─────────────────────────────┘                                     │ usa portas
                                                                     ▼
                              EmailSender(Graph) · Repositórios(SQL) · Relógio · Templates
```

- **O worker não sabe quem o chamou.** Airflow, APScheduler, cron ou um teste chamam o **mesmo**
  `executar()`. Isso **resolve a pendência D-12** ("quem dispara?"): a resposta deixa de ser única —
  o gatilho é um **adaptador plugável**, e a escolha não contamina a lógica.
- **A API não hospeda o scheduler** (decisão de `06` §6). O worker é um **módulo/CLI** executável;
  o agendamento vive **fora** (Airflow).

---

## 2. Por que Airflow como scheduler (e não um processo com APScheduler)

A CITY API **já dispara DAGs** do Airflow (`app/services/airflow_client.py`, usado em `api/v2/mapao.py`).
Reaproveitar isso é mais barato e mais observável que introduzir um processo novo:

| Critério | **Airflow DAG** (recomendado) | APScheduler (processo dedicado) |
|---|---|---|
| Infra | **Já existe** e é operada | Novo processo long-running p/ manter vivo |
| Observabilidade | UI, logs, retries, alertas de falha **prontos** | Você constrói |
| Retry manhã/tarde | 2 schedules no DAG (`cron`) | Você agenda 2 jobs |
| Fuso UTC-3 | Nativo no DAG (`timezone`) | Manual |
| Fallback local/dev | — | Bom p/ rodar sem Airflow |

> **Recomendação:** **Airflow** como gatilho de produção; **APScheduler** fica documentado como
> adaptador alternativo (dev/local ou caso a operação prefira um worker autocontido). Como o worker é
> agnóstico ao gatilho (§1), trocar um pelo outro **não altera** a lógica.

---

## 3. O worker (o que roda) — caso de uso

`DispararAlertasDoDia` orquestra o fluxo de `05` §1. **Uma** responsabilidade: para a competência
corrente, enviar os alertas devidos hoje e registrar os sucessos.

```python
# app/core/domain/alertas/disparar_alertas_do_dia.py
class DispararAlertasDoDia:
    def __init__(self, deps: "DependenciasDoDisparo") -> None:
        self._deps = deps

    def executar(self, competencia: "Competencia") -> "ResumoDoDisparo":
        regras = self._deps.calendario.regras_de(self._deps.relogio.hoje(), competencia)
        resumo = ResumoDoDisparo(competencia)
        for regra in regras:                       # 0, 1 (ou +) regras caem hoje
            for pj in self._elegiveis(regra, competencia):
                self._tentar_enviar(pj, regra, competencia, resumo)
        return resumo

    def _elegiveis(self, regra: "RegraDeAlerta", competencia: "Competencia") -> "Elegiveis":
        # Fornecedores ativos − quem está na Fato(competência) − quem já tem Alerta(email,regra,comp)
        return self._deps.elegibilidade.para(regra, competencia)

    def _tentar_enviar(self, pj, regra, competencia, resumo) -> None:
        if self._deps.fato.entregou(pj.email, competencia):    # revalida à beira do envio (05 §5)
            return resumo.pular(pj, motivo="entregou")
        corpo = self._deps.templates.render(regra, pj, competencia)
        try:
            self._deps.email.enviar(pj.email, self._deps.templates.assunto(regra, competencia), corpo)
        except EnvioFalhou as erro:
            return resumo.falhar(pj, erro)                     # NÃO grava → tarde retenta (05 §4)
        self._deps.alertas.registrar(pj, regra, competencia, self._deps.relogio.agora())
        resumo.enviar(pj)
```

- **Registrar só após sucesso** (`05` §4). Falha não grava → a execução da tarde reenvia.
- **Revalidação à beira do envio** (`05` §5): se o PJ entregou entre a seleção e o envio, aborta aquele.
- **Isolamento por destinatário**: um envio que estoura **não derruba o lote** — vira linha de falha no resumo.

---

## 4. Portas (DIP + ISP) e os adaptadores reais

Cada dependência do worker é uma **porta pequena**; os adaptadores **reaproveitam o que a CITY API já tem**.

| Porta | Responsabilidade | Adaptador (Fase 2) |
|---|---|---|
| `EmailSender` | Enviar 1 e-mail | **`GraphEmailSender`** (Microsoft Graph, reusa `EntraConnection`) |
| `RelogioDoDia` | `hoje()` / `agora()` | `RelogioSistema` — mockável em teste |
| `CalendarioDeCobranca` | Deriva `D` e as regras do dia | Puro (config `.env`) |
| `Elegibilidade` | Seleção `Fornecedor − Fato − Alerta` | Query SQL (repos compartilhados) |
| `FatoDeRecepcao` | `entregou(email, competência)` | `NotaFiscalRepository` (`06` §4) |
| `RegistroDeAlerta` | `registrar(...)` idempotente | `AlertaRepository` (`06` §4) |
| `RenderizadorDeTemplate` | HTML por regra (preventivo/cobrança) | Templates City (`13` §3, `frontend/11`) |
| `AgendadorDeAlertas` | **Acionar** o worker | **Airflow DAG** (ou APScheduler) — §6 |

### 4.1 E-mail por Microsoft Graph (reuso do `EntraConnection`)

A City não tem SMTP (`05` §7); o envio usa **Graph `/sendMail`** com o **token client-credentials que o
`EntraConnection` já obtém** (`msal`, escopo `https://graph.microsoft.com/.default`).

```python
# app/services/connections/graph_email_sender.py
import httpx
from app.services.connections.entra_connection import EntraConnection
from app.core.config import settings

class EnvioFalhou(Exception): ...

class GraphEmailSender:
    """Envia via Graph /sendMail reusando o token do EntraConnection (já existente)."""
    def __init__(self, remetente: str | None = None) -> None:
        self._remetente = remetente or settings.alertas_remetente   # caixa remetente (P-08)

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

> **Pré-requisito de permissão:** o app registration precisa de **`Mail.Send` (Application)** no Graph e
> de uma **caixa remetente licenciada** (P-08). Sem isso o `/sendMail` retorna 403 — o worker trata como
> falha e a tarde retenta, mas o alerta não sai até a permissão existir. Sinalizar na operação.

---

## 5. Value Objects e coleções (Object Calisthenics)

Nada de `str`/`date` cru circulando pela lógica:

| Tipo | Encapsula | Comportamento |
|---|---|---|
| `RegraDeAlerta` (VO) | `D-3` \| `D` \| `D+1` \| `D+3` | `ehPreventivo()`, `ehCobranca()`, `paraTemplate()` |
| `Competencia` (VO) | `MM-AAAA` (reuso do domínio) | `paraExibicao()`, `corrente()` |
| `CalendarioDeCobranca` | `PRAZO_DIA`, `PRAZO_MES_OFFSET` | `prazo(comp)`, `regras_de(hoje, comp)` (dias corridos, `05` §2.2) |
| `Elegiveis` (1st-class coll.) | lista de PJ elegíveis | itera; nunca expõe a lista crua |
| `ResumoDoDisparo` (1st-class coll.) | enviados/falhas/pulados | `enviar/falhar/pular`, `para_log()` |

```python
# app/core/domain/alertas/calendario_de_cobranca.py
from datetime import date, timedelta

_OFFSETS = {-3: "D-3", 0: "D", 1: "D+1", 3: "D+3"}   # dias corridos (05 §2)

class CalendarioDeCobranca:
    def __init__(self, prazo_dia: int, mes_offset: int) -> None:
        self._prazo_dia = prazo_dia
        self._mes_offset = mes_offset

    def prazo(self, competencia: "Competencia") -> date:
        mes = competencia.mes() + self._mes_offset
        ano = competencia.ano() + (mes - 1) // 12
        return date(ano, (mes - 1) % 12 + 1, self._prazo_dia)

    def regras_de(self, hoje: date, competencia: "Competencia") -> list["RegraDeAlerta"]:
        prazo = self.prazo(competencia)
        return [RegraDeAlerta(nome) for delta, nome in _OFFSETS.items()
                if hoje == prazo + timedelta(days=delta)]
```

> O calendário é **puro e determinístico** — recebe `hoje` como argumento (não lê o relógio) para ser
> testável com meses curtos (`05` §2.2) sem depender da data real.

---

## 6. O scheduler (quem dispara) — adaptadores

### 6.1 Airflow (produção, recomendado)

Um DAG no repositório de DAGs (fora da API) roda **2x/dia em UTC-3** e chama o entrypoint do worker.
Como o gatilho é fire-and-forget e sem regra de negócio, o DAG é minúsculo:

```python
# dags/nf_pjs_alertas.py   (repo de DAGs — schedule 2x/dia, UTC-3)
from airflow import DAG
from airflow.operators.bash import BashOperator
import pendulum

with DAG(
    dag_id="nf_pjs_alertas",
    schedule="0 9,15 * * *",                       # 09h e 15h (D-13: horários a confirmar)
    start_date=pendulum.datetime(2026, 1, 1, tz="America/Sao_Paulo"),
    catchup=False,
    tags=["nf-pjs", "alertas"],
):
    BashOperator(                                  # roda o CLI dentro da imagem da CITY API
        task_id="disparar_alertas",
        bash_command="python -m app.workers.alertas",
    )
```

> A "regra da tarde" (`05` §3) **não** vive no DAG: as duas execuções chamam o mesmo worker, e a
> **idempotência** (§7) faz a tarde reenviar só o que a manhã não conseguiu.

### 6.2 Entrypoint do worker (CLI)

Um módulo executável, no estilo dos `scripts/` existentes. **Composição própria** (o `dependencies.py`
do FastAPI é *request-scoped*; o worker monta as suas dependências):

```python
# app/workers/alertas.py
import logging, sys
from app.core.domain.alertas.competencia import Competencia
from app.workers.composicao import montar_disparo_de_alertas

logger = logging.getLogger("nf_pjs.alertas")

def main() -> int:
    competencia = Competencia.corrente()
    resumo = montar_disparo_de_alertas().executar(competencia)
    logger.info(resumo.para_log())                 # enviados/falhas/pulados
    return 0 if resumo.sem_falhas_criticas() else 1

if __name__ == "__main__":
    sys.exit(main())
```

### 6.3 APScheduler (alternativa autocontida)

Se a operação preferir um worker que se agenda sozinho (sem Airflow), o **mesmo** `main()` é chamado por
um `BlockingScheduler` — o núcleo não muda:

```python
# app/workers/agendador_apscheduler.py
from apscheduler.schedulers.blocking import BlockingScheduler
from app.workers.alertas import main

agendador = BlockingScheduler(timezone="America/Sao_Paulo")
agendador.add_job(main, "cron", hour="9,15")       # 2x/dia
agendador.start()
```

> `apscheduler` **não** está no `requirements.txt` hoje. Só adicionar se a Opção B for escolhida.

---

## 7. Idempotência e concorrência (o que torna a tarde segura)

1. **Constraint** `UNIQUE(email, regra, mes_ano_referencia)` na Tabela de Alerta (`12` §2.3) — o banco
   é a última linha de defesa contra duplicidade.
2. **Seleção exclui** quem já tem registro → a tarde **não** reenvia o sucesso da manhã (`05` §3/§5).
3. **Registrar só no sucesso** (§3). Violação da constraint (corrida entre manhã/tarde) é tratada como
   **sucesso** ("já comunicado"), não como erro.
4. **Revalidar a Fato** imediatamente antes do envio (`05` §5) — reduz a janela de "entregou no meio".

---

## 8. Observabilidade

- **`ResumoDoDisparo`** por execução: `{competência, regra, enviados, falhas[], pulados[]}` → log
  estruturado; opcionalmente persistir para o Dashboard exibir "última rodada".
- Falha de envio → **log com o motivo** (status Graph, e-mail inválido), **sem** abortar o lote (`05` §9).
- Exit code do CLI: `!= 0` se houve falha crítica → Airflow marca a task como falha e **retenta/alerta**.

---

## 9. Configuração (`.env`)

Reaproveita as chaves `ENTRA_*` já existentes; acrescenta as de alerta:

```
# já existem (EntraConnection)
ENTRA_TENANT_ID=...
ENTRA_CLIENT_ID=...
ENTRA_CLIENT_SECRET=...
# novas (alertas)
ALERTAS_REMETENTE=notas-pj@cityinc.com.br      # caixa remetente Graph (P-08)
PRAZO_DIA=1                                    # dia de D (05 §2.1)
PRAZO_MES_OFFSET=1                             # meses após a competência
ALERTAS_HORARIOS=9,15                          # execuções (D-13)
# SQL Server: reusa a conexão da CITY API (mssql_hook)
```

---

## 10. SOLID — onde cada letra aparece

| Princípio | Onde |
|---|---|
| **S** | Worker só **orquestra o disparo**; `CalendarioDeCobranca` só **data**; `GraphEmailSender` só **envio**; DAG só **agenda**. |
| **O** | Trocar Airflow↔APScheduler = novo adaptador de gatilho, **sem** tocar no worker. Trocar Graph↔outro provedor = novo `EmailSender`. |
| **L** | Qualquer `EmailSender`/`AgendadorDeAlertas` é substituível; o worker não distingue. |
| **I** | Portas de um método (`enviar`, `hoje`, `entregou`, `registrar`) — nada obriga o worker a conhecer Graph, SQL ou Airflow. |
| **D** | O worker depende de **abstrações**; os concretos (Graph, repos, relógio) entram na composição (`app/workers/composicao.py`). |

## 11. Object Calisthenics

Mesma disciplina de `frontend/15` e `backend/19`: sem `else` (guard-clauses no `_tentar_enviar`),
primitivos encapsulados (`RegraDeAlerta`, `Competencia`), first-class collections (`Elegiveis`,
`ResumoDoDisparo`), classes pequenas, nomes sem abreviação. Exceções (DTOs de fronteira, ≤2 atributos)
são as **mesmas já documentadas** — não reinterpretar.

## 12. Pendências

| ID | Pendência | Situação |
|---|---|---|
| **D-12** | Quem dispara o worker | ✅ **Endereçada:** gatilho plugável; **Airflow** recomendado (infra já existe). |
| **D-13** | Horários exatos manhã/tarde | Default `9,15` — confirmar com a operação. |
| **P-08** | Caixa remetente + permissão `Mail.Send` no Graph | **Bloqueia o envio real**; mockável em dev. |

## 13. Checklist de implementação

- [ ] `EmailSender` (porta) + `GraphEmailSender` (reusa `EntraConnection`, Graph `/sendMail`).
- [ ] `CalendarioDeCobranca` + `RegraDeAlerta` + `Competencia` com testes de meses curtos (`05` §2.2).
- [ ] `Elegibilidade` (query `Fornecedor − Fato − Alerta`) reusando repos de `06` §4.
- [ ] `DispararAlertasDoDia` com registrar-só-no-sucesso, revalidação da Fato e isolamento por PJ.
- [ ] `ResumoDoDisparo` (log estruturado) + exit code do CLI.
- [ ] `app/workers/alertas.py` (CLI) + `app/workers/composicao.py` (DI do worker).
- [ ] DAG `nf_pjs_alertas` (2x/dia, UTC-3) chamando o CLI; **sem** regra de negócio no DAG.
- [ ] `.env`: `ALERTAS_REMETENTE`, `PRAZO_*`, `ALERTAS_HORARIOS`.
- [ ] Confirmar `Mail.Send` (Application) e caixa remetente (P-08); horários (D-13).
- [ ] Testes: calendário (bordas), idempotência (manhã/tarde), falha isolada, elegibilidade.
