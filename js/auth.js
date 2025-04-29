// Auth Service - Supabaseの認証機能を利用したユーザー管理
class AuthService {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.authStateChangeCallbacks = [];

    // Supabaseクライアントが利用可能か確認
    if (window.supabase && supabaseConfig.url && supabaseConfig.key) {
      try {
        this.supabase = window.supabase.createClient(supabaseConfig.url, supabaseConfig.key);
        console.log('Auth Service: Supabase client initialized.');
      } catch (error) {
        console.error('Auth Service: Failed to initialize Supabase client:', error);
      }
    } else {
      console.error('Auth Service: Supabase client is not available or configuration is missing.');
    }
  }

  // 初期化時に認証状態を確認
  async init() {
    if (!this.supabase) {
      console.error('Auth Service: Cannot initialize auth - Supabase client not available.');
      return false;
    }

    try {
      const { data, error } = await this.supabase.auth.getUser();
      if (error) {
        console.error('Auth Service: Error getting current user:', error);
        return false;
      }
      
      if (data?.user) {
        this.currentUser = data.user;
        console.log('Auth Service: User is authenticated:', this.currentUser.email);
        return true;
      } else {
        console.log('Auth Service: No authenticated user found.');
        return false;
      }
    } catch (error) {
      console.error('Auth Service: Exception during auth initialization:', error);
      return false;
    }
  }

  // メール・パスワードによるサインアップ
  async signUp(email, password) {
    if (!this.supabase) {
      throw new Error('Auth Service: Supabase client not available');
    }

    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      
      console.log('Auth Service: User signed up successfully:', data.user?.email);
      return data;
    } catch (error) {
      console.error('Auth Service: Sign up failed:', error);
      throw error;
    }
  }

  // メール・パスワードによるログイン
  async signIn(email, password) {
    if (!this.supabase) {
      throw new Error('Auth Service: Supabase client not available');
    }

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      this.currentUser = data.user;
      console.log('Auth Service: User signed in successfully:', this.currentUser.email);
      return data;
    } catch (error) {
      console.error('Auth Service: Sign in failed:', error);
      throw error;
    }
  }

  // ログアウト
  async signOut() {
    if (!this.supabase) {
      throw new Error('Auth Service: Supabase client not available');
    }

    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      
      this.currentUser = null;
      console.log('Auth Service: User signed out successfully');
      return true;
    } catch (error) {
      console.error('Auth Service: Sign out failed:', error);
      throw error;
    }
  }

  // 現在のユーザーを取得
  getUser() {
    return this.currentUser;
  }

  // ユーザーIDを取得
  getUserId() {
    return this.currentUser?.id;
  }

  // ユーザーのメールアドレスを取得
  getUserEmail() {
    return this.currentUser?.email;
  }

  // ユーザーの認証状態が変更されたときのコールバック
  onAuthStateChange(callback) {
    if (!this.supabase) {
      console.error('Auth Service: Cannot subscribe to auth changes - Supabase client not available');
      return null;
    }
    
    try {
      const subscription = this.supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth Service: Auth state changed:', event);
        this.currentUser = session?.user || null;
        callback(event, session);
      });
      
      // コールバックを配列に追加
      this.authStateChangeCallbacks.push(callback);
      
      return subscription;
    } catch (error) {
      console.error('Auth Service: Error setting up auth state change listener:', error);
      return null;
    }
  }

  // アプリケーションのリセット (ログアウト後のクリーンアップ)
  async resetAppState() {
    // authServiceがログアウト操作を実行
    try {
      if (this.currentUser) {
        await this.signOut();
      }
      
      // ローカルストレージをクリア
      if (supabaseConfig.useLocalStorage) {
        localStorage.removeItem(supabaseConfig.localStorageKeys.tasks);
        localStorage.removeItem(supabaseConfig.localStorageKeys.subtasks);
        localStorage.removeItem(supabaseConfig.localStorageKeys.interruptions);
      }
      
      console.log('Auth Service: App state reset successfully');
      return true;
    } catch (error) {
      console.error('Auth Service: Error resetting app state:', error);
      throw error;
    }
  }
}

// シングルトンとして使用
const authService = new AuthService();
