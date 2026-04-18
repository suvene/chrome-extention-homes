# storage_sync_v1.3.md

## 目的
- HOME'S / SUUMO の一覧で付けたステータスとコメントを `chrome.storage.sync` で共有する。
- 一覧粒度が違っても、同じ部屋は同じ状態を引き継ぎやすくする。
- 同期が崩れたときでも、JSON の書き出しと読み込みで状態を救済できるようにする。

## 保存方針
- 正本の保存先は `chrome.storage.sync` とする。
- 既存 HOME'S データ互換のため、トップレベル key prefix は `homes_condition_note_v2:` を維持する。
- HOME'S は、取得できるなら `room:<roomId>` を最優先にする。
- HOME'S の `roomId` は `data-kykey` または部屋詳細 URL (`/chintai/room/.../`) から導く。
- HOME'S で部屋キーが取れない場合だけ `tykey:<tykey>` などの fallback を使う。
- SUUMO は `suumo-room:<clipkey>` を正本キーとし、`.js-clipkey` を優先して使う。
- SUUMO で `clipkey` が取れない場合だけ、詳細リンクの `bc` query を使って `suumo-room:<bc>` を導く。
- 旧実装の `bid:` `href:` `pkey:` 保存は HOME'S の読み取り対象として残し、画面再表示時に新しい優先キーへ寄せる。
- 状態には `color` `comment` `title` `updatedAt` を保持する。
- 既定状態の物件は保存しない。

## JSONバックアップ方針
- JSON書き出しは、保存済みの全物件状態をまとめてファイル化する。
- 書き出しファイル名は `rent-condition-notes-YYMMDD-HHMMSS.json` とし、書き出し対象データの `updatedAt` の最大値を使う。
- 書き出し対象に更新済みデータが 1 件もない場合だけ、ファイル名は書き出し実行時刻へ fallback する。
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
    },
    "suumo-room:100502014359": {
      "color": "2",
      "comment": "駅近で再確認",
      "title": "グレイス大森海岸 4階 ワンルーム",
      "updatedAt": 1713360000000
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
