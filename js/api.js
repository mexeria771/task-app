// API wrapper for data operations (Supabase or localStorage)
class TaskAPI {
  constructor() {
    this.supabase = null;

    // Initialize Supabase client if URL and key are provided
    if (supabaseConfig.url && supabaseConfig.key && !supabaseConfig.useLocalStorage) {
      try {
          this.supabase = window.supabase.createClient(supabaseConfig.url, supabaseConfig.key);
          console.log('Supabase client initialized');
      } catch (error) {
          console.error("Failed to initialize Supabase client:", error);
          console.log("Falling back to localStorage.");
          supabaseConfig.useLocalStorage = true; // Force localStorage if init fails
      }
    } else {
      console.log('Using localStorage for data storage');
      supabaseConfig.useLocalStorage = true; // Ensure flag is set if no Supabase details
    }
  }

  /**
   * Generate a UUID for local storage
   */
  generateUUID() {
    // Simple UUID v4 generator
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

  // === TASKS ===

  /**
   * Get all tasks (without subtasks initially)
   */
  /**
   * Get current user ID or fallback to 'anonymous' if not authenticated
   */
  getUserId() {
    // authServiceが存在し、ユーザーが認証されている場合
    if (window.authService && window.authService.getUserId()) {
      return window.authService.getUserId();
    }
    // 認証されていない場合のフォールバック
    return 'anonymous';
  }

  async getAllTasks() {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('tasks')
          .select('*')
          .eq('user_id', this.getUserId()) // 現在のユーザーのタスクのみ取得
          .order('created_at', { ascending: true }); // Example: sort by oldest first

        if (error) throw error;
        return data || []; // Ensure it returns an array even if data is null
      } catch (error) {
        console.error('Supabase Error fetching tasks:', error);
        throw new Error(`Failed to fetch tasks from Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.tasks) || '[]');
        // Example: sort by oldest first for consistency
        return tasks.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      } catch (error) {
        console.error('LocalStorage Error fetching tasks:', error);
        throw new Error(`Failed to fetch tasks from localStorage: ${error.message}`);
      }
    }
    return []; // Should not reach here if configured properly
  }

  /**
   * Get all tasks including their subtasks. Used for export.
   * ★★★ This method was added ★★★
   */
  async getAllTasksWithSubtasks() {
    const tasks = await this.getAllTasks(); // Get all main tasks first
    if (!tasks || tasks.length === 0) {
      return [];
    }

    // Fetch subtasks for each task in parallel
    try {
        const tasksWithSubtasks = await Promise.all(
          tasks.map(async (task) => {
            const subtasks = await this.getSubtasks(task.id); // Use existing getSubtasks method
            return { ...task, subtasks: subtasks || [] }; // Attach subtasks (ensure it's an array)
          })
        );
        return tasksWithSubtasks;
    } catch(error) {
        console.error("Error fetching subtasks while getting all tasks:", error);
        // Return tasks without subtasks as a fallback, or re-throw
        // For export, it might be better to fail clearly:
        throw new Error(`Failed to fetch subtasks for export: ${error.message}`);
    }
  }


  /**
   * Create a new task
   */
  async createTask(taskData) {
    const timestamp = this.getCurrentTimestamp();
    const newTask = {
      id: this.generateUUID(), // Generate ID first
      title: taskData.title,
      notes: taskData.notes || null, // Ensure notes is null if empty
      elapsed_time: 0,
      status: 'active',
      is_current: false, // New tasks are never current initially
      created_at: timestamp,
      updated_at: timestamp,
      user_id: this.getUserId() // ユーザーIDを設定
    };

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('tasks')
          .insert(newTask) // Pass the object directly
          .select()
          .single(); // Expecting a single row back

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Supabase Error creating task:', error);
        throw new Error(`Failed to create task in Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = await this.getAllTasks(); // Use getAllTasks to get current state
        tasks.push(newTask);
        localStorage.setItem(supabaseConfig.localStorageKeys.tasks, JSON.stringify(tasks));
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
   */
  async updateTask(taskId, updateData) {
    if (!taskId) throw new Error("Task ID is required for update.");

    const timestamp = this.getCurrentTimestamp();
    const dataToUpdate = {
        ...updateData,
        updated_at: timestamp // Always update the timestamp
    };

    // Prevent updating immutable fields accidentally
    delete dataToUpdate.id;
    delete dataToUpdate.created_at;

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('tasks')
          .update(dataToUpdate)
          .eq('id', taskId)
          .select()
          .single(); // Expecting a single row back

        if (error) throw error;
        return data;
      } catch (error) {
        console.error(`Supabase Error updating task ${taskId}:`, error);
        throw new Error(`Failed to update task in Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = await this.getAllTasks();
        const taskIndex = tasks.findIndex(task => task.id === taskId);

        if (taskIndex !== -1) {
          // Merge existing task with updateData
          tasks[taskIndex] = { ...tasks[taskIndex], ...dataToUpdate };
          localStorage.setItem(supabaseConfig.localStorageKeys.tasks, JSON.stringify(tasks));
          return tasks[taskIndex];
        } else {
          throw new Error(`Task with ID ${taskId} not found in localStorage.`);
        }
      } catch (error) {
        console.error(`LocalStorage Error updating task ${taskId}:`, error);
        throw new Error(`Failed to update task in localStorage: ${error.message}`);
      }
    }
     throw new Error("No storage method configured.");
  }

  /**
   * Delete a task and its subtasks
   */
  async deleteTask(taskId) {
    if (!taskId) throw new Error("Task ID is required for deletion.");

    if (this.supabase) {
      try {
         // Potential improvement: Use transaction or CASCADE DELETE if DB schema supports it
         // 1. Delete subtasks first
         const { error: subtaskError } = await this.supabase
            .from('subtasks')
            .delete()
            .eq('task_id', taskId);
         if (subtaskError) console.warn(`Supabase: Could not delete subtasks for task ${taskId} (might not exist):`, subtaskError.message);

         // 2. Delete the main task
        const { error } = await this.supabase
          .from('tasks')
          .delete()
          .eq('id', taskId);

        if (error) throw error;
        return true; // Indicate success
      } catch (error) {
        console.error(`Supabase Error deleting task ${taskId}:`, error);
        throw new Error(`Failed to delete task from Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        let tasks = await this.getAllTasks();
        let subtasks = await this.getAllSubtasks(); // Get all subtasks

        const initialTaskLength = tasks.length;
        const filteredTasks = tasks.filter(task => task.id !== taskId);

        if (filteredTasks.length === initialTaskLength) {
            console.warn(`LocalStorage: Task with ID ${taskId} not found for deletion.`);
            // Still proceed to delete subtasks, just in case
        }

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

    if (this.supabase) {
      try {
        // Use a database function (RPC) for atomicity if possible, e.g., set_current_task(taskId)
        // Otherwise, perform two separate updates (less ideal but works):
        // 1. Reset all tasks
        const { error: resetError } = await this.supabase
          .from('tasks')
          .update({ is_current: false })
          .eq('is_current', true); // Optimization: only update the one that *was* true

        if (resetError) {
            console.warn("Supabase: Failed to reset previous current task (might be none):", resetError.message);
            // Continue execution, attempt to set the new one
        }

        // 2. Set the new current task
        const { data, error } = await this.supabase
          .from('tasks')
          .update({ is_current: true, updated_at: this.getCurrentTimestamp() })
          .eq('id', taskId)
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error(`Task ${taskId} not found.`); // Should not happen if ID is valid
        return data;
      } catch (error) {
        console.error(`Supabase Error setting current task to ${taskId}:`, error);
        throw new Error(`Failed to set current task in Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = await this.getAllTasks();
        let foundTask = null;

        tasks.forEach(task => {
          if (task.id === taskId) {
            task.is_current = true;
            task.updated_at = this.getCurrentTimestamp();
            foundTask = task;
          } else {
            task.is_current = false; // Ensure others are false
          }
        });

        if (!foundTask) {
            throw new Error(`Task with ID ${taskId} not found in localStorage.`);
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
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('tasks')
          .select('*')
          .eq('is_current', true)
          .maybeSingle(); // Use maybeSingle to handle 0 or 1 result without error

        if (error) throw error;
        currentTaskData = data; // This will be null if no task is current
      } catch (error) {
        console.error('Supabase Error fetching current task:', error);
        throw new Error(`Failed to fetch current task from Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = await this.getAllTasks();
        currentTaskData = tasks.find(task => task.is_current) || null;
      } catch (error) {
        console.error('LocalStorage Error fetching current task:', error);
        throw new Error(`Failed to fetch current task from localStorage: ${error.message}`);
      }
    } else {
       throw new Error("No storage method configured.");
    }

    // If a current task was found, fetch its subtasks
    if (currentTaskData) {
        try {
            const subtasks = await this.getSubtasks(currentTaskData.id);
            return { ...currentTaskData, subtasks: subtasks || [] };
        } catch (error) {
            console.error(`Error fetching subtasks for current task ${currentTaskData.id}:`, error);
            // Return task data without subtasks, or re-throw depending on desired behavior
            return { ...currentTaskData, subtasks: [] }; // Return with empty subtasks on error
        }
    } else {
      return null; // No current task found
    }
  }

  /**
   * Update only the elapsed time for a task
   */
  async updateTaskTime(taskId, elapsedTime) {
    // Ensure elapsedTime is a non-negative number
    const time = Number(elapsedTime);
    if (isNaN(time) || time < 0) {
      console.warn(`Invalid elapsedTime provided for task ${taskId}: ${elapsedTime}`);
      // Decide whether to throw an error or just return null/do nothing
      return null; // Or throw new Error("Invalid elapsedTime");
    }
    // Use updateTask for the actual update logic
    return this.updateTask(taskId, { elapsed_time: Math.round(time) }); // Round to integer seconds
  }

  // === SUBTASKS ===

   /**
   * Helper to get all subtasks (used internally)
   */
  async getAllSubtasks() {
      if (this.supabase) {
          // Generally not needed for Supabase as queries are targeted
          return []; // Or implement if needed for some reason
      } else if (supabaseConfig.useLocalStorage) {
          try {
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
   */
  async getSubtasks(taskId) {
     if (!taskId) return []; // Return empty array if no taskId provided

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('subtasks')
          .select('*')
          .eq('task_id', taskId)
          .order('position', { ascending: true });

        if (error) throw error;
        return data || []; // Ensure array return
      } catch (error) {
        console.error(`Supabase Error fetching subtasks for task ${taskId}:`, error);
        // Don't throw here, allow function to return empty on error maybe?
        // Or re-throw depending on how critical subtasks are:
         throw new Error(`Failed to fetch subtasks from Supabase: ${error.message}`);
        // return [];
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const subtasks = await this.getAllSubtasks();
        return subtasks
          .filter(subtask => subtask.task_id === taskId)
          .sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity)); // Handle null/undefined positions
      } catch (error) {
        console.error(`LocalStorage Error fetching subtasks for task ${taskId}:`, error);
        // Return empty on error
        return [];
      }
    }
    return [];
  }

  /**
   * Create a new subtask for a given task
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
          // Find the max position (handling nulls) and add 1
          nextPosition = Math.max(...existingSubtasks.map(s => s.position ?? -1)) + 1;
        }
    } catch(error) {
        console.warn(`Could not accurately determine next subtask position for task ${subtaskData.task_id}, using 0. Error: ${error.message}`);
        // Proceed with position 0 if fetching existing fails
    }


    const timestamp = this.getCurrentTimestamp();
    const newSubtask = {
      id: this.generateUUID(),
      task_id: subtaskData.task_id,
      text: subtaskData.text,
      notes: subtaskData.notes || null,
      position: nextPosition,
      completed: false,
      created_at: timestamp,
      updated_at: timestamp
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
        const subtasks = await this.getAllSubtasks();
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

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('subtasks')
          .update(dataToUpdate)
          .eq('id', subtaskId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error(`Supabase Error updating subtask ${subtaskId}:`, error);
        throw new Error(`Failed to update subtask in Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const subtasks = await this.getAllSubtasks();
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
   */
  async deleteSubtask(subtaskId) {
     if (!subtaskId) throw new Error("Subtask ID is required for deletion.");

    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('subtasks')
          .delete()
          .eq('id', subtaskId);

        // Check error code? If it's 'not found', maybe return true anyway?
        if (error && error.code !== 'PGRST116') { // PGRST116: Row not found
             throw error;
        }
        return true; // Assume success even if row didn't exist
      } catch (error) {
        console.error(`Supabase Error deleting subtask ${subtaskId}:`, error);
        throw new Error(`Failed to delete subtask from Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const subtasks = await this.getAllSubtasks();
        const filteredSubtasks = subtasks.filter(subtask => subtask.id !== subtaskId);
        // Check if length changed to confirm deletion? Optional.
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
   */
  async toggleSubtaskCompletion(subtaskId) {
      if (!subtaskId) throw new Error("Subtask ID is required to toggle completion.");

      let currentCompletionStatus = false;
      // Need to fetch the current status first
       if (this.supabase) {
          try {
              const { data, error } = await this.supabase
                  .from('subtasks')
                  .select('completed')
                  .eq('id', subtaskId)
                  .single();
              if (error) throw error;
              if (!data) throw new Error("Subtask not found");
              currentCompletionStatus = data.completed;
          } catch (error) {
               console.error(`Supabase Error fetching subtask ${subtaskId} status:`, error);
               throw new Error(`Failed to get subtask status: ${error.message}`);
          }
       } else if (supabaseConfig.useLocalStorage) {
            const subtasks = await this.getAllSubtasks();
            const subtask = subtasks.find(s => s.id === subtaskId);
            if (!subtask) throw new Error(`Subtask with ID ${subtaskId} not found in localStorage.`);
            currentCompletionStatus = subtask.completed;
       } else {
            throw new Error("No storage method configured.");
       }

      // Now update with the toggled status
      return this.updateSubtask(subtaskId, { completed: !currentCompletionStatus });
  }

  /**
   * Move subtask position (up/down) by swapping positions with adjacent item
   */
  async moveSubtask(subtaskId, direction) {
    if (!subtaskId || (direction !== 'up' && direction !== 'down')) {
        throw new Error("Invalid arguments for moveSubtask.");
    }

    let taskId = null;
    let subtasks = [];

    // 1. Fetch the subtask and its siblings, sorted by position
    try {
        if (this.supabase) {
            const { data: targetSubtask, error: fetchError } = await this.supabase
                .from('subtasks').select('task_id, position').eq('id', subtaskId).single();
            if (fetchError) throw fetchError;
            if (!targetSubtask) throw new Error("Subtask not found");
            taskId = targetSubtask.task_id;

            const { data: siblings, error: siblingsError } = await this.supabase
                .from('subtasks').select('id, position').eq('task_id', taskId)
                .order('position', { ascending: true });
            if (siblingsError) throw siblingsError;
            subtasks = siblings || [];
        } else if (supabaseConfig.useLocalStorage) {
            const allSubtasks = await this.getAllSubtasks();
            const targetSubtask = allSubtasks.find(s => s.id === subtaskId);
            if (!targetSubtask) throw new Error("Subtask not found");
            taskId = targetSubtask.task_id;
            subtasks = allSubtasks.filter(s => s.task_id === taskId)
                                .sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));
        } else {
             throw new Error("No storage method configured.");
        }
    } catch (error) {
        console.error(`Error fetching data for moving subtask ${subtaskId}:`, error);
        throw new Error(`Failed to prepare subtask movement: ${error.message}`);
    }


    // 2. Find indices and check bounds
    const currentIndex = subtasks.findIndex(s => s.id === subtaskId);
    if (currentIndex === -1) throw new Error("Subtask not found among siblings."); // Should not happen

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= subtasks.length) {
      console.log(`Subtask ${subtaskId} is already at the ${direction === 'up' ? 'top' : 'bottom'}. Cannot move.`);
      return false; // Indicate that no move was performed
    }

    // 3. Get IDs and positions for swap
    const currentItem = subtasks[currentIndex];
    const targetItem = subtasks[targetIndex];

    // Positions might be null or need careful handling if not contiguous
    const currentPosition = currentItem.position;
    const targetPosition = targetItem.position;

    // 4. Perform the swap update
    try {
        if (this.supabase) {
            // Use Promise.all to run updates concurrently
            await Promise.all([
              this.supabase.from('subtasks').update({ position: targetPosition, updated_at: this.getCurrentTimestamp() }).eq('id', currentItem.id),
              this.supabase.from('subtasks').update({ position: currentPosition, updated_at: this.getCurrentTimestamp() }).eq('id', targetItem.id)
            ]);
        } else if (supabaseConfig.useLocalStorage) {
             const allSubtasks = await this.getAllSubtasks();
             const currentFullIndex = allSubtasks.findIndex(s => s.id === currentItem.id);
             const targetFullIndex = allSubtasks.findIndex(s => s.id === targetItem.id);

             if (currentFullIndex !== -1) allSubtasks[currentFullIndex].position = targetPosition;
             if (targetFullIndex !== -1) allSubtasks[targetFullIndex].position = currentPosition;

             // Also update timestamps
             if (currentFullIndex !== -1) allSubtasks[currentFullIndex].updated_at = this.getCurrentTimestamp();
             if (targetFullIndex !== -1) allSubtasks[targetFullIndex].updated_at = this.getCurrentTimestamp();

             localStorage.setItem(supabaseConfig.localStorageKeys.subtasks, JSON.stringify(allSubtasks));
        }
        return true; // Indicate success
    } catch (error) {
         console.error(`Error swapping positions for subtasks ${currentItem.id} and ${targetItem.id}:`, error);
         throw new Error(`Failed to move subtask: ${error.message}`);
    }
  }

  // === INTERRUPTION TASKS ===

  /**
   * Get all interruption tasks, ordered newest first
   */
  async getInterruptionTasks() {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('interruption_tasks')
          .select('*')
          .eq('user_id', this.getUserId()) // 現在のユーザーの割り込みタスクのみ取得
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
        return tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } catch (error) {
        console.error('LocalStorage Error fetching interruption tasks:', error);
        throw new Error(`Failed to fetch interruption tasks from localStorage: ${error.message}`);
      }
    }
    return [];
  }

  /**
   * Create a new interruption task
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
      // elapsed_time is not typically tracked for interruptions
      added_to_main: false,
      created_at: timestamp,
      updated_at: timestamp, // Set updated_at on creation too
      user_id: this.getUserId() // ユーザーIDを設定
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
        const tasks = await this.getInterruptionTasks(); // Get current list
        tasks.push(newTask); // Add to list (it will be re-sorted on next get)
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
   * Update an interruption task
   */
  async updateInterruptionTask(taskId, updateData) {
    if (!taskId) throw new Error("Interruption Task ID is required for update.");

    const timestamp = this.getCurrentTimestamp();
    const dataToUpdate = {
      ...updateData,
      updated_at: timestamp // Always update the timestamp
    };

    // Prevent updating immutable fields accidentally
    delete dataToUpdate.id;
    delete dataToUpdate.created_at;

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('interruption_tasks')
          .update(dataToUpdate)
          .eq('id', taskId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error(`Supabase Error updating interruption task ${taskId}:`, error);
        throw new Error(`Failed to update interruption task in Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = await this.getInterruptionTasks();
        const taskIndex = tasks.findIndex(task => task.id === taskId);

        if (taskIndex !== -1) {
          // Merge existing task with updateData
          tasks[taskIndex] = { ...tasks[taskIndex], ...dataToUpdate };
          localStorage.setItem(supabaseConfig.localStorageKeys.interruptions, JSON.stringify(tasks));
          return tasks[taskIndex];
        } else {
          throw new Error(`Interruption task with ID ${taskId} not found in localStorage.`);
        }
      } catch (error) {
        console.error(`LocalStorage Error updating interruption task ${taskId}:`, error);
        throw new Error(`Failed to update interruption task in localStorage: ${error.message}`);
      }
    }
    throw new Error("No storage method configured.");
  }

  /**
   * Delete an interruption task
   */
  async deleteInterruptionTask(taskId) {
     if (!taskId) throw new Error("Interruption Task ID is required for deletion.");

    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('interruption_tasks')
          .delete()
          .eq('id', taskId);

         if (error && error.code !== 'PGRST116') throw error; // Ignore 'not found' error
        return true;
      } catch (error) {
        console.error(`Supabase Error deleting interruption task ${taskId}:`, error);
        throw new Error(`Failed to delete interruption task from Supabase: ${error.message}`);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        let tasks = await this.getInterruptionTasks();
        const filteredTasks = tasks.filter(task => task.id !== taskId);
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
   * Move an interruption task to the main task list
   */
  async moveToMainTasks(interruptionId) {
     if (!interruptionId) throw new Error("Interruption Task ID is required to move.");

    // 1. Get the interruption task data
    let interruptionTask = null;
    if (this.supabase) {
        try {
            const { data, error } = await this.supabase
                .from('interruption_tasks').select('*').eq('id', interruptionId).single();
            if (error) throw error;
            interruptionTask = data;
        } catch (error) {
            console.error(`Supabase: Could not find interruption task ${interruptionId} to move: ${error.message}`);
            throw error;
        }
    } else if (supabaseConfig.useLocalStorage) {
         const tasks = await this.getInterruptionTasks();
         interruptionTask = tasks.find(task => task.id === interruptionId);
         if (!interruptionTask) throw new Error(`Interruption task ${interruptionId} not found in localStorage.`);
    } else {
         throw new Error("No storage method configured.");
    }

    // Check if already moved
    if (interruptionTask.added_to_main) {
        console.warn(`Interruption task ${interruptionId} has already been added to main tasks.`);
        // Optionally return null or the existing task ID if stored?
        return null; // Indicate no new task was created
    }

    // 2. Create a new main task using its data
    let newMainTask = null;
    try {
        newMainTask = await this.createTask({
          title: interruptionTask.title,
          notes: interruptionTask.notes
        });
        if (!newMainTask) throw new Error("Failed to create new main task from interruption.");
    } catch (error) {
        console.error(`Error creating main task from interruption ${interruptionId}:`, error);
        throw error; // Re-throw to signal failure
    }


    // 3. Mark the interruption task as added_to_main (or delete it)
    try {
        if (this.supabase) {
            await this.supabase
              .from('interruption_tasks')
              .update({ added_to_main: true, updated_at: this.getCurrentTimestamp() })
              .eq('id', interruptionId);
            // Optionally, could delete instead: await this.deleteInterruptionTask(interruptionId);
        } else if (supabaseConfig.useLocalStorage) {
             let tasks = await this.getInterruptionTasks();
             const taskIndex = tasks.findIndex(task => task.id === interruptionId);
             if (taskIndex !== -1) {
               tasks[taskIndex].added_to_main = true;
               tasks[taskIndex].updated_at = this.getCurrentTimestamp();
               localStorage.setItem(supabaseConfig.localStorageKeys.interruptions, JSON.stringify(tasks));
               // Optionally, delete instead: await this.deleteInterruptionTask(interruptionId);
             }
        }
    } catch (error) {
        // Log error but continue, as the main task was created
        console.error(`Error marking interruption task ${interruptionId} as added_to_main:`, error);
    }

    // 4. Return the newly created main task
    return newMainTask;
  }
} // End of TaskAPI class

// Create a single instance to be used throughout the app
const taskAPI = new TaskAPI();