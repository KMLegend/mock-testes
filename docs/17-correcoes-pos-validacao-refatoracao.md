---
titulo: Correções Pós-Validação da Refatoração (React + TypeScript)
dominio: frontend
fase: 1
tags: [correcao, bug, validacao, react, hooks, loop-infinito, identidade-visual, tokens, eslint, regressao]
status: normativo-para-implementacao
---

# Correções Pós-Validação da Refatoração

> Resultado da validação da refatoração React + TS (`14`, `15`, `16`), executada em **2026-07-17**
> com typecheck, lint, testes e verificação em runtime no navegador.
>
> **Veredito: não aprovada** — 1 bloqueador (C-01) e 1 regressão de marca (C-02), mais 3 itens menores.
> Este documento é o backlog de correção. Cada item traz **evidência medida**, **causa**, **correção**
> e **critério de verificação**.

## 0. O que já está correto (não refazer)

| Verificado | Situação |
|---|---|
| Estrutura de camadas (`14`) e remoção do legado | ✅ conforme |
| **Fronteiras de dependência** (`domain` isolado; infra só no CompositionRoot) | ✅ zero violações |
| `tsc --noEmit` / ESLint | ✅ limpos, sem `any` |
| Testes unitários | ✅ 17/17 |
| Paridade `16` §3 — A, B, C, E, F, G, H, I, K | ✅ validada em runtime |
| Bugs históricos (CNPJ máscara/dígitos, e-mail normalizado, `Ambas`=1 linha, Tratamento Manual, modal para PJ Pendente, Excel 1:1 com a tela, sem duplicação em concorrência) | ✅ todos continuam corrigidos |
| `xlsx` via npm (sem CDN) | ✅ |

---

## C-01 — 🔴 BLOQUEADOR: loop infinito de render/efeito

### Evidência
- `AlertaRepositoryEmMemoria.todos()` é chamado **24 vezes em 300 ms (~80/s) sem nenhuma interação**
  do usuário. O correto é **1**.
- `npm test` **nunca termina**: `tests/integration/ui.test.tsx` trava e o worker do Vitest morre
  (`Worker exited unexpectedly`, exit 124). Isso **viola o DoD** de `16` §6.
- O loop bloqueia o event loop: o `testTimeout` do Vitest sequer dispara.
- No navegador, queima CPU continuamente (timers de 0 ms caem de ~450 para **197 ticks/2 s**).
  É a causa real dos travamentos de screenshot antes atribuídos ao glassmorphism.

### Causa
`src/ui/App.tsx` (linhas ~23–34) recria referências **a cada render** e as passa como dependência de efeito:

```tsx
const mapaStatusRollup = new Map();          // ← nova referência todo render
for (const [emailKey, list] of mapaStatus.entries()) { mapaStatusRollup.set(emailKey, list[0]); }

const { alertas } = useMensagens({           // ← objeto literal novo todo render
  competencia, searchQuery, statusFilter, mapaStatusFornecedor: mapaStatusRollup
});
```

`src/ui/hooks/useMensagens.ts` (linha 24) depende desse objeto:
```ts
}, [listarMensagens, criterio]);
```

Ciclo: `render → criterio novo → efeito → setCarregando/setAlertas → render → …` (infinito).

> `useCompetencia` e `CompositionRoot` **estão corretos** (ambos memoizados) — o defeito é só no `App.tsx`.

### Correção
Memoizar as duas referências:

```tsx
const mapaStatusRollup = useMemo(() => {
  const mapa = new Map<string, StatusNf>();
  for (const [emailKey, lista] of linhasGrid.agruparStatusPorEmail().entries()) {
    mapa.set(emailKey, lista[0]);
  }
  return mapa;
}, [linhasGrid]);

const criterio = useMemo(
  () => ({ competencia, searchQuery, statusFilter, mapaStatusFornecedor: mapaStatusRollup }),
  [competencia, searchQuery, statusFilter, mapaStatusRollup]
);

const { alertas } = useMensagens(criterio);
```

### Verificação
- [ ] Sonda: repositório de alertas chamado **≤ 2 vezes** em 300 ms sem interação (era 24).
- [ ] `npm test` **conclui**, com os testes de integração passando.
- [ ] Sem regressão nos itens de `16` §3 (rodar o checklist).

### Prevenção (obrigatória)
- [ ] Adicionar **teste de regressão** que falhe se o loop voltar (contar chamadas ao repositório após render).
- [ ] Regra: **nunca** passar objeto/array/Map literal como dependência de `useEffect` — memoizar na origem.

---

## C-02 — 🟠 Regressão de identidade visual (cores fora da marca)

### Evidência
- **90 ocorrências de HEX hard-coded** em `src/ui/**/*.module.css`, contra apenas 50 usos de token.
- Viola `11` §5 ("referenciar **exclusivamente** os tokens semânticos — nunca HEX hard-coded") e `15` §3.6.
- As cores implementadas **não são as da City**:

| Elemento | Implementado | Token oficial (`public/brand/brand.css`) |
|---|---|---|
| Badge/indicador **Pendente** | `#EAB308` (amarelo) | **`--color-status-pendente`** = `--city-laranja` = **`#FF8700`** |
| **Enviado** | `#3B82F6` | `--color-status-enviado` = `#2563EB` |
| **Recebido** | `#22C55E` | `--color-status-recebido` = `#16A34A` |
| **Tratamento Manual** | `#EF4444` | `--color-danger` = `#DC2626` |
| **Header** | `var(--color-gray-900, #111111)` → **token inexistente**, cai no fallback | `--color-header-bg` = `--city-preto` = **`#020202`** |

> O impacto de marca é direto: o status **Pendente perdeu o laranja City**, que é a cor principal do
> manual e o destaque central do dashboard.

### Arquivos afetados
```
src/ui/components/Header/Header.module.css:2
src/ui/components/CardsDeResumo/CardsDeResumo.module.css:9,58-61
src/ui/components/TabelaDeStatus/TabelaDeStatus.module.css:57-60
src/ui/components/TabelaDeMensagens/TabelaDeMensagens.module.css:18,60-61
src/ui/components/ModalDeMensagens/ModalDeMensagens.module.css:19,29,44,90-91
src/ui/components/FiltrosDaBusca/FiltrosDaBusca.module.css:69
src/ui/components/PainelDeSimulacao/PainelDeSimulacao.module.css:6,24,89-92
```

### Correção
1. Substituir **todos** os HEX por tokens de `brand.css`:
   - Header → `var(--color-header-bg)`; branco → `var(--color-card-bg)`; bordas → `var(--color-border)`;
     texto → `var(--color-text)` / `var(--color-text-muted)`.
   - Badges → par `var(--color-status-*)` + `var(--color-status-*-soft)`;
     Manual → `var(--color-danger)` + `var(--color-danger-soft)`.
2. **Contraste (manual p.49):** o laranja `#FF8700` **não** pode ser usado em texto pequeno sobre
   fundo claro. Para o badge "Pendente", usar fundo `--color-status-pendente-soft` com **texto em
   laranja escuro derivado**.
3. Cores **derivadas** (ex.: o laranja escuro do texto do badge, tons do painel de QA) devem ser
   declaradas **uma única vez** como tokens de projeto (ex.: `src/ui/styles/tokens.css`), nunca
   espalhadas nos módulos. Documentar que são derivadas e não pertencem à paleta da marca.

### Verificação
- [ ] `grep -rE "#[0-9a-fA-F]{3,8}" src/ui --include=*.css` retorna **0** fora do arquivo central de tokens.
- [ ] Header renderiza `rgb(2, 2, 2)`.
- [ ] Badge/card **Pendente** usa o laranja City (`#FF8700`) com contraste adequado.
- [ ] Nenhum `var(--token-inexistente, #fallback)` — todo token referenciado deve existir.

### Prevenção
- [ ] Adicionar guarda no CI (mínimo: script de `grep` falhando o build; ideal: **stylelint** com
      `declaration-property-value-disallowed-list` para cor literal).

---

## C-03 — 🟡 Override de ESLint amplo demais

### Evidência
`.eslintrc.json` libera, para **todo** `src/ui/**/*.tsx`:
`max-lines-per-function: 300`, `max-lines: 400`, `complexity: 15`.

Mas apenas **1 arquivo** realmente excede o limite de 150 linhas:
`PainelDeSimulacao.tsx` (**285**). Os demais estão folgados (App 125, TabelaDeStatus 135, Modal 120).

Ou seja: a Regra 7 de Object Calisthenics está **desligada justamente na camada que apodreceu na v1**,
sem necessidade real.

### Correção
- [ ] Restringir o override ao arquivo que precisa (`PainelDeSimulacao.tsx`) **ou** quebrá-lo em
      subcomponentes e remover o override.
- [ ] Manter `tests/**` e `infrastructure/mock/dados/*` isentos (legítimo: dados e specs).

### Verificação
- [ ] `npm run lint` limpo **sem** override genérico para `src/ui/**/*.tsx`.

---

## C-04 — 🟡 Port `ExtratorCnpjDaNota` não implementado

### Evidência
`14` §7 e a decisão **A-21** definem o port `ExtratorCnpjDaNota` com implementações
`Mock` (agora) e `Marker` (P-09), selecionáveis por `CNPJ_EXTRACTOR=MOCK|MARKER`.
Na implementação, o CNPJ chega como **propriedade do chamado** (`chamado.cnpjAnexo`) e
`ResolucaoDeContrato` o lê direto — o port não existe.

> A **lógica de resolução está correta** (1 contrato → direto; >1 → CNPJ; sem match → Tratamento
> Manual). O problema é de fronteira: o Marker é I/O assíncrono (ler PDF/OCR) e **não cabe** como
> propriedade síncrona de entidade — vai exigir retrabalho na Fase 2.

### Correção
- [ ] Criar `application/ports/ExtratorCnpjDaNota.ts` com `extrair(chamado): Promise<Cnpj | null>`.
- [ ] Criar `infrastructure/mock/ExtratorCnpjMock.ts` (mapa fixo de `13` §4.3).
- [ ] `ObterStatusDaCompetencia` passa o CNPJ extraído para `ResolucaoDeContrato` (que continua puro).
- [ ] Selecionar a implementação no **Composition Root**.

### Verificação
- [ ] Trocar mock → Marker exige alterar **apenas** o Composition Root.
- [ ] Cenários de `13` §4.5 continuam válidos (contrato 102; troca de CNPJ; sem match → Manual).

---

## C-05 — 🟡 Limites de lint divergentes do padrão documentado

| Regra | `15` §2 (documentado) | `.eslintrc.json` (implementado) |
|---|---|---|
| `max-lines-per-function` | 20 | **40** |
| `complexity` | 5 | **8** |

### Correção
- [ ] **Decidir e alinhar**: ou apertar o lint para o valor documentado, ou atualizar `15` §2 com os
      valores praticados e a justificativa. **Não deixar doc e código divergentes.**

> Recomendação: manter **40/8** (valores realistas para componentes React) e **atualizar `15` §2** —
> desde que C-03 seja corrigido, para que o limite volte a valer na UI.

---

## Ordem sugerida

```
C-01 (bloqueador)  →  C-02 (marca)  →  C-03  →  C-05  →  C-04
```
C-01 e C-02 são pré-requisito para aceitar a Fase 1. C-04 pode ir junto do início da Fase 2.

## Definition of Done da correção

1. [ ] C-01 e C-02 concluídos e verificados.
2. [ ] `npm run typecheck`, `npm run lint` e **`npm test` (concluindo)** limpos.
3. [ ] Checklist de paridade `16` §3 revalidado **integralmente** após as mudanças.
4. [ ] Testes de regressão adicionados para C-01 (loop) e guarda de cor para C-02.
5. [ ] `15` §2 e `.eslintrc.json` consistentes entre si (C-05).
