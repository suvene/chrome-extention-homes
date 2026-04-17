# testing_v1.1.md

## 目的
- 今後の修正で、必要なときに `tests/` 配下の確認を迷わず実行できるようにする。

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
