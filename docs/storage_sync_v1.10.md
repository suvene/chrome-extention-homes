# storage_sync_v1.10.md

## 目的
- HOME'S / SUUMO の一覧で付けたステータスとコメントを、同じブラウザ内の `chrome.storage.local` に保存する。
- 読み込んだ掲載の台帳をローカルに保持し、物件名・住所・家賃の一致候補から紐づきを判断・再編集できるようにする。
- JSON の書き出しと読み込みで、状態だけでなく掲載台帳と紐づき情報も救済できるようにする。

## 保存方針
- 正本の保存先は `chrome.storage.local` とする。
- 状態は `homes_state_v1` に `listingId -> { color, comment, title, updatedAt }` で保持する。
- 掲載台帳は `homes_listing_registry_v1` に `listingId -> { site, name, address, rent, detailUrl, fingerprint, lastSeenAt }` で保持する。
- 手動の紐づき group は `homes_link_group_v1` に `listingId -> groupId` で保持する。
- `groupId` がない掲載は、`auto:<fingerprint>` を実効 group として扱う。
- `groupId` がある掲載は、その manual group を正本として扱う。
- fingerprint は、正規化した `物件名 + 住所 + 家賃` から導く。
- detail URL は query 順や hash の揺れを正規化して保持し、手動リンクの検索キーとしても使う。
- 正規化では全角/半角英数、空白、ハイフン、丁目/番地表記の揺れを吸収する。
- 家賃は base rent のみを使い、管理費は fingerprint に含めない。
- fingerprint を作れない掲載は自動候補を持たず、listingId 単位でのみ扱う。
- 旧実装の `chrome.storage.sync` と旧 local key は初回だけ読み、`homes_state_v1` へ移行する。

## 反映方針
- ステータスとコメントは、現在の掲載が属する実効 group 全体へ同じ値を書き戻す。
- `この掲載の紐づけを解除` は、現在の掲載だけを新しい manual group へ分離する。
- 候補一覧の行ボタンから、対象掲載ごとに `リンク` / `解除` を直接反映する。

## JSONバックアップ方針
- JSON書き出しは、状態、掲載台帳、紐づき group をまとめて出力する。
- 書き出しファイル名は `rent-condition-notes-YYMMDD-HHMMSS.json` とし、状態データの `updatedAt` 最大値を基準にする。
- 状態データが 1 件もない場合だけ、書き出し実行時刻へ fallback する。
- 書き出し形式の正本は次とする。

```json
{
  "schemaVersion": 2,
  "exportedAt": 1713360000000,
  "states": {
    "room:a0649336242d91a967a399930c6e5ef1e6d33ebd": {
      "color": "1",
      "comment": "要確認",
      "title": "サンプル物件",
      "updatedAt": 1713350000000
    }
  },
  "listings": {
    "room:a0649336242d91a967a399930c6e5ef1e6d33ebd": {
      "site": "homes-condition1",
      "name": "サンプル物件",
      "address": "東京都品川区南大井1-2-3",
      "rent": "5.5万円",
      "detailUrl": "https://www.homes.co.jp/chintai/room/a0649336242d91a967a399930c6e5ef1e6d33ebd/",
      "fingerprint": "sample|tokyo|5.5",
      "lastSeenAt": 1713360000000
    }
  },
  "linkGroups": {
    "room:a0649336242d91a967a399930c6e5ef1e6d33ebd": "manual:abc123"
  }
}
```

- `schemaVersion: 1` の旧 JSON と、以前の「物件ID -> 状態」の素の JSON も引き続き読み込める。
- `schemaVersion: 2` の読み込みでは `states` `listings` `linkGroups` をそれぞれ local へ復元する。
- 同じ `listingId` が現在データと JSON の両方にある場合は、状態は `updatedAt` が新しい方、掲載台帳は `lastSeenAt` が新しい方を採用する。
- JSON に存在しない現在データは削除しない。

## UI方針
- 各掲載 panel に `紐づき N件` を表示する。
  ここでの `N` は自分自身を含まず、他の掲載との紐づき件数だけを数える。
- 同一サイト内で manual link group に入った重複掲載は、ページ上では先頭の 1 件だけを表示し、2 件目以降は非表示にする。
- `紐づけ一覧` には site、物件名リンク、家賃、住所、状態ラベルを表示する。
- `紐づけ一覧` に自分自身の掲載は表示しない。
- linked な掲載には `解除` ボタンを表示し、その行だけ current listing から個別に切り離せるようにする。
- 候補掲載には `リンク` ボタンを表示し、その行だけ current listing の manual link group へ参加させる。
- `詳細URLを貼り付けてリンク` では、台帳に保存済みの detail URL と一致する掲載を見つけ、fingerprint が一致しなくても manual link group へ参加させられる。
