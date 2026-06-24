# 🎨📦 Frontend Unificado & Distribuição (Instaláveis) — ContaHub

> Plano de implementação para (1) unificar o **design da marca** em todos os
> apps e (2) gerar os **instaláveis** desktop (Windows + macOS).
> Complementa `CLAUDE.md`, `ROADMAP.md` e `docs/IMPLEMENTATION_PLAN.md`.
>
> **Decisões (jun/2026, owner):** redesenhar **todos** os apps para a marca; o
> design system fica em **pacote compartilhado**; entregar os apps desktop
> **instaláveis** para **Windows e macOS**.

---

## 1. Estado atual (auditoria)

Todas as telas estão **implementadas e funcionais** (sem stubs). O problema é de
**consistência visual**: o design da marca só está 100% aplicado em um app.

| App                       | Telas                                                                        | Design da marca                                                                             |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **desktop-contabilidade** | Login, Dashboard, Empresas, Funcionários (+Excel), Lotes, Documentos, Config | ✅ **Referência** — brand `#7DC82E`, tokens `ink`, sidebar escura, `components/ui`, DM Sans |
| **desktop-empresa**       | Login, Dashboard, Documentos, Funcionários, Conta                            | ❌ Tailwind genérico (cinza); `tailwind.config` vazio; sem `components/ui`                  |
| **mobile**                | Login, OTP, Início, Documentos, Perfil                                       | ⚠️ Identidade própria em **teal `#0d9488`** (não a verde da marca)                          |
| **admin (web)**           | Login, Dashboard, Convites, Tenants, Planos, Subscriptions                   | ⚠️ Accent **violet** (painel interno do owner)                                              |

**Tokens da marca (referência — `desktop-contabilidade/tailwind.config.ts`):**

- `brand`: DEFAULT `#7DC82E`, light `#EBF7D4`, muted `#F4FAE9`, dark `#5FA01E`, darker `#4A7D16`
- `ink`: `#111214` / `ink-muted` `#6B7280` / `ink-faint` `#9CA3AF` / `ink-xfaint` `#C4C9D4`
- `sidebar`: `#101214` (+ item/border/next)
- Fonte: **DM Sans** · `shadow-card` · `rounded-panel` (1.25rem)
- Componentes: `Card`, `Button`, `Badge`, `Input`, `Select`, `Campo`, `Modal`, `PageHeader`, `EmptyState`, `Spinner`, `AlertaErro`

---

## 2. Arquitetura proposta (pacote compartilhado)

Dois níveis de compartilhamento, para não duplicar e atender web + React Native:

```
packages/
  design-tokens/          ← preset Tailwind (cores/fontes/sombras/raios da marca)
    preset.cjs            (zero dependências; lido por TODOS os tailwind configs)
  ui-desktop/             ← @contabhub/ui-desktop (componentes React WEB da marca)
    src/components/ui/*   (Card, Button, Badge, PageHeader, Modal, … extraídos do
                           desktop-contabilidade)
```

- **`@contabhub/design-tokens`** → um **preset** Tailwind. Cada app referencia:

  ```ts
  // tailwind.config.ts
  import preset from '@contabhub/design-tokens/preset'
  export default { presets: [preset], content: [...] }
  ```

  Funciona para os **2 desktops** (Tailwind), o **mobile** (NativeWind lê o mesmo
  config) e o **admin** (Tailwind). Uma só fonte da verdade para as cores.

- **`@contabhub/ui-desktop`** → os **componentes React web** da marca (hoje em
  `apps/desktop-contabilidade/src/components/ui`). Consumido pelos **2 apps
  desktop**. O **mobile** NÃO importa este pacote (são componentes RN próprios);
  ele compartilha apenas os **tokens** via preset. O **admin** continua com seu
  `@contabhub/ui` (web), apenas re-tematizado pelos tokens.

> Por que separar tokens e componentes: o mobile (React Native) não pode importar
> componentes web (React DOM). Tokens são agnósticos; componentes não.

---

## 3. Fases — Design unificado

### Fase D0 — Pacote de tokens (`@contabhub/design-tokens`)

**Escopo:** criar o pacote com o preset Tailwind (brand, ink, sidebar, fonte,
sombras, raios). Apontar os **4** `tailwind.config` para o preset.

**DoD**

- [ ] `packages/design-tokens/preset.cjs` com todos os tokens da marca.
- [ ] Os 4 apps compilam consumindo o preset (sem mudança visual no
      desktop-contabilidade, que já usa esses valores).
- [ ] `pnpm type-check`/`lint`/`build` verdes.

### Fase D1 — Pacote de componentes desktop (`@contabhub/ui-desktop`)

**Escopo:** extrair `components/ui` do desktop-contabilidade para o pacote;
o desktop-contabilidade passa a importar de `@contabhub/ui-desktop` (refactor
**sem mudança visual**).

**DoD**

- [ ] Componentes movidos; `desktop-contabilidade` importa do pacote.
- [ ] Zero diferença visual no desktop-contabilidade (paridade pixel).
- [ ] `type-check`/`lint`/`build` verdes.

### Fase D2 — Redesign do `desktop-empresa` (prioritário)

**Escopo:** preset + `@contabhub/ui-desktop`; refazer as 5 telas (Login,
Dashboard, Documentos, Funcionários, Conta) com `PageHeader` + `Card` + marca +
sidebar escura, **mantendo a lógica que já funciona** (queries, auth, signed URLs).

**DoD**

- [ ] As 5 telas com paridade visual ao desktop-contabilidade.
- [ ] Sidebar e Layout usando os tokens da marca.
- [ ] Nenhuma regressão funcional (login CNPJ+senha, documentos, etc.).

### Fase D3 — Mobile na marca

**Escopo:** aplicar o preset no `tailwind.config` do mobile (NativeWind),
trocando **teal `#0d9488` → verde `#7DC82E`**; ajustar os componentes RN
(botões, badges, header, tab bar) e ícones/realces para a marca.

**DoD**

- [ ] Nenhuma cor teal remanescente; identidade verde da marca.
- [ ] Telas (Login, OTP, Início, Documentos, Perfil) revisadas.

### Fase D4 — Admin na marca (cosmético)

**Escopo:** re-tematizar o accent **violet → brand** no admin (preset +
ajuste do `@contabhub/ui`). É painel interno; prioridade menor.

**DoD**

- [ ] Accent da marca no admin; sem violet hardcoded.

---

## 4. Fases — Instaláveis (Windows + macOS)

> Pré-requisito de build: os apps já compilam o frontend (`pnpm build` ok). O que
> falta é o empacotamento nativo do Tauri.

### Fase I0 — Ícones (bloqueador atual)

`tauri.conf.json` referencia `src-tauri/icons/*` que **não existem** → `tauri
build` falha. Gerar a partir de um PNG fonte (1024×1024):

```bash
pnpm --filter desktop-contabilidade tauri icon caminho/logo.png
pnpm --filter desktop-empresa       tauri icon caminho/logo.png
```

**DoD:** pasta `icons/` gerada nos dois apps (32x32, 128x128, @2x, .ico, .icns).

> Sem logo definitivo, geramos um **placeholder** com a marca verde para
> destravar os testes, e trocamos depois.

### Fase I1 — Updater (decidir)

O plugin `tauri-plugin-updater` está registrado, mas **não há config** em
`tauri.conf.json` (sem `plugins.updater`/`pubkey`/`endpoints`).

- **Opção A (recomendada agora):** **remover** o updater até existir um servidor
  de updates — evita config morta e simplifica o primeiro build.
- **Opção B:** configurar: `tauri signer generate` → `pubkey` + `endpoints`
  (ex.: bucket público `https://updates.contahub.com.br/{app}/{target}/{version}`).

**DoD:** updater removido **ou** configurado com chaves/endpoint.

### Fase I2 — Variáveis de build

O app inlina `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` em build time. O CI de
release precisa injetá-las (via GitHub Secrets), senão o app instalado não
conecta ao Supabase.

**DoD:** secrets `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` documentados e
usados no workflow.

### Fase I3 — Workflow de release (matrix Windows + macOS)

`.github/workflows/release.yml` usando **`tauri-apps/tauri-action`**, disparado
por tag `v*`:

```yaml
name: Release Desktop
on:
  push:
    tags: ['v*']
jobs:
  build:
    strategy:
      matrix:
        include:
          - { os: windows-latest, app: desktop-contabilidade }
          - { os: macos-latest, app: desktop-contabilidade }
          - { os: windows-latest, app: desktop-empresa }
          - { os: macos-latest, app: desktop-empresa }
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - uses: dtolnay/rust-toolchain@stable
      - run: pnpm install --frozen-lockfile
      - uses: tauri-apps/tauri-action@v0
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        with:
          projectPath: apps/${{ matrix.app }}
          tagName: ${{ github.ref_name }}
          releaseName: '${{ matrix.app }} ${{ github.ref_name }}'
```

Gera, por OS:

- **Windows:** `.msi` (WiX) e/ou `.exe` (NSIS)
- **macOS:** `.dmg` e `.app` (universal, se configurado)

**DoD:** tag `v0.1.0` → release no GitHub com os 4 bundles (2 apps × 2 SOs)
anexados.

### Fase I4 — Assinatura de código (antes do GA público)

Sem assinatura, o **Windows SmartScreen** alerta "editor desconhecido" e TI
corporativa/antivírus podem bloquear; no macOS, Gatekeeper bloqueia apps não
notarizados.

- **Windows:** certificado **Code Signing** (OV ou **EV**; EV evita o alerta de
  reputação). Configurar `certificateThumbprint` + `timestampUrl` (ou assinar no
  CI com o cert via secret).
- **macOS:** **Apple Developer ID** (US$ 99/ano) + **notarização** (o
  `tauri-action` suporta via secrets `APPLE_*`).

**Estratégia:** **beta interno sem assinar** (instalável com aviso) → **assinar
antes do lançamento público**.

**DoD:** instaláveis assinados (Win) e notarizados (mac) gerados pelo CI.

---

## 5. Ordem recomendada e dependências

```
D0 (tokens) ─┬─► D1 (ui-desktop) ─► D2 (empresa)
             ├─► D3 (mobile)
             └─► D4 (admin)

I0 (ícones) ─► I1 (updater) ─► I2 (env) ─► I3 (release CI) ─► I4 (signing)
```

- **D0 e I0** são as fundações e destravam o resto.
- D e I são independentes entre si e podem andar em paralelo.
- Sugestão de sprint: **D0 → D1 → D2** (fecha o gap visual mais crítico) em
  paralelo com **I0 → I3** (já produz instaláveis de teste), e depois D3/D4/I4.

---

## 6. O que depende de você

- [ ] **Logo PNG 1024×1024** (ou autorização para usar um placeholder da marca).
- [ ] Decisão do **updater** (remover agora vs. configurar).
- [ ] **Secrets** no GitHub: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
      (produção). Para assinatura: cert Windows + conta Apple Developer.
- [ ] Confirmar `productName`/identifiers para a loja/instalador (hoje
      `ContaHub Contabilidade` / `ContaHub Empresa`).

---

_Documento vivo. Atualizar conforme as fases forem concluídas._
