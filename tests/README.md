# Tests

## Smoke Test

今回の変更で実際に使った確認を、依存なしで再実行できるようにしています。

実行方法:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\smoke.ps1
```

確認内容:

- `content.js` の構文確認
- レガシー `hidden` 参照が残っていないこと
- JSON 書き出し / 読み込みの主要フックが残っていること
