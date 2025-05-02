-- ユーザー認証問題を修正するためのSQLスクリプト

-- 既存のRLSポリシーを削除
DROP POLICY IF EXISTS "Allow users to CRUD their own tasks" ON "tasks";
DROP POLICY IF EXISTS "Allow users to CRUD their own subtasks" ON "subtasks";
DROP POLICY IF EXISTS "Allow users to CRUD their own interruption_tasks" ON "interruption_tasks";

-- ユーザーごとのアクセス制御ポリシー作成（anonymousユーザーへのアクセス許可を削除）
CREATE POLICY "Allow users to CRUD their own tasks" ON "tasks"
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to CRUD their own subtasks" ON "subtasks"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = subtasks.task_id
            AND tasks.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = subtasks.task_id
            AND tasks.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow users to CRUD their own interruption_tasks" ON "interruption_tasks"
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
