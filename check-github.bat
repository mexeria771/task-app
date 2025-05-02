@echo off
echo GitHubへのプッシュ状況を確認します...

cd C:\Users\mexer\PR\task-app

echo -------------------
echo ローカルコミット履歴:
echo -------------------
git log -n 3 --oneline

echo.
echo ------------------
echo リモート同期状況:
echo ------------------
git status

echo.
echo ------------------
echo リモートブランチ情報:
echo ------------------
git remote -v
git branch -vv

echo.
echo 確認完了。問題がある場合は上記の出力を確認してください。
pause
