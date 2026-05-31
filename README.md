# glossary-site

wand 家系プロジェクト（wand / canon / facet / glance / perch / eventfx / dotfiles）の
**用語集 (`docs/glossary.md`)** から各リポジトリ専用の **静的 SPA** を生成し、
GitHub Pages に自動デプロイするための **tooling 集約リポ**。

各ソースリポは Node 依存を一切持たず、薄い workflow から本リポの
**reusable workflow** を呼ぶだけ。実体（builder + viewer）はここに集約。

## 仕組み

```
[source repo] docs/glossary.md
      │
      └─ push → .github/workflows/glossary.yml
                └─ uses: akira-toriyama/glossary-site/.github/workflows/deploy.yml@main
                            │
                            ├─ checkout caller repo + this repo
                            ├─ packages/builder  → glossary.json  (mermaid は SVG 化して埋込)
                            ├─ packages/viewer   → Vite + React + cmdk バンドル
                            └─ actions/deploy-pages
                                    │
                                    └─ https://akira-toriyama.github.io/<repo>/
```

- **粒度はリポジトリ単位**：横断ビューはなし。各リポは自分の用語だけを持つ。
- **出力は `glossary.json`**：viewer は同じディレクトリの `glossary.json` を `fetch()`。
- **`mermaid` ブロックは事前 SVG 化**：viewer は mermaid runtime を持たない（オフライン動作）。
- **Obsidian フレンドリーな `.md`**：frontmatter（YAML）と `[[wikilink]]` をサポート。

## 構成

| パス | 役割 |
|---|---|
| [`packages/builder/`](packages/builder/) | Node CLI: `glossary.md` → `glossary.json`。mermaid を `@mermaid-js/mermaid-cli` で SVG にレンダリング |
| [`packages/viewer/`](packages/viewer/) | Vite + React + [cmdk](https://github.com/pacocoursey/cmdk)。`glossary.json` を読んで描画する SPA |
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | **Reusable workflow**（`workflow_call`）。各ソースリポから呼ばれる |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | 本リポ単体の lint / build / smoke テスト |
| [`.github/dependabot.yml`](.github/dependabot.yml) | npm + github-actions の週次更新 |

## ローカル開発

```sh
npm install                          # workspace 全部
npm run build:demo                   # 隣の ../repos/wand/docs/glossary.md でテスト build
npm run dev                          # viewer の dev server (localhost:5173)
npm run build:viewer                 # production build
```

`build:demo` はリポジトリ親ディレクトリに wand のクローンがある前提で動く便利スクリプト。

## ソースリポ側の workflow

各ソースリポは `.github/workflows/glossary.yml` を以下のように置く（10 行）:

```yaml
name: Deploy glossary site
on:
  push:
    branches: [main]
    paths: [docs/glossary.md, .github/workflows/glossary.yml]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  deploy:
    uses: akira-toriyama/glossary-site/.github/workflows/deploy.yml@main
```

加えて **Pages を Actions ソースで有効化**（リポ Settings → Pages → Source: GitHub Actions）。

## glossary.json のスキーマ

```ts
type Glossary = {
  repo: string;             // 呼び出し元リポ名 (e.g. "wand")
  title: string;            // .md の h1 (なければ自動)
  generatedAt: string;      // ISO timestamp
  sourceUrl: string;        // docs/glossary.md への GitHub link
  frontmatter: Record<string, unknown>;
  diagrams: { id: string; sectionLabel: string; svg: string }[];
  sections: string[];       // h2 の順序付きリスト
  entries: {
    term: string;           // h3 見出し
    section: string;        // 所属する h2
    body: string;           // 本文 markdown (Don't call it: 行は除外)
    dontcall: string;       // Don't call it: の原文
    aliases: string[];      // dontcall を `,` / `、` で split
    wikilinks: string[];    // [[...]] のターゲット名
    anchor: string;         // slug
  }[];
};
```

## 関連

- 各ソースリポの `docs/glossary.md` は [wand#46](https://github.com/akira-toriyama/wand/pull/46) /
  [chord#33](https://github.com/akira-toriyama/chord/pull/33) で確立した家風に従う
  （日本語主体・コード識別子は英語のまま・mermaid 図入り）。
- 用語の追加・改名はソースリポの `.md` を直すだけで反映される（push → 自動 deploy）。

## License

MIT
