# ユーザー認証機能の実装ドキュメント

## 概要

タスク管理アプリにSupabaseを使用したユーザー認証機能を追加しました。この機能により、ユーザーは個人アカウントを作成してタスクを管理できるようになります。各ユーザーは自分のタスクのみにアクセスでき、セキュリティが向上しています。

## 実装された機能

1. **ユーザー登録/サインアップ**
   - メールアドレスとパスワードによる新規アカウント作成
   - アカウント作成後の自動ログイン

2. **ログイン機能**
   - 既存アカウントへのログイン
   - セッション管理（ブラウザを閉じても認証状態を維持）

3. **ログアウト機能**
   - 現在のセッションからのログアウト
   - アプリデータのクリア

4. **ユーザー別データ管理**
   - タスクの所有者としてのユーザーID保存
   - ユーザー固有のタスクのみを表示
   - サブタスクとタスクの関連付け継続

5. **UIの変更**
   - 認証画面の追加（ログイン/サインアップフォーム）
   - ユーザーメニューの追加
   - ヘッダーへのユーザー情報表示

## ファイル構造の変更

以下のファイルが新規作成または変更されました：

- **新規作成ファイル**:
  - `js/auth.js` - 認証サービスのコア機能
  - `js/app_auth.js` - 認証UI管理とイベント処理
  - `migration_auth.sql` - Supabaseデータベース更新用のSQLスクリプト

- **変更されたファイル**:
  - `index.html` - 認証UI要素とスクリプト参照の追加
  - `js/api.js` - ユーザーID機能とデータフィルタリングの追加
  - `js/app.js` - 認証状態に基づくアプリ初期化の修正

## 認証フロー

1. アプリ起動時に `auth.js` の `authService.init()` が実行され、現在の認証状態を確認
2. 認証済みの場合は直接アプリを表示、未認証の場合はログイン画面を表示
3. ログイン/サインアップ成功後、アプリケーションが初期化され、ユーザー固有のデータが読み込まれる
4. ログアウト時には認証状態がクリアされ、ログイン画面に戻る

## データ構造の変更

Supabaseのデータベース構造を以下のように変更しました：

- `tasks` および `interruption_tasks` テーブルの `user_id` フィールドをUUID型に変更
- 各テーブルにインデックスを追加してパフォーマンスを最適化
- Row Level Security (RLS) ポリシーを更新して、ユーザーが自分のデータのみにアクセスできるように制限

## セットアップ手順

1. **Supabaseプロジェクト設定**:
   - Supabaseプロジェクトで認証機能を有効化（デフォルトで有効）
   - `migration_auth.sql` スクリプトをSupabaseのSQLエディタで実行

2. **アプリケーション設定**:
   - `config.js` の `useLocalStorage` が `false` に設定されていることを確認
   - Supabaseの接続情報（URL、キー）が正しく設定されていることを確認

## 使用方法

1. **アカウント作成**:
   - アプリにアクセスすると最初にログイン画面が表示される
   - 「アカウントをお持ちでない方はこちら」をクリックしてサインアップモードに切り替え
   - メールアドレスとパスワードを入力して「アカウント作成」をクリック

2. **ログイン**:
   - 既存のアカウントでメールアドレスとパスワードを入力
   - 「ログイン」ボタンをクリック

3. **ログアウト**:
   - ヘッダーのユーザーメールアドレスをクリック
   - 表示されるモーダルで「ログアウト」ボタンをクリック

## 注意事項

- 未認証（ログインしていない）ユーザーは、操作できなくなりました
- ブラウザのローカルストレージが消去されると、セッション情報も失われる場合があります
- 認証に関する設定は、Supabaseダッシュボードの「Authentication」セクションから管理できます

## 将来の拡張予定

- ソーシャルログイン（Google、Githubなど）の追加
- パスワードリセット機能
- 2要素認証の実装
- ユーザープロフィール管理
- タスクの共有・コラボレーション機能
