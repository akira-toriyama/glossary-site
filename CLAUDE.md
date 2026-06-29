# CLAUDE.md

Guidance for working in this repository.

## Roadmap board (GitHub Projects)

この repo の issue は集約 Project「roadmap」(akira-toriyama #5・
https://github.com/users/akira-toriyama/projects/5)で管理。Claude もこれに従う:

- 新規 issue は **Inbox** 既定。off-board の open issue を残さない(迷子を作らない)。
- Status(single-select): `Inbox → Backlog → Ready → In Progress → Done` / `Icebox`=someday。Ready は 2〜3(WIP)。
- PR 本文に `Closes #N` を必ず書く → merge で issue 自動 close → 自動 Done。
- 詳細は Project の README。

## Visual identity (DESIGN.md)

viewer の見た目(色・タイポ・spacing・角丸)を変えるときは [`packages/viewer/DESIGN.md`](packages/viewer/DESIGN.md) に従う。これは `packages/viewer/src/styles.css` を写し取った視覚 identity の正本で、**wand 家系(wand / canon / facet / glance / perch / eventfx / dotfiles)全部の生成 glossary サイトに等しく効く**。token を変えるときは styles.css と DESIGN.md を**同一 PR で**更新し、`npx @google/design.md lint packages/viewer/DESIGN.md` を通す(新しいデザインの発明はしない=既存の見た目を保つ)。
