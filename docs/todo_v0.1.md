# TODO v0.1

## 目的
- `site` 追加時の TODO が `docs/todo.md` の上書きで失われないよう、今回から versioned な正本を残す。
- まずは `airdoor` 追加の判断と検証観点をここへ固定し、次回以降も同じ形式で増やせるようにする。

## airdoor 追加
- [x] `https://airdoor.jp/list` の対応範囲を固定する。意図: 対象 URL と pagination の扱いを最初に明文化し、後から互換範囲が広がらないようにするため。
- [x] `samples/airdoor/` に一覧 bundle と page selector の fixture を追加する。意図: selector と URL 規則を後から再確認できるようにするため。
- [x] `content.js` の `SITE_CONFIGS` に `airdoor` adapter を追加し、既存の保存・filter・link 基盤へ載せる。意図: 既存アーキテクチャのまま最小差分で site を増やすため。
- [x] `manifest.json` と `tests/smoke.js` を `airdoor` 前提へ更新する。意図: 実装と再利用可能な検証入口を同じ change でそろえるため。
- [x] site 追加 workflow に versioned TODO 運用を追記する。意図: 次回以降の site 追加でも同じ判断順で履歴を残せるようにするため。

## レビュー
- [x] `airdoor` 対応追加前に `node ./tests/smoke.js` を実行し、既存 smoke の基準を確認する。
- [x] `airdoor` 対応追加後に `node ./tests/smoke.js` を実行する。
- [ ] 手動で `airdoor` 実ページの表示、保存、filter、link UI、pagination を確認する。
