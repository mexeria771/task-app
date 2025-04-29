# タスク管理アプリ

シンプルなタスク管理アプリケーションです。現在のタスクを明確に可視化し、割り込みタスクも管理できます。

## 機能

- メインタスクの管理（追加、編集、削除、完了）
- タスクタイマー機能
- サブタスク管理（追加、完了チェック、順序変更）
- 割り込みタスクのメモ機能
- ドラッグアンドドロップによるタスク並べ替え
- タスク一覧のマークダウンエクスポート機能（Notion互換）
- シンプルなUI

## 技術スタック

- フロントエンド: HTML5, CSS (Tailwind CSS), JavaScript
- バックエンド/データベース: Supabase (PostgreSQL)
- Supabase JavaScript SDK
- SortableJS（ドラッグアンドドロップ機能）

## 初期設定

### ローカルセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/task-app.git
cd task-app

# Pythonを使用して簡易サーバーを起動
python -m http.server 8000

# または Node.js を使用
node start-server.js
```

### ローカルストレージモード

1. `config.js` の `useLocalStorage` の値を `true` に設定
2. ブラウザで `http://localhost:8000` にアクセス

### Supabase接続モード

1. Supabaseプロジェクトを作成
2. 以下のテーブルを作成:
   - `tasks` テーブル
   - `subtasks` テーブル
   - `interruption_tasks` テーブル
3. 取得したURLとAPIキーを `config.js` に設定
4. `useLocalStorage` の値を `false` に設定



## Supabase デプロイ

1. Supabaseのアカウントを作成します（まだの場合）
2. 新しいプロジェクトを作成します
3. SQLエディタで以下のマイグレーションスクリプトを実行：

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- タスクテーブル
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  notes TEXT,
  elapsed_time INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed'
  is_current BOOLEAN DEFAULT false, -- 現在取り組み中のタスクかどうか
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT -- 将来的な認証用、初期は固定値
);

-- サブタスクテーブル
CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks ON DELETE CASCADE,
  text TEXT NOT NULL,
  notes TEXT,
  completed BOOLEAN DEFAULT false,
  position INTEGER, -- 順序管理用
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 割り込みタスクテーブル
CREATE TABLE interruption_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  notes TEXT,
  elapsed_time INTEGER DEFAULT 0,
  added_to_main BOOLEAN DEFAULT false, -- メインリストに追加済みかどうか
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT -- 将来的な認証用、初期は固定値
);

-- RLSポリシーの設定
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interruption_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous access to tasks" ON tasks
  FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous access to subtasks" ON subtasks
  FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous access to interruption_tasks" ON interruption_tasks
  FOR ALL 
  USING (true)
  WITH CHECK (true);
```

4. SupabaseのURLとAnon Keyを取得し、`config.js`に設定します

## GitHub Pages等でのデプロイ

1. このリポジトリをフォークまたはクローンします
2. `config.js`ファイルにSupabaseの接続情報を設定します
3. GitHubアカウントにプッシュします:

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/task-app.git
git push -u origin main
```

4. GitHub Pagesで公開するには、Settings > Pages から設定します:
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
   - Save



## 将来的な拡張予定

- ユーザー認証機能
- 統計情報機能
- テーマカスタマイズ
- キーボードショートカット
- 定期タスク機能

## ライセンス

MIT

## 貢献

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request