---
version: alpha
name: Glossary Viewer — Zinc & Amber
description: >-
  wand 家系(wand / canon / facet / glance / perch / eventfx / dotfiles)の
  用語集から各リポ専用の静的 SPA を生成する共有 viewer の共通ビジュアル identity。
  明テーマを基調に、zinc(無彩のグレースケール)+ indigo accent + amber の
  注意色で構成する。値は packages/viewer/src/styles.css の実装から抽出。
colors:
  primary: "#4f46e5"
  primary-bg: "#eef2ff"
  primary-fg: "#ffffff"
  secondary: "#71717a"
  neutral: "#f7f7f5"
  surface: "#ffffff"
  on-surface: "#18181b"
  on-surface-strong: "#0a0a0b"
  line: "#e4e4e7"
  line-strong: "#d4d4d8"
  highlight-bg: "#fef3c7"
  highlight-fg: "#78350f"
  warn-bg: "#fef3c7"
  warn-line: "#f59e0b"
  warn-fg: "#92400e"
  code-bg: "#f1f3f5"
  code-fg: "#1f1f23"
typography:
  headline-entry:
    fontFamily: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  headline-app:
    fontFamily: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: "-0.01em"
  body-md:
    fontFamily: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "\"palt\""
  body-sm:
    fontFamily: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.55
  search-input:
    fontFamily: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.4
  item-term:
    fontFamily: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.3
  label-caps:
    fontFamily: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: "0.05em"
  label-chip:
    fontFamily: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1
  label-kbd:
    fontFamily: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace
    fontSize: 10px
    fontWeight: 400
    lineHeight: 1
spacing:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 14px
  xl: 16px
  xxl: 22px
  preview-x: 36px
  preview-y: 28px
  sidebar-width: 380px
  layout-gap: 14px
rounded:
  sm: 6px
  md: 10px
  pill: 999px
components:
  app-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-strong}"
    padding: 12px
  sidebar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
  search-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.search-input}"
  item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: 8px
  item-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-fg}"
    rounded: "{rounded.sm}"
  search-highlight:
    backgroundColor: "{colors.highlight-bg}"
    textColor: "{colors.highlight-fg}"
  stat-chip:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.pill}"
    typography: "{typography.label-chip}"
  tag-chip:
    backgroundColor: "{colors.code-bg}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.pill}"
  since-chip:
    backgroundColor: "{colors.primary-bg}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
  deprecated-chip:
    backgroundColor: "{colors.warn-bg}"
    textColor: "{colors.warn-fg}"
    rounded: "{rounded.pill}"
  kbd:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    rounded: "4px"
    typography: "{typography.label-kbd}"
  dontcall-callout:
    backgroundColor: "{colors.warn-bg}"
    textColor: "{colors.warn-fg}"
    rounded: "{rounded.sm}"
    padding: 12px
  code-inline:
    backgroundColor: "{colors.code-bg}"
    textColor: "{colors.code-fg}"
    rounded: "4px"
---

# DESIGN.md — Glossary Viewer

これは **wand 家系**(wand / canon / facet / glance / perch / eventfx / dotfiles)の
用語集から各リポジトリ専用の静的 SPA を生成する**共有 viewer** の共通ビジュアル
identity である。各リポの glossary サイトはこの 1 つの viewer から生成されるため、
本 DESIGN.md は家系“全部”の glossary サイトに等しく適用される単一の正本となる。

この文書は新しいデザインの提案ではなく、`packages/viewer/src/styles.css` に
すでに実装されている見た目を写し取ったものである。token の値はすべて実 CSS
(`:root` の CSS 変数および各セレクタの実値)から厳密に抽出している。

## Overview

glossary viewer は「読むための道具」であり、装飾より**可読性と検索の速さ**を
最優先する。中立的で静かな明テーマ(off-white の地に zinc グレースケール)を地色とし、
唯一のブランド accent である indigo を「操作・現在地・リンク」にだけ使う。amber 系は
「注意・非推奨・ハイライト」専用で、それ以外には登場しない。

人格は **engineered / quiet / dense**。ターミナル風の等幅フォントを用語・検索・
ラベルに使い、技術ドキュメントとしての精密さを出す一方、本文は OS の system sans
で長文の読みやすさを確保する。家系のどのリポの用語集でも見た目が完全に揃うことで、
「これは同じ家族の道具だ」という一貫した信頼感を与えることを狙う。

レイアウトは左に検索パレット(cmdk)、右にプレビューの 2 ペイン構成。情報密度は高め
だが、余白とカード境界で領域を明確に分け、圧迫感を避ける。

なお実装には `prefers-color-scheme: dark` の暗テーマも併存するが、本 identity の
基調は**明テーマ**であり、token の正準値は明テーマ側を採用する(暗テーマは同じ役割を
保ったままの自動反転として扱う)。

## Colors

パレットは高コントラストの zinc 無彩スケールを土台に、単一の indigo accent と
amber の注意色を載せる構成。

- **Primary / Indigo (#4f46e5):** 唯一のブランド accent。リンク、選択中の項目、
  現在地、フォーカスリング、`since` chip など「操作と現在地」だけに使う。塗りの上の
  文字は **Primary FG (#ffffff)**、淡い面は **Primary BG (#eef2ff)** を使う。
- **Secondary / Zinc (#71717a):** メタ情報・キャプション・プレースホルダ・
  非アクティブなラベル等の控えめなテキスト(`--dim`)。
- **Neutral (#f7f7f5):** すべてのページの地色となる、わずかに暖色寄りの off-white。
  純白を避けることで紙のような落ち着きを出す(`--bg`)。
- **Surface (#ffffff):** ヘッダー・サイドバー・プレビューなどカード面の純白
  (`--card`)。地色 Neutral との明度差だけで面の階層を作る。
- **On-surface (#18181b):** 本文の標準テキスト(`--fg`)。
- **On-surface Strong (#0a0a0b):** 見出し・強調語の最も濃い zinc(`--fg-strong`)。
- **Line (#e4e4e7) / Line Strong (#d4d4d8):** カード境界・区切り線・スクロールバー。
  影に頼らず線で領域を仕切る(`--line` / `--line-strong`)。
- **Highlight (#fef3c7 / #78350f):** 検索ヒット等のテキストハイライト(amber 系の
  地に濃い茶の文字)。
- **Warn (bg #fef3c7 / line #f59e0b / fg #92400e):** 「非推奨」「Don't call it」
  「警告」専用の amber。chip・コールアウト・取り消し線の色に使う。
- **Code (bg #f1f3f5 / fg #1f1f23):** インラインコード・tag chip の地と文字。

WCAG コントラストの注意点は本文末尾の Do's and Don'ts と、PR の wcagNotes に
記録する。ブランド色(indigo / amber)の値は viewer の既存実装に合わせて固定し、
本 DESIGN.md では変更しない。

## Typography

2 系統のフォントを役割で使い分ける。

- **等幅(ui-monospace 系):** 用語名・見出し・検索入力・各種ラベル・chip・kbd・
  グラフのノードなど、「技術的・構造的な要素」すべて。SFMono → Menlo → Consolas
  の OS フォールバックで、ターミナル由来の精密な印象を出す。
- **System sans(-apple-system 系):** 本文の散文。日本語は Hiragino Sans / Yu Gothic
  にフォールバックし、`font-feature-settings: "palt"` で約物を詰めて和文の読みやすさを
  確保する。

代表レベル:

- **Headline (Entry, 28px / 700, 等幅):** プレビュー先頭の用語見出し。`letter-spacing
  -0.01em`、長い識別子のため `word-break` 前提。
- **Headline (App, 15px / 600, sans):** ヘッダーのサイト名。
- **Body (14px / 1.55, sans):** 本文標準。`palt` 有効。
- **Body Small (13px, sans):** 補助本文・related・empty 表示。
- **Search Input (15px / 1.4, 等幅):** cmdk の検索ボックス。caret は indigo。
- **Item Term (13px / 600, 等幅):** 検索結果の用語名。
- **Label Caps (11px / 600, 等幅, letter-spacing 0.05em, uppercase):** セクション
  ラベル・グループ見出し。大文字+字間広めで「機械的な小見出し」を表す。
- **Label Chip (11px, 等幅):** stat / tag / since / deprecated の各 chip。
- **Label Kbd (10px, 等幅):** キーボードショートカット表示。

## Layout

ヘッダー / 本体 / フッターの縦 3 段(`grid-template-rows: auto 1fr auto`、全高
`100vh`)を基本骨格とする。本体は **サイドバー 380px + 残り 1fr** の 2 カラム
グリッドで、検索パレットとプレビューを並べる。

spacing は厳密な等差スケールではなく、実装で多用される値を採用する:
**4 / 6 / 8 / 14 / 16 / 22px**。カードは `gap: 14px` で離し、ページ外周は `16px`
padding。プレビュー内側は左右 **36px** / 上下 **28px** と広めに取り、長文の読みやすさを
優先する。ヘッダー/フッターは左右 22px。

レスポンシブ: `max-width: 720px` で 2 カラムを 1 カラム化し、縦に 45% / 55% へ
分割。外周 padding を 8px に詰め、フッター右側の補助情報は隠す。

## Elevation & Depth

階層は基本的に**境界線と面の明度差**で表す(フラット志向)。地色 Neutral の上に
純白 Surface のカードを置き、`--line` の 1px 境界で囲むのが基本。

影は控えめな 2 段階のみ:

- **Shadow SM** `0 1px 2px rgba(0,0,0,0.04)` — ごく薄い接地影。
- **Shadow MD** `0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.06)` —
  サイドバー / プレビューのカードに使う、2 層の柔らかい浮き。

フォーカス時はサイドバーに indigo のフォーカスリング
(`0 0 0 3px var(--accent-bg)` + Shadow MD)を重ね、操作対象を明示する。
暗テーマでは同じ役割のまま影を濃く(alpha 0.4〜0.5)する。

## Shapes

角丸は 3 段階:

- **Rounded SM (6px):** chip 以外の小要素・item・related・コードブロック・
  view-toggle・本文画像など標準の丸み。
- **Rounded MD (10px):** カード(サイドバー / プレビュー / diagram)の大きめの丸み。
- **Pill (999px):** chip 類の完全な丸み。

kbd・インラインコードなど一部の極小要素のみ実装上 `4px` の独自丸みを使う。
丸みと角は混在させず、すべて統一した丸み言語で揃える。

## Components

- **App Header:** 純白 Surface 地に `--line` の下境界。サイト名(15px/600)・repo
  リンク・stat chip を横並び。
- **Sidebar (cmdk palette):** 純白カード(Rounded MD + Shadow MD)。フォーカス時に
  indigo リング。内部に検索入力・グループ見出し(Label Caps)・item リスト。
- **Search Input:** 透明地・境界なしで純白 Surface カード上に描画(本書では effective
  background を surface とする)。caret と selection が indigo。
- **Item:** 縦積みの用語名+別名。`data-selected="true"` で indigo 塗り + 白文字へ
  反転(Item Selected)。
- **Chips:** すべて pill 形。
  - **Stat chip:** Neutral 地・zinc 文字・`--line` 境界。
  - **Tag chip:** Code BG 地・zinc 文字。
  - **Since chip:** Primary BG 地・indigo 文字・indigo 境界(新規/バージョン情報)。
  - **Deprecated chip:** Warn BG 地・warn 文字・warn-line 境界(非推奨)。
- **Kbd:** Neutral 地・下境界 2px の擬似キーキャップ(`border-bottom-width: 2px`)。
- **Don't-call callout:** Warn BG 地に左 3px の warn-line ボーダー、右肩だけ Rounded SM。
  「こう呼ぶな」を示す家系共通の注意ブロック。
- **Inline code:** Code BG / Code FG・`--line` 境界・4px 丸み。
- **Wikilink:** indigo の破線下線。hover で Primary BG が薄く敷かれる。
- **Graph:** ノードは Surface 矩形 + Line Strong 境界、active で indigo 塗り。
  エッジは Line Strong の細線(opacity 0.5)、active で indigo 実線。

## Do's and Don'ts

- Do: indigo(Primary)は「操作・現在地・リンク」だけに使い、1 画面で乱用しない。
- Do: amber(Warn / Highlight)は「非推奨・注意・検索ヒット」専用に限定する。
- Do: 用語・ラベル・検索など構造要素は等幅、散文本文は system sans、という
  役割分担を守る。
- Do: 階層は影でなく境界線と面の明度差(Neutral 地 / 純白 Surface)で表す。
- Don't: 新しい accent 色を足さない。ブランドは zinc + indigo + amber の 3 系統のみ。
- Don't: 丸みと鋭角を同一ビューで混ぜない(統一した Rounded 言語を保つ)。
- Don't: 純白を地色に使わない(地は必ず Neutral #f7f7f5、純白はカード面のみ)。
- Note(WCAG): tag-chip の zinc 文字(#71717a)を code-bg(#f1f3f5)に置くと 4.34:1 で
  AA(4.5:1)を僅かに下回る。warn-line(#f59e0b)上の warn-fg(#92400e)や Neutral 地の
  Secondary なども厳密には AA 未満の可能性がある。これらはブランド/既存実装の色なので
  本書では値を変えず、人間レビュー用に PR の wcagNotes へ記録する。