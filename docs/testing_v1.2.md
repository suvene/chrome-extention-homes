# testing_v1.2.md

## 目的
- 今後の修正で、必要なときに `tests/` 配下の確認を迷わず実行できるようにする。
- Canary のように実ページでだけ出る不安定挙動も、再発時に短時間で診断モードへ戻せるようにする。

## 現在のテスト入口
- 再利用可能な最小確認は `tests/smoke.js` に置く。
- Windows / PowerShell 環境では `tests/smoke.ps1` から同じ smoke を呼び出せるようにする。
- 実行方法の詳細は `tests/README.md` を正本とする。

## 実行ルール
- 変更が `content.js` の構文、保存状態、JSON 書き出し / 読み込み、レガシー項目除去に触れる場合は、まず `tests/smoke.js` を実行する。
- PowerShell が使える環境では、必要に応じて `tests/smoke.ps1` を使ってもよい。ただし実体の検証内容は `tests/smoke.js` を正本とする。
- 追加の確認が必要になったら、手順をチャットだけで終わらせず `tests/` に再利用可能な形で保存する。
- 作業完了時は、何を実行したか、何を未実行かを結果に明記する。

## 実行コマンド

```bash
node ./tests/smoke.js
```

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\smoke.ps1
```

## Canary 診断モードの戻し方
- 通常時は `content.js` の `DEBUG_TOOLS_ENABLED` を `false` にして、`DEBUG書き出し` ボタンと永続診断ログを止めておく。
- Canary の実ページで応答停止や IME 中の揺れのような症状が再発したら、まず `DEBUG_TOOLS_ENABLED` を `true` に戻す。
- 有効化後は拡張を再読み込みし、対象ページを開き直してから再現させる。
- 画面上の `DEBUG書き出し` で `rent-condition-debug-*.json` を保存し、`diagnostics` / `observer` / `scan` / `dom` の各項目を確認する。
- 特に確認するイベントは `runtime.error`、`runtime.unhandledrejection`、`observer.suspended`、`scan.deferred.composition`、`canary.normalize`。
- 調査が終わったら `DEBUG_TOOLS_ENABLED` を `false` に戻し、通常状態へ戻す。
