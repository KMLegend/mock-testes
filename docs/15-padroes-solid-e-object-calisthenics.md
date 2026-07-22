---
titulo: Padrões de Código — SOLID e Object Calisthenics (React + TypeScript)
dominio: frontend
fase: 1
tags: [solid, object-calisthenics, padroes, typescript, react, clean-code, eslint, qualidade]
status: normativo
---

# Padrões de Código — SOLID e Object Calisthenics

> Normativo para o frontend refatorado (`14-frontend-react-ts-arquitetura.md`). Cada regra vem com
> **exemplo do próprio domínio** e, quando necessário, com a **adaptação honesta** ao contexto
> React/TypeScript funcional — aplicar as 9 regras ao pé da letra em componentes React produz código
> pior, e este documento diz explicitamente onde e por quê.

---

## 1. SOLID aplicado a este projeto

### S — Single Responsibility
Cada módulo tem **um motivo para mudar**.

| Camada | Muda quando… |
|---|---|
| `domain/` | a **regra de negócio** muda (ex.: nova regra de status) |
| `application/` | um **fluxo** muda (ex.: exportação passa a incluir outra aba) |
| `infrastructure/` | a **origem do dado** muda (mock → HTTP na Fase 2) |
| `ui/` | a **apresentação** muda (nova coluna, nova aba) |

> ❌ O `app.js` v1 violava isso: renderização, regra de status, filtro e exportação no mesmo arquivo —
> por isso uma mudança de coluna arriscava quebrar o cálculo de status.

### O — Open/Closed
Aberto para extensão, fechado para modificação.
- Adicionar a fonte **HTTP** (Fase 2) = **criar** um adapter novo, **sem alterar** domínio nem UI.
- Trocar o extrator de CNPJ mock → **Marker** (P-09) = novo adapter do mesmo port.

### L — Liskov
Qualquer implementação de um port é substituível sem quebrar quem a usa.
- `FornecedorRepositoryEmMemoria` e `FornecedorRepositoryHttp` respeitam o mesmo contrato:
  ambos retornam **apenas fornecedores ativos**, já normalizados. Nada de "o mock filtra, o HTTP não".

### I — Interface Segregation
Ports **pequenos e específicos**, em vez de um provider gordo.
> ❌ v1: um único `dataProvider` com `listFornecedores`, `listChamados`, `listAlertas`,
> `listMensagens`, `resolverContrato`.
> ✅ Agora: `FornecedorRepository`, `ChamadoRepository`, `AlertaRepository`, `ContratoRepository`,
> `ExtratorCnpjDaNota` — quem só precisa de alertas não depende de chamados.

### D — Dependency Inversion
UI e casos de uso dependem de **abstrações**; os detalhes são injetados no Composition Root.
É o que torna a **troca mock → API (A-22)** uma mudança de **um arquivo**.

---

## 2. Object Calisthenics — as 9 regras

### Regra 1 — Um nível de indentação por método
Usar **guard clauses** e extrair funções.

```ts
// ❌
function classificar(registros) {
  if (registros.length > 0) {
    if (registros.some(r => r.finalizado)) { return 'Recebido'; }
    else { return 'Enviado'; }
  } else { return 'Pendente'; }
}

// ✅
function classificar(chamados: Chamados): StatusNf {
  if (chamados.vazio()) return StatusNf.pendente();
  if (chamados.algumFinalizado()) return StatusNf.recebido();
  return StatusNf.enviado();
}
```

### Regra 2 — Não usar `else`
Retorno antecipado. No JSX, preferir **early return** de componente ou renderização por mapa de
estados a ternários aninhados.

```tsx
// ❌ ternário aninhado no JSX
{status === 'Pendente' ? <A/> : status === 'Enviado' ? <B/> : <C/>}

// ✅
const BADGES = { Pendente: BadgePendente, Enviado: BadgeEnviado, Recebido: BadgeRecebido } as const;
const Badge = BADGES[status];
return <Badge />;
```

### Regra 3 — Encapsular todos os primitivos
**A regra mais importante deste projeto.** `string` não é CNPJ, e-mail nem competência.
Ver os Value Objects em `14` §5 — foi a ausência deles que fez o bug do CNPJ voltar 4 vezes.

```ts
// ❌  cnpj: string      → permite comparar máscara com dígitos
// ✅  cnpj: Cnpj        → só existe uma forma de comparar
```

### Regra 4 — First-class collections
Uma classe cujo único atributo é uma coleção, com os comportamentos dela.
Ver `14` §6 (`LinhasDeStatus`, `Alertas`) — elimina as **4 cópias** do filtro.

### Regra 5 — Um ponto por linha
Objetivo real: **Lei de Demeter** (não navegar na estrutura interna dos outros).

```ts
// ❌ navega no interior do fornecedor
if (linha.fornecedor.contato.email.valor === buscado) { ... }

// ✅ pergunta ao objeto
if (linha.temEmail(buscado)) { ... }
```

> **Adaptação:** encadear operações de coleção (`.filter().map()`) e chamadas fluentes do próprio
> objeto (`linhas.filtradasPor(x).ordenadasPor(y)`) **é permitido** — não viola Demeter.

### Regra 6 — Não abreviar
`competencia`, não `comp`. `fornecedor`, não `forn`. `quantidade`, não `qtd`.
Exceções consagradas: `id`, `url`, `cnpj`, `props`.

### Regra 7 — Manter entidades pequenas
Limites **aplicados por lint** (§4):

| Item | Limite |
|---|---|
| Arquivo | **150 linhas** |
| Função / método | **40 linhas** (até 150 em `src/ui/**/*.tsx`) |
| Componente React | **150 linhas** (senão, extrair subcomponente) |
| Parâmetros | **3** (mais que isso: objeto nomeado) |
| Complexidade ciclomática | **8** |

> Referência: `app.js` tinha **797 linhas** — 5× o limite de arquivo.

### Regra 8 — Máximo 2 atributos de instância
**Aplicável ao `domain/`** (VOs e entidades pequenas e coesas).

> **Adaptação para React (obrigatória):** componentes não têm "atributos de instância" e entidades de
> negócio legítimas (um `Chamado` tem protocolo, e-mail, datas, tipo…) violariam a regra sem ganho.
> **Como aplicamos:**
> - **VOs:** no máximo 2 campos — sem exceção.
> - **Entidades:** agrupar campos correlatos em VOs (ex.: `PeriodoDoChamado { abertura, finalizacao }`)
>   em vez de campos soltos.
> - **Componentes React:** no máximo **4 props**; acima disso, agrupar em objeto coeso ou dividir o
>   componente. Props "de dados" já chegam como um objeto de view.

### Regra 9 — Sem getters/setters
Objetos expõem **comportamento**, não estado cru.

```ts
// ❌  competencia.getValor()  →  quem chama decide como formatar (e erra)
// ✅  competencia.paraExibicao()   // "07/2026"
//     competencia.paraArmazenamento() // "07-2026"
//     competencia.mesmoPeriodoDe(outra)
```

> **Adaptação para React (obrigatória):** a UI **precisa ler valores** para renderizar. Permitido:
> - Métodos de **apresentação** nos VOs (`paraExibicao()`), nunca getters crus.
> - **DTOs de leitura** (`type LinhaDeStatusView = { … }`) na **fronteira** domínio → UI, produzidos
>   por um método do domínio (`linhas.paraView()`), com campos `readonly`.
> - **Proibido:** a UI receber a entidade e formatar por conta própria — foi assim que a máscara de
>   CNPJ acabou implementada em 4 lugares diferentes.

---

## 3. Regras específicas de React/TypeScript

1. **`strict: true`** no TS. Proibido `any`; use `unknown` + narrowing.
2. **Sem lógica de negócio em componente.** Se tem `if` decidindo regra, pertence ao domínio.
3. **Sem `useEffect` para derivar dado** — derive na renderização ou no domínio. `useEffect` só para
   efeitos externos (buscar dados, assinar eventos), sempre com **cleanup/cancelamento** (`14` §10).
4. **Sem `innerHTML`/manipulação direta do DOM.**
5. **Chaves de lista estáveis** — usar o `id` do chamado, nunca o índice.
6. **Formatação vem do domínio** (`paraExibicao()`), não de helpers soltos na UI.
7. **Nomes de domínio em português**, alinhados ao glossário (`00`): `Fornecedor`, `Chamado`,
   `Competencia`, `Alerta`, `TipoLancamento`. Consistência com a base de conhecimento importa mais
   que a convenção anglófona.

---

## 4. Enforcement automático

Padrão só vale se a máquina cobrar. Configuração mínima:

**`tsconfig.json`**
```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**ESLint (regras que materializam Object Calisthenics)**
```jsonc
{
  "rules": {
    "max-depth": ["error", 1],                 // Regra 1
    "no-else-return": ["error", { "allowElseIf": false }], // Regra 2
    "max-lines": ["error", 150],               // Regra 7
    "max-lines-per-function": ["error", 40],   // Regra 7 (150 em src/ui/**/*.tsx)
    "max-params": ["error", 3],                // Regra 7
    "complexity": ["error", 8],                // Regra 7
    "id-length": ["error", { "min": 3, "exceptions": ["id", "a", "b"] }], // Regra 6
    "@typescript-eslint/no-explicit-any": "error",
    "react-hooks/exhaustive-deps": "error"
  }
}
```

**Fronteiras de dependência** (impede que a arquitetura apodreça):
```jsonc
"import/no-restricted-paths": ["error", { "zones": [
  { "target": "./src/domain",      "from": ["./src/ui", "./src/infrastructure", "./src/application"] },
  { "target": "./src/application", "from": ["./src/ui", "./src/infrastructure"] }
]}]
```
> Essa regra é o que garante, mecanicamente, que regra de negócio **nunca mais** vá parar na UI.

---

## 5. Testes como parte do padrão

A v1 não tinha testes porque as regras estavam presas ao DOM. Com o domínio isolado, passam a ser
obrigatórios:

| Alvo | Tipo | Exemplos mínimos |
|---|---|---|
| Value Objects | unitário | `Cnpj` casa máscara × dígitos; `Competencia.deTextoLivre('Julho/2026')` → `07-2026` |
| `MotorDeStatus` | unitário | Pendente/Enviado/Recebido; `Ambas` = 1 linha; 2 chamados = 2 linhas |
| `ResolucaoDeContrato` | unitário | 1 contrato direto; >1 via CNPJ; sem match → Tratamento Manual |
| `LinhasDeStatus` | unitário | filtro por status e busca; **rollup** dos contadores |
| Componentes | integração (RTL) | abas, modal por PJ (inclusive PJ Pendente), botão EXCEL |

> Os cenários de `08-mocks-e-testes.md` deixam de ser checklist manual e viram **suíte automatizada**.
