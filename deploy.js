// GitHub & Cloudflare ワンクリックデプロイスクリプト
const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ユーザー情報を取得
rl.question('GitHubのユーザー名: ', (username) => {
  rl.question('GitHubのメールアドレス: ', (email) => {
    rl.question('リポジトリ名 (例: task-app): ', (repoName) => {
      rl.question('コミットメッセージ: ', (commitMessage) => {
        
        // デフォルト値の設定
        username = username || 'yourusername';
        repoName = repoName || 'task-app';
        commitMessage = commitMessage || 'Initial commit - Task management app';
        
        console.log('\n以下の情報でデプロイを開始します:');
        console.log(`- ユーザー名: ${username}`);
        console.log(`- メールアドレス: ${email}`);
        console.log(`- リポジトリ名: ${repoName}`);
        console.log(`- コミットメッセージ: ${commitMessage}`);
        
        rl.question('\n続行しますか？ (y/n): ', (answer) => {
          if (answer.toLowerCase() === 'y') {
            try {
              // Gitの初期化（まだの場合）
              if (!fs.existsSync('.git')) {
                console.log('Gitリポジトリを初期化します...');
                execSync('git init');
              }
              
              // Gitユーザー情報の設定
              if (username && email) {
                execSync(`git config user.name "${username}"`);
                execSync(`git config user.email "${email}"`);
              }
              
              // リモートリポジトリの確認・設定
              try {
                execSync('git remote -v');
              } catch (error) {
                console.log('リモートリポジトリを設定します...');
                execSync(`git remote add origin https://github.com/${username}/${repoName}.git`);
              }
              
              // 変更のステージング・コミット
              console.log('変更をステージング・コミットします...');
              execSync('git add .');
              execSync(`git commit -m "${commitMessage}"`);
              
              // プッシュ
              console.log('GitHubにプッシュします...');
              execSync('git branch -M main');
              execSync('git push -u origin main');
              
              console.log('\n🎉 GitHubへのデプロイが完了しました！');
              console.log(`リポジトリURL: https://github.com/${username}/${repoName}`);
              
              // Cloudflareデプロイの案内
              console.log('\nCloudflareにデプロイするには:');
              console.log('1. Cloudflare Workersにログイン: wrangler login');
              console.log('2. デプロイの実行: wrangler publish');
            } catch (error) {
              console.error('エラーが発生しました:', error.message);
            }
          } else {
            console.log('デプロイをキャンセルしました。');
          }
          rl.close();
        });
      });
    });
  });
});
