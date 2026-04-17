# storage_sync_v1.2.md

## 目的
- HOME'S の一覧で付けたステータスとコメントを `chrome.storage.sync` で共有する。
- `condition-list` と `condition1` で一覧粒度が違っても、同じ部屋は同じ状態を引き継ぎやすくする。
- 同期が崩れたときでも、JSON の書き出しと読み込みで状態を救済できるようにする。

## 保存方針
- 正本の保存先は `chrome.storage.sync` とする。
- 保存キーは、取得できるなら `room:<roomId>` を最優先にする。
- `roomId` は `data-kykey` または部屋詳細 URL (`/chintai/room/.../`) から導く。
- 部屋キーが取れない場合だけ `tykey:<tykey>` などの fallback を使う。
- 旧実装の `bid:` `href:` `pkey:` 保存も読み取り対象として残し、画面再表示時に新しい優先キーへ寄せる。
- 状態には `color` `comment` `title` `updatedAt` を保持する。
- 既定状態の物件は保存しない。

## JSONバックアップ方針
- JSON書き出しは、保存済みの全物件状態をまとめてファイル化する。
- 書き出し形式は次の envelope を正本とする。

```json
{
  "schemaVersion": 1,
  "exportedAt": 1713360000000,
  "states": {
    "room:a0649336242d91a967a399930c6e5ef1e6d33ebd": {
      "color": "1",
      "comment": "要確認",
      "title": "サンプル物件",
      "updatedAt": 1713350000000
    }
  }
}
```

- 取り込み時は、以前の書き出し形式だった「物件ID -> 状態」の素の JSON も受け付ける。
- 同一物件IDが現在データとJSONの両方にある場合は、`updatedAt` が新しい方を採用する。
- JSONに存在しない現在データは削除しない。同期崩れの救済を優先し、安全側に倒す。

## 反映方針
- 書き出し前と読み込み前に、コメント編集中の debounce 保存を flush する。
- 読み込み後は `chrome.storage.sync` と画面の両方を更新する。
- JSONの形式が不正な場合は、反映せずにエラーを通知する。
