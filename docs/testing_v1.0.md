# testing_v1.0.md

## 目的
- 今後の修正で、必要なときに `tests/` 配下の確認を迷わず実行できるようにする。

## 現在のテスト入口
- 再利用可能な最小確認は `tests/smoke.ps1` に置く。
- 実行方法の詳細は `tests/README.md` を正本とする。

## 実行ルール
- 変更が `content.js` の構文、保存状態、JSON 書き出し / 読み込み、レガシー項目除去に触れる場合は、まず `tests/smoke.ps1` を実行する。
- 追加の確認が必要になったら、手順をチャットだけで終わらせず `tests/` に再利用可能な形で保存する。
- 作業完了時は、何を実行したか、何を未実行かを結果に明記する。

## 実行コマンド

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\smoke.ps1
```
