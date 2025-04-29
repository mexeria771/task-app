// Main application code
document.addEventListener('DOMContentLoaded', () => {
  // DOM element references
  const currentTaskEl = document.getElementById('current-task');
  const currentTaskContent = document.getElementById('current-task-content');
  const noCurrentTask = document.getElementById('no-current-task');
  const taskListEl = document.getElementById('task-list');
  const interruptionListEl = document.getElementById('interruption-list');
  
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
    addTaskBtn.addEventListener('click', () => openTaskModal());
    addTaskListBtn.addEventListener('click', () => openTaskModal());
    closeModalBtn.addEventListener('click', () => closeTaskModal());
    taskForm.addEventListener('submit', handleTaskFormSubmit);
    completeTaskBtn.addEventListener('click', completeCurrentTask);
    
    // Timer button
    timerToggle.addEventListener('click', toggleTimer);
    
    // Subtask buttons
    addSubtaskBtn.addEventListener('click', () => openSubtaskModal());
    closeSubtaskModalBtn.addEventListener('click', () => closeSubtaskModal());
    subtaskForm.addEventListener('submit', handleSubtaskFormSubmit);
    
    // Interruption buttons
    addInterruptionBtn.addEventListener('click', addInterruptionTask);
    
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
    const tasks = await taskAPI.getAllTasks();
    renderTaskList(tasks);
  }
  
  // Render task list
  function renderTaskList(tasks) {
    taskListEl.innerHTML = '';
    
    if (tasks.length === 0) {
      taskListEl.innerHTML = '<p class="text-gray-500 text-center">タスクがありません</p>';
      return;
    }
    
    tasks.forEach(task => {
      const taskEl = document.createElement('div');
      taskEl.className = `task-item p-3 border rounded mb-2 ${task.is_current ? 'current' : ''} ${task.status === 'completed' ? 'bg-gray-100' : 'hover:bg-gray-50'}`;
      taskEl.dataset.id = task.id;
      
      // Format elapsed time
      const hours = Math.floor(task.elapsed_time / 3600);
      const minutes = Math.floor((task.elapsed_time % 3600) / 60);
      const seconds = task.elapsed_time % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      taskEl.innerHTML = `
        <div class="flex justify-between items-center">
          <div class="flex-1">
            <h4 class="font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}">${task.title}</h4>
            <p class="text-xs text-gray-500">経過時間: ${timeStr}</p>
          </div>
          <div class="flex space-x-1">
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
      
      // Add event listeners
      taskEl.querySelector('.delete-task-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(task.id);
      });
      
      if (task.status !== 'completed') {
        taskEl.querySelector('.select-task-btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          selectTask(task.id);
        });
        
        taskEl.querySelector('.edit-task-btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          openTaskModal(task);
        });
      }
      
      taskListEl.appendChild(taskEl);
    });
    
    // Initialize Sortable for task list
    if (tasks.length > 1) {
      new Sortable(taskListEl, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        handle: '.task-item',
        onEnd: async function(evt) {
          // Get all task IDs in the new order
          const taskIds = Array.from(taskListEl.querySelectorAll('.task-item')).map(item => item.dataset.id);
          
          // Save new task order (Future implementation)
          console.log('New task order:', taskIds);
          // Here we would implement a function to save the new order to the database
          // For now, we'll just log it
        }
      });
    }
  }
  
  // Load and render current task
  async function loadCurrentTask() {
    const currentTask = await taskAPI.getCurrentTask();
    
    if (currentTask) {
      currentTaskId = currentTask.id;
      currentTimerSeconds = currentTask.elapsed_time;
      renderCurrentTask(currentTask);
    } else {
      showNoCurrentTask();
    }
  }
  
  // Show empty state when no task is selected
  function showNoCurrentTask() {
    noCurrentTask.classList.remove('hidden');
    currentTaskContent.classList.add('hidden');
    currentTaskId = null;
    
    // Reset timer
    stopTimer();
    currentTimerSeconds = 0;
    updateTimerDisplay();
  }
  
  // Render current task
  function renderCurrentTask(task) {
    // Show current task content
    noCurrentTask.classList.add('hidden');
    currentTaskContent.classList.remove('hidden');
    
    // Set task title and notes
    document.getElementById('current-task-title').textContent = task.title;
    document.getElementById('current-task-notes').textContent = task.notes || '(メモなし)';
    
    // Update timer display
    currentTimerSeconds = task.elapsed_time;
    updateTimerDisplay();
    
    // Reset timer button
    timerToggle.textContent = '開始';
    timerToggle.classList.remove('bg-red-500', 'hover:bg-red-600');
    timerToggle.classList.add('bg-green-500', 'hover:bg-green-600');
    
    // Render subtasks
    renderSubtasks(task.subtasks || []);
  }
  
  // Render subtasks
  function renderSubtasks(subtasks) {
    const subtasksList = document.getElementById('subtasks-list');
    subtasksList.innerHTML = '';
    
    if (subtasks.length === 0) {
      subtasksList.innerHTML = '<li class="text-gray-500 text-sm">サブタスクがありません</li>';
      return;
    }
    
    subtasks.forEach(subtask => {
      const subtaskEl = document.createElement('li');
      subtaskEl.className = `subtask-item p-2 border rounded flex items-center ${subtask.completed ? 'subtask-completed bg-gray-50' : ''}`;
      subtaskEl.dataset.id = subtask.id;
      
      subtaskEl.innerHTML = `
        <input type="checkbox" class="mr-2 subtask-checkbox" ${subtask.completed ? 'checked' : ''}>
        <div class="flex-1">
          <p class="text-sm">${subtask.text}</p>
          ${subtask.notes ? `<p class="text-xs text-gray-500">${subtask.notes}</p>` : ''}
        </div>
        <div class="flex space-x-1">
          <button class="move-up-btn text-xs bg-gray-200 hover:bg-gray-300 py-1 px-1 rounded">↑</button>
          <button class="move-down-btn text-xs bg-gray-200 hover:bg-gray-300 py-1 px-1 rounded">↓</button>
          <button class="delete-subtask-btn text-xs bg-red-500 hover:bg-red-600 text-white py-1 px-1 rounded">×</button>
        </div>
      `;
      
      // Add event listeners
      subtaskEl.querySelector('.subtask-checkbox').addEventListener('change', () => {
        toggleSubtaskCompletion(subtask.id);
      });
      
      subtaskEl.querySelector('.move-up-btn').addEventListener('click', () => {
        moveSubtask(subtask.id, 'up');
      });
      
      subtaskEl.querySelector('.move-down-btn').addEventListener('click', () => {
        moveSubtask(subtask.id, 'down');
      });
      
      subtaskEl.querySelector('.delete-subtask-btn').addEventListener('click', () => {
        deleteSubtask(subtask.id);
      });
      
      subtasksList.appendChild(subtaskEl);
    });
    
    // Initialize Sortable for subtasks
    if (subtasks.length > 1) {
      new Sortable(subtasksList, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        handle: '.subtask-item',
        onEnd: async function(evt) {
          // Get all subtask IDs in new order
          const subtaskIds = Array.from(subtasksList.querySelectorAll('.subtask-item')).map(item => item.dataset.id);
          
          // Update subtask positions
          console.log('New subtask order:', subtaskIds);
          // Save the new positions
          await updateSubtaskPositions(subtaskIds);
        }
      });
    }
  }
  
  // Load and render interruption tasks
  async function loadInterruptionTasks() {
    const tasks = await taskAPI.getInterruptionTasks();
    renderInterruptionTasks(tasks);
  }
  
  // Render interruption tasks
  function renderInterruptionTasks(tasks) {
    interruptionListEl.innerHTML = '';
    
    if (tasks.length === 0) {
      return; // No empty state needed
    }
    
    tasks.forEach(task => {
      const taskEl = document.createElement('div');
      taskEl.className = 'interruption-item p-3 bg-white rounded shadow mb-2';
      taskEl.dataset.id = task.id;
      
      taskEl.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h4 class="font-medium text-sm">${task.title}</h4>
            ${task.notes ? `<p class="text-xs text-gray-500">${task.notes}</p>` : ''}
            <p class="text-xs text-gray-400 mt-1">${new Date(task.created_at).toLocaleString()}</p>
          </div>
          <div class="flex space-x-1">
            ${!task.added_to_main ? `
              <button class="add-to-main-btn text-xs bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-2 rounded">
                メインに追加
              </button>
            ` : ''}
            <button class="delete-interruption-btn text-xs bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded">
              削除
            </button>
          </div>
        </div>
      `;
      
      // Add event listeners
      taskEl.querySelector('.delete-interruption-btn')?.addEventListener('click', () => {
        deleteInterruptionTask(task.id);
      });
      
      if (!task.added_to_main) {
        taskEl.querySelector('.add-to-main-btn')?.addEventListener('click', () => {
          moveInterruptionToMain(task.id);
        });
      }
      
      interruptionListEl.appendChild(taskEl);
    });
  }
  
  // Timer functions
  function toggleTimer() {
    if (!currentTaskId) return;
    
    if (timerInterval) {
      stopTimer();
      timerToggle.textContent = '開始';
      timerToggle.classList.remove('bg-red-500', 'hover:bg-red-600');
      timerToggle.classList.add('bg-green-500', 'hover:bg-green-600');
    } else {
      startTimer();
      timerToggle.textContent = '一時停止';
      timerToggle.classList.remove('bg-green-500', 'hover:bg-green-600');
      timerToggle.classList.add('bg-red-500', 'hover:bg-red-600');
    }
  }
  
  function startTimer() {
    if (timerInterval) return;
    
    timerDisplay.classList.add('timer-active');
    
    timerInterval = setInterval(() => {
      currentTimerSeconds++;
      updateTimerDisplay();
      
      // Every 10 seconds, update the task's elapsed time in storage
      if (currentTimerSeconds % 10 === 0) {
        saveTimerState();
      }
    }, 1000);
  }
  
  function stopTimer() {
    if (!timerInterval) return;
    
    clearInterval(timerInterval);
    timerInterval = null;
    timerDisplay.classList.remove('timer-active');
    
    // Save the current timer state
    saveTimerState();
  }
  
  function updateTimerDisplay() {
    const hours = Math.floor(currentTimerSeconds / 3600);
    const minutes = Math.floor((currentTimerSeconds % 3600) / 60);
    const seconds = currentTimerSeconds % 60;
    
    timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  async function saveTimerState() {
    if (!currentTaskId) return;
    
    await taskAPI.updateTaskTime(currentTaskId, currentTimerSeconds);
  }
  
  // Task operations
  function openTaskModal(task = null) {
    // Reset form
    taskForm.reset();
    
    if (task) {
      // Edit mode
      modalTitle.textContent = 'タスク編集';
      taskTitleInput.value = task.title;
      taskNotesInput.value = task.notes || '';
      taskIdInput.value = task.id;
    } else {
      // Create mode
      modalTitle.textContent = '新規タスク';
      taskIdInput.value = '';
    }
    
    // Show modal with animation
    taskModal.classList.remove('hidden');
    taskModal.classList.add('flex', 'fade-in');
    
    // Focus title input
    setTimeout(() => {
      taskTitleInput.focus();
    }, 100);
  }
  
  function closeTaskModal() {
    taskModal.classList.add('hidden');
    taskModal.classList.remove('flex', 'fade-in');
  }
  
  async function handleTaskFormSubmit(e) {
    e.preventDefault();
    
    const taskData = {
      title: taskTitleInput.value.trim(),
      notes: taskNotesInput.value.trim()
    };
    
    let task;
    
    if (taskIdInput.value) {
      // Update existing task
      task = await taskAPI.updateTask(taskIdInput.value, taskData);
    } else {
      // Create new task
      task = await taskAPI.createTask(taskData);
    }
    
    if (task) {
      // Reload task list
      await loadTaskList();
      
      // If this is the only task, set it as current
      if (taskIdInput.value === '' && !currentTaskId) {
        await selectTask(task.id);
      } else if (taskIdInput.value === currentTaskId) {
        // Reload current task if we just updated it
        await loadCurrentTask();
      }
      
      // Close modal
      closeTaskModal();
    }
  }
  
  async function deleteTask(taskId) {
    if (!confirm('このタスクを削除してもよろしいですか？')) {
      return;
    }
    
    const deleted = await taskAPI.deleteTask(taskId);
    
    if (deleted) {
      await loadTaskList();
      
      // If we deleted the current task, show the empty state
      if (taskId === currentTaskId) {
        showNoCurrentTask();
      }
    }
  }
  
  async function selectTask(taskId) {
    await taskAPI.setCurrentTask(taskId);
    await loadCurrentTask();
    await loadTaskList(); // Refresh the task list to update the 'current' styling
  }
  
  async function completeCurrentTask() {
    if (!currentTaskId) return;
    
    if (!confirm('このタスクを完了としてマークしますか？')) {
      return;
    }
    
    // Stop the timer if it's running
    stopTimer();
    
    // Update the task status
    await taskAPI.updateTask(currentTaskId, { status: 'completed' });
    
    // Reload the task list and show no current task
    await loadTaskList();
    showNoCurrentTask();
  }
  
  // Subtask operations
  function openSubtaskModal(subtask = null) {
    // Reset form
    subtaskForm.reset();
    
    if (subtask) {
      // Edit mode - not implemented yet
      subtaskIdInput.value = subtask.id;
      subtaskTextInput.value = subtask.text;
      subtaskNotesInput.value = subtask.notes || '';
    } else {
      // Create mode
      subtaskIdInput.value = '';
    }
    
    // Show modal
    subtaskModal.classList.remove('hidden');
    subtaskModal.classList.add('flex', 'fade-in');
    
    // Focus text input
    setTimeout(() => {
      subtaskTextInput.focus();
    }, 100);
  }
  
  function closeSubtaskModal() {
    subtaskModal.classList.add('hidden');
    subtaskModal.classList.remove('flex', 'fade-in');
  }
  
  async function handleSubtaskFormSubmit(e) {
    e.preventDefault();
    
    if (!currentTaskId) return;
    
    const subtaskData = {
      task_id: currentTaskId,
      text: subtaskTextInput.value.trim(),
      notes: subtaskNotesInput.value.trim()
    };
    
    let subtask;
    
    if (subtaskIdInput.value) {
      // Update existing subtask - not fully implemented yet
      subtask = await taskAPI.updateSubtask(subtaskIdInput.value, {
        text: subtaskData.text,
        notes: subtaskData.notes
      });
    } else {
      // Create new subtask
      subtask = await taskAPI.createSubtask(subtaskData);
    }
    
    if (subtask) {
      // Reload current task to show updated subtasks
      await loadCurrentTask();
      
      // Close modal
      closeSubtaskModal();
    }
  }
  
  async function toggleSubtaskCompletion(subtaskId) {
    await taskAPI.toggleSubtaskCompletion(subtaskId);
    await loadCurrentTask();
  }
  
  async function moveSubtask(subtaskId, direction) {
    await taskAPI.moveSubtask(subtaskId, direction);
    await loadCurrentTask();
  }
  
  async function deleteSubtask(subtaskId) {
    if (!confirm('このサブタスクを削除してもよろしいですか？')) {
      return;
    }
    
    const deleted = await taskAPI.deleteSubtask(subtaskId);
    
    if (deleted) {
      await loadCurrentTask();
    }
  }
  
  async function updateSubtaskPositions(subtaskIds) {
    // For each subtask ID in the new order, update its position
    for (let i = 0; i < subtaskIds.length; i++) {
      await taskAPI.updateSubtask(subtaskIds[i], { position: i });
    }
    
    // Reload current task to reflect the changes
    await loadCurrentTask();
  }
  
  // Interruption task operations
  async function addInterruptionTask() {
    const title = interruptionInput.value.trim();
    
    if (!title) {
      alert('タスク名を入力してください');
      return;
    }
    
    const task = await taskAPI.createInterruptionTask({ title });
    
    if (task) {
      // Clear input
      interruptionInput.value = '';
      
      // Reload interruption tasks
      await loadInterruptionTasks();
    }
  }
  
  async function deleteInterruptionTask(taskId) {
    const deleted = await taskAPI.deleteInterruptionTask(taskId);
    
    if (deleted) {
      await loadInterruptionTasks();
    }
  }
  
  async function moveInterruptionToMain(taskId) {
    const newTask = await taskAPI.moveToMainTasks(taskId);
    
    if (newTask) {
      // Reload both lists
      await loadTaskList();
      await loadInterruptionTasks();
      
      // If no current task, select this one
      if (!currentTaskId) {
        await selectTask(newTask.id);
      }
    }
  }
  
  // Export functions
  async function openExportModal() {
    // Get all tasks
    const allTasks = await taskAPI.getAllTasks();
    
    // Create markdown content
    const markdown = generateMarkdownContent(allTasks);
    
    // Set content to textarea
    exportContent.value = markdown;
    
    // Show modal
    exportModal.classList.remove('hidden');
    exportModal.classList.add('flex', 'fade-in');
    
    // Select text for easy copying
    setTimeout(() => {
      exportContent.focus();
      exportContent.select();
    }, 100);
  }
  
  function closeExportModal() {
    exportModal.classList.add('hidden');
    exportModal.classList.remove('flex', 'fade-in');
  }
  
  function copyExportContent() {
    exportContent.select();
    document.execCommand('copy');
    
    // Show feedback
    const originalText = copyExportBtn.textContent;
    copyExportBtn.textContent = 'コピーしました！';
    
    // Reset after 2 seconds
    setTimeout(() => {
      copyExportBtn.textContent = originalText;
    }, 2000);
  }
  
  function generateMarkdownContent(tasks) {
    // Get today's date for the header
    const today = new Date();
    const dateStr = today.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit'
    });
    
    // Start with header
    let markdown = `# タスク一覧 (${dateStr})

`;
    
    // Current task section
    const currentTask = tasks.find(task => task.is_current);
    if (currentTask) {
      markdown += `## 現在のタスク

`;
      markdown += `- **${currentTask.title}**`;
      
      if (currentTask.notes) {
        markdown += ` - ${currentTask.notes}`;
      }
      
      // Format elapsed time
      const hours = Math.floor(currentTask.elapsed_time / 3600);
      const minutes = Math.floor((currentTask.elapsed_time % 3600) / 60);
      markdown += ` (${hours}時間${minutes}分)

`;
      
      // サブタスクがあれば追加
      if (currentTask.subtasks && currentTask.subtasks.length > 0) {
        markdown += "### サブタスク\n\n";
        currentTask.subtasks.forEach(subtask => {
          markdown += `  - ${subtask.completed ? '[x]' : '[ ]'} ${subtask.text}\n`;
        });
        markdown += '\n';
      }
    }
    
    // Active tasks section
    const activeTasks = tasks.filter(task => task.status === 'active' && !task.is_current);
    if (activeTasks.length > 0) {
      markdown += `## 未完了のタスク

`;
      
      activeTasks.forEach(task => {
        markdown += `- ${task.title}`;
        
        if (task.notes) {
          markdown += ` - ${task.notes}`;
        }
        
        // Format elapsed time
        const hours = Math.floor(task.elapsed_time / 3600);
        const minutes = Math.floor((task.elapsed_time % 3600) / 60);
        if (hours > 0 || minutes > 0) {
          markdown += ` (${hours}時間${minutes}分)`;
        }
        
        markdown += '\n';
      });
      
      markdown += '\n';
    }
    
    // Completed tasks section
    const completedTasks = tasks.filter(task => task.status === 'completed');
    if (completedTasks.length > 0) {
      markdown += `## 完了したタスク

`;
      
      completedTasks.forEach(task => {
        markdown += `- [x] ${task.title}`;
        
        if (task.notes) {
          markdown += ` - ${task.notes}`;
        }
        
        markdown += '\n';
      });
    }
    
    return markdown;
  }
  
  // Start the app
  initApp();
});