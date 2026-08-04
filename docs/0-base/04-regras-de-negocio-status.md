---
titulo: Regras de Negócio — Motor de Status
dominio: regras-de-negocio
fase: [1, 2]
tags: [status, left-join, pendente, enviado, recebido, competencia, motor-de-status]
status: normativo
---

# Regras de Negócio — Motor de Status Mensal

> Documento **normativo**. A classificação de status é o coração do sistema. Vale para as **duas fases**: na **Fase 1** o motor roda sobre os **dados mock** (no cliente ou numa camada mock); na **Fase 2** vira a query real na CITY API. A lógica é a mesma. Ver validação em `08-mocks-e-testes.md`.

## 1. Definição dos status (por competência Ano/Mês)

O status é sempre calculado **para um fornecedor e uma competência (`mes_ano_referencia`)**.

| Status | Condição | Origem |
|---|---|---|
| **Pendente** | Não há registro na Fato **ou** o registro é a linha pré-semeada sem chamado real (A-36, §1.1) | Ausência de chamado (real ou efetiva) |
| **Enviado** | Há registro na Fato com chamado **aberto** (`data_finalizacao` NULL) | Chamado aberto |
| **Recebido** | Há registro na Fato com chamado **finalizado** (`data_finalizacao` preenchida) | Chamado encerrado |

### 1.1 Pré-seed mensal e exclusões na sincronização (A-36, 2026-08-04)

> A Fato **não é mais só derivada por ausência** — é **pré-populada** todo mês, por viés de
> histórico/auditoria (registrar o que aconteceu naquele mês, não só o estado atual). Ver A-36 em
> `09-pendencias-e-decisoes.md` e o fluxo completo em `03` §9.

- **Pré-seed (dia 1 do mês):** um job cria uma linha `Pendente` na Fato para **cada PJ ativo**, na
  nova competência, antes de qualquer sincronização do Tomticket rodar.
- **A sincronização do Tomticket só *substitui* a linha pré-semeada quando o chamado é válido.**
  Dois casos fazem o sync **ignorar** o chamado e manter o PJ como Pendente, mesmo que o chamado
  exista e esteja tecnicamente aberto no Tomticket:
  1. **Corte de dia 10** — `creation_date` do chamado é **depois do dia 10** do mês da competência
     (o atendente vai cancelá-lo manualmente; o sistema já antecipa isso, sem esperar o cancelamento).
  2. **Chamado Cancelado** — `situation.description = "Cancelado"` no `/detail` (`03` §4).
- **Importante:** essas duas exclusões acontecem **na sincronização** (decidindo o que gravar), não
  na leitura. O Left Join do §3 abaixo **não muda** — ele já mostra Pendente corretamente para
  qualquer linha que ficou com os dados de placeholder (sem chamado real associado).

## 2. Algoritmo (normativo)

```
Para cada PJ ativo em Lista de PJ, para a competência :mes_ano_referencia:
  registros = Fato onde (email = PJ.email) e (mes_ano_referencia = :mes_ano_referencia)
  se registros vazio:
    status = 'Pendente'
  senão se existe algum registro com data_finalizacao preenchida:
    status = 'Recebido'      # ver regra de agregação abaixo
  senão:
    status = 'Enviado'
```

> **Chave de casamento (A-14):** a junção é por **e-mail** (normalizado trim + lowercase). Não há
> chave de fallback fixa. O **CNPJ** só entra como **desambiguador** (campo customizado do chamado
> no Tomticket, A-31) quando a pessoa tem **mais de um contrato** — ver `03` §3.1. Isso resolve
> *qual contrato* a NF atende, mas **não** é a chave de junção do status.

### 2.1 Múltiplos chamados no mesmo período (A-05)

Cada chamado do Tomticket tem **ID único** (`id_tomticket`). Um mesmo solicitante (email) pode ter
**dois chamados** na mesma competência — ex.: um `Contratual` e um `Reembolso plano de saúde` — que
são **dois chamados distintos**, gerando **duas linhas** na Fato.

**Granularidade normativa:** o status é calculado por **`(email, tipo_lancamento)`** dentro da
competência. O Dashboard exibe **uma linha por tratativa**, não um status único por PJ.

**Rollup consolidado** (usado apenas nos cards de resumo, `05` §5):
- **Recebido** se todas as tratativas exigidas do PJ estão finalizadas.
- **Enviado** se ao menos uma tem chamado aberto e nenhuma falta abrir.
- **Pendente** se falta abrir chamado para alguma tratativa exigida.

## 3. Left Join canônico (referência SQL)

> **Corrigido (2026-08-04 — A-36).** Com o pré-seed (§1.1), uma linha `Pendente` pode **existir de
> verdade** na Fato (não é mais só ausência). `f.id_recepcao IS NULL` deixaria de detectar isso
> corretamente — cairia no `ELSE 'Enviado'` por engano. A leitura agora **confia no `status`
> gravado pela sincronização** (`COALESCE`), com o `CASE` antigo como *fallback* só para o caso
> raro de um PJ ficar ativo **depois** do pré-seed do mês já ter rodado (linha realmente ausente).

```sql
SELECT
  pj.id_pj,
  pj.nome,
  pj.email,
  pj.cnpj,
  f.numero_chamado,
  f.data_abertura,
  f.data_finalizacao,
  f.tipo_lancamento,
  f.link_chamado,
  COALESCE(
    f.status,                              -- pré-seed ou sync já gravou o status correto (A-36)
    CASE                                    -- fallback: PJ ativado após o pré-seed do mês
      WHEN f.id_recepcao IS NULL          THEN 'Pendente'
      WHEN f.data_finalizacao IS NOT NULL THEN 'Recebido'
      ELSE                                     'Enviado'
    END
  ) AS status
FROM APP.TB_DPE_GPJ_PRESTADOR pj
LEFT JOIN APP.TB_DPE_GPJ_RECEPCAO_NF f
       ON f.email = pj.email                     -- chave de casamento: EMAIL (trim+lowercase) — A-14
      AND f.mes_ano_referencia = :mes_ano_referencia   -- "MM-AAAA"
      AND f.is_delete = 0
WHERE pj.ativo = 1 AND pj.is_delete = 0
ORDER BY pj.nome;
```

## 4. Armadilhas que geram falsos positivos de "Pendente" (crítico — Tarefa 4.1)

Todos estes casos fazem um PJ que **entregou** parecer **Pendente**. Prevenir e testar:

1. **E-mail divergente** (risco nº 1) — caixa/espaços diferentes entre Lista de PJ e chamado (`Joao.Silva@…` × `joao.silva@…`). → **Normalizar trim + lowercase dos dois lados** (e persistir normalizado na Fato).
2. **Filtro de competência no ON vs. WHERE** — colocar `f.mes_ano_referencia = :mes_ano_referencia` (ou `f.is_delete = 0`) no `WHERE` em vez do `ON` transforma o LEFT JOIN em INNER JOIN e **elimina** os Pendentes. → Manter ambos no `ON`.
3. **"Mês Referente" mal interpretado** — chamado existe mas foi classificado noutra competência (formato `MM-AAAA`). → Ver parser em `03` §6; validar (Tarefa 4.2).
4. **Sync desatualizado** — o chamado existe no Tomticket mas ainda não foi sincronizado. → Rodar o cálculo de status **após** o sync.
5. **PJ inativo/ativo** — considerar apenas `ativo = 1`, sem excluir PJ que estava ativo no período histórico consultado.
6. **E-mail duplicado na Lista de PJ** — se o mesmo e-mail existir em duas linhas, a junção multiplica registros. → Garantir unicidade do e-mail no cadastro (ou tratar 1 pessoa → N contratos via desambiguação, `03` §3.1).
7. **Pessoa com >1 contrato** — não é falso Pendente do status, mas exige desambiguação pelo campo customizado "CNPJ" do chamado para atribuir a NF ao contrato certo (`03` §3.1, A-31). O status por e-mail permanece correto.
8. **Linha pré-semeada lida com o `CASE` antigo (A-36)** — se a query usar só o `CASE` baseado em `id_recepcao IS NULL`/`data_finalizacao`, uma linha `Pendente` pré-semeada (que **existe** na tabela) é classificada erradamente como **Enviado**, porque `id_recepcao` não é nulo. → Sempre ler `f.status` gravado (via `COALESCE`, §3), nunca re-derivar do zero quando a linha já existe.
9. **Chamado tardio ou Cancelado contando como Enviado** — se a sincronização gravar qualquer chamado casado por e-mail sem checar o corte de dia 10 ou `situation.description = "Cancelado"`, um PJ que na prática não vai receber pagamento aparece como Enviado/Recebido. → A exclusão é responsabilidade do **sync** (`03` §9, A-36), não da leitura — a leitura só reflete o que foi gravado.

## 5. Consultas de status derivadas (para o Dashboard)

- **Contagem por status** no período: `Pendente`, `Enviado`, `Recebido` (cards/resumo).
- **Lista completa**: todos os PJ ativos + status calculado (base do DataGrid — `07-frontend-dashboard.md`).
- **Filtro obrigatório**: `ano` e `mes` selecionados na UI compõem `mes_ano_referencia`.

## 6. Invariantes (devem sempre valer)

- Todo PJ ativo aparece **exatamente uma vez** por competência na visão consolidada (ou uma vez por Tipo de Lançamento na visão granular).
- Nenhum PJ com chamado no período pode ser classificado como **Pendente**.
- `Recebido` implica `data_finalizacao` não nula em (pelo menos) o(s) chamado(s) que sustentam a classificação.
- A soma `Pendente + Enviado + Recebido` (consolidado) = total de PJ ativos no período.
