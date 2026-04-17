# Storage Sync Design v1.0

## 目的
- HOME'S の一覧で付けた非表示・色分け・コメントを、同じ Google アカウントでログインした Chrome 間で共有する。

## 方針
- 保存先は `chrome.storage.sync` を正本とする。
- 1 つの巨大 JSON ではなく、物件ごとに 1 key で保存する。
- 旧 `chrome.storage.local` の単一 JSON は初回読込時に `updatedAt` を見て同期側へ移行する。
- 既定値に戻ったデータは削除して、同期容量を節約する。

## 非機能
- コメント入力は短い debounce を入れて、過剰書き込みを避ける。
- `chrome.storage.onChanged` を購読し、他タブ・他ブラウザ由来の変更を現在画面へ反映する。

## 制約
- `chrome.storage.sync` の総容量には上限があるため、非常に大量の物件へ長文コメントを付ける用途には将来的な追加対策が必要。
