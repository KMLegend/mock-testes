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
| **Pendente** | Não há registro na Tabela Fato para o PJ no `mes_ano_referencia` (resultado `NULL` no Left Join) | Ausência de chamado |
| **Enviado** | Há registro na Fato com chamado **aberto** (`data_finalizacao` NULL) | Chamado aberto |
| **Recebido** | Há registro na Fato com chamado **finalizado** (`data_finalizacao` preenchida) | Chamado encerrado |

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
> chave de fallback fixa. O **CNPJ** só entra como **desambiguador** (extraído do PDF via Marker)
> quando a pessoa tem **mais de um contrato** — ver `03` §3.1. Isso resolve *qual contrato* a NF
> atende, mas **não** é a chave de junção do status.

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
  CASE
    WHEN f.id_recepcao IS NULL              THEN 'Pendente'
    WHEN f.data_finalizacao IS NOT NULL THEN 'Recebido'
    ELSE                                     'Enviado'
  END AS status
FROM APP.TB_GER_NF_PJ_FORNECEDOR pj
LEFT JOIN APP.TB_GER_NF_PJ_RECEPCAO f
       ON f.email = pj.email                     -- chave de casamento: EMAIL (trim+lowercase) — A-14
      AND f.mes_ano_referencia = :mes_ano_referencia   -- "MM-AAAA"
      AND f.is_delete IS NULL
WHERE pj.ativo = 1 AND pj.is_delete IS NULL
ORDER BY pj.nome;
```

## 4. Armadilhas que geram falsos positivos de "Pendente" (crítico — Tarefa 4.1)

Todos estes casos fazem um PJ que **entregou** parecer **Pendente**. Prevenir e testar:

1. **E-mail divergente** (risco nº 1) — caixa/espaços diferentes entre Lista de PJ e chamado (`Joao.Silva@…` × `joao.silva@…`). → **Normalizar trim + lowercase dos dois lados** (e persistir normalizado na Fato).
2. **Filtro de competência no ON vs. WHERE** — colocar `f.mes_ano_referencia = :mes_ano_referencia` (ou `f.is_delete IS NULL`) no `WHERE` em vez do `ON` transforma o LEFT JOIN em INNER JOIN e **elimina** os Pendentes. → Manter ambos no `ON`.
3. **"Mês Referente" mal interpretado** — chamado existe mas foi classificado noutra competência (formato `MM-AAAA`). → Ver parser em `03` §6; validar (Tarefa 4.2).
4. **Sync desatualizado** — o chamado existe no Tomticket mas ainda não foi sincronizado. → Rodar o cálculo de status **após** o sync.
5. **PJ inativo/ativo** — considerar apenas `ativo = 1`, sem excluir PJ que estava ativo no período histórico consultado.
6. **E-mail duplicado na Lista de PJ** — se o mesmo e-mail existir em duas linhas, a junção multiplica registros. → Garantir unicidade do e-mail no cadastro (ou tratar 1 pessoa → N contratos via desambiguação, `03` §3.1).
7. **Pessoa com >1 contrato** — não é falso Pendente do status, mas exige desambiguação por Marker para atribuir a NF ao contrato certo (`03` §3.1). O status por e-mail permanece correto.

## 5. Consultas de status derivadas (para o Dashboard)

- **Contagem por status** no período: `Pendente`, `Enviado`, `Recebido` (cards/resumo).
- **Lista completa**: todos os PJ ativos + status calculado (base do DataGrid — `07-frontend-dashboard.md`).
- **Filtro obrigatório**: `ano` e `mes` selecionados na UI compõem `mes_ano_referencia`.

## 6. Invariantes (devem sempre valer)

- Todo PJ ativo aparece **exatamente uma vez** por competência na visão consolidada (ou uma vez por Tipo de Lançamento na visão granular).
- Nenhum PJ com chamado no período pode ser classificado como **Pendente**.
- `Recebido` implica `data_finalizacao` não nula em (pelo menos) o(s) chamado(s) que sustentam a classificação.
- A soma `Pendente + Enviado + Recebido` (consolidado) = total de PJ ativos no período.
