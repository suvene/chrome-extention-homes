# site_addition_workflow_v1.1.md

## 目的
- 新しい賃貸一覧サイトを追加するとき、毎回同じ順番で判断・実装・検証できるようにする。
- `docs/todo.md` の上書きで site 追加ごとの TODO が失われないよう、versioned な TODO の残し方も手順へ含める。

## 手順
1. `docs/todo_vX.Y.md` を最初に作る。
   site 追加の scope、実装順、検証観点は `docs/todo.md` ではなく versioned TODO に残し、後から判断理由を追えるようにする。
2. 対象 URL と今回の scope を固定する。
   互換維持を広げず、どの一覧 URL までを今回の対応範囲に含めるかを最初に明文化する。
3. `samples/<site>/` に `bundle` と `page-selector` を揃える。
   一覧本体とページャ断片を別 fixture にし、物件名・住所・家賃・詳細URL・ページ送りの selector を後から再確認できるようにする。
4. `content.js` の `SITE_CONFIGS` に必要な hook 一覧を埋める。
   最低でも `matches` `itemSelector` `getListingId` `getLegacyLookupIds` `getName` `getAddress` `getRent` `getDetailUrl` `getDecoratedElements` `mountPanel` `getBuildingContainer` `getContainerCards` `getBundle` `getBuildingBlocks` を揃える。
5. pagination がある場合は URL 規則と insert anchor を先に確定する。
   `次へ` をどう URL に変換するか、どの DOM の手前に次ページ block を差し込むかを sample と実ページの両方で先に固める。
6. manifest / smoke / docs を同じ change に含める。
   対応 URL の `host_permissions` と `content_scripts.matches`、smoke の required pattern、関連 doc の site 名表記を同じ差分で揃える。
7. storage schema は変えない。
   新サイト追加だけなら既存の `homes_state_v1` `homes_listing_registry_v1` `homes_link_group_v1` を流用し、schema 変更が必要なら別タスクに分離する。
8. 検証は `sample 確認 -> smoke -> 実ページ手動確認` の順で行う。
   sample で selector を固定し、`node ./tests/smoke.js` で再利用可能な確認を通し、最後に実ページで表示・保存・ページ送りを確認する。

## 今回の athome 適用メモ
- 対象 URL は `https://www.athome.co.jp/chintai/tokyo/list/` と `pageN/` 配下に限定する。
- sample は `samples/athome/260420-0339_tokyo-list_bundle.html` と `samples/athome/260420-0339_tokyo-list_page-selector.html` を正本にする。
- `athome` は「建物 card + 部屋 row」の構造なので、保存単位は room、建物の非表示判定は container 単位で行う。
- pager は `page` attribute から次ページ番号を取り、`/chintai/tokyo/list/pageN/` へ解決する。
