---
titulo: Plano de Refatoração do Frontend (Vanilla JS → React + TypeScript)
dominio: frontend
fase: 1
tags: [refatoracao, plano, migracao, checklist, paridade, regressao, testes, react, typescript]
status: normativo-para-implementacao
---

# Plano de Refatoração do Frontend

> **Público-alvo:** agentes de IA que vão executar a refatoração.
> Arquitetura alvo: `14-frontend-react-ts-arquitetura.md`. Padrões: `15-padroes-solid-e-object-calisthenics.md`.
>
> ⚠️ **Regra de ouro:** a refatoração **não altera comportamento**. Tudo em §3 já foi validado em
> execução e **precisa continuar valendo** — vários daqueles itens são **correções de bugs reais**.

## 1. Estratégia

**Reescrita de dentro para fora, em etapas verificáveis** (não big-bang):

1. Extrair o **domínio** primeiro (TypeScript puro, com testes) — é a parte com maior risco de regressão.
2. Depois **ports + adapters mock** (equivalente tipado do `dataProvider.js`).
3. Depois a **UI React**, tela por tela.
4. Só então **remover** os arquivos legados.

O app legado continua funcionando até a etapa 7 — assim é possível comparar comportamentos lado a lado.

> **Não** migrar "traduzindo `app.js` para React". A tradução literal carregaria os mesmos problemas
> estruturais. O domínio deve ser **reconstruído a partir das regras** (`04`, `03`, `13`), usando o
> `app.js` apenas como referência de comportamento e o §3 como contrato.

## 2. Etapas

| # | Etapa | Entregável | Pronto quando |
|---|---|---|---|
| 1 | **Setup** | Vite + React + TS `strict`, Vitest, ESLint com as regras de `15` §4, `xlsx` via npm | `npm run dev`, `npm test` e `npm run lint` rodam limpos |
| 2 | **Value Objects** | `Cnpj`, `Email`, `Competencia`, `TipoLancamento`, `RegraAlerta`, `StatusNf`, `DataHora` | Testes unitários cobrindo §3.A e §3.B |
| 3 | **Entidades + Coleções** | `Fornecedor`, `Chamado`, `Contrato`, `Alerta`; `LinhasDeStatus`, `Alertas` | Filtro e rollup **existem em um único lugar** |
| 4 | **Serviços de domínio** | `MotorDeStatus`, `ResolucaoDeContrato`, `RollupDeStatus` | Testes de §3.C, §3.D e §3.E passam |
| 5 | **Ports + adapters mock** | Interfaces + repositórios in-memory sobre os dados de `13` | Domínio roda sem UI, alimentado pelo mock |
| 6 | **UI React** | Composition Root, hooks, componentes, CSS Modules sobre `brand.css` | Checklist §3.F a §3.J validado na tela |
| 7 | **Descomissionamento** | Remover `app.js`, `dataProvider.js`, `mockData.js`, `app.css`, `index.html` legado | Nenhuma referência aos arquivos antigos |

> `public/brand/` **não é tocado** em nenhuma etapa.

## 3. Checklist de paridade comportamental (não pode regredir)

> Cada item abaixo foi **verificado em execução** na v1. Marcar apenas com evidência (teste
> automatizado ou verificação na tela).

### A. Competência
- [ ] Formato **sistêmico `MM-AAAA`**, **exibição `MM/AAAA`** (A-19).
- [ ] Parser do "Mês Referente" aceita `07/2026`, `07-2026`, `2026-07`, `Julho/2026`.
- [ ] Sem valor válido → fallback para o mês de `creation_date`.
- [ ] Default da tela = **mês atual** (A-11).
- [ ] Trocar competência recalcula grid, cards e aba Mensagens.

### B. CNPJ e e-mail (bugs corrigidos — atenção máxima)
- [ ] Busca por CNPJ funciona **com máscara** (`33.333.333/0001-33`) **e só dígitos** (`33333333000133`), com **resultado idêntico**.
- [ ] Busca parcial funciona nas duas formas (`87.654.321` ≡ `876543`).
- [ ] E-mail casa com `trim` + `lowercase` (`"  Kevin.Maykel@… "` ≡ `kevin.maykel@…`).
- [ ] Busca cobre: Razão Social, Nome Fantasia, Responsável Legal, E-mail, Nº do chamado e CNPJ.

### C. Motor de status
- [ ] Left Join **por e-mail** (A-14); PJ sem chamado no período → **Pendente**.
- [ ] Chamado aberto → **Enviado**; finalizado → **Recebido**.
- [ ] Granularidade por `(e-mail, tipo de lançamento)`.
- [ ] `Ambas` em um único chamado → **1 linha** (A-05).
- [ ] 2 chamados distintos (Contratual + Reembolso) → **2 linhas**.
- [ ] Fornecedor **inativo** não aparece.
- [ ] Chamado de outra competência não afeta o período selecionado.

### D. Desambiguação de contrato (A-21 / P-09)
- [ ] 1 contrato → atribuição direta, **sem** chamar o extrator.
- [ ] >1 contrato → resolve pelo **CNPJ do tomador** extraído do anexo (mock).
- [ ] Sem correspondência → **Tratamento Manual** (nunca contrato arbitrário), com aviso visual.

### E. Contadores (rollup)
- [ ] Precedência: **Tratamento Manual > Pendente > Enviado > Recebido**.
- [ ] `Recebido` só quando **todas** as tratativas do PJ estão finalizadas.
- [ ] Total = fornecedores **ativos** distintos.
- [ ] Cards clicáveis aplicam o filtro de status.

### F. Tabela de status
- [ ] **12 colunas** na ordem: botão de mensagens · Razão Social · Nome Fantasia · Responsável Legal · CNPJ · E-mail · Status · Nº Chamado · Abertura · Finalização · Tipo de Lançamento · Link (A-23 rev./A-24).
- [ ] Cabeçalhos **não quebram** em duas linhas.
- [ ] Colunas legíveis, sem compressão.
- [ ] Ordenação por coluna e link do chamado abrindo em nova aba.

### G. Mensagens — duas visões (A-24)
- [ ] **Aba "Mensagens"**: Responsável Legal · E-mail · CNPJ · Regra · Data/Hora de Envio · Ano/Mês.
- [ ] **Modal por PJ** via botão na 1ª coluna, com cabeçalho (Fornecedor/CNPJ/E-mail).
- [ ] Modal **funciona para PJ Pendente** (sem registro na Fato) — requisito crítico.
- [ ] Modal fecha no **X**, **clique fora** e **ESC**.
- [ ] Ordenação do mais recente para o mais antigo.

### H. Exportação (A-25)
- [ ] **Somente Excel**, botão rotulado **`EXCEL`** (sem CSV/PDF).
- [ ] Abas: `Status Notas Fiscais`, `Contratos`, `Mensagens Enviadas`.
- [ ] **A planilha reflete exatamente os filtros da tela** — mesma contagem de linhas do grid e da aba Mensagens.

### I. Concorrência (bug corrigido)
- [ ] Digitar na busca e trocar de aba ao mesmo tempo **não duplica linhas**.
- [ ] Digitação rápida (vários eventos) não acumula resultados.
- [ ] Respostas obsoletas são descartadas (`14` §10).

### J. Identidade visual (`11`)
- [ ] Header preto com **logo preferencial negativa**, área de proteção e tamanho mínimo.
- [ ] Cores **exclusivamente** via tokens de `brand.css` (sem HEX hard-coded).
- [ ] Laranja **não** usado em texto pequeno sobre fundo claro.
- [ ] Fontes servidas **localmente** (nunca CDN).

### K. Painel de simulação (QA)
- [ ] Alterar CNPJ do anexo, alternar aberto/finalizado, criar/remover chamado e resetar continuam funcionando e recalculando a tela.

## 4. Testes automatizados exigidos

A v1 não tinha testes. A refatoração **só é aceita com**:

| Nível | Cobertura mínima |
|---|---|
| Unitário (domínio) | Todos os itens de §3.A a §3.E |
| Componente (RTL) | §3.F, §3.G, §3.I |
| Exportação | §3.H — comparar contagem tela × planilha gerada |

Os 8 cenários de mock de `08-mocks-e-testes.md` §1 viram **fixtures** da suíte.

## 5. Riscos

| Risco | Mitigação |
|---|---|
| Reintroduzir o bug do CNPJ | `Cnpj` é VO; **proibido** `cnpj: string` fora dele (revisar em code review) |
| Reintroduzir duplicação de filtro | Filtro **só** existe como método de coleção; lint de fronteiras impede filtro na UI |
| Regra de negócio vazar para componente | `import/no-restricted-paths` (`15` §4) barra mecanicamente |
| Perda de comportamento sutil | Checklist §3 + suíte automatizada antes de remover o legado (etapa 7) |
| Divergência tela × Excel | Ambos consomem a **mesma** coleção filtrada (`14` §6) |

## 6. Definition of Done

1. Todos os itens de §3 marcados **com evidência**.
2. `npm run lint` e `npm test` limpos; **cobertura do `domain/` ≥ 80%**.
3. Nenhum `any`; `tsc --noEmit` sem erros.
4. Arquivos legados removidos; `public/brand/` intacto.
5. Trocar o adapter mock → HTTP exige alterar **apenas o Composition Root** (validar por inspeção).
6. Documentação atualizada: `07` (se a UI mudar), `09` (decisões), `10` (roadmap).
