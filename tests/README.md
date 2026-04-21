# Tests

## Smoke Test

今回の変更で実際に使った確認を、依存なしで再実行できるようにしています。

実行方法:

```bash
node ./tests/smoke.js
```

PowerShell が使える環境では、既存の入口も使えます。

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\smoke.ps1
```

Canary の実ページだけで出る不安定挙動を調べるときは、診断モードの戻し方を [docs/testing_v1.2.md](/Users/hirok/dev/chrome-extention-homes/docs/testing_v1.2.md) で確認してください。

確認内容:

- `content.js` の構文確認
- レガシー `hidden` 参照が残っていないこと
- local-only の状態保存、掲載台帳、link group の主要フックが残っていること
- JSON 書き出し / 読み込みの主要フックが `schemaVersion: 2` と link 情報に対応していること
- HOME'S / SUUMO / athome / Canary の sample fixture が linking 用 selector と page metadata を維持していること
- 紐づけ一覧の detail link、コンパクト表示、詳細URL直リンク、行ボタンベース個別解除のフックが残っていること
- ヘッダの最終更新日時表示フックが残っていること
