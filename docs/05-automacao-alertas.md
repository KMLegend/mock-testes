---
titulo: Automação de Alertas e Cobrança (Worker Python)
dominio: automacao
fase: 2
tags: [alertas, cobranca, worker, scheduler, apscheduler, regras-de-tempo, d-3, d, d+1, d+3, email, office365, alerta]
status: normativo
---

# Automação de Alertas e Cobrança — Worker Python (Scheduler)

> **Decisão (A-13):** a automação de alertas roda em um **service/worker Python** com uma
> **biblioteca de Scheduler** (ex.: APScheduler ou `schedule`) — **não** em n8n. O worker agenda,
> avalia a regra do dia, calcula a elegibilidade, **envia o e-mail via Office 365** e **registra** o
> disparo na **Tabela de Alerta**. Compartilha a **camada de dados** com o domínio da CITY API
> (mesmos repositórios/SQL Server), por ser Python.

## 1. Princípio geral (Tarefa 2.3)

São elegíveis os fornecedores que **ainda não entregaram** no período — ou seja, **exclui** quem já
consta na **Tabela Fato** para a competência corrente **e** quem já recebeu aquela regra (registro na
**Tabela de Alerta**). **Todo disparo bem-sucedido é gravado na Tabela de Alerta.**

```
[Worker Python + Scheduler]  (2x/dia, UTC-3)
  1. determina a(s) regra(s) do dia (D-3 | D | D+1 | D+3) a partir de D (config .env)
  2. elegíveis = Fornecedores ativos
                 − quem está na Fato(competência)
                 − quem já tem Alerta(email, regra, competência)   ← idempotência
  3. para cada elegível: envia e-mail (Office 365) com o template da regra
  4. em caso de sucesso: grava na Tabela de Alerta (email, regra, competência, data_hora_envio)
```

## 2. Regras de tempo (normativo)

**`D` é definido por variável de `.env`** (A-20). Os offsets são **dias corridos**. **Não há
validação de dia útil/feriado** — apenas calcula-se `D-3`, `D`, `D+1`, `D+3` (a chance de cair em dia
não útil é baixa e aceita).

| Regra | Momento | Tipo |
|---|---|---|
| **D-3** | 3 dias corridos antes de `D` | Preventivo |
| **D** | data-prazo (config `.env`) | Preventivo |
| **D+1** | 1 dia corrido após `D` | Cobrança |
| **D+3** | 3 dias corridos após `D` | Cobrança |

> A regra "1º dia útil do mês" do plano original foi **removida** (A-15): não há mais lógica de dia
> útil, e `D` (≈ dia 1 do mês seguinte à competência) já cobre o marco de prazo.

### 2.1 Como `D` é obtido (config `.env`)

`D` = **dia 1 do mês seguinte à competência**, parametrizado. Exemplo de variáveis:
```
PRAZO_DIA=1            # dia do mês
PRAZO_MES_OFFSET=1     # meses após a competência (1 = mês seguinte)
```
Para a competência `07-2026`: `D = 01/08/2026`, `D-3 = 29/07`, `D+1 = 02/08`, `D+3 = 04/08`.

### 2.2 Atenção: dias corridos em meses curtos
`D-3` é sempre `D − 3 dias corridos`, **nunca** um dia fixo:
- comp. `07-2026` → D = 01/08 → **D-3 = 29/07**
- comp. `02-2026` → D = 01/03 → **D-3 = 26/02**
- comp. `12-2026` → D = 01/01/2027 → **D-3 = 29/12/2026**

## 3. Agendamento (A-16)

| Item | Definição |
|---|---|
| Fuso | **UTC-3** (America/Sao_Paulo) |
| Frequência | **2x/dia** — manhã e tarde |
| Regra da tarde | A execução da tarde **só envia o que não foi comunicado pela manhã**. Se o e-mail da manhã teve sucesso, **não** reenvia à tarde. |

> A "regra da tarde" é consequência da **idempotência** (§5): quem já tem registro na Tabela de Alerta
> para `(email, regra, competência)` não entra na seleção da tarde — a tarde é **retentativa** de
> falhas, não segundo disparo.
> PENDÊNCIA D-13: horários exatos (manhã/tarde).

## 4. Elegibilidade do disparo (normativo)

Um fornecedor é elegível para `(regra, competência)` se **todas** valerem:
1. **Não** consta na Tabela Fato para a competência (não entregou).
   - Cobranças (`D+1`, `D+3`) só valem para não-entregues. Se já está `Enviado`/`Recebido`, **não** cobrar.
2. **Não** possui registro na Tabela de Alerta para `(email, regra, competência)` (idempotência).
3. O dia corrente corresponde à `regra` (§2).

```
para cada pj em elegiveis(regra, competência):
   ok = enviar_email_o365(pj, template(regra), competência)
   se ok: gravar_alerta(email=pj.email, regra, competência, data_hora_envio=agora)
   senão: NÃO gravar  → a execução da tarde tentará de novo
```

> **Crítico:** gravar na Tabela de Alerta **somente após sucesso** do envio. Gravar antes faria a
> retentativa da tarde ser suprimida indevidamente.

## 5. Idempotência (crítico)
- A constraint `UNIQUE (email, regra, mes_ano_referencia)` na Tabela de Alerta impede duplicidade no banco.
- A seleção de elegíveis já exclui quem tem registro — por isso a tarde não reenvia o da manhã.
- Se um PJ entregar entre a seleção e o envio, revalidar a Fato imediatamente antes de enviar.

## 6. Distinção preventivo × cobrança
- **Preventivo** (D-3, D): lembrete de que a NF é esperada.
- **Cobrança** (D+1, D+3): a NF **não foi recebida** no prazo; tom de cobrança.

Templates distintos por grupo. Conteúdo-base e placeholders em `13-referencia-payloads-mock.md` §3.

## 7. Envio de e-mail — Office 365 (A-17)
- A City **não possui serviço SMTP próprio**. O envio usa o serviço de e-mail do **Office 365**.
- Feito **pelo worker Python**, encapsulado atrás de uma interface (`IEmailSender`) para trocar
  implementação (O365 hoje).
- HTML do e-mail segue a **identidade visual City** (`11-identidade-visual.md`).
- Caixa remetente/credenciais O365: P-08 em `09`.

## 8. Registro obrigatório na Tabela de Alerta
Cada envio bem-sucedido grava: `email`, `nome`, `cnpj`, `regra`, `data_hora_envio`, `mes_ano_referencia`.
Essa tabela é a fonte do **Histórico de Comunicação** no Dashboard (Tarefa 3.2) e deve permanecer
consultável **mesmo que o PJ nunca entre na Fato**. (Consolida o que o plano chamava de "Tabela
Comunicado" — ver `02` e A-18.)

## 9. Casos de borda
- **Falha de envio O365 (bounce/erro):** não registrar; a tarde retenta. Logar no worker.
- **PJ sem e-mail válido:** logar falha, não travar o lote; sinalizar no Dashboard.
- **D-3 em mês curto:** ver §2.2 — sempre por subtração de dias corridos.
- **PJ com 2 chamados (Contratual + Reembolso):** cada um tem ID único; considerar a tratativa faltante ao cobrar (granularidade por tipo — `04` §2.1).

## 10. Parâmetros configuráveis (`.env`)
- `PRAZO_DIA`, `PRAZO_MES_OFFSET` (define `D`).
- Horários das 2 execuções (manhã/tarde) e fuso (UTC-3).
- Credenciais/caixa remetente **Office 365**.
- URLs de portal/links do template (`13` §3).
- Conexão SQL Server (mesma da CITY API) para os repositórios compartilhados.
