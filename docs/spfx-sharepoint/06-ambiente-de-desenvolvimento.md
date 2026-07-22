---
titulo: SPFx — Ambiente de Desenvolvimento e Versão do Framework
dominio: infraestrutura
tags: [spfx, ambiente, node, npm, gulp, node-sass, typescript, versao, toolchain, windows]
status: normativo
---

# Ambiente de Desenvolvimento SPFx

> **Premissa implícita de toda esta pasta:** o toolchain do SPFx é **legado e sensível a versão**.
> As regras deste documento valem para **qualquer** trabalho no projeto SPFx e **não** precisam ser
> repetidas nas demais tarefas — são pressupostas.
>
> Baseado no ambiente já validado em `C:\Projetos-SPFx\CORRECAO-SPFX.md` (SPFx 1.11 + Node 10 portátil).

## 1. Regra de ouro do ambiente

> **O SPFx não roda no Node.js global da máquina.** O Node global é **24.x**; o toolchain do SPFx
> legado exige **Node 10**. Toda invocação de build/serve deve usar o **Node portátil do projeto**.

Sintoma clássico de violar isso:
```
Node Sass does not yet support your current environment:
Windows 64-bit with Unsupported runtime (137)
```
O runtime **137 = Node 24**. O erro **não** se resolve instalando Python 2 nem `node-gyp` — é
incompatibilidade de versão de Node.

## 2. Configuração obrigatória do projeto

### 2.1 Node portátil + `.nvmrc`
```
node10/node-v10.24.1-win-x64/node.exe     ← Node 10.24.1 (npm 6.14.12)
.nvmrc → 10.24.1
```

### 2.2 `engines` no `package.json`
```json
"engines": { "node": ">=10.13.0 <11.0.0", "npm": ">=6.4.1 <7.0.0" }
```

### 2.3 Scripts apontando para o Node portátil
```json
"scripts": {
  "build": ".\\node10\\node-v10.24.1-win-x64\\node.exe .\\node_modules\\gulp\\bin\\gulp.js bundle",
  "clean": ".\\node10\\node-v10.24.1-win-x64\\node.exe .\\node_modules\\gulp\\bin\\gulp.js clean",
  "serve": ".\\node10\\node-v10.24.1-win-x64\\node.exe .\\node_modules\\gulp\\bin\\gulp.js serve",
  "test":  ".\\node10\\node-v10.24.1-win-x64\\node.exe .\\node_modules\\gulp\\bin\\gulp.js test"
}
```
> Assim `npm run serve` funciona mesmo com `node --version` mostrando 24 — **sem** mexer no `PATH`.

### 2.4 Instalação de dependências
```powershell
& '.\node10\node-v10.24.1-win-x64\node.exe' `
  '.\node10\node-v10.24.1-win-x64\node_modules\npm\bin\npm-cli.js' `
  install --scripts-prepend-node-path=true
```
Resultado esperado: `node-sass 4.12.0` com `win32-x64-64_binding.node` e
`package-lock.json` em **`lockfileVersion: 1`** (npm 6).

## 3. Regras permanentes (implícitas em todas as tarefas)

| Regra | Motivo |
|---|---|
| ❌ **Nunca** rodar `npm audit fix` | Atualiza dependências para versões incompatíveis e **quebra** o toolchain legado. Os avisos de vulnerabilidade são **esperados** |
| ❌ Nunca instalar com o Node global | Compila `node-sass` para o runtime errado |
| ✅ `"isDomainIsolated": false` em `package-solution.json` | Web parts com domínio isolado foram **descontinuadas** no SharePoint Online |
| ✅ `gulp trust-dev-cert` (uma vez) | Certificado HTTPS local do workbench |
| ✅ Testar no **workbench hospedado** | `https://<tenant>.sharepoint.com/_layouts/15/workbench.aspx` — o workbench local **não** tem contexto real de usuário (sem `pageContext.user`, sem `AadHttpClient`) |
| ⏳ Build lento é normal | Gulp 3 + toolchain antigo levam minutos |
| 📌 Versões fixadas por compatibilidade | Ex.: `"@types/prop-types": "15.7.0"` — versões novas usam sintaxe que o TS do SPFx não entende |

> O item do **workbench hospedado** é especialmente relevante aqui: como a identidade e o
> `AadHttpClient` (`02`) só existem com contexto real, **testes de autenticação não funcionam no
> workbench local**.

## 4. 🔴 Conflito crítico: SPFx 1.11 × código atual

O ambiente validado usa **SPFx 1.11 → TypeScript 3.3**. O código do nf-pjs hoje usa **TypeScript 5.4.5**.
Isso **não é ajuste de configuração** — é incompatibilidade de **linguagem**.

### 4.1 Medição no código atual

| Recurso | Exige | Situação no projeto |
|---|---|---|
| `?.` (optional chaining) | TS **3.7** | **3 ocorrências** |
| `??` (nullish coalescing) | TS **3.7** | **17 ocorrências** |
| — | — | **15 arquivos** afetados no total |
| `noUncheckedIndexedAccess` | TS **4.1** | ativo no `tsconfig.json` |
| `noImplicitOverride` | TS **4.3** | ativo |
| `exactOptionalPropertyTypes` | TS **4.4** | ativo |
| `target: ES2022` | TS **4.6+** | ativo |
| React | — | projeto em **18**; SPFx 1.11 traz **16.8** |

### 4.2 O que custaria manter o SPFx 1.11

1. Reescrever `?.` e `??` em **15 arquivos** (verboso e propenso a erro em código de domínio).
2. **Remover 3 flags de `strict`** — exatamente as que sustentam os padrões de `docs/15` §4.
3. Rebaixar `target` para ES5/ES2017.
4. Adequar React 18 → 16.8.
5. Conviver com `node-sass`, gulp 3 e Node 10 (fim de vida desde 2021).

> Ou seja: adotar 1.11 **desfaz parte da qualidade** que acabou de ser conquistada — inclusive as
> correções C-01/C-02 de `docs/17`, que dependem de tipagem estrita para não regredirem.

### 4.3 Recomendação

> **Não usar SPFx 1.11 para este projeto.** Escolher uma **versão moderna do SPFx**.

O tenant é **SharePoint Online** (o próprio `CORRECAO-SPFX.md` cita workbench hospedado, App Catalog
e a descontinuação de domínio isolado no SPO) — e o SPO **suporta as versões atuais do SPFx**.
SPFx 1.11 é de 2020 e existe principalmente para compatibilidade com SharePoint **on-premises**.

Uma versão moderna entrega **Node 18+**, **TypeScript 4.7+** e **React 17**, o que:
- torna `?.` e `??` válidos (**zero reescrita**);
- mantém as três flags de `strict` (todas ≤ TS 4.4);
- elimina `node-sass`/Node 10 (usa `sass` e gulp 4);
- reduz o ajuste de React a **18 → 17** (o código não usa APIs exclusivas do 18).

**A decisão da versão é S-01** (`05`) e **precede** a etapa 1 do plano (`04`).

### 4.4 Se ainda assim for obrigatório usar 1.11

Tratar como **decisão consciente de dívida técnica**, registrando em `05`:
- Documentar a remoção das flags como **exceção explícita** a `docs/15` §4 (não como padrão novo).
- Manter `domain/` e `application/` compilando **também** com o TS moderno via `tsc --noEmit`
  separado, para não perder a checagem estrita (o SPFx compila com o TS antigo; a verificação de
  qualidade roda em paralelo com o moderno).
- Manter o **Vitest rodando no Node moderno** sobre o núcleo (`01` §5) — ele não depende do SPFx.

## 5. Dois runtimes convivendo (independente da versão escolhida)

| Tarefa | Runtime |
|---|---|
| `gulp serve` / `bundle` / `package-solution` | **Node do SPFx** (10 no 1.11; 18+ no moderno) |
| **Vitest** sobre `domain/` + `application/` | **Node moderno** — é TypeScript puro, não depende do SPFx |
| `tsc --noEmit` de verificação estrita | **Node moderno** |

> Isso é possível justamente porque o núcleo é **framework-free** (`01` §1). Documentar claramente
> qual script usa qual runtime, para não repetir o erro do runtime 137.
