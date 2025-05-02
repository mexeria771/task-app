@echo off
echo GitHubに変更をプッシュします...

REM 現在のディレクトリを表示
echo 現在のディレクトリ: %cd%

REM 変更をステージングエリアに追加
git add .
echo ステージング完了: 全ての変更をステージングしました

REM 変更をコミット（日付付きのコミットメッセージ）
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~0,4%"
set "MM=%dt:~4,2%"
set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%"
set "Min=%dt:~10,2%"
set "SS=%dt:~12,2%"

set "timestamp=%YY%-%MM%-%DD% %HH%:%Min%:%SS%"
git commit -m "認証機能のバグ修正: %timestamp%"
echo コミット完了: 認証機能のバグ修正: %timestamp%

REM プッシュ
git push
if %errorlevel% neq 0 (
  echo プッシュに失敗しました。おそらくリモートが設定されていません。
  echo リモートリポジトリをセットアップします。
  
  echo GitHubのユーザー名を入力してください:
  set /p username=
  
  echo リポジトリ名を入力してください（例: task-app）:
  set /p reponame=
  
  git remote add origin https://github.com/%username%/%reponame%.git
  git branch -M main
  git push -u origin main
) else (
  echo プッシュ完了: 変更がGitHubにアップロードされました。
)

echo 終了しました。
pause
