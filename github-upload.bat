@echo off
echo タスク管理アプリをGitHubにアップロードします

REM Gitリポジトリがまだ初期化されていない場合は初期化
if not exist .git (
  echo Gitリポジトリを初期化します...
  git init
)

REM Gitユーザー名とメールアドレスの設定（初回のみ必要）
echo Gitユーザー名とメールアドレスを設定してください（すでに設定済みの場合はEnterキーを押してください）:
set /p git_username=ユーザー名: 
set /p git_email=メールアドレス: 

if not "%git_username%"=="" (
  git config user.name "%git_username%"
)

if not "%git_email%"=="" (
  git config user.email "%git_email%"
)

REM GitHubリポジトリURLの入力
set /p repo_url=GitHubリポジトリのURL（例: https://github.com/yourusername/task-app.git）: 

if "%repo_url%"=="" (
  echo リポジトリURLが入力されていません。処理を中止します。
  pause
  exit /b 1
)

REM 変更をステージング
echo 変更をステージングしています...
git add .

REM コミット
set /p commit_message=コミットメッセージ: 

if "%commit_message%"=="" (
  set commit_message=Initial commit - Task management app
)

echo 変更をコミットしています...
git commit -m "%commit_message%"

REM リモートリポジトリの設定
echo リモートリポジトリを設定しています...
git remote > nul 2>&1
if %errorlevel% neq 0 (
  REM リモートが設定されていない場合は追加
  git remote add origin "%repo_url%"
) else (
  REM すでに設定されている場合は更新
  git remote set-url origin "%repo_url%"
)

REM プッシュ
echo 変更をプッシュしています...
git branch -M main
git push -u origin main

echo アップロード完了！GitHubでリポジトリを確認してください。
echo GitHub Pagesを有効にするには、リポジトリの Settings > Pages から設定してください。

pause
