-- タスク管理アプリにユーザー認証機能を追加するためのマイグレーションスクリプト

-- ユーザーIDの外部キーに対する参照整合性設定を無効化
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_user_id_fkey";
ALTER TABLE "interruption_tasks" DROP CONSTRAINT IF EXISTS "interruption_tasks_user_id_fkey";

-- テーブルの更新：user_idをUUIDタイプに変更
ALTER TABLE "tasks" 
    ALTER COLUMN "user_id" TYPE UUID USING "user_id"::uuid;

ALTER TABLE "interruption_tasks" 
    ALTER COLUMN "user_id" TYPE UUID USING "user_id"::uuid;

-- RLS（行レベルセキュリティ）ポリシー更新
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Allow anonymous access to tasks" ON "tasks";
DROP POLICY IF EXISTS "Allow anonymous access to subtasks" ON "subtasks";
DROP POLICY IF EXISTS "Allow anonymous access to interruption_tasks" ON "interruption_tasks";

-- 認証ユーザーごとのアクセス制御ポリシー作成
CREATE POLICY "Allow users to CRUD their own tasks" ON "tasks"
    FOR ALL
    USING (auth.uid() = user_id OR user_id = 'anonymous')
    WITH CHECK (auth.uid() = user_id OR user_id = 'anonymous');

CREATE POLICY "Allow users to CRUD their own subtasks" ON "subtasks"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = subtasks.task_id
            AND (tasks.user_id = auth.uid() OR tasks.user_id = 'anonymous')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = subtasks.task_id
            AND (tasks.user_id = auth.uid() OR tasks.user_id = 'anonymous')
        )
    );

CREATE POLICY "Allow users to CRUD their own interruption_tasks" ON "interruption_tasks"
    FOR ALL
    USING (auth.uid() = user_id OR user_id = 'anonymous')
    WITH CHECK (auth.uid() = user_id OR user_id = 'anonymous');

-- インデックス作成
CREATE INDEX IF NOT EXISTS "tasks_user_id_idx" ON "tasks" ("user_id");
CREATE INDEX IF NOT EXISTS "interruption_tasks_user_id_idx" ON "interruption_tasks" ("user_id");
CREATE INDEX IF NOT EXISTS "subtasks_task_id_idx" ON "subtasks" ("task_id");

-- データマイグレーション
-- 既存の'anonymous'または空のuser_idを持つレコードを保持しつつ、今後はUUID形式のuser_idを使用
