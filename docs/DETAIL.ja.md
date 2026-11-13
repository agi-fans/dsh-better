![dsh-better /better リアルタイム深化デモ](demo.gif)

# プロンプト深化ヘルパー (`dsh-better`)

`dsh-better` は、[`pi-better`](https://github.com/nicobailon/pi-better) によるリポジトリと会話文脈に基づくプロンプト深化（`/better`）およびサブエージェント指示書の検証機能を DeepSeek Harness に導入します。

1. `/better <下書き>` を実行 —— 入力欄はすぐ解放され、読み取り専用ヘルパーがバックグラウンドでコードベースを確認します。
2. `探索 → 抽出 → 深化 → 研磨` をリアルタイム表示 —— Depth ドックでツールバッジと生成進捗を追跡し、KV キャッシュを再利用します。
3. 確認してから送信 —— 深化プロンプトが入力欄に反映され、ワンクリックで **元に戻す** ことも可能です（Enter を押すまで送信されません）。

## 設定リファレンス（`pi-better` 準拠・拡張）

オリジナルの `pi-better` では `"better"` 配下に `model` と `thinking` を設定します。`dsh-better` は両方に完全対応しつつ、サブエージェント制御と動的モデルカタログを追加しています：

| 設定項目 | 既定値 | 説明 |
| --- | --- | --- |
| `model` | `null`（現在の会話に従う） | `/better` で使用するモデル経路（`provider/model`）またはルーティンググループ。現在の会話モデルを引き継ぐと前序の KV プロンプトキャッシュを再利用でき、別モデルを指定すると専用品質や低コストのためにキャッシュ再利用を放棄します。 |
| `reasoningEffort` | `null`（`low`・高速既定） | `pi-better` の `thinking` に相当（`none`、`off`、`low`、`medium`、`high`、`max`、`inherit`）。既定では KV キャッシュを保ったまま高速な `low` を使用し、対応段階へ自動整合します。 |
| `checkSubagents` | `true` | `/better` で始まるサブエージェント指示書をディスパッチ前に自動検証するかどうかを切り替えます。 |
| `briefModel` | `null`（`model` と同じ） | サブエージェントの `/better` 指示書検証のみに別モデルを指定します。 |
| `briefReasoningEffort` | `null`（`reasoningEffort` と同じ） | サブエージェントの `/better` 指示書検証のみに別の推論強度を指定します。 |

## DeepSeek Harness での設定方法

1. **設定モーダル**：左下のメニューから **設定 → プロンプト深化** を開きます（変更は自動保存されます）。
2. **プラグインページ**：**プラグイン → プロンプト深化ヘルパー (`@agi-fans/dsh-better`)**（または行 `@agi-fans/dsh-better#dsh-better` の設定）を開きます。
3. **スラッシュコマンド（`/better-model`）**：任意のチャットや CLI セッションから確認・変更できます：
   - `/better-model` — 現在の設定と利用可能なモデル一覧を表示
   - `/better-model <provider/model> [effort]` — モデルと任意の推論強度を指定
   - `/better-model effort <level|inherit>` — 推論強度のみ変更
   - `/better-model brief <same|inherit|<provider/model>> [effort]` — サブエージェント検証モデルを設定
   - `/better-model subagents <on|off>` — サブエージェント検証のオン／オフをリアルタイム切替
   - `/better-model reset [all]` — 会話継承にリセット（`all` で全5項目をリセット）

GUI および `/better-model` の変更は現在のプロファイルの `dsh-better.settings.json` にアトミック保存され、再起動なしで即座に反映されます。初期既定値は `cordis.patch.yml` に定義されています。
