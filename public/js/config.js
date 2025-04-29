// Supabase configuration
const supabaseConfig = {
  url: 'https://uvvxfwsduknmiwmtpbkp.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2dnhmd3NkdWtubWl3bXRwYmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDI3NTUsImV4cCI6MjA2MTQ3ODc1NX0.VNgnMiwiG8hax3KEFX_W7wxbZfO0iCuhGRwX_69oh0U',
  
  // Default values for local development (using localStorage)
  useLocalStorage: false, // Using Supabase instead of localStorage
  localStorageKeys: {
    tasks: 'task_app_tasks',
    subtasks: 'task_app_subtasks',
    interruptions: 'task_app_interruptions'
  }
};

// Check if localStorage is available
function isLocalStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

// If localStorage is not available, log a warning
if (!isLocalStorageAvailable()) {
  console.warn('LocalStorage is not available. Data will not persist between sessions.');
  supabaseConfig.useLocalStorage = false;
}