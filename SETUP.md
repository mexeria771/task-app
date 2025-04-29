# タスク管理アプリ セットアップガイド

## 実装状況

タスク管理アプリは以下のコンポーネントを含め、完全に実装されています：

1. **フロントエンド**:
   - HTML/CSS/JavaScriptでの完全なUI実装
   - Tailwind CSSによるスタイリング
   - レスポンシブデザイン対応

2. **バックエンド**:
   - Supabaseプロジェクト作成済み
   - 必要なテーブルと関係性の構築
   - Row Level Security (RLS)の設定
   - サンプルデータの投入

3. **機能**:
   - タスク一覧表示・追加・編集・削除機能
   - サブタスク管理機能
   - タイマー機能
   - 割り込みタスク管理機能

## 起動方法

アプリケーションを実行するには2つの方法があります：

### 方法1: Pythonを使用する場合

1. `start-server.bat`をダブルクリックします
2. ブラウザで`http://localhost:8000`にアクセスします

### 方法2: Node.jsを使用する場合

1. `start-server-node.bat`をダブルクリックします
2. ブラウザで`http://localhost:8000`にアクセスします

## Supabase接続情報

アプリケーションは既にSupabaseに接続する設定がされています：

- URL: `https://uvvxfwsduknmiwmtpbkp.supabase.co`
- 匿名キー: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2dnhmd3NkdWtubWl3bXRwYmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDI3NTUsImV4cCI6MjA2MTQ3ODc1NX0.VNgnMiwiG8hax3KEFX_W7wxbZfO0iCuhGRwX_69oh0U`

この情報は`js/config.js`ファイルで確認できます。

## ローカルストレージモードに切り替える

インターネット接続なしでアプリを使用したい場合：

1. `js/config.js`ファイルを開きます
2. `useLocalStorage`の値を`true`に変更します：

```javascript
useLocalStorage: true, // Using localStorage instead of Supabase
```

## ファイル構造

```
task-app/
│
├── index.html         # メインHTMLファイル
├── css/
│   └── style.css      # CSSスタイル
├── js/
│   ├── config.js      # 設定ファイル
│   ├── api.js         # APIラッパー
│   └── app.js         # メインアプリケーションロジック
├── start-server.bat   # Pythonサーバー起動用
├── start-server-node.bat # Node.jsサーバー起動用
├── start-server.js    # Node.jsサーバースクリプト
├── README.md          # 概要説明
├── DOCUMENTATION.md   # 詳細ドキュメント
└── SETUP.md           # このセットアップガイド
```

## 次のステップ

アプリケーションはすぐに使用できる状態ですが、以下の拡張を検討できます：

1. **ユーザー認証の追加**:
   - Supabase Authを使用したログイン機能の実装
   - ユーザーごとのデータ分離

2. **UI改善**:
   - ドラッグアンドドロップによるタスク並べ替え
   - アニメーションの追加

3. **機能拡張**:
   - ダークモード/ライトモード
   - データのエクスポート/インポート
   - 統計情報の表示

## トラブルシューティング

### Supabaseに接続できない場合

1. インターネット接続を確認してください
2. ローカルストレージモードに切り替えてください

### ローカルサーバーが起動しない場合

1. Pythonまたはnode.jsがインストールされているか確認してください
2. セキュリティソフトがサーバーをブロックしていないか確認してください
3. 別のポート（8080など）で試す場合は、サーバースクリプトを編集してください

### その他の問題

詳細なドキュメントは`DOCUMENTATION.md`を参照してください。
