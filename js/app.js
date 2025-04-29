// Main application code
document.addEventListener('DOMContentLoaded', () => {
  // DOM element references
  const currentTaskEl = document.getElementById('current-task'); // ドロップゾーンとして使う親要素
  const currentTaskContent = document.getElementById('current-task-content');
  const noCurrentTask = document.getElementById('no-current-task');
  const taskListEl = document.getElementById('task-list');
  const interruptionListEl = document.getElementById('interruption-list');
  const dropZone = currentTaskEl; // 親要素全体をドロップゾーンにする

  // Modal elements
  const taskModal = document.getElementById('task-modal');
  const modalTitle = document.getElementById('modal-title');
  const taskForm = document.getElementById('task-form');
  const taskTitleInput = document.getElementById('task-title');
  const taskNotesInput = document.getElementById('task-notes');
  const taskIdInput = document.getElementById('task-id');

  // Export modal elements
  const exportModal = document.getElementById('export-modal');
  const exportContent = document.getElementById('export-content');
  const copyExportBtn = document.getElementById('copy-export');
  const closeExportModalBtn = document.getElementById('close-export-modal');

  // Subtask modal elements
  const subtaskModal = document.getElementById('subtask-modal');
  const subtaskForm = document.getElementById('subtask-form');
  const subtaskTextInput = document.getElementById('subtask-text');
  const subtaskNotesInput = document.getElementById('subtask-notes');
  const subtaskIdInput = document.getElementById('subtask-id');

  // Timer elements
  const timerDisplay = document.getElementById('timer-display');
  const timerToggle = document.getElementById('timer-toggle');

  // Button references
  const addTaskBtn = document.getElementById('add-task-btn');
  const addTaskListBtn = document.getElementById('add-task-list-btn');
  const closeModalBtn = document.getElementById('close-modal');
  const completeTaskBtn = document.getElementById('complete-task');
  const addSubtaskBtn = document.getElementById('add-subtask');
  const closeSubtaskModalBtn = document.getElementById('close-subtask-modal');
  const addInterruptionBtn = document.getElementById('add-interruption');
  const interruptionInput = document.getElementById('interruption-input');
  const exportTasksBtn = document.getElementById('export-tasks-btn');
  const exportTasksBtnTop = document.getElementById('export-tasks-btn-top');
  const exportTasksBtnCurrent = document.getElementById('export-tasks-btn-current');

  // Timer state
  let timerInterval = null;
  let currentTimerSeconds = 0;
  let currentTaskId = null;

  // App initialization
  async function initApp() {
    // Load tasks
    await loadTaskList();

    // Load current task if one exists
    await loadCurrentTask();

    // Load interruption tasks
    await loadInterruptionTasks();

    // Set up event listeners
    setupEventListeners();
  }

  // Set up all event listeners
  function setupEventListeners() {
    // Task buttons
    addTaskBtn.addEventListener('click', () => openTaskModal()); // 上部ボタン
    addTaskListBtn.addEventListener('click', () => openTaskModal()); // 下部ボタン
    closeModalBtn.addEventListener('click', () => closeTaskModal());
    taskForm.addEventListener('submit', handleTaskFormSubmit); // 修正された関数が呼ばれる
    completeTaskBtn.addEventListener('click', completeCurrentTask);

    // Timer button
    timerToggle.addEventListener('click', toggleTimer);

    // Subtask buttons
    addSubtaskBtn.addEventListener('click', () => openSubtaskModal());
    closeSubtaskModalBtn.addEventListener('click', () => closeSubtaskModal());
    subtaskForm.addEventListener('submit', handleSubtaskFormSubmit);

    // Interruption buttons
    addInterruptionBtn.addEventListener('click', addInterruptionTask);

    // --- ドラッグ＆ドロップ関連のリスナー ---

    // ドラッグ開始: taskListEl でイベントを捕捉
    taskListEl.addEventListener('dragstart', e => {
      const taskItem = e.target.closest('.task-item');
      if (taskItem && taskItem.getAttribute('draggable') === 'true') {
        e.dataTransfer.setData('text/plain', taskItem.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
        taskItem.classList.add('dragging');
        console.log('Drag Start:', taskItem.dataset.id);
      } else {
        e.preventDefault();
      }
    });

    // ドラッグ終了: taskListEl でイベントを捕捉
    taskListEl.addEventListener('dragend', e => {
      const taskItem = e.target.closest('.task-item.dragging');
      if (taskItem) {
        taskItem.classList.remove('dragging');
      }
      // ドラッグ後に残っている可能性のあるドロップゾーンの強調表示を消す
      dropZone.classList.remove('dragover-active');
      console.log('Drag End');
    });

    // --- ドロップゾーン (`#current-task`) のイベントリスナー ---

    // dragenter: 要素がドロップゾーンに入った時
    dropZone.addEventListener('dragenter', e => {
      e.preventDefault();
      if (e.dataTransfer.types.includes('text/plain')) {
        dropZone.classList.add('dragover-active');
        console.log('Drag Enter dropZone');
      }
    });

    // dragover: 要素がドロップゾーン上にある間
    dropZone.addEventListener('dragover', e => {
      // ★★★ ドロップを許可するために絶対に必要 ★★★
      e.preventDefault();
      // console.log('Drag Over Fired'); // 頻繁に出るのでコメントアウト推奨
      if (e.dataTransfer.types.includes('text/plain')) {
        e.dataTransfer.dropEffect = 'move';
      } else {
         e.dataTransfer.dropEffect = 'none';
      }
    });

    // dragleave: 要素がドロップゾーンから離れた時
    dropZone.addEventListener('dragleave', e => {
        // シンプルにするため、ここでは一旦そのまま削除。
        dropZone.classList.remove('dragover-active');
        console.log('Drag Leave dropZone');
    });

    // drop: 要素がドロップゾーンでドロップされた時
    dropZone.addEventListener('drop', async e => {
      // ★★★ ブラウザのデフォルト動作を防ぐために絶対に必要 ★★★
      e.preventDefault();
      dropZone.classList.remove('dragover-active'); // 強調表示を消す
      console.log('Drop Event Fired!');

      const taskId = e.dataTransfer.getData('text/plain');
      console.log('Dropped Task ID from dataTransfer:', taskId);

      if (taskId && taskId !== currentTaskId) {
        console.log('Attempting to select task via selectTask...');
        try {
            await selectTask(taskId);
            console.log('selectTask completed successfully after drop.');
        } catch (error) {
            console.error('Error during selectTask after drop:', error);
        }
      } else if (!taskId) {
         console.log('Drop ignored: Task ID not found in dataTransfer.');
      } else {
        console.log('Drop ignored: Task is already current.');
      }
    });
    // --- ドラッグ＆ドロップ関連のリスナーここまで ---

    // エンターキーで割り込みタスクを追加
    interruptionInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addInterruptionTask();
      }
    });

    // Export buttons
    exportTasksBtn.addEventListener('click', openExportModal);
    exportTasksBtnTop.addEventListener('click', openExportModal);
    exportTasksBtnCurrent.addEventListener('click', openExportModal);
    closeExportModalBtn.addEventListener('click', closeExportModal);
    copyExportBtn.addEventListener('click', copyExportContent);

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target === taskModal) closeTaskModal();
      if (e.target === subtaskModal) closeSubtaskModal();
      if (e.target === exportModal) closeExportModal();
    });
  }

  // Load and render task list
  async function loadTaskList() {
    try {
        const tasks = await taskAPI.getAllTasks();
        renderTaskList(tasks);
    } catch (error) {
        console.error("Error loading task list:", error);
        taskListEl.innerHTML = '<p class="text-red-500 text-center">タスクリストの読み込みに失敗しました。</p>';
    }
  }

  // Render task list
  function renderTaskList(tasks) {
    taskListEl.innerHTML = '';

    if (!tasks || tasks.length === 0) {
      taskListEl.innerHTML = '<p class="text-gray-500 text-center">タスクがありません</p>';
      return;
    }

    tasks.forEach(task => {
      const taskEl = document.createElement('div');
      // クラス設定
      let classes = 'task-item p-3 border rounded mb-2 transition-colors duration-150 ease-in-out';
      if (task.is_current) {
        classes += ' bg-blue-100 border-blue-300'; // 現在のタスク
      } else if (task.status === 'completed') {
        classes += ' bg-gray-100 text-gray-500 line-through cursor-not-allowed'; // 完了タスク
      } else {
        classes += ' hover:bg-gray-50 cursor-grab'; // 未完了タスク
      }
      taskEl.className = classes;
      taskEl.dataset.id = task.id;
      taskEl.setAttribute('draggable', task.status !== 'completed'); // 未完了のみドラッグ可能

      // Format elapsed time
      const hours = Math.floor(task.elapsed_time / 3600);
      const minutes = Math.floor((task.elapsed_time % 3600) / 60);
      const seconds = task.elapsed_time % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      taskEl.innerHTML = `
        <div class="flex justify-between items-center">
          <div class="flex-1 min-w-0 mr-2"> <!-- タイトルが長い場合に省略されるように -->
            <h4 class="font-medium truncate ${task.status === 'completed' ? '' : ''}">${task.title}</h4>
            <p class="text-xs text-gray-500">経過時間: ${timeStr}</p>
          </div>
          <div class="flex space-x-1 flex-shrink-0"> <!-- ボタンが縮まないように -->
            ${task.status !== 'completed' ? `
              <button class="select-task-btn text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded">
                選択
              </button>
              <button class="edit-task-btn text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-2 rounded">
                編集
              </button>
            ` : ''}
            <button class="delete-task-btn text-xs bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded">
              削除
            </button>
          </div>
        </div>
      `;

      // Add event listeners for buttons
      taskEl.querySelector('.delete-task-btn')?.addEventListener('click', (e) => {
        e.stopPropagation(); // 親要素へのイベント伝播を停止
        deleteTask(task.id);
      });

      if (task.status !== 'completed') {
        taskEl.querySelector('.select-task-btn')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          console.log(`Select button clicked for task: ${task.id}`);
          await selectTask(task.id);
        });

        taskEl.querySelector('.edit-task-btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          openTaskModal(task);
        });
      }

      taskListEl.appendChild(taskEl);
    });

    // Initialize Sortable for task list (リスト内並び替え)
    // draggable=false の要素はドラッグ不可にする filter を追加
    if (tasks.filter(t => t.status !== 'completed').length > 1) {
      new Sortable(taskListEl, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        filter: '[draggable="false"]',
        preventOnFilter: false,
        onEnd: async function(evt) {
          const taskIds = Array.from(taskListEl.querySelectorAll('.task-item')).map(item => item.dataset.id);
          console.log('SortableJS - New task order:', taskIds);
          // await taskAPI.updateTaskOrder(taskIds); // 将来的に順序保存APIを実装する場合
        }
      });
    }
  }

  // Load and render current task
  async function loadCurrentTask() {
    try {
        const currentTask = await taskAPI.getCurrentTask(); // getCurrentTaskはsubtasksを含む
        if (currentTask) {
          currentTaskId = currentTask.id;
          currentTimerSeconds = currentTask.elapsed_time;
          renderCurrentTask(currentTask);
        } else {
          showNoCurrentTask();
        }
    } catch(error) {
        console.error("Error loading current task:", error);
        showNoCurrentTask(); // エラー時は空表示にする
    }
  }

  // Show empty state when no task is selected
  function showNoCurrentTask() {
    noCurrentTask.classList.remove('hidden');
    currentTaskContent.classList.add('hidden');
    currentTaskId = null;

    // Reset timer if it was running
    if (timerInterval) {
        stopTimer(); // Stop timer without saving
        clearInterval(timerInterval);
        timerInterval = null;
    }
    currentTimerSeconds = 0;
    updateTimerDisplay();
  }

  // Render current task display
  function renderCurrentTask(task) {
    noCurrentTask.classList.add('hidden');
    currentTaskContent.classList.remove('hidden');

    document.getElementById('current-task-title').textContent = task.title;
    document.getElementById('current-task-notes').textContent = task.notes || '(メモなし)';

    currentTimerSeconds = task.elapsed_time;
    updateTimerDisplay();

    // Reset timer button state (always show "開始" initially)
    timerToggle.textContent = '開始';
    timerToggle.classList.remove('bg-red-500', 'hover:bg-red-600', 'timer-active');
    timerToggle.classList.add('bg-green-500', 'hover:bg-green-600');
    // If a timer was running for another task, clear it
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    renderSubtasks(task.subtasks || []); // APIがsubtasksを含んで返す前提
  }

  // Render subtasks for the current task
  function renderSubtasks(subtasks) {
    const subtasksList = document.getElementById('subtasks-list');
    subtasksList.innerHTML = '';

    if (!subtasks || subtasks.length === 0) {
      subtasksList.innerHTML = '<li class="text-gray-500 text-sm">サブタスクがありません</li>';
      return;
    }

    subtasks.forEach(subtask => {
      const subtaskEl = document.createElement('li');
      subtaskEl.className = `subtask-item p-2 border rounded flex items-center ${subtask.completed ? 'subtask-completed bg-gray-50 text-gray-500 line-through' : ''}`;
      subtaskEl.dataset.id = subtask.id;

      subtaskEl.innerHTML = `
        <input type="checkbox" class="mr-2 subtask-checkbox" ${subtask.completed ? 'checked' : ''} data-subtask-id="${subtask.id}">
        <div class="flex-1 min-w-0 mr-1">
          <p class="text-sm truncate">${subtask.text}</p>
          ${subtask.notes ? `<p class="text-xs text-gray-500 truncate">${subtask.notes}</p>` : ''}
        </div>
        <div class="flex space-x-1 flex-shrink-0">
          <button class="move-up-btn text-xs bg-gray-200 hover:bg-gray-300 py-1 px-1 rounded" data-subtask-id="${subtask.id}">↑</button>
          <button class="move-down-btn text-xs bg-gray-200 hover:bg-gray-300 py-1 px-1 rounded" data-subtask-id="${subtask.id}">↓</button>
          <button class="delete-subtask-btn text-xs bg-red-500 hover:bg-red-600 text-white py-1 px-1 rounded" data-subtask-id="${subtask.id}">×</button>
        </div>
      `;

      subtaskEl.querySelector('.subtask-checkbox').addEventListener('change', async (e) => {
        const id = e.target.dataset.subtaskId;
        await toggleSubtaskCompletion(id);
      });

      subtaskEl.querySelector('.move-up-btn').addEventListener('click', async (e) => {
        const id = e.target.dataset.subtaskId;
        await moveSubtask(id, 'up');
      });

      subtaskEl.querySelector('.move-down-btn').addEventListener('click', async (e) => {
        const id = e.target.dataset.subtaskId;
        await moveSubtask(id, 'down');
      });

      subtaskEl.querySelector('.delete-subtask-btn').addEventListener('click', async (e) => {
        const id = e.target.dataset.subtaskId;
        await deleteSubtask(id);
      });

      subtasksList.appendChild(subtaskEl);
    });

    // Initialize Sortable for subtasks
    if (subtasks.length > 1) {
      new Sortable(subtasksList, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        handle: '.subtask-item', // Allow dragging the whole item
        onEnd: async function(evt) {
          const subtaskIds = Array.from(subtasksList.querySelectorAll('.subtask-item')).map(item => item.dataset.id);
          console.log('SortableJS - New subtask order:', subtaskIds);
          await updateSubtaskPositions(subtaskIds);
        }
      });
    }
  }

  // Load and render interruption tasks
  async function loadInterruptionTasks() {
     try {
        const tasks = await taskAPI.getInterruptionTasks();
        renderInterruptionTasks(tasks);
    } catch (error) {
        console.error("Error loading interruption tasks:", error);
        // Optionally show error in sidebar
    }
  }

  // Render interruption tasks in the sidebar
  function renderInterruptionTasks(tasks) {
    interruptionListEl.innerHTML = '';

    if (!tasks || tasks.length === 0) {
      // Maybe show a message like "No interruption tasks"
      return;
    }

    tasks.forEach(task => {
      const taskEl = document.createElement('div');
      taskEl.className = 'interruption-item p-3 bg-white rounded shadow mb-2';
      taskEl.dataset.id = task.id;

      taskEl.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex-1 min-w-0 mr-2">
            <h4 class="font-medium text-sm truncate">${task.title}</h4>
            ${task.notes ? `<p class="text-xs text-gray-500 truncate">${task.notes}</p>` : ''}
            <p class="text-xs text-gray-400 mt-1">${new Date(task.created_at).toLocaleString()}</p>
          </div>
          <div class="flex space-x-1 flex-shrink-0">
            ${!task.added_to_main ? `
              <button class="add-to-main-btn text-xs bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-2 rounded" data-interruption-id="${task.id}">
                メインに追加
              </button>
            ` : ''}
            <button class="delete-interruption-btn text-xs bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded" data-interruption-id="${task.id}">
              削除
            </button>
          </div>
        </div>
      `;

      taskEl.querySelector('.delete-interruption-btn')?.addEventListener('click', async (e) => {
        const id = e.target.dataset.interruptionId;
        await deleteInterruptionTask(id);
      });

      taskEl.querySelector('.add-to-main-btn')?.addEventListener('click', async (e) => {
        const id = e.target.dataset.interruptionId;
        await moveInterruptionToMain(id);
      });

      interruptionListEl.appendChild(taskEl);
    });
  }

  // Timer functions
  function toggleTimer() {
    if (!currentTaskId) {
        console.warn("Timer toggle attempted without a current task.");
        return;
    }

    if (timerInterval) {
      stopTimerAndSave(); // Stop and save time
      timerToggle.textContent = '開始';
      timerToggle.classList.remove('bg-red-500', 'hover:bg-red-600', 'timer-active');
      timerToggle.classList.add('bg-green-500', 'hover:bg-green-600');
    } else {
      startTimer();
      timerToggle.textContent = '一時停止';
      timerToggle.classList.remove('bg-green-500', 'hover:bg-green-600');
      timerToggle.classList.add('bg-red-500', 'hover:bg-red-600', 'timer-active');
    }
  }

  function startTimer() {
    if (timerInterval) return; // Already running
    if (!currentTaskId) return; // No task selected

    console.log(`Starting timer for task: ${currentTaskId}`);
    timerDisplay.classList.add('timer-active'); // Optional: for styling

    timerInterval = setInterval(async () => {
      currentTimerSeconds++;
      updateTimerDisplay();

      // Save periodically (e.g., every 10 seconds)
      if (currentTimerSeconds % 10 === 0) {
        console.log(`Auto-saving timer state for task ${currentTaskId} at ${currentTimerSeconds}s`);
        await saveTimerState();
      }
    }, 1000);
  }

  function stopTimerAndSave() {
    if (!timerInterval) return; // Not running

    console.log(`Stopping timer for task: ${currentTaskId} at ${currentTimerSeconds}s`);
    clearInterval(timerInterval);
    timerInterval = null;
    timerDisplay.classList.remove('timer-active'); // Optional: for styling

    // Save the final time
    saveTimerState();
  }

    // Function to just stop the interval without saving
  function stopTimer() {
      if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
          timerDisplay.classList.remove('timer-active');
      }
  }

  function updateTimerDisplay() {
    const hours = Math.floor(currentTimerSeconds / 3600);
    const minutes = Math.floor((currentTimerSeconds % 3600) / 60);
    const seconds = currentTimerSeconds % 60;

    timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Save elapsed time to backend/storage
  async function saveTimerState() {
    if (!currentTaskId) {
        console.warn("Attempted to save timer state without a current task ID.");
        return;
    }
    try {
        await taskAPI.updateTaskTime(currentTaskId, currentTimerSeconds);
        console.log(`Successfully saved time ${currentTimerSeconds}s for task ${currentTaskId}`);
    } catch (error) {
        console.error(`Error saving timer state for task ${currentTaskId}:`, error);
        // Optionally inform the user
    }
  }

  // Task operations: Modal Handling
  function openTaskModal(task = null) {
    taskForm.reset(); // Clear previous data

    if (task) {
      modalTitle.textContent = 'タスク編集';
      taskTitleInput.value = task.title;
      taskNotesInput.value = task.notes || '';
      taskIdInput.value = task.id; // Set hidden input for editing
    } else {
      modalTitle.textContent = '新規タスク';
      taskIdInput.value = ''; // Ensure hidden input is empty for creation
    }

    taskModal.classList.remove('hidden');
    taskModal.classList.add('flex', 'fade-in');
    setTimeout(() => taskTitleInput.focus(), 100); // Focus after animation
  }

  function closeTaskModal() {
    taskModal.classList.add('hidden');
    taskModal.classList.remove('flex', 'fade-in');
  }

  // Task operations: Form Submit (Create/Update) - ★★★ Updated Logic ★★★
  async function handleTaskFormSubmit(e) {
    e.preventDefault();

    const taskData = {
      title: taskTitleInput.value.trim(),
      notes: taskNotesInput.value.trim()
    };

    if (!taskData.title) {
        alert('タスクタイトルを入力してください。');
        taskTitleInput.focus();
        return;
    }

    let task;
    const isEditing = !!taskIdInput.value; // True if editing, false if creating

    try {
      if (isEditing) {
        console.log(`[handleTaskFormSubmit] Updating task: ${taskIdInput.value}`);
        task = await taskAPI.updateTask(taskIdInput.value, taskData);
      } else {
        console.log('[handleTaskFormSubmit] Creating new task');
        task = await taskAPI.createTask(taskData);
      }

      if (task) {
        console.log('[handleTaskFormSubmit] Task operation successful:', task);

        // 1. まずタスクリストを再読み込みして、最新の状態を反映
        await loadTaskList();

        // 2. 編集中のタスクが現在のタスクだった場合のみ、現在のタスク表示を更新
        if (isEditing && taskIdInput.value === currentTaskId) {
          console.log('[handleTaskFormSubmit] Reloading current task display (edited current)');
          await loadCurrentTask(); // 現在のタスク情報を再読み込みして表示更新
        }
        // 3. 新規作成時は selectTask を呼び出さない
        else if (!isEditing) {
           console.log('[handleTaskFormSubmit] New task created. Current task remains unchanged.');
           // selectTask(task.id); // ← この行を削除またはコメントアウト
        } else {
           // 編集したが現在のタスクではなかった場合も、リスト更新のみでOK
           console.log('[handleTaskFormSubmit] Task list updated (edited non-current). Current task remains unchanged.');
        }

        closeTaskModal(); // モーダルを閉じる
      } else {
          console.error('[handleTaskFormSubmit] Task operation returned success but no task data.');
          alert('タスクの保存に失敗しました。(データなし)');
      }
    } catch (error) {
        console.error('[handleTaskFormSubmit] Error during task operation:', error);
        alert(`エラーが発生しました: ${error.message || '不明なエラー'}`);
    }
  }

  // Task operations: Delete
  async function deleteTask(taskId) {
    if (!confirm(`タスク「${document.querySelector(`.task-item[data-id="${taskId}"] h4`)?.textContent || taskId}」を削除してもよろしいですか？`)) {
      return;
    }

    console.log(`Attempting to delete task: ${taskId}`);
    try {
        const deleted = await taskAPI.deleteTask(taskId);
        if (deleted) {
          console.log(`Task ${taskId} deleted successfully.`);
          // If the deleted task was the current one, clear the display
          if (taskId === currentTaskId) {
            console.log("Deleted task was the current task, clearing display.");
            showNoCurrentTask(); // This also stops the timer
          }
          await loadTaskList(); // Refresh the list regardless
        } else {
          console.warn(`Delete operation for task ${taskId} reported success but returned false?`);
           alert('タスクの削除に失敗しました。(API応答異常)');
        }
    } catch (error) {
        console.error(`Error deleting task ${taskId}:`, error);
        alert(`タスクの削除中にエラーが発生しました: ${error.message}`);
    }
  }

  // Task operations: Select Task
  async function selectTask(taskId) {
      if (!taskId) {
          console.error("[selectTask] Error: taskId is null or undefined.");
          return;
      }
      if (taskId === currentTaskId) {
          console.log(`[selectTask] Task ${taskId} is already selected. No action needed.`);
          return; // Avoid unnecessary processing if already selected
      }

      console.log(`[selectTask] Started for task ID: ${taskId}. Previous task ID: ${currentTaskId}`);

      // Stop and save time for the PREVIOUS task if there was one and timer was running
      if (timerInterval) {
          console.log(`[selectTask] Stopping and saving timer for previous task: ${currentTaskId}`);
          stopTimerAndSave();
      } else if(currentTaskId) {
          // If timer wasn't running but there was a current task, ensure its last time is saved.
          console.log(`[selectTask] Saving final timer state for previous task: ${currentTaskId}`);
          await saveTimerState();
      }

      try {
          console.log(`[selectTask] Setting current task via API for: ${taskId}`);
          await taskAPI.setCurrentTask(taskId); // Tell backend this is the new current task

          console.log(`[selectTask] Loading current task display for: ${taskId}`);
          await loadCurrentTask(); // Load and render the new current task details (incl. time)

          console.log(`[selectTask] Reloading task list UI to reflect current status`);
          await loadTaskList(); // Update the list view (highlighting)

          console.log(`[selectTask] Finished successfully for task ID: ${taskId}`);

      } catch (error) {
          console.error(`[selectTask] Error during selection process for task ${taskId}:`, error);
          alert(`タスクの選択中にエラーが発生しました: ${error.message}`);
      }
  }

  // Task operations: Complete Current Task
  async function completeCurrentTask() {
    if (!currentTaskId) {
        console.warn("Complete task attempted without a current task.");
        return;
    }

    if (!confirm(`タスク「${document.getElementById('current-task-title').textContent}」を完了としてマークしますか？`)) {
      return;
    }

    console.log(`Attempting to complete task: ${currentTaskId}`);
    // Stop the timer and save the final time BEFORE marking as complete
    if (timerInterval) {
        stopTimerAndSave();
    } else {
        // Even if timer wasn't running, save the current elapsed time
        await saveTimerState();
    }

    try {
        await taskAPI.updateTask(currentTaskId, { status: 'completed' });
        console.log(`Task ${currentTaskId} marked as completed.`);
        // Task is completed, so clear the current task display
        showNoCurrentTask();
        // Reload the list to show the task as completed
        await loadTaskList();
    } catch (error) {
        console.error(`Error completing task ${currentTaskId}:`, error);
        alert(`タスクの完了処理中にエラーが発生しました: ${error.message}`);
    }
  }

  // --- Subtask operations ---
  function openSubtaskModal(subtask = null) {
    subtaskForm.reset();
    if (subtask) {
       alert("サブタスクの編集はまだ実装されていません。"); return;
    } else {
      subtaskIdInput.value = '';
    }
    subtaskModal.classList.remove('hidden');
    subtaskModal.classList.add('flex', 'fade-in');
    setTimeout(() => subtaskTextInput.focus(), 100);
  }

  function closeSubtaskModal() {
    subtaskModal.classList.add('hidden');
    subtaskModal.classList.remove('flex', 'fade-in');
  }

  async function handleSubtaskFormSubmit(e) {
    e.preventDefault();
    if (!currentTaskId) {
        alert("サブタスクを追加するメインタスクが選択されていません。");
        return;
    }

    const subtaskData = {
      task_id: currentTaskId,
      text: subtaskTextInput.value.trim(),
      notes: subtaskNotesInput.value.trim()
    };

    if (!subtaskData.text) {
        alert('サブタスクの内容を入力してください。');
        subtaskTextInput.focus();
        return;
    }

    const isEditing = !!subtaskIdInput.value;
    if (isEditing) {
        alert("サブタスクの編集はまだ実装されていません。"); return;
    }

    console.log(`Creating subtask for task: ${currentTaskId}`);
    try {
        const subtask = await taskAPI.createSubtask(subtaskData);
        if (subtask) {
          console.log("Subtask created:", subtask);
          await loadCurrentTask(); // Reload main task to show new subtask
          closeSubtaskModal();
        } else {
           console.error('Subtask creation reported success but no data returned.');
           alert('サブタスクの作成に失敗しました。(データなし)');
        }
    } catch (error) {
        console.error('Error creating subtask:', error);
        alert(`サブタスクの作成中にエラーが発生しました: ${error.message}`);
    }
  }

  async function toggleSubtaskCompletion(subtaskId) {
    console.log(`Toggling completion for subtask: ${subtaskId}`);
    try {
        await taskAPI.toggleSubtaskCompletion(subtaskId);
        await loadCurrentTask(); // Reload to update UI
    } catch (error) {
        console.error(`Error toggling subtask ${subtaskId} completion:`, error);
        alert('サブタスクの状態更新中にエラーが発生しました。');
        await loadCurrentTask();
    }
  }

  async function moveSubtask(subtaskId, direction) {
    console.log(`Moving subtask ${subtaskId} ${direction}`);
    try {
        const moved = await taskAPI.moveSubtask(subtaskId, direction); // APIが成功/失敗を返す想定
        if (moved) {
          await loadCurrentTask(); // Reload to reflect new order
        } else {
            console.warn(`Move subtask ${subtaskId} ${direction} failed or was not possible.`);
        }
    } catch (error) {
        console.error(`Error moving subtask ${subtaskId}:`, error);
        alert('サブタスクの移動中にエラーが発生しました。');
    }
  }

  async function deleteSubtask(subtaskId) {
    if (!confirm('このサブタスクを削除してもよろしいですか？')) {
      return;
    }
    console.log(`Deleting subtask: ${subtaskId}`);
    try {
        const deleted = await taskAPI.deleteSubtask(subtaskId);
        if (deleted) {
          await loadCurrentTask(); // Reload parent task
        } else {
           console.warn(`Delete operation for subtask ${subtaskId} reported success but returned false?`);
           alert('サブタスクの削除に失敗しました。(API応答異常)');
        }
    } catch (error) {
        console.error(`Error deleting subtask ${subtaskId}:`, error);
        alert(`サブタスクの削除中にエラーが発生しました: ${error.message}`);
    }
  }

  async function updateSubtaskPositions(subtaskIds) {
      console.log("Updating subtask positions:", subtaskIds);
      try {
          await Promise.all(subtaskIds.map((id, index) =>
              taskAPI.updateSubtask(id, { position: index })
          ));
          console.log("Subtask positions updated successfully.");
          // UIはSortableJSが更新済みなので、基本的にはリロード不要
      } catch (error) {
          console.error("Error updating subtask positions:", error);
          alert("サブタスクの順序保存中にエラーが発生しました。");
          await loadCurrentTask(); // エラー時はUIを元に戻すためにリロード
      }
  }

  // --- Interruption task operations ---
  async function addInterruptionTask() {
    const title = interruptionInput.value.trim();
    if (!title) {
      alert('割り込みタスクの内容を入力してください。');
      interruptionInput.focus();
      return;
    }
    console.log("Adding interruption task:", title);
    try {
        const task = await taskAPI.createInterruptionTask({ title });
        if (task) {
          interruptionInput.value = ''; // Clear input on success
          await loadInterruptionTasks(); // Refresh list
        } else {
           console.error('Interruption task creation reported success but no data returned.');
           alert('割り込みタスクの追加に失敗しました。(データなし)');
        }
    } catch (error) {
        console.error('Error adding interruption task:', error);
        alert(`割り込みタスクの追加中にエラーが発生しました: ${error.message}`);
    }
  }

  async function deleteInterruptionTask(taskId) {
     if (!confirm('この割り込みメモを削除してもよろしいですか？')) return;
     console.log("Deleting interruption task:", taskId);
     try {
         const deleted = await taskAPI.deleteInterruptionTask(taskId);
         if (deleted) {
             await loadInterruptionTasks(); // Refresh list
         } else {
             console.warn(`Delete operation for interruption task ${taskId} reported success but returned false?`);
             alert('割り込みタスクの削除に失敗しました。(API応答異常)');
         }
     } catch(error) {
         console.error(`Error deleting interruption task ${taskId}:`, error);
         alert(`割り込みタスクの削除中にエラーが発生しました: ${error.message}`);
     }
  }

  async function moveInterruptionToMain(taskId) {
      console.log("Moving interruption task to main list:", taskId);
      try {
          const newTask = await taskAPI.moveToMainTasks(taskId);
          if (newTask) {
              console.log("Interruption task moved, new main task:", newTask);
              await loadTaskList(); // Refresh main list
              await loadInterruptionTasks(); // Refresh interruption list

              // If no task was currently active, select the newly added one
              // if (!currentTaskId) { // ← 新規タスクは自動選択しない方針に変更
              //     console.log("No current task, selecting the moved task:", newTask.id);
              //     await selectTask(newTask.id);
              // }
          } else {
              console.error('Move interruption task reported success but no new task data returned.');
              alert('メインタスクへの移動に失敗しました。(データなし)');
          }
      } catch (error) {
          console.error(`Error moving interruption task ${taskId} to main:`, error);
          alert(`メインタスクへの移動中にエラーが発生しました: ${error.message}`);
      }
  }

  // --- Export functions ---
  async function openExportModal() {
    console.log("Opening export modal...");
    try {
        // ★★★ APIからgetAllTasksWithSubtasksを呼び出す ★★★
        const allTasks = await taskAPI.getAllTasksWithSubtasks();
        const markdown = generateMarkdownContent(allTasks);
        exportContent.value = markdown;
        exportModal.classList.remove('hidden');
        exportModal.classList.add('flex', 'fade-in');
        setTimeout(() => {
            exportContent.focus();
            exportContent.select();
        }, 100);
    } catch (error) {
        console.error("Error preparing data for export:", error);
        alert("エクスポートデータの準備中にエラーが発生しました。");
    }
  }

  function closeExportModal() {
    exportModal.classList.add('hidden');
    exportModal.classList.remove('flex', 'fade-in');
  }

  function copyExportContent() {
    if (!navigator.clipboard) {
        exportContent.select();
        document.execCommand('copy');
        alert('クリップボードにコピーしました（旧方式）。');
    } else {
        navigator.clipboard.writeText(exportContent.value).then(() => {
            console.log('Export content copied to clipboard.');
            const originalText = copyExportBtn.textContent;
            copyExportBtn.textContent = 'コピーしました！';
            copyExportBtn.disabled = true;
            setTimeout(() => {
              copyExportBtn.textContent = originalText;
              copyExportBtn.disabled = false;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy export content: ', err);
            alert('クリップボードへのコピーに失敗しました。');
        });
    }
  }

  function generateMarkdownContent(tasks) {
    const today = new Date();
    const dateStr = today.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
    let markdown = `# タスク一覧 (${dateStr})\n\n`;

    const currentTask = tasks.find(task => task.is_current);
    if (currentTask) {
      markdown += `## 現在のタスク\n\n`;
      markdown += formatTaskForMarkdown(currentTask, true); // Include subtasks
      markdown += '\n';
    }

    const activeTasks = tasks.filter(task => task.status === 'active' && !task.is_current);
    if (activeTasks.length > 0) {
      markdown += `## 未完了のタスク\n\n`;
      activeTasks.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) // Sort by creation date asc
                 .forEach(task => {
                    markdown += formatTaskForMarkdown(task, true); // Include subtasks for active tasks too
                 });
      markdown += '\n';
    }

    const completedTasks = tasks.filter(task => task.status === 'completed');
    if (completedTasks.length > 0) {
      markdown += `## 完了したタスク\n\n`;
      completedTasks.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at)) // Sort by completion date asc
                    .forEach(task => {
                        markdown += formatTaskForMarkdown(task, false); // Don't include subtasks for completed
                    });
      markdown += '\n';
    }

    return markdown.trim();
  }

  // Helper function for Markdown formatting
  function formatTaskForMarkdown(task, includeSubtasks) {
      let md = `- ${task.status === 'completed' ? '[x]' : (task.is_current ? '**' : '')}${task.title}${task.is_current ? '**' : ''}`;
      if (task.notes) {
        md += ` - ${task.notes.replace(/\n/g, ' ')}`;
      }
      if (task.status !== 'completed' && task.elapsed_time > 0) {
          const hours = Math.floor(task.elapsed_time / 3600);
          const minutes = Math.floor((task.elapsed_time % 3600) / 60);
          if (hours > 0 || minutes > 0) {
             md += ` (${hours}時間${minutes}分)`;
          }
      }
      md += '\n';

      if (includeSubtasks && task.subtasks && task.subtasks.length > 0) {
          // Sort subtasks by position before displaying
          task.subtasks.sort((a, b) => a.position - b.position).forEach(subtask => {
              md += `  - ${subtask.completed ? '[x]' : '[ ]'} ${subtask.text}\n`;
          });
      }
      return md;
  }

  // Start the app
  console.log("Initializing application...");
  initApp().then(() => {
      console.log("Application initialized.");
  }).catch(error => {
      console.error("Application initialization failed:", error);
      document.body.innerHTML = '<div class="p-4 text-red-700 bg-red-100 border border-red-400 rounded">アプリケーションの初期化に失敗しました。ページをリロードしてください。</div>';
  });

}); // End of DOMContentLoaded