---
titulo: Pendências, Decisões e Registro de Decisões
dominio: gestao
fase: 1
tags: [pendencias, decisoes, registro-de-decisoes, adr, hcm, tomticket, worker, email, marker]
status: rastreador
---

# Pendências, Decisões e Registro de Decisões

> **Como ler (agentes de IA):**
> - **§1 Pendências (P-xx)** e **§3 Decisões a confirmar (D-xx)** → **dados ainda não definidos**. **Não inventar.** Implementar de forma **parametrizável** (config/placeholder).
> - **§2 Decisões confirmadas (A-xx)** → **normativas**. As marcadas ~~riscadas~~ foram **substituídas** — não aplicar.
> - **§4 Registro de decisões** → trilha de auditoria (quando/quem/o quê).

## 1. Pendências

| ID | Pendência | Status | Observação |
|---|---|---|---|
| P-01 | Mapeamento da base do **HCM** | **Resolvido (formato)** | Formato de retorno definido (`13` §1). Endpoint/credenciais pendentes (P-06). Foco: **frontend mockado** primeiro. |
| P-02 | **Templates de e-mail** | **Resolvido (base)** | Assunto e corpo-base definidos (`13` §3); ajuste fino de tom por regra pendente. |
| P-03 | **Categoria** do Tomticket | **Resolvido** | `category_id = 8b9a123fcd09bd585714b53d5370f1a2`, `category_name = "Recebimento de Notas - PJ"` (`13` §2). |
| P-04 | Campo **`tipo_de_lancamento`** | **Resolvido** | Valores: `Ambas`, `Contratual`, `Reembolso plano de saude` (`13` §2). |
| P-05 | Formato do **"Mês Referente"** | **Resolvido** | Exibição `07/2026`; **sistêmico `07-2026`** (A-19). |
| P-06 | **Endpoint/credenciais do HCM** | **Aberto** | Formato conhecido; falta o endpoint real. Mockar por enquanto. |
| P-08 | Credenciais/caixa remetente **Office 365** (worker) | **Aberto** | — |
| P-09 | **Anexo PDF + Marker** para extrair CNPJ (desambiguação, cenário 2) | **Mockado** | Interface `INotaCnpjExtractor` + `MockNotaCnpjExtractor` (mapa fixo, `13` §4) já habilita o cenário 1 PJ × >1 contrato. Real (**Marker** + acesso ao anexo) fica para depois. |
| ~~P-07~~ | ~~Calendário de feriados / "1º dia útil"~~ | **Cancelado** | Não se aplica: `D` vem do `.env` e **não há** validação de dia útil (A-15/A-20). |

## 2. Decisões confirmadas (A-xx)

### Lote 1 — arquitetura e integração
| ID | Decisão | Definição | Ref. |
|---|---|---|---|
| A-01 | Modelo do backend | Novo domínio de endpoints na **CITY API** (FastAPI). | `06`, `12` |
| A-02 | Fonte da Lista de PJ | **ERP HCM** → tabelas no **DB City** (SQL Server). | `02`, `12` |
| A-03 | Campo de competência | `mes_ano_referencia` (formato refinado em **A-19**). | `06` §3 |
| ~~A-04~~ | ~~CNPJ é a chave de casamento~~ | **Substituída por A-14** (a chave é o e-mail). | — |
| A-05 | Unicidade do chamado | Cada chamado tem **ID único** (`id_tomticket`). 2 chamados (Contratual+Reembolso) = 2 IDs para o mesmo solicitante → 2 linhas. Status por `(email, tipo_lancamento)`. | `02`, `04` §2.1 |
| ~~A-06~~ | ~~Dias corridos + dia útil no "1º dia útil"~~ | **Substituída por A-20** (dias corridos; sem regra de dia útil). | — |
| ~~A-07~~ | ~~D = dia 1 do mês seguinte; 2x/dia~~ | **Refinada por A-16 e A-20** (D via `.env`; agendamento mantido). | — |
| ~~A-08~~ | ~~Alertas em n8n~~ | **Substituída por A-13** (worker Python). | — |
| ~~A-09~~ | ~~E-mail via O365 pelo n8n~~ | **Substituída por A-17** (O365 pelo worker). | — |
| ~~A-10~~ | ~~Exportação csv/xlsx/pdf~~ | **Substituída por A-25** (somente Excel). Excel segue proibido como **fonte**. | — |
| A-11 | Default do Dashboard | Abre no **mês atual**. | `07` §1 |
| A-12 | Stack | Herda a stack da CITY API (FastAPI/SQL Server/JWT M2M/Docker). | `06` §1 |

### Lote 2 — alinhamento de pendências
| ID | Decisão | Definição | Ref. |
|---|---|---|---|
| **A-13** | Automação de alertas | **Worker Python** com **Scheduler** (ex.: APScheduler/`schedule`) — **não** n8n. Reutiliza a camada de dados. | `05`, `06` §6 |
| **A-14** | Chave de casamento chamado × PJ | **E-mail** (única, normalizada). **Sem** chave de fallback fixa. **CNPJ** só desambigua via **Marker** (PDF) quando a pessoa tem **>1 contrato**. | `02` §2, `03` §3, `04` §2 |
| **A-15** | Regra "1º dia útil" | **Removida.** As regras de tempo são **D-3, D, D+1, D+3**. | `05` §2 |
| **A-16** | Agendamento | **2x/dia** (manhã + tarde), **UTC-3**; a tarde é **retentativa** do que falhou de manhã. | `05` §3 |
| **A-17** | Envio de e-mail | **Office 365**, executado **pelo worker** (`IEmailSender`). City não tem SMTP próprio. | `05` §7 |
| **A-18** | Modelo de dados | **3 tabelas**: `FORNECEDOR`, `RECEPCAO` (fato), `ALERTA` (log de disparos). O "Comunicado" do plano foi **unificado na Alerta**. Fila de elegíveis é calculada sob demanda. | `02`, `12` §2 |
| **A-19** | Formato de competência | **Sistêmico `MM-AAAA`** (`07-2026`); **exibição `MM/AAAA`** (`07/2026`). | `02`, `13` §2.4 |
| **A-20** | Prazo `D` e contagem | **`D` definido por variável `.env`** (≈ dia 1 do mês seguinte à competência). Offsets em **dias corridos**; **sem** validação de dia útil/feriado. | `05` §2 |
| **A-21** | Desambiguação de contrato (P-09) | Extração de CNPJ atrás da interface **`INotaCnpjExtractor`**; **mock** (`MockNotaCnpjExtractor`) por enquanto, **Marker** depois, trocável por `CNPJ_EXTRACTOR=MOCK\|MARKER`. Sem match → tratamento manual. | `13` §4, `03` §3.1 |
| **A-22** | Fases de desenvolvimento | **Fase 1 = frontend mockado interativo** (status Pendente/Enviado/Recebido sobre interface modular, sem backend); **Fase 2 = backend** (endpoints CITY API + integrações + worker); Fase 3 = validação. UI não muda entre fases. | `10-roadmap-fases-tarefas.md` |
| **A-23** | Colunas da tabela de status | **Fornecedor / PJ** (apelido), **Nome Empresa** (razão social), **Nome Funcionário** (`name` do chamado), CNPJ, E-mail, Status, Nº Chamado, Abertura, Finalização, Tipo de Lançamento, Link. | `07` §1 |
| **A-24** | Histórico de comunicação | É uma **aba própria "Mensagens"** (não botão "Auditar" por linha). Colunas: Nome, E-mail, CNPJ, Regra, Data/Hora de Envio, Ano/Mês. | `07` §2 |
| **A-25** | Exportação | **Somente Excel (`.xlsx`)**, botão rotulado **"EXCEL"** — **sem CSV nem PDF** (substitui A-10). | `07` §3 |

## 3. Decisões ainda a confirmar

| ID | Decisão | Recomendação default | Ref. |
|---|---|---|---|
| D-07 | Critério da "**Aba de contratos**" no `.xlsx` | Registros `Contratual` (e `Ambas` com contrato) | `07` §3 |
| D-11 | Nomes finais de **tabela/rota** + formato de competência na CITY API | Seguir padrão CITY API (`SCHEMA.TB_PREFIXO_SUFIXO`). Propostas: `APP.TB_GER_NF_PJ_*`, `/v2/notas-fiscais`. **Atenção:** a competência do nf-pjs usa hífen (`MM-AAAA`) enquanto as tabelas atuais da CITY API usam barra (`MM/AAAA`) — validar. | `06` §3, `12` §2 |
| D-12 | Quem agenda o **sync** (Tomticket/HCM) | O próprio worker, um scheduler dedicado, ou Airflow (já usado no Mapão) | `06` §6 |
| D-13 | Horários exatos das execuções manhã/tarde (UTC-3) | A definir | `05` §3 |

## 4. Registro de decisões

> Trilha de auditoria. Novas decisões são **acrescentadas**; reversões viram **nova linha**
> referenciando a anterior (nunca reescrever o histórico).

| Data | ID | Decisão tomada | Responsável |
|---|---|---|---|
| 2026-07-17 | A-01 | Backend como **novo domínio na CITY API** (FastAPI), documentado para agentes. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-02 | **Lista de PJ vem do ERP HCM**; tabelas no **DB City**. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-03 | Campo de competência `mes_ano_referencia` (formato final em A-19). | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-05 | Cada chamado tem **ID único**; 2 tipos = 2 chamados; status por `(email, tipo)`. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-10 | Excel proibido como **fonte**; export em `.csv`/`.xlsx`/`.pdf`. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-11 | Dashboard abre no **mês atual**. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-12 | Stack herdada da CITY API. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-13 | Alertas em **worker Python + Scheduler** (substitui n8n / A-08). | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-14 | Casamento por **e-mail** (única chave); CNPJ só desambigua via **Marker** quando >1 contrato (substitui A-04). Cenários: (1) 1 contrato → direto; (2) >1 contrato → extrair CNPJ do PDF. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-15 | Regra "**1º dia útil**" **removida**; regras = D-3/D/D+1/D+3. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-16 | Agendamento **2x/dia** (manhã/tarde), **UTC-3**; tarde = retentativa. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-17 | E-mail via **Office 365** no worker (substitui A-09; City sem SMTP próprio). | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-18 | **3 tabelas** (fornecedor, fato, alerta); "Comunicado" unificado na Alerta. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-19 | Competência **sistêmica `MM-AAAA`** / **exibição `MM/AAAA`**. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-20 | **`D` via `.env`**; dias corridos; sem validação de dia útil. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-21 | **Mockar P-09** agora: `INotaCnpjExtractor` + `MockNotaCnpjExtractor` para testar 1 PJ × >1 contrato; Marker fica para depois. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-22 | **Fase 1 = frontend mockado interativo** (status dos PJ); **Fase 2 = backend**. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-23 | Colunas da tabela: Fornecedor/PJ, Nome Empresa, Nome Funcionário, CNPJ, E-mail, Status, Nº Chamado, Abertura, Finalização, Tipo de Lançamento, Link. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-24 | Histórico vira **aba "Mensagens"** (Nome, E-mail, CNPJ, Regra, Dt/H Envio, Ano/Mês); sem botão Auditar. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-25 | Exportação **somente Excel** (botão "EXCEL"); remove CSV e PDF (substitui A-10). | kevin.maykel@cityinc.com.br |

### Decisões substituídas (histórico)
| ID antigo | Substituído por | O que mudou |
|---|---|---|
| D-01 | A-05 | Chave única da Fato → `id_tomticket` |
| D-02 → A-04 | **A-14** | Casamento: CNPJ → **e-mail** (CNPJ vira desambiguador via Marker) |
| D-03 | A-05 | Consolidação resolvida pela unicidade do chamado |
| D-04 → A-06 | **A-20** | Dias corridos; sem regra de dia útil |
| D-05 → A-07 | **A-20** | `D` via `.env` |
| D-06 → A-07 | **A-16** | Fuso UTC-3 e 2x/dia; horários exatos em D-13 |
| D-08 | A-11 | Mês atual como default |
| D-09 | A-12 | Stack definida |
| D-10 → A-09 | **A-17 + A-13** | E-mail via O365 **e** disparo movido do n8n para **worker Python** |
| A-10 | **A-25** | Export de csv/xlsx/pdf → **somente Excel** |

> Manter este registro atualizado é parte da Documentação Final (Fase 3 do roadmap `10`).
