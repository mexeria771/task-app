// 認証関連の処理を行うコード
document.addEventListener('DOMContentLoaded', () => {
  // DOM要素の参照
  const authContainer = document.getElementById('auth-container');
  const appContainer = document.getElementById('app-container');
  const authForm = document.getElementById('auth-form');
  const authEmail = document.getElementById('auth-email');
  const authPassword = document.getElementById('auth-password');
  const authSubmit = document.getElementById('auth-submit');
  const authButtonText = document.getElementById('auth-button-text');
  const authSubtitle = document.getElementById('auth-subtitle');
  const toggleAuthMode = document.getElementById('toggle-auth-mode');
  const authError = document.getElementById('auth-error');

  // ユーザーモーダル関連
  const userModal = document.getElementById('user-modal');
  const userEmail = document.getElementById('user-email');
  const closeUserModal = document.getElementById('close-user-modal');
  const logoutButton = document.getElementById('logout-button');

  // 認証モード
  let isLoginMode = true;

  // 初期化関数
  async function init() {
    try {
      // 認証状態の確認
      const isAuthenticated = await authService.init();
      
      if (isAuthenticated) {
        // ユーザーが既に認証されている場合
        showApp();
      } else {
        // 認証されていない場合は認証画面を表示
        showAuth();
      }

      // イベントリスナーの設定
      setupEventListeners();

      // 認証状態の変更を監視
      authService.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN') {
          showApp();
        } else if (event === 'SIGNED_OUT') {
          showAuth();
        }
      });

    } catch (error) {
      console.error('Authentication initialization error:', error);
      showAuthError('認証システムの初期化に失敗しました。');
    }
  }

  // 認証画面を表示
  function showAuth() {
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
    
    // フォームをリセット
    authForm.reset();
    
    // エラーメッセージをクリア
    authError.classList.add('hidden');
    authError.textContent = '';
  }

  // アプリケーションを表示
  function showApp() {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    // メールアドレスを表示
    if (authService.getUser()) {
      const emailAddress = authService.getUserEmail();
      if (emailAddress) {
        // headerにユーザー情報を表示する要素があれば追加
        const headerElement = document.querySelector('header');
        if (headerElement) {
          const userInfoEl = document.createElement('div');
          userInfoEl.className = 'flex items-center';
          userInfoEl.innerHTML = `
            <button id="user-menu-button" class="text-sm text-blue-500 hover:text-blue-700">
              <i class="fas fa-user-circle mr-1"></i> ${emailAddress}
            </button>
          `;
          headerElement.appendChild(userInfoEl);
          
          // ユーザーメニューボタンのイベントリスナー
          document.getElementById('user-menu-button').addEventListener('click', openUserModal);
        }
      }
    }
  }

  // ユーザーモーダルを開く
  function openUserModal() {
    userEmail.textContent = authService.getUserEmail() || '';
    userModal.classList.remove('hidden');
    userModal.classList.add('flex', 'fade-in');
  }

  // ユーザーモーダルを閉じる
  function closeUserModalHandler() {
    userModal.classList.add('hidden');
    userModal.classList.remove('flex', 'fade-in');
  }

  // ログアウト処理
  async function handleLogout() {
    try {
      await authService.resetAppState();
      closeUserModalHandler();
      showAuth();
    } catch (error) {
      console.error('Logout error:', error);
      alert('ログアウト中にエラーが発生しました。');
    }
  }

  // 認証モードの切り替え
  function toggleAuthModeHandler() {
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
      authButtonText.textContent = 'ログイン';
      authSubtitle.textContent = 'ログインまたはアカウント作成';
      toggleAuthMode.textContent = 'アカウントをお持ちでない方はこちら';
    } else {
      authButtonText.textContent = 'アカウント作成';
      authSubtitle.textContent = '新規アカウント作成';
      toggleAuthMode.textContent = 'すでにアカウントをお持ちの方はこちら';
    }
    
    // エラーメッセージをクリア
    authError.classList.add('hidden');
    authError.textContent = '';
  }

  // 認証エラーを表示
  function showAuthError(message) {
    authError.textContent = message;
    authError.classList.remove('hidden');
  }

  // 認証フォームの送信処理
  async function handleAuthSubmit(e) {
    e.preventDefault();
    
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();
    
    if (!email || !password) {
      showAuthError('メールアドレスとパスワードを入力してください。');
      return;
    }
    
    // ボタンを無効化して処理中を表示
    authSubmit.disabled = true;
    const originalButtonText = authButtonText.textContent;
    authButtonText.textContent = '処理中...';
    
    try {
      if (isLoginMode) {
        // ログイン処理
        await authService.signIn(email, password);
      } else {
        // アカウント作成処理
        await authService.signUp(email, password);
        
        // アカウント作成直後はログインも自動的に行われる場合がある
        // （Supabaseの設定による）
      }
      
      // 成功した場合、アプリを表示
      showApp();
      
    } catch (error) {
      console.error('Authentication error:', error);
      
      // エラーメッセージを表示
      let errorMessage = 'エラーが発生しました。';
      
      if (error.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'メールアドレスまたはパスワードが正しくありません。';
        } else if (error.message.includes('User already registered')) {
          errorMessage = 'このメールアドレスは既に登録されています。';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'メールアドレスの確認が完了していません。メールをご確認ください。';
        } else {
          errorMessage = `エラー: ${error.message}`;
        }
      }
      
      showAuthError(errorMessage);
    } finally {
      // ボタンを再び有効化
      authSubmit.disabled = false;
      authButtonText.textContent = originalButtonText;
    }
  }

  // イベントリスナーの設定
  function setupEventListeners() {
    // 認証フォームの送信
    authForm.addEventListener('submit', handleAuthSubmit);
    
    // 認証モードの切り替え
    toggleAuthMode.addEventListener('click', toggleAuthModeHandler);
    
    // ユーザーモーダル
    closeUserModal.addEventListener('click', closeUserModalHandler);
    logoutButton.addEventListener('click', handleLogout);
    
    // モーダル外クリックで閉じる
    userModal.addEventListener('click', (e) => {
      if (e.target === userModal) {
        closeUserModalHandler();
      }
    });
  }

  // 初期化
  init();
});
