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

確認内容:

- `content.js` の構文確認
- レガシー `hidden` 参照が残っていないこと
- JSON 書き出し / 読み込みの主要フックが残っていること
- ヘッダの同期状態表示フックが残っていること
