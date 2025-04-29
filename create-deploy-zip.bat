@echo off
echo タスク管理アプリのデプロイ用ZIPファイルを作成します...

REM 既存のZIPファイルを削除
if exist task-app-deploy.zip (
    del task-app-deploy.zip
)

REM ZIPファイルに必要なファイルを追加
echo ZIPファイルを作成しています...
powershell Compress-Archive -Path "index.html","css","js","*.md","worker.js","mcp-config.js","wrangler.toml","public" -DestinationPath "task-app-deploy.zip" -Force

echo 完了しました！
echo task-app-deploy.zip ファイルがカレントディレクトリに作成されました。
echo このファイルをCloudflare MCPにアップロードしてください。

pause
