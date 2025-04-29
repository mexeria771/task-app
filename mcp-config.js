// MCP Configuration for task-app
export default {
  // MCP ツール定義
  tools: {
    // タスク一覧を取得
    getAllTasks: {
      description: "タスク管理アプリのすべてのタスクを取得します",
      parameters: {},
      handler: async () => {
        // 実際の実装ではバックエンドAPIなどと連携
        return {
          tasks: [
            { id: "task1", title: "サンプルタスク1", status: "active" },
            { id: "task2", title: "サンプルタスク2", status: "completed" }
          ]
        };
      }
    },
    
    // 新しいタスクを作成
    createTask: {
      description: "新しいタスクを作成します",
      parameters: {
        title: { type: "string", description: "タスクのタイトル" },
        notes: { type: "string", description: "タスクの詳細メモ（オプション）", optional: true }
      },
      handler: async ({ title, notes = "" }) => {
        // 実際の実装ではバックエンドAPIなどと連携
        return {
          success: true,
          task: {
            id: `task-${Date.now()}`,
            title,
            notes,
            status: "active",
            created_at: new Date().toISOString()
          }
        };
      }
    },
    
    // タスクを完了としてマーク
    completeTask: {
      description: "タスクを完了としてマークします",
      parameters: {
        taskId: { type: "string", description: "完了としてマークするタスクのID" }
      },
      handler: async ({ taskId }) => {
        // 実際の実装ではバックエンドAPIなどと連携
        return {
          success: true,
          taskId,
          status: "completed",
          completed_at: new Date().toISOString()
        };
      }
    }
  }
};
