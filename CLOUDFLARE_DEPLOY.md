# Cloudflareへのデプロイ手順

このタスク管理アプリをCloudflare Pagesにデプロイする手順です。

## 前提条件

1. Cloudflareアカウントを持っている（まだ持っていない場合は[こちら](https://dash.cloudflare.com/sign-up)から作成できます）
2. [Git](https://git-scm.com/downloads)がインストールされている（Cloudflare PagesはGitリポジトリから直接デプロイするため）

## デプロイ手順

### 1. コードをGitリポジトリにプッシュする

まず、コードをGitHubやGitLabなどのGitリポジトリにプッシュする必要があります：

```bash
# Gitリポジトリを初期化（まだ実行していない場合）
git init

# 変更をステージング
git add .

# コミット
git commit -m "Initial commit"

# リモートリポジトリを追加（自分のリポジトリURLに置き換えてください）
git remote add origin https://github.com/yourusername/task-app.git

# プッシュ
git push -u origin main
```

### 2. Cloudflare Pagesでプロジェクトを作成

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/)にログインします
2. 左側のサイドバーから「Pages」を選択します
3. 「Create a project」ボタンをクリックします
4. 「Connect to Git」を選択します
5. GitHubまたはGitLabのアカウントを接続し、認証します
6. リポジトリのリストからタスク管理アプリのリポジトリを選択します
7. 「Begin setup」をクリックします

### 3. プロジェクト設定

プロジェクト設定画面で以下の情報を入力します：

- **Project name**: 任意の名前（例: task-manager-app）
- **Production branch**: main （またはあなたのデフォルトブランチ）
- **Build settings**:
  - **Framework preset**: None
  - **Build command**: 空白のままでOK（ビルド不要）
  - **Build output directory**: / （ルートディレクトリ）

### 4. 環境変数（必要な場合）

プロジェクトに環境変数が必要な場合は、この画面で設定できます。現在のアプリでは特に必要ありません。

### 5. デプロイを開始

「Save and Deploy」ボタンをクリックしてデプロイを開始します。

### 6. デプロイ完了

デプロイが完了すると、自動生成されたURLでアプリにアクセスできるようになります。例：
`https://task-manager-app.pages.dev`

## Supabase接続の設定

アプリをデプロイしたら、Supabaseの接続設定を更新する必要があります。

1. Supabaseダッシュボードで「Project Settings」→「API」に移動します
2. 「API Settings」セクションで、「Project URL」と「anon public」をコピーします
3. `config.js`ファイルを次のように更新します：

```javascript
// Supabase configuration
const supabaseConfig = {
  url: 'あなたのSupabase URL',
  key: 'あなたのanon key',
  useLocalStorage: false
};
```

4. 変更をGitリポジトリにコミットしてプッシュします：

```bash
git add js/config.js
git commit -m "Update Supabase configuration"
git push
```

Cloudflare Pagesは自動的に変更を検知して新しいデプロイを開始します。

## トラブルシューティング

### CORS エラー

Supabaseとの接続でCORSエラーが発生する場合は、Supabaseダッシュボードで以下の設定を行ってください：

1. プロジェクトダッシュボードから「Settings」→「API」に移動します
2. 「API Settings」セクションで、「Additional link and CORS settings」を探します
3. 「Allowed origins」に、Cloudflare PagesのURLを追加します（例：`https://task-manager-app.pages.dev`）

### キャッシュの問題

更新が反映されない場合は、ブラウザのキャッシュをクリアしてみてください。または、Cloudflareダッシュボードから手動でデプロイを再開できます。
