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
| P-03 | **Categoria** do Tomticket | **Resolvido, valor corrigido (A-33, 2026-08-04)** | Valor real confirmado por teste contra a API: `category_id = 38ae7388ab732f568bfe9193c60165ed`, `category_name = "Lançamento de Notas Fiscais"`. O valor anterior (`8b9a123...`/"Recebimento de Notas - PJ") era hipotético, dos mocks — nunca foi testado contra a conta real. |
| P-04 | Campo **`tipo_de_lancamento`** | **Resolvido** | Valores: `Ambas`, `Contratual`, `Reembolso plano de saude` (`13` §2). |
| P-05 | Formato e origem do **"Mês Referente"** | **Resolvido, origem mudou (A-34, 2026-08-04)** | Exibição `07/2026`; **sistêmico `07-2026`** (A-19). **Não é campo customizado a ler** — é o mês/ano de `creation_date` (data de abertura) do chamado. Elimina de vez a dependência do custom field. |
| P-06 | **Endpoint/credenciais do HCM** | **Aberto** | Formato conhecido; falta o endpoint real. Mockar por enquanto. |
| P-08 | Credenciais/caixa remetente **Office 365** (worker) | **Aberto** | — |
| ~~P-09~~ | ~~Anexo PDF + Marker para extrair CNPJ (desambiguação, cenário 2)~~ | **Resolvido, escopo mudou (A-31)** | CNPJ é **campo customizado do chamado** (mesma natureza de "Mês Referente") — sem PDF, sem Marker. Falta só confirmar o campo existe em todo chamado (mesma pendência operacional de "Mês Referente"). |
| ~~P-07~~ | ~~Calendário de feriados / "1º dia útil"~~ | **Cancelado** | Não se aplica: `D` vem do `.env` e **não há** validação de dia útil (A-15/A-20). |
| ~~P-10~~ | ~~Esquema do header de autenticação do Tomticket~~ | **Resolvido (A-35, 2026-08-04)** | Testado contra a API real com a chave de `API_KEY_TOMTICKET_HUB`: **`Authorization: Bearer <token>`** — HTTP 200. Já era o que `TomticketConnection` implementava. |
| ~~P-17~~ | ~~Parâmetros de paginação/filtro do `GET /ticket/list`~~ | **Resolvido (A-35, 2026-08-04)** | Testado contra a API real: `category_id` **filtra de verdade** na query do `/list` (não precisa filtrar só no cliente, mas mantém-se como garantia). Paginação usa o campo **`pages`** do envelope de resposta (junto de `size`/`next_page`/`previous_page`) — pedir `page` além do total devolve **HTTP 404**, não uma lista vazia com 200. `TomticketConnection.listar_chamados_nf` corrigido para parar em `pagina > pages`, evitando a chamada extra e um falso log de erro a cada sync. (Numeração pula de P-10 porque **P-11 a P-16 já existem** — namespace de hospedagem SharePoint em `5-deploy-producao/18`.) |
| ~~P-18~~ | ~~Corte de dia 10 e pré-seed mensal da Fato com status Pendente~~ | **Resolvido (A-36, 2026-08-04)** | Ver A-36. Único ponto que segue **aberto dentro** de A-36: o design da chave sintética para a linha pré-semeada (proposta, não confirmada pelo usuário) — `03` §9. |

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
| **A-14** | Chave de casamento chamado × PJ | **E-mail** (única, normalizada). **Sem** chave de fallback fixa. **CNPJ** só desambigua (campo customizado do chamado, **A-31**) quando a pessoa tem **>1 contrato**. | `02` §2, `03` §3, `04` §2 |
| **A-15** | Regra "1º dia útil" | **Removida.** As regras de tempo são **D-3, D, D+1, D+3**. | `05` §2 |
| **A-16** | Agendamento | **2x/dia** (manhã + tarde), **UTC-3**; a tarde é **retentativa** do que falhou de manhã. | `05` §3 |
| **A-17** | Envio de e-mail | **Office 365**, executado **pelo worker** (`IEmailSender`). City não tem SMTP próprio. | `05` §7 |
| **A-18** | Modelo de dados | **3 tabelas**: `FORNECEDOR`, `RECEPCAO` (fato), `ALERTA` (log de disparos). O "Comunicado" do plano foi **unificado na Alerta**. Fila de elegíveis é calculada sob demanda. | `02`, `12` §2 |
| **A-19** | Formato de competência | **Sistêmico `MM-AAAA`** (`07-2026`); **exibição `MM/AAAA`** (`07/2026`). | `02`, `13` §2.4 |
| **A-20** | Prazo `D` e contagem | **`D` definido por variável `.env`** (≈ dia 1 do mês seguinte à competência). Offsets em **dias corridos**; **sem** validação de dia útil/feriado. | `05` §2 |
| ~~A-21~~ | ~~Desambiguação de contrato (P-09)~~ | **Substituída por A-31** (CNPJ é campo customizado do chamado, não extração de PDF). | — |
| **A-22** | Fases de desenvolvimento | **Fase 1 = frontend mockado interativo** (status Pendente/Enviado/Recebido sobre interface modular, sem backend); **Fase 2 = backend** (endpoints CITY API + integrações + worker); Fase 3 = validação. UI não muda entre fases. | `10-roadmap-fases-tarefas.md` |
| **A-23** | Colunas da tabela de status *(revisada — ver registro)* | **Razão Social**, **Nome Fantasia** (apelido), **Responsável Legal** (`name` do chamado), CNPJ, E-mail, Status, Nº Chamado, Abertura, Finalização, Tipo de Lançamento, Link — precedidas do botão de mensagens. | `07` §1 |
| **A-24** | Histórico de comunicação | **Duas visões complementares:** (a) **aba "Mensagens"** com todos os alertas (Responsável Legal, E-mail, CNPJ, Regra, Data/Hora, Ano/Mês); (b) **modal por PJ**, aberto por **botão na 1ª coluna do grid** (Regra, Data/Hora, Ano/Mês, Tipo). Ambas leem a Tabela de Alerta e funcionam para PJ Pendente. | `07` §2 |
| **A-25** | Exportação | **Somente Excel (`.xlsx`)**, botão rotulado **"EXCEL"** — **sem CSV nem PDF** (substitui A-10). | `07` §3 |
| **A-26** | Stack e padrões do frontend | **React + TypeScript (`strict`)** desde a Fase 1, mesmo com dados mockados, sob **SOLID** e **Object Calisthenics**, em arquitetura **Ports & Adapters**. Substitui a implementação em Vanilla JS. | `14`, `15`, `16` |
| **A-27** | Coluna "Responsável Legal" nas Mensagens (resolve D-14) | A aba/planilha de Mensagens exibe a **pessoa responsável legal** do PJ, **não a razão social**. O campo da Tabela de Alerta passa a ser **`responsavel_legal`** (antes `nome`, que gravava razão social). | `07` §2.1, `02` §4, `05` §8 |
| **A-28** | Hospedagem e identidade | A aplicação roda **embarcada no SharePoint** (iframe); **usuários e controle de acesso são os do SharePoint / Entra ID** — sem cadastro próprio. O backend deve derivar a identidade de um **token de usuário verificável** (nunca de valor enviado pelo cliente). | `18-hospedagem-sharepoint-e-identidade.md` |
| **A-29** | Forma de entrega do frontend (resolve P-11 de `18`) | **SPFx web part** publicada no SharePoint, com **CITY API** como backend e token de **usuário** do Entra ID via `AadHttpClient`. Descartada a alternativa SPA+iframe+MSAL. | `spfx-sharepoint/` |
| **A-31** | Origem do CNPJ na desambiguação de contrato (resolve P-09, substitui A-21) | O CNPJ vem de um **campo customizado do próprio chamado no Tomticket** ("CNPJ"), lido do mesmo payload que já traz `tipo_de_lancamento` e "Mês Referente" — **não** de extração de PDF via Marker. Elimina a interface `INotaCnpjExtractor`/`MockNotaCnpjExtractor` e a flag `CNPJ_EXTRACTOR`. Sem valor no campo → tratamento manual (mesma regra anterior). | `03` §3.1, `03` §7 |
| **A-32** | Comportamento da carga manual de planilha (Base de PJs) | A importação **substitui a base inteira**: cada envio bem-sucedido **trunca e recria** `PRESTADOR` e `CONTRATO` a partir do conteúdo validado da planilha. **Reverte** o desenho anterior de `19` §8 (fornecedor acumulativo nunca apagado + contrato ausente vira soft-delete/reativação) — a planilha passa a ser a **fonte única de verdade** a cada upload, sem preservar o que não veio nela. Não afeta `RECESSO_MOVIMENTO`: a FK é por `cod_empresa`/`cod_contrato` (chave de negócio), não pelo `id_contrato` (surrogate), então o truncar-e-recriar não quebra o histórico de ocorrências de recesso. | `19` §8, §8.1 |
| **A-33** | Endpoints reais e formato de payload do Tomticket | Confirmado por teste contra a conta real da City (2026-08-04): **`GET /v2.0/ticket/list`** (lista, sem `custom_fields`) + **`GET /v2.0/ticket/detail?ticket_id=`** (detalhe, com `custom_fields`) — base `https://api.tomticket.com`. **Categoria real** (corrige P-03): `category_id = 38ae7388ab732f568bfe9193c60165ed`, `category_name = "Lançamento de Notas Fiscais"`. `tipo_de_lancamento` e `cnpj` só existem em `custom_fields.open[]` do `/detail`, nunca no `/list` — exige enriquecimento em 2 chamadas, só para chamados já casados por e-mail. CNPJ vem **mascarado** (`"46.340.700/0001-26"`), precisa normalizar. Status Enviado/Recebido deriva **só de `end_date`** — `situation`/`status`/`current_status` do Tomticket **não** representam esse ciclo de vida (são sobre atendente/workflow interno). Autenticação via secret **`API_KEY_TOMTICKET_HUB`** (já no GitHub Secrets da `api-city`, mesmo nome). | `03` (seção inteira) |
| **A-34** | Origem do "Mês Referente" (resolve P-05) | **Não é campo a ler.** A competência (`mes_ano_referencia`) de um chamado é sempre o **mês/ano de `creation_date`** (data de abertura), confirmado pelo usuário (2026-08-04): um chamado aberto em 30/06 e finalizado em 03/07 é competência de **Junho**, mês da abertura, independente de quando foi finalizado. Já vem no `/list` — **não depende do `/detail`** nem de custom field, nem do fallback por `subject` que os docs anteriores previam. Simplifica o fluxo: `mes_ano_referencia` fica disponível numa única chamada. | `03` §6, §2.1 |
| **A-35** | Auth e paginação reais do Tomticket (resolve P-10, P-17) | Testado com a chave real (`API_KEY_TOMTICKET_HUB`) contra `api.tomticket.com` (2026-08-04): auth é **`Authorization: Bearer <token>`** (HTTP 200); `category_id` filtra de verdade na query do `/list`; paginação usa o campo **`pages`** do envelope — pedir página além do total devolve **HTTP 404** (não lista vazia). `TomticketConnection` corrigida para parar quando `pagina > pages`, em vez de tentar uma página a mais e logar erro falso a cada sincronização. | `03` §7/§8, `api-city/app/services/connections/tomticket_connection.py` |
| **A-36** | Pré-seed mensal, corte de dia 10 e chamado Cancelado (resolve P-18) | Quatro peças confirmadas pelo usuário (2026-08-04): **(1) Motivo do pré-seed:** viés de **histórico/auditoria** — a Fato deve registrar o que aconteceu em cada mês, mesmo que nunca chegue chamado; o Left Join de `04` §3 já deriva Pendente por ausência, mas não deixa rastro persistido do mês. **(2) Timing:** job agendado no **dia 1 do mês**, cria uma linha Pendente por PJ ativo para a nova competência. **(3) Corte de dia 10:** chamados com `creation_date` **depois do dia 10** do mês da competência são **ignorados** no cálculo de status — o PJ continua Pendente no dashboard mesmo que o chamado exista e esteja "aberto" no Tomticket, antecipando que o atendente vai cancelá-lo. **(4) Chamado Cancelado:** aparece normalmente no `/list`/`/detail`, mesmo formato, mas com `situation.description = "Cancelado"` — deve ser tratado como "não conta" (mesmo efeito de não ter chamado). **Corrige A-33**: `situation` não é 100% ignorável como aquela decisão registrou — o valor `"Cancelado"` precisa ser checado. | `03` §4, §9, A-33 (correção parcial) |
| **A-37** | `cod_empresa` gerado pelo sistema; Contratos vincula por CNPJ | Bug real em produção (2026-08-04): CNPJ mascarado da planilha ia direto para a coluna `cnpj` sem normalizar, estourando o buffer da coluna (NVARCHAR) e derrubando o import com HTTP 500 em vez de um erro de validação limpo. Corrigido junto com uma mudança de modelo pedida pelo usuário: **`cod_empresa` deixa de ser preenchido pela planilha** — é um identificador interno de junção Fornecedor↔Contrato, não um dado de negócio. A importação agora faz **dry-run por CNPJ** contra a base atual: CNPJ já cadastrado reaproveita o `cod_empresa` existente; CNPJ novo recebe um `cod_empresa` gerado sequencialmente. A aba **Contratos passa a referenciar o fornecedor por `cnpj`**, não mais por `cod_empresa`. Implementado em `api-city/app/api/v2/prestadores.py`; template/exportação atualizados para o novo formato. | `19` §8.1, `api-city/app/api/v2/prestadores.py` |

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
| 2026-07-17 | A-23 (rev.) | **Renomeadas** as 3 primeiras colunas e **invertida a ordem** das duas primeiras: `Fornecedor / PJ`→**Nome Fantasia**, `Nome Empresa`→**Razão Social**, `Nome Funcionário`→**Responsável Legal**; ordem passa a ser **Razão Social · Nome Fantasia · Responsável Legal**. Vale também para a exportação Excel. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-24 | Histórico vira **aba "Mensagens"** (Nome, E-mail, CNPJ, Regra, Dt/H Envio, Ano/Mês); sem botão Auditar. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-24 (rev.) | **Mantida a aba** e **adicionado botão na 1ª coluna** do grid que abre **modal com as mensagens daquele PJ** — as duas visões coexistem. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-25 | Exportação **somente Excel** (botão "EXCEL"); remove CSV e PDF (substitui A-10). | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-26 | Frontend deve ser **React + TypeScript** com **SOLID** e **Object Calisthenics** desde a Fase 1 (mesmo mockado). A implementação em Vanilla JS será **refatorada**. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-27 | Coluna **Responsável Legal** nas Mensagens passa a exibir a **pessoa** (não a razão social); campo da Tabela de Alerta renomeado `nome` → **`responsavel_legal`**. Resolve **D-14**. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-28 | App será publicado **no SharePoint como iframe**; **identidade e controle de acesso vêm do SharePoint/Entra ID**. Resolve a direção de **R-04** do módulo de Recesso; abre **P-11..P-16** em `18`. | kevin.maykel@cityinc.com.br |
| 2026-07-17 | A-29 | Frontend será **SPFx web part** (não SPA em iframe). Resolve **P-11**; converte P-12→S-06, P-13→S-09, P-14→S-02 e torna P-15 inaplicável. Backend segue a **CITY API**, que passará a validar **token de usuário RS256**. | kevin.maykel@cityinc.com.br |
| 2026-07-29 | A-31 | CNPJ da desambiguação (cenário 2, §3.1 de `03`) vem de **campo customizado do chamado no Tomticket**, não de extração de PDF via Marker (resolve P-09, substitui A-21). | kevin.maykel@cityinc.com.br |
| 2026-07-30 | A-32 | Carga manual de planilha (Base de PJs) passa a **substituir a base inteira** (truncar + recriar `PRESTADOR`/`CONTRATO`), em vez do desenho anterior de fornecedor acumulativo + contrato soft-delete/reativação (`19` §8). | kevin.maykel@cityinc.com.br |
| 2026-08-04 | A-33 | Endpoints reais do Tomticket testados (`/ticket/list` + `/ticket/detail`); categoria real corrige P-03; `custom_fields` só no `/detail`; CNPJ mascarado; status deriva só de `end_date`; auth via `API_KEY_TOMTICKET_HUB`. | kevin.maykel@cityinc.com.br |
| 2026-08-04 | A-34 | "Mês Referente" não é campo a ler — é o mês/ano de `creation_date` do chamado (resolve P-05). Confirmado com exemplo: chamado aberto 30/06 finalizado 03/07 = competência Junho. | kevin.maykel@cityinc.com.br |
| 2026-08-04 | A-35 | Testado com token real: auth = `Authorization: Bearer` (resolve P-10); paginação usa campo `pages` do envelope, página além do total dá HTTP 404 (resolve P-17). | kevin.maykel@cityinc.com.br |
| 2026-08-04 | A-36 | Pré-seed mensal (viés de histórico) roda dia 1; corte de dia 10 ignora chamado tardio no status; chamado Cancelado (`situation.description`) não conta (resolve P-18). | kevin.maykel@cityinc.com.br |
| 2026-08-07 | A-38 | `D` volta a ser o **N-ésimo dia ÚTIL** do mês (`ALERTAS_PRAZO_DIA`; 1 = 1º dia útil, 5 = 5º dia útil), pulando sábado/domingo — reverte parcialmente A-20/A-15. Offsets D-3/D+1/D+3 seguem em dias corridos a partir dessa data. | kevin.maykel@cityinc.com.br |
| 2026-08-07 | A-39 | `cod_contrato` passa a ser **opcional** na planilha: preenchido é preservado (identidade estável do contrato entre importações — a carga é TRUNCATE+INSERT e o recesso referencia por `cod_empresa`/`cod_contrato`); vazio, o sistema gera o próximo número livre daquela empresa, nunca reutilizando código já existente. Descartadas as alternativas de âncora `(cnpj, nome_contrato)` e "contrato ativo da vigência" — ambas quebram em renovação de contrato (mesmo CNPJ/nome, período novo). | kevin.maykel@cityinc.com.br |

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
| A-21 | **A-31** | CNPJ via `INotaCnpjExtractor`/Marker → **campo customizado do chamado** |

> Manter este registro atualizado é parte da Documentação Final (Fase 3 do roadmap `10`).
