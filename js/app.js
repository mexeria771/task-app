// API wrapper for data operations (Supabase or localStorage)
class TaskAPI {
  constructor() {
    this.supabase = null;
    this.userId = 'anonymous'; // Initialize userId

    // Initialize Supabase client if URL and key are provided
    if (supabaseConfig.url && supabaseConfig.key && !supabaseConfig.useLocalStorage) {
      try {
          this.supabase = window.supabase.createClient(supabaseConfig.url, supabaseConfig.key);
          console.log('Supabase client initialized');
          // --- ▼▼▼ ユーザーID取得のタイミングを変更 ▼▼▼ ---
          this.updateUserId(); // 初期化時にユーザーIDを設定試行
          // Listen for auth changes to update userId
          if (this.supabase.auth) {
              this.supabase.auth.onAuthStateChange((event, session) => {
                  console.log('Auth state changed:', event);
                  this.updateUserId(session);
              });
          }
          // --- ▲▲▲ ユーザーID取得のタイミングを変更 ▲▲▲ ---
      } catch (error) {
          console.error("Failed to initialize Supabase client:", error);
          console.log("Falling back to localStorage.");
          supabaseConfig.useLocalStorage = true; // Force localStorage if init fails
          this.userId = 'anonymous'; // localStorage時は anonymous
      }
    } else {
      console.log('Using localStorage for data storage');
      supabaseConfig.useLocalStorage = true; // Ensure flag is set if no Supabase details
      this.userId = 'anonymous'; // localStorage時は anonymous
    }
  }

  /**
   * Generate a UUID for local storage
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Get current timestamp in ISO format
   */
  getCurrentTimestamp() {
    return new Date().toISOString();
  }

  // --- ▼▼▼ ユーザーID管理メソッド追加 ▼▼▼ ---
  /**
   * Update the stored user ID based on the current session or authService.
   */
  updateUserId(session = null) {
    let currentUserId = 'anonymous'; // Default to anonymous
    if (this.supabase && this.supabase.auth) {
        const user = session?.user ?? this.supabase.auth.user?.(); // Use provided session or get current
        if (user) {
            currentUserId = user.id;
        }
    } else if (window.authService && window.authService.getUserId()) { // Fallback for potential custom authService
        currentUserId = window.authService.getUserId();
    }
    if (this.userId !== currentUserId) {
        console.log(`User ID updated from ${this.userId} to ${currentUserId}`);
        this.userId = currentUserId;
    }
  }

  /**
   * Get current user ID or fallback to 'anonymous'
   */
  getUserId() {
    // 常に保持している userId を返す
    return this.userId || 'anonymous';
  }
  // --- ▲▲▲ ユーザーID管理メソッド追加 ▲▲▲ ---


  // === TASKS ===

  /**
   * Get all tasks (without subtasks initially), ordered by position or creation date.
   * ★★★ Requires 'position' column in 'tasks' table for Supabase ★★★
   */
  async getAllTasks() {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('tasks')
          .select('*')
          .eq('user_id', this.getUserId())
          // ★★★ `position` でソート、なければ `created_at` ★★★
          .order('position', { ascending: true, nullsFirst: false }) // Nulls last (or first, consistent is key)
          .order('created_at', { ascending: true }); // Secondary sort

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Supabase Error fetching tasks:', error);
        throw new Error(`Failed to fetch tasks from Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.tasks) || '[]');
        // ★★★ `position` でソート、なければ `created_at` ★★★
        return tasks
          .filter(task => task.user_id === this.getUserId()) // ユーザーでフィルタリング
          .sort((a, b) => {
            const posA = a.position ?? Infinity;
            const posB = b.position ?? Infinity;
            if (posA !== posB) return posA - posB;
            return new Date(a.created_at) - new Date(b.created_at); // Fallback sort
          });
      } catch (error) {
        console.error('LocalStorage Error fetching tasks:', error);
        throw new Error(`Failed to fetch tasks from localStorage: ${error.message}`);
      }
    }
    return [];
  }

  /**
   * Get all tasks including their subtasks. Used for export.
   */
  async getAllTasksWithSubtasks() {
    const tasks = await this.getAllTasks();
    if (!tasks || tasks.length === 0) {
      return [];
    }

    try {
        const tasksWithSubtasks = await Promise.all(
          tasks.map(async (task) => {
            const subtasks = await this.getSubtasks(task.id);
            return { ...task, subtasks: subtasks || [] };
          })
        );
        return tasksWithSubtasks;
    } catch(error) {
        console.error("Error fetching subtasks while getting all tasks:", error);
        throw new Error(`Failed to fetch subtasks for export: ${error.message}`);
    }
  }


  /**
   * Create a new task
   * ★★★ Adds task to the end by setting position ★★★
   */
  async createTask(taskData) {
    // --- ▼▼▼ 位置決め処理を追加 ▼▼▼ ---
    let nextPosition = 0;
    try {
      const tasks = await this.getAllTasks(); // 既存タスクを取得 (ソート済みのはず)
      if (tasks.length > 0) {
        nextPosition = Math.max(...tasks.map(t => t.position ?? -1)) + 1;
      }
    } catch (error) {
      console.warn(`Could not determine next task position, using 0. Error: ${error.message}`);
    }
    // --- ▲▲▲ 位置決め処理を追加 ▲▲▲ ---

    const timestamp = this.getCurrentTimestamp();
    const newTask = {
      id: this.generateUUID(),
      title: taskData.title,
      notes: taskData.notes || null,
      elapsed_time: 0,
      status: 'active',
      is_current: false,
      position: nextPosition, // ★★★ 位置を設定 ★★★
      created_at: timestamp,
      updated_at: timestamp,
      user_id: this.getUserId()
    };

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('tasks')
          .insert(newTask)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Supabase Error creating task:', error);
        throw new Error(`Failed to create task in Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.tasks) || '[]');
        const userTasks = tasks.filter(t => t.user_id === this.getUserId()); // 自分のタスクのみ
        userTasks.push(newTask);
        // ユーザー以外のタスクと結合して保存（マルチユーザー対応のため）
        const otherUserTasks = tasks.filter(t => t.user_id !== this.getUserId());
        localStorage.setItem(supabaseConfig.localStorageKeys.tasks, JSON.stringify([...otherUserTasks, ...userTasks]));
        return newTask;
      } catch (error) {
        console.error('LocalStorage Error creating task:', error);
        throw new Error(`Failed to create task in localStorage: ${error.message}`);
      }
    }
     throw new Error("No storage method configured.");
  }

  /**
   * Update an existing task
   * ★★★ Now also handles 'position' updates ★★★
   */
  async updateTask(taskId, updateData) {
    if (!taskId) throw new Error("Task ID is required for update.");

    const timestamp = this.getCurrentTimestamp();
    const dataToUpdate = {
        ...updateData,
        updated_at: timestamp
    };

    // Prevent updating immutable fields accidentally
    delete dataToUpdate.id;
    delete dataToUpdate.created_at;
    delete dataToUpdate.user_id; // user_idも変更不可とする

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('tasks')
          .update(dataToUpdate)
          .eq('id', taskId)
          .eq('user_id', this.getUserId()) // Ensure user owns the task
          .select()
          .single();

        if (error) {
            if (error.code === 'PGRST116') { // Row not found or permission denied
                 throw new Error(`Task ${taskId} not found or permission denied.`);
            }
            throw error;
        }
        return data;
      } catch (error) {
        console.error(`Supabase Error updating task ${taskId}:`, error);
        throw new Error(`Failed to update task in Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.tasks) || '[]');
        const taskIndex = tasks.findIndex(task => task.id === taskId && task.user_id === this.getUserId());

        if (taskIndex !== -1) {
          tasks[taskIndex] = { ...tasks[taskIndex], ...dataToUpdate };
          localStorage.setItem(supabaseConfig.localStorageKeys.tasks, JSON.stringify(tasks));
          return tasks[taskIndex];
        } else {
          throw new Error(`Task with ID ${taskId} not found for current user in localStorage.`);
        }
      } catch (error) {
        console.error(`LocalStorage Error updating task ${taskId}:`, error);
        throw new Error(`Failed to update task in localStorage: ${error.message}`);
      }
    }
     throw new Error("No storage method configured.");
  }

  // --- ▼▼▼ タスク並び替えメソッド追加 ▼▼▼ ---
  /**
   * Update the order (position) of multiple tasks.
   * ★★★ Requires 'position' column in 'tasks' table ★★★
   * @param {string[]} taskIds - Array of task IDs in the desired order.
   */
  async updateTaskOrder(taskIds) {
    if (!Array.isArray(taskIds)) {
      throw new Error("taskIds must be an array.");
    }
    console.log("Updating task order:", taskIds);

    const timestamp = this.getCurrentTimestamp();
    const updates = taskIds.map((id, index) => ({
        id: id,
        position: index,
        updated_at: timestamp // Optionally update timestamp on reorder
    }));

    if (this.supabase) {
      try {
         // Perform updates in parallel
         // Note: Supabase JS v2 doesn't have bulk update directly.
         // Looping Promise.all is common. For large lists, an RPC might be better.
        const updatePromises = updates.map(update =>
            this.supabase
                .from('tasks')
                .update({ position: update.position, updated_at: update.updated_at })
                .eq('id', update.id)
                .eq('user_id', this.getUserId()) // Ensure ownership
        );
        const results = await Promise.all(updatePromises);

        // Check for errors in results (optional, as Promise.all throws on first error)
        results.forEach((result, index) => {
          if (result.error) {
            console.error(`Error updating position for task ${updates[index].id}:`, result.error);
            // Decide how to handle partial failures - rollback? log? throw?
            // For simplicity, we'll log and continue, but throwing might be safer.
            // throw new Error(`Partial failure updating task order: ${result.error.message}`);
          }
        });
        console.log("Supabase task order update results:", results);
        return true; // Indicate success (even if some warnings occurred)

      } catch (error) {
        console.error('Supabase Error updating task order:', error);
        throw new Error(`Failed to update task order in Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.tasks) || '[]');
        const userId = this.getUserId();
        let updateCount = 0;

        // Create a map for quick lookup
        const taskMap = new Map(tasks.map(task => [task.id, task]));

        updates.forEach(update => {
          const task = taskMap.get(update.id);
          // Update only if task exists and belongs to the user
          if (task && task.user_id === userId) {
             if (task.position !== update.position) { // Only update if position changed
                 task.position = update.position;
                 task.updated_at = update.updated_at;
                 updateCount++;
             }
          }
        });

        if (updateCount > 0) {
            console.log(`LocalStorage: Updated positions for ${updateCount} tasks.`);
            localStorage.setItem(supabaseConfig.localStorageKeys.tasks, JSON.stringify(tasks));
        } else {
            console.log("LocalStorage: No task positions needed updating.");
        }
        return true;
      } catch (error) {
        console.error('LocalStorage Error updating task order:', error);
        throw new Error(`Failed to update task order in localStorage: ${error.message}`);
      }
    }
    throw new Error("No storage method configured.");
  }
  // --- ▲▲▲ タスク並び替えメソッド追加 ▲▲▲ ---


  /**
   * Delete a task and its subtasks
   */
  async deleteTask(taskId) {
    if (!taskId) throw new Error("Task ID is required for deletion.");

    if (this.supabase) {
      try {
         // Use transaction if possible, otherwise delete subtasks then task
         const { error: subtaskError } = await this.supabase
            .from('subtasks')
            .delete()
            .eq('task_id', taskId)
            .eq('user_id', this.getUserId()); // Ensure user owns subtasks via task
            // Note: Subtasks might not directly have user_id, rely on task ownership

         if (subtaskError) console.warn(`Supabase: Could not delete subtasks for task ${taskId} (might not exist or permission issue):`, subtaskError.message);

         const { error } = await this.supabase
          .from('tasks')
          .delete()
          .eq('id', taskId)
          .eq('user_id', this.getUserId()); // Ensure user owns the task

        if (error && error.code !== 'PGRST116') throw error; // Ignore 'not found'
        return true;
      } catch (error) {
        console.error(`Supabase Error deleting task ${taskId}:`, error);
        throw new Error(`Failed to delete task from Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        let tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.tasks) || '[]');
        let subtasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.subtasks) || '[]');
        const userId = this.getUserId();

        const initialTaskLength = tasks.length;
        const filteredTasks = tasks.filter(task => !(task.id === taskId && task.user_id === userId));

        if (filteredTasks.length === initialTaskLength) {
            console.warn(`LocalStorage: Task with ID ${taskId} not found for current user.`);
        }

        // Filter subtasks based on the deleted task ID (assuming subtasks don't have user_id)
        const filteredSubtasks = subtasks.filter(subtask => subtask.task_id !== taskId);

        localStorage.setItem(supabaseConfig.localStorageKeys.tasks, JSON.stringify(filteredTasks));
        localStorage.setItem(supabaseConfig.localStorageKeys.subtasks, JSON.stringify(filteredSubtasks));
        return true;
      } catch (error) {
        console.error(`LocalStorage Error deleting task ${taskId}:`, error);
        throw new Error(`Failed to delete task from localStorage: ${error.message}`);
      }
    }
     throw new Error("No storage method configured.");
  }

  /**
   * Set a specific task as the current one (ensuring others are not current)
   */
  async setCurrentTask(taskId) {
    if (!taskId) throw new Error("Task ID is required to set current task.");
    const userId = this.getUserId();

    if (this.supabase) {
      try {
        // 1. Reset previous current task (if any) for this user
        const { error: resetError } = await this.supabase
          .from('tasks')
          .update({ is_current: false, updated_at: this.getCurrentTimestamp() }) // update timestamp on reset too
          .eq('is_current', true)
          .eq('user_id', userId); // Only reset for the current user

        if (resetError) {
            console.warn(`Supabase: Failed to reset previous current task for user ${userId}:`, resetError.message);
        }

        // 2. Set the new current task for this user
        const { data, error } = await this.supabase
          .from('tasks')
          .update({ is_current: true, updated_at: this.getCurrentTimestamp() })
          .eq('id', taskId)
          .eq('user_id', userId) // Ensure user owns the task
          .select()
          .single();

        if (error) {
             if (error.code === 'PGRST116') {
                 throw new Error(`Task ${taskId} not found or permission denied for user ${userId}.`);
             }
            throw error;
        }
        return data;
      } catch (error) {
        console.error(`Supabase Error setting current task to ${taskId}:`, error);
        throw new Error(`Failed to set current task in Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.tasks) || '[]');
        let foundTask = null;
        const timestamp = this.getCurrentTimestamp();

        tasks.forEach(task => {
          if (task.user_id === userId) { // Only modify tasks belonging to the user
             if (task.id === taskId) {
               task.is_current = true;
               task.updated_at = timestamp;
               foundTask = task;
             } else if (task.is_current) { // Reset previous current for this user
               task.is_current = false;
               task.updated_at = timestamp;
             }
          }
        });

        if (!foundTask) {
            throw new Error(`Task with ID ${taskId} not found for user ${userId} in localStorage.`);
        }

        localStorage.setItem(supabaseConfig.localStorageKeys.tasks, JSON.stringify(tasks));
        return foundTask;
      } catch (error) {
        console.error(`LocalStorage Error setting current task to ${taskId}:`, error);
        throw new Error(`Failed to set current task in localStorage: ${error.message}`);
      }
    }
     throw new Error("No storage method configured.");
  }

  /**
   * Get the currently marked task, including its subtasks
   */
  async getCurrentTask() {
    let currentTaskData = null;
    const userId = this.getUserId();

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('tasks')
          .select('*')
          .eq('is_current', true)
          .eq('user_id', userId) // Only for the current user
          .maybeSingle();

        if (error) throw error;
        currentTaskData = data;
      } catch (error) {
        console.error('Supabase Error fetching current task:', error);
        throw new Error(`Failed to fetch current task from Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.tasks) || '[]');
        currentTaskData = tasks.find(task => task.is_current && task.user_id === userId) || null;
      } catch (error) {
        console.error('LocalStorage Error fetching current task:', error);
        throw new Error(`Failed to fetch current task from localStorage: ${error.message}`);
      }
    } else {
       throw new Error("No storage method configured.");
    }

    if (currentTaskData) {
        try {
            const subtasks = await this.getSubtasks(currentTaskData.id);
            return { ...currentTaskData, subtasks: subtasks || [] };
        } catch (error) {
            console.error(`Error fetching subtasks for current task ${currentTaskData.id}:`, error);
            return { ...currentTaskData, subtasks: [] }; // Return with empty subtasks on error
        }
    } else {
      return null; // No current task found for this user
    }
  }

  /**
   * Update only the elapsed time for a task
   */
  async updateTaskTime(taskId, elapsedTime) {
    const time = Number(elapsedTime);
    if (isNaN(time) || time < 0) {
      console.warn(`Invalid elapsedTime provided for task ${taskId}: ${elapsedTime}`);
      return null;
    }
    // Use updateTask, which handles user ownership check
    return this.updateTask(taskId, { elapsed_time: Math.round(time) });
  }

  // === SUBTASKS ===
  // Subtasks generally don't need direct user_id checks if accessed via task_id,
  // assuming task operations already check user_id ownership.

   /**
   * Helper to get all subtasks (only for localStorage)
   */
  async getAllSubtasks_LS() {
      if (supabaseConfig.useLocalStorage) {
          try {
              // Note: LS subtasks don't have user_id, filtering happens later if needed
              return JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.subtasks) || '[]');
          } catch (error) {
              console.error('LocalStorage Error fetching all subtasks:', error);
              return [];
          }
      }
      return [];
  }


  /**
   * Get subtasks for a specific task ID, ordered by position
   * ★★★ Assumes task ID belongs to the current user (checked before calling) ★★★
   */
  async getSubtasks(taskId) {
     if (!taskId) return [];

    if (this.supabase) {
      try {
        // We trust that taskId provided belongs to the current user based on how it was obtained (e.g., from getCurrentTask)
        const { data, error } = await this.supabase
          .from('subtasks')
          .select('*')
          .eq('task_id', taskId)
          .order('position', { ascending: true, nullsFirst: false }); // Nulls last

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error(`Supabase Error fetching subtasks for task ${taskId}:`, error);
         throw new Error(`Failed to fetch subtasks from Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        // We need to ensure the parent task belongs to the user first if called directly
        // However, usually called after getting the parent task, so ownership is implied.
        const subtasks = await this.getAllSubtasks_LS();
        return subtasks
          .filter(subtask => subtask.task_id === taskId)
          .sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));
      } catch (error) {
        console.error(`LocalStorage Error fetching subtasks for task ${taskId}:`, error);
        return [];
      }
    }
    return [];
  }

  /**
   * Create a new subtask for a given task
   * ★★★ Assumes task ID belongs to the current user ★★★
   */
  async createSubtask(subtaskData) {
     if (!subtaskData || !subtaskData.task_id) {
         throw new Error("Task ID is required to create a subtask.");
     }
     if (!subtaskData.text) {
         throw new Error("Subtask text cannot be empty.");
     }

    // Determine the next position
    let nextPosition = 0;
    try {
        const existingSubtasks = await this.getSubtasks(subtaskData.task_id);
        if (existingSubtasks.length > 0) {
          nextPosition = Math.max(...existingSubtasks.map(s => s.position ?? -1)) + 1;
        }
    } catch(error) {
        console.warn(`Could not determine next subtask position for task ${subtaskData.task_id}, using 0. Error: ${error.message}`);
    }

    const timestamp = this.getCurrentTimestamp();
    const newSubtask = {
      id: this.generateUUID(),
      task_id: subtaskData.task_id, // User ownership checked when parent task was accessed
      text: subtaskData.text,
      notes: subtaskData.notes || null,
      position: nextPosition,
      completed: false,
      created_at: timestamp,
      updated_at: timestamp,
      // user_id: this.getUserId() // Typically subtasks don't store user_id directly
    };

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('subtasks')
          .insert(newSubtask)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Supabase Error creating subtask:', error);
        throw new Error(`Failed to create subtask in Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const subtasks = await this.getAllSubtasks_LS();
        subtasks.push(newSubtask);
        localStorage.setItem(supabaseConfig.localStorageKeys.subtasks, JSON.stringify(subtasks));
        return newSubtask;
      } catch (error) {
        console.error('LocalStorage Error creating subtask:', error);
        throw new Error(`Failed to create subtask in localStorage: ${error.message}`);
      }
    }
    throw new Error("No storage method configured.");
  }

  /**
   * Update an existing subtask
   * ★★★ Now also handles 'position' updates ★★★
   * ★★★ Assumes subtask ID belongs to a task owned by the current user ★★★
   */
  async updateSubtask(subtaskId, updateData) {
     if (!subtaskId) throw new Error("Subtask ID is required for update.");

    const timestamp = this.getCurrentTimestamp();
     const dataToUpdate = {
        ...updateData,
        updated_at: timestamp
    };

    // Prevent updating immutable fields
    delete dataToUpdate.id;
    delete dataToUpdate.task_id;
    delete dataToUpdate.created_at;
    // delete dataToUpdate.user_id; // if subtasks had user_id

    if (this.supabase) {
      try {
        // We assume the calling code verified ownership via the parent task
        const { data, error } = await this.supabase
          .from('subtasks')
          .update(dataToUpdate)
          .eq('id', subtaskId)
          .select()
          .single();

        if (error) {
             if (error.code === 'PGRST116') { // Row not found
                 throw new Error(`Subtask ${subtaskId} not found.`);
             }
             throw error;
        }
        return data;
      } catch (error) {
        console.error(`Supabase Error updating subtask ${subtaskId}:`, error);
        throw new Error(`Failed to update subtask in Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const subtasks = await this.getAllSubtasks_LS();
        const subtaskIndex = subtasks.findIndex(subtask => subtask.id === subtaskId);

        if (subtaskIndex !== -1) {
          subtasks[subtaskIndex] = { ...subtasks[subtaskIndex], ...dataToUpdate };
          localStorage.setItem(supabaseConfig.localStorageKeys.subtasks, JSON.stringify(subtasks));
          return subtasks[subtaskIndex];
        } else {
            throw new Error(`Subtask with ID ${subtaskId} not found in localStorage.`);
        }
      } catch (error) {
        console.error(`LocalStorage Error updating subtask ${subtaskId}:`, error);
        throw new Error(`Failed to update subtask in localStorage: ${error.message}`);
      }
    }
     throw new Error("No storage method configured.");
  }

  /**
   * Delete a subtask
   * ★★★ Assumes subtask ID belongs to a task owned by the current user ★★★
   */
  async deleteSubtask(subtaskId) {
     if (!subtaskId) throw new Error("Subtask ID is required for deletion.");

    if (this.supabase) {
      try {
        // Assume ownership checked by calling context
        const { error } = await this.supabase
          .from('subtasks')
          .delete()
          .eq('id', subtaskId);

        if (error && error.code !== 'PGRST116') throw error;
        return true;
      } catch (error) {
        console.error(`Supabase Error deleting subtask ${subtaskId}:`, error);
        throw new Error(`Failed to delete subtask from Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const subtasks = await this.getAllSubtasks_LS();
        const filteredSubtasks = subtasks.filter(subtask => subtask.id !== subtaskId);
        localStorage.setItem(supabaseConfig.localStorageKeys.subtasks, JSON.stringify(filteredSubtasks));
        return true;
      } catch (error) {
        console.error(`LocalStorage Error deleting subtask ${subtaskId}:`, error);
        throw new Error(`Failed to delete subtask from localStorage: ${error.message}`);
      }
    }
     throw new Error("No storage method configured.");
  }

  /**
   * Toggle the completion status of a subtask
   * ★★★ Assumes subtask ID belongs to a task owned by the current user ★★★
   */
  async toggleSubtaskCompletion(subtaskId) {
      if (!subtaskId) throw new Error("Subtask ID is required to toggle completion.");

      let currentCompletionStatus = false;
      // Need to fetch the current status first
       if (this.supabase) {
          try {
              // Assume ownership checked by caller
              const { data, error } = await this.supabase
                  .from('subtasks')
                  .select('completed')
                  .eq('id', subtaskId)
                  .single();
              if (error) throw error; // Throws if not found
              currentCompletionStatus = data.completed;
          } catch (error) {
               console.error(`Supabase Error fetching subtask ${subtaskId} status:`, error);
               throw new Error(`Failed to get subtask status: ${error.message}`);
          }
       } else if (supabaseConfig.useLocalStorage) {
            const subtasks = await this.getAllSubtasks_LS();
            const subtask = subtasks.find(s => s.id === subtaskId);
            if (!subtask) throw new Error(`Subtask with ID ${subtaskId} not found in localStorage.`);
            currentCompletionStatus = subtask.completed;
       } else {
            throw new Error("No storage method configured.");
       }

      // Now update with the toggled status using updateSubtask
      return this.updateSubtask(subtaskId, { completed: !currentCompletionStatus });
  }

  // --- ▼▼▼ moveSubtask メソッド削除 ▼▼▼ ---
  // async moveSubtask(subtaskId, direction) { ... }
  // --- ▲▲▲ moveSubtask メソッド削除 ▲▲▲ ---


  // === INTERRUPTION TASKS ===

  /**
   * Get all interruption tasks for the current user, ordered newest first
   */
  async getInterruptionTasks() {
    const userId = this.getUserId();
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('interruption_tasks')
          .select('*')
          .eq('user_id', userId) // Filter by user
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Supabase Error fetching interruption tasks:', error);
        throw new Error(`Failed to fetch interruption tasks from Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.interruptions) || '[]');
        return tasks
          .filter(task => task.user_id === userId) // Filter by user
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } catch (error) {
        console.error('LocalStorage Error fetching interruption tasks:', error);
        throw new Error(`Failed to fetch interruption tasks from localStorage: ${error.message}`);
      }
    }
    return [];
  }

  /**
   * Create a new interruption task for the current user
   */
  async createInterruptionTask(taskData) {
     if (!taskData || !taskData.title) {
         throw new Error("Title is required for interruption task.");
     }

    const timestamp = this.getCurrentTimestamp();
    const newTask = {
      id: this.generateUUID(),
      title: taskData.title,
      notes: taskData.notes || null,
      added_to_main: false,
      created_at: timestamp,
      updated_at: timestamp,
      user_id: this.getUserId() // Set current user ID
    };

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('interruption_tasks')
          .insert(newTask)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Supabase Error creating interruption task:', error);
        throw new Error(`Failed to create interruption task in Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.interruptions) || '[]');
        tasks.push(newTask); // Add new task
        localStorage.setItem(supabaseConfig.localStorageKeys.interruptions, JSON.stringify(tasks));
        return newTask;
      } catch (error) {
        console.error('LocalStorage Error creating interruption task:', error);
        throw new Error(`Failed to create interruption task in localStorage: ${error.message}`);
      }
    }
    throw new Error("No storage method configured.");
  }

  /**
   * Update an interruption task owned by the current user
   */
  async updateInterruptionTask(taskId, updateData) {
    if (!taskId) throw new Error("Interruption Task ID is required for update.");
    const userId = this.getUserId();

    const timestamp = this.getCurrentTimestamp();
    const dataToUpdate = {
      ...updateData,
      updated_at: timestamp
    };

    delete dataToUpdate.id;
    delete dataToUpdate.created_at;
    delete dataToUpdate.user_id;

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('interruption_tasks')
          .update(dataToUpdate)
          .eq('id', taskId)
          .eq('user_id', userId) // Ensure ownership
          .select()
          .single();

        if (error) {
            if (error.code === 'PGRST116') {
                throw new Error(`Interruption task ${taskId} not found or permission denied.`);
            }
            throw error;
        }
        return data;
      } catch (error) {
        console.error(`Supabase Error updating interruption task ${taskId}:`, error);
        throw new Error(`Failed to update interruption task in Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.interruptions) || '[]');
        const taskIndex = tasks.findIndex(task => task.id === taskId && task.user_id === userId);

        if (taskIndex !== -1) {
          tasks[taskIndex] = { ...tasks[taskIndex], ...dataToUpdate };
          localStorage.setItem(supabaseConfig.localStorageKeys.interruptions, JSON.stringify(tasks));
          return tasks[taskIndex];
        } else {
          throw new Error(`Interruption task with ID ${taskId} not found for current user.`);
        }
      } catch (error) {
        console.error(`LocalStorage Error updating interruption task ${taskId}:`, error);
        throw new Error(`Failed to update interruption task in localStorage: ${error.message}`);
      }
    }
    throw new Error("No storage method configured.");
  }

  /**
   * Delete an interruption task owned by the current user
   */
  async deleteInterruptionTask(taskId) {
     if (!taskId) throw new Error("Interruption Task ID is required for deletion.");
     const userId = this.getUserId();

    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('interruption_tasks')
          .delete()
          .eq('id', taskId)
          .eq('user_id', userId); // Ensure ownership

         if (error && error.code !== 'PGRST116') throw error;
        return true;
      } catch (error) {
        console.error(`Supabase Error deleting interruption task ${taskId}:`, error);
        throw new Error(`Failed to delete interruption task from Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        let tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.interruptions) || '[]');
        const filteredTasks = tasks.filter(task => !(task.id === taskId && task.user_id === userId));
        localStorage.setItem(supabaseConfig.localStorageKeys.interruptions, JSON.stringify(filteredTasks));
        return true;
      } catch (error) {
        console.error(`LocalStorage Error deleting interruption task ${taskId}:`, error);
        throw new Error(`Failed to delete interruption task from localStorage: ${error.message}`);
      }
    }
    throw new Error("No storage method configured.");
  }

  /**
   * Move an interruption task (owned by current user) to the main task list
   */
  async moveToMainTasks(interruptionId) {
     if (!interruptionId) throw new Error("Interruption Task ID is required to move.");
     const userId = this.getUserId();

    // 1. Get the interruption task data, ensuring ownership
    let interruptionTask = null;
    if (this.supabase) {
        try {
            const { data, error } = await this.supabase
                .from('interruption_tasks').select('*')
                .eq('id', interruptionId)
                .eq('user_id', userId) // Ensure ownership
                .single();
            if (error) throw error; // Throws if not found or permission denied
            interruptionTask = data;
        } catch (error) {
            console.error(`Supabase: Could not find interruption task ${interruptionId} for user ${userId}: ${error.message}`);
            throw error;
        }
    } else if (supabaseConfig.useLocalStorage) {
         const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.interruptions) || '[]');
         interruptionTask = tasks.find(task => task.id === interruptionId && task.user_id === userId);
         if (!interruptionTask) throw new Error(`Interruption task ${interruptionId} not found for user ${userId} in localStorage.`);
    } else {
         throw new Error("No storage method configured.");
    }

    if (interruptionTask.added_to_main) {
        console.warn(`Interruption task ${interruptionId} has already been added to main tasks.`);
        return null;
    }

    // 2. Create a new main task (createTask sets user_id automatically)
    let newMainTask = null;
    try {
        newMainTask = await this.createTask({
          title: interruptionTask.title,
          notes: interruptionTask.notes
          // position will be set by createTask
        });
        if (!newMainTask) throw new Error("Failed to create new main task from interruption.");
    } catch (error) {
        console.error(`Error creating main task from interruption ${interruptionId}:`, error);
        throw error;
    }

    // 3. Mark the interruption task as added_to_main using updateInterruptionTask (handles ownership)
    try {
        await this.updateInterruptionTask(interruptionId, { added_to_main: true });
        // Alternatively delete: await this.deleteInterruptionTask(interruptionId);
    } catch (error) {
        // Log error but continue, as the main task was created
        console.error(`Error marking interruption task ${interruptionId} as added_to_main:`, error);
    }

    return newMainTask;
  }
} // End of TaskAPI class

// Create a single instance to be used throughout the app
const taskAPI = new TaskAPI();