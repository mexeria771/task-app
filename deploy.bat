@echo off
echo ===== タスク管理アプリのデプロイツール =====
echo.

echo このツールは以下の操作を行います:
echo 1. GitHubにコードをプッシュ
echo 2. Cloudflare Workersへのデプロイ方法の案内
echo.

if not exist node_modules (
  echo node_modulesが見つかりません。必要なパッケージをインストールします...
  call npm install
)

echo デプロイプロセスを開始します...
node deploy.js

echo.
pause
