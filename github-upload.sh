#!/bin/bash

# GitHubへのアップロード用スクリプト
echo "タスク管理アプリをGitHubにアップロードします"

# Gitリポジトリがまだ初期化されていない場合は初期化
if [ ! -d .git ]; then
  echo "Gitリポジトリを初期化します..."
  git init
fi

# Gitユーザー名とメールアドレスの設定（初回のみ必要）
echo "Gitユーザー名とメールアドレスを設定してください（すでに設定済みの場合はEnterキーを押してください）:"
read -p "ユーザー名: " git_username
read -p "メールアドレス: " git_email

if [ ! -z "$git_username" ]; then
  git config user.name "$git_username"
fi

if [ ! -z "$git_email" ]; then
  git config user.email "$git_email"
fi

# GitHubリポジトリURLの入力
read -p "GitHubリポジトリのURL（例: https://github.com/yourusername/task-app.git）: " repo_url

if [ -z "$repo_url" ]; then
  echo "リポジトリURLが入力されていません。処理を中止します。"
  exit 1
fi

# 変更をステージング
echo "変更をステージングしています..."
git add .

# コミット
read -p "コミットメッセージ: " commit_message

if [ -z "$commit_message" ]; then
  commit_message="Initial commit - Task management app"
fi

echo "変更をコミットしています..."
git commit -m "$commit_message"

# リモートリポジトリの設定
echo "リモートリポジトリを設定しています..."
git_remote=$(git remote)
if [ -z "$git_remote" ]; then
  # リモートが設定されていない場合は追加
  git remote add origin "$repo_url"
else
  # すでに設定されている場合は更新
  git remote set-url origin "$repo_url"
fi

# プッシュ
echo "変更をプッシュしています..."
git branch -M main
git push -u origin main

echo "アップロード完了！GitHubでリポジトリを確認してください。"
echo "GitHub Pagesを有効にするには、リポジトリの Settings > Pages から設定してください。"
