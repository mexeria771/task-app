// API wrapper for data operations (Supabase or localStorage)
class TaskAPI {
  constructor() {
    this.supabase = null;
    
    // Initialize Supabase client if URL and key are provided
    if (supabaseConfig.url && supabaseConfig.key && !supabaseConfig.useLocalStorage) {
      this.supabase = window.supabase.createClient(supabaseConfig.url, supabaseConfig.key);
      console.log('Supabase client initialized');
    } else {
      console.log('Using localStorage for data storage');
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
   * Get current timestamp
   */
  getCurrentTimestamp() {
    return new Date().toISOString();
  }

  // TASKS

  /**
   * Get all tasks
   */
  async getAllTasks() {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.tasks) || '[]');
        return tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } catch (error) {
        console.error('Error fetching tasks from localStorage:', error);
        return [];
      }
    }
    return [];
  }

  /**
   * Create a new task
   */
  async createTask(taskData) {
    const timestamp = this.getCurrentTimestamp();
    const newTask = {
      ...taskData,
      id: this.generateUUID(),
      elapsed_time: 0,
      status: 'active',
      is_current: false,
      created_at: timestamp,
      updated_at: timestamp
    };

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('tasks')
          .insert([newTask])
          .select();
        
        if (error) throw error;
        return data[0];
      } catch (error) {
        console.error('Error creating task:', error);
        return null;
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.tasks) || '[]');
        tasks.push(newTask);
        localStorage.setItem(supabaseConfig.localStorageKeys.tasks, JSON.stringify(tasks));
        return newTask;
      } catch (error) {
        console.error('Error creating task in localStorage:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Update a task
   */
  async updateTask(taskId, updateData) {
    const timestamp = this.getCurrentTimestamp();
    
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('tasks')
          .update({ ...updateData, updated_at: timestamp })
          .eq('id', taskId)
          .select();
        
        if (error) throw error;
        return data[0];
      } catch (error) {
        console.error('Error updating task:', error);
        return null;
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.tasks) || '[]');
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        
        if (taskIndex !== -1) {
          tasks[taskIndex] = {
            ...tasks[taskIndex],
            ...updateData,
            updated_at: timestamp
          };
          
          localStorage.setItem(supabaseConfig.localStorageKeys.tasks, JSON.stringify(tasks));
          return tasks[taskIndex];
        }
        return null;
      } catch (error) {
        console.error('Error updating task in localStorage:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId) {
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('tasks')
          .delete()
          .eq('id', taskId);
        
        if (error) throw error;
        return true;
      } catch (error) {
        console.error('Error deleting task:', error);
        return false;
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.tasks) || '[]');
        const filteredTasks = tasks.filter(task => task.id !== taskId);
        
        // Also delete related subtasks
        const subtasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.subtasks) || '[]');
        const filteredSubtasks = subtasks.filter(subtask => subtask.task_id !== taskId);
        
        localStorage.setItem(supabaseConfig.localStorageKeys.tasks, JSON.stringify(filteredTasks));
        localStorage.setItem(supabaseConfig.localStorageKeys.subtasks, JSON.stringify(filteredSubtasks));
        
        return true;
      } catch (error) {
        console.error('Error deleting task from localStorage:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Set current task
   */
  async setCurrentTask(taskId) {
    if (this.supabase) {
      try {
        // First reset all tasks
        await this.supabase
          .from('tasks')
          .update({ is_current: false })
          .not('id', 'eq', null);
        
        // Then set the current task
        const { data, error } = await this.supabase
          .from('tasks')
          .update({ is_current: true })
          .eq('id', taskId)
          .select();
        
        if (error) throw error;
        return data[0];
      } catch (error) {
        console.error('Error setting current task:', error);
        return null;
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.tasks) || '[]');
        
        // Reset all tasks
        tasks.forEach(task => task.is_current = false);
        
        // Set current task
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
          tasks[taskIndex].is_current = true;
        }
        
        localStorage.setItem(supabaseConfig.localStorageKeys.tasks, JSON.stringify(tasks));
        return taskIndex !== -1 ? tasks[taskIndex] : null;
      } catch (error) {
        console.error('Error setting current task in localStorage:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Get current task (including subtasks)
   */
  async getCurrentTask() {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('tasks')
          .select('*')
          .eq('is_current', true)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            // No current task found
            return null;
          }
          throw error;
        }
        
        // Get subtasks
        const subtasks = await this.getSubtasks(data.id);
        return { ...data, subtasks };
      } catch (error) {
        console.error('Error fetching current task:', error);
        return null;
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.tasks) || '[]');
        const currentTask = tasks.find(task => task.is_current);
        
        if (!currentTask) return null;
        
        // Get subtasks
        const subtasks = await this.getSubtasks(currentTask.id);
        return { ...currentTask, subtasks };
      } catch (error) {
        console.error('Error fetching current task from localStorage:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Update task elapsed time
   */
  async updateTaskTime(taskId, elapsedTime) {
    return this.updateTask(taskId, { elapsed_time: elapsedTime });
  }

  // SUBTASKS

  /**
   * Get subtasks for a task
   */
  async getSubtasks(taskId) {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('subtasks')
          .select('*')
          .eq('task_id', taskId)
          .order('position', { ascending: true });
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error fetching subtasks:', error);
        return [];
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const subtasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.subtasks) || '[]');
        return subtasks
          .filter(subtask => subtask.task_id === taskId)
          .sort((a, b) => a.position - b.position);
      } catch (error) {
        console.error('Error fetching subtasks from localStorage:', error);
        return [];
      }
    }
    return [];
  }

  /**
   * Create a subtask
   */
  async createSubtask(subtaskData) {
    // Get position value
    let position = 0;
    const existingSubtasks = await this.getSubtasks(subtaskData.task_id);
    if (existingSubtasks.length > 0) {
      position = Math.max(...existingSubtasks.map(s => s.position || 0)) + 1;
    }
    
    const timestamp = this.getCurrentTimestamp();
    const newSubtask = {
      ...subtaskData,
      id: this.generateUUID(),
      position,
      completed: false,
      created_at: timestamp,
      updated_at: timestamp
    };

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('subtasks')
          .insert([newSubtask])
          .select();
        
        if (error) throw error;
        return data[0];
      } catch (error) {
        console.error('Error creating subtask:', error);
        return null;
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const subtasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.subtasks) || '[]');
        subtasks.push(newSubtask);
        localStorage.setItem(supabaseConfig.localStorageKeys.subtasks, JSON.stringify(subtasks));
        return newSubtask;
      } catch (error) {
        console.error('Error creating subtask in localStorage:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Update a subtask
   */
  async updateSubtask(subtaskId, updateData) {
    const timestamp = this.getCurrentTimestamp();
    
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('subtasks')
          .update({ ...updateData, updated_at: timestamp })
          .eq('id', subtaskId)
          .select();
        
        if (error) throw error;
        return data[0];
      } catch (error) {
        console.error('Error updating subtask:', error);
        return null;
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const subtasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.subtasks) || '[]');
        const subtaskIndex = subtasks.findIndex(subtask => subtask.id === subtaskId);
        
        if (subtaskIndex !== -1) {
          subtasks[subtaskIndex] = {
            ...subtasks[subtaskIndex],
            ...updateData,
            updated_at: timestamp
          };
          
          localStorage.setItem(supabaseConfig.localStorageKeys.subtasks, JSON.stringify(subtasks));
          return subtasks[subtaskIndex];
        }
        return null;
      } catch (error) {
        console.error('Error updating subtask in localStorage:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Delete a subtask
   */
  async deleteSubtask(subtaskId) {
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('subtasks')
          .delete()
          .eq('id', subtaskId);
        
        if (error) throw error;
        return true;
      } catch (error) {
        console.error('Error deleting subtask:', error);
        return false;
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const subtasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.subtasks) || '[]');
        const filteredSubtasks = subtasks.filter(subtask => subtask.id !== subtaskId);
        
        localStorage.setItem(supabaseConfig.localStorageKeys.subtasks, JSON.stringify(filteredSubtasks));
        return true;
      } catch (error) {
        console.error('Error deleting subtask from localStorage:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Toggle subtask completion
   */
  async toggleSubtaskCompletion(subtaskId) {
    if (this.supabase) {
      try {
        // First get the current state
        const { data: currentData, error: fetchError } = await this.supabase
          .from('subtasks')
          .select('completed')
          .eq('id', subtaskId)
          .single();
        
        if (fetchError) throw fetchError;
        
        // Then toggle it
        const { data, error } = await this.supabase
          .from('subtasks')
          .update({ 
            completed: !currentData.completed,
            updated_at: this.getCurrentTimestamp()
          })
          .eq('id', subtaskId)
          .select();
        
        if (error) throw error;
        return data[0];
      } catch (error) {
        console.error('Error toggling subtask completion:', error);
        return null;
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const subtasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.subtasks) || '[]');
        const subtaskIndex = subtasks.findIndex(subtask => subtask.id === subtaskId);
        
        if (subtaskIndex !== -1) {
          subtasks[subtaskIndex].completed = !subtasks[subtaskIndex].completed;
          subtasks[subtaskIndex].updated_at = this.getCurrentTimestamp();
          
          localStorage.setItem(supabaseConfig.localStorageKeys.subtasks, JSON.stringify(subtasks));
          return subtasks[subtaskIndex];
        }
        return null;
      } catch (error) {
        console.error('Error toggling subtask completion in localStorage:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Move subtask position (up/down)
   */
  async moveSubtask(subtaskId, direction) {
    // Get the subtask
    let subtask = null;
    let taskId = null;
    let subtasks = [];
    
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('subtasks')
          .select('*')
          .eq('id', subtaskId)
          .single();
        
        if (error) throw error;
        subtask = data;
        taskId = subtask.task_id;
        
        // Get all subtasks for this task
        const { data: allSubtasks, error: subtasksError } = await this.supabase
          .from('subtasks')
          .select('*')
          .eq('task_id', taskId)
          .order('position', { ascending: true });
        
        if (subtasksError) throw subtasksError;
        subtasks = allSubtasks;
      } catch (error) {
        console.error('Error fetching subtask for movement:', error);
        return false;
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const allSubtasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.subtasks) || '[]');
        subtask = allSubtasks.find(s => s.id === subtaskId);
        
        if (!subtask) return false;
        
        taskId = subtask.task_id;
        subtasks = allSubtasks
          .filter(s => s.task_id === taskId)
          .sort((a, b) => a.position - b.position);
      } catch (error) {
        console.error('Error fetching subtask for movement from localStorage:', error);
        return false;
      }
    } else {
      return false;
    }
    
    // Find the current index
    const currentIndex = subtasks.findIndex(s => s.id === subtaskId);
    if (currentIndex === -1) return false;
    
    // Calculate the target index
    let targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Check bounds
    if (targetIndex < 0 || targetIndex >= subtasks.length) {
      return false; // Can't move outside bounds
    }
    
    // Swap positions
    const currentPosition = subtasks[currentIndex].position;
    const targetPosition = subtasks[targetIndex].position;
    
    // Update positions
    if (this.supabase) {
      try {
        // Update current subtask
        await this.supabase
          .from('subtasks')
          .update({ position: targetPosition })
          .eq('id', subtaskId);
        
        // Update target subtask
        await this.supabase
          .from('subtasks')
          .update({ position: currentPosition })
          .eq('id', subtasks[targetIndex].id);
        
        return true;
      } catch (error) {
        console.error('Error moving subtask in Supabase:', error);
        return false;
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const allSubtasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.subtasks) || '[]');
        
        // Find the indices in the full array
        const currentFullIndex = allSubtasks.findIndex(s => s.id === subtaskId);
        const targetFullIndex = allSubtasks.findIndex(s => s.id === subtasks[targetIndex].id);
        
        if (currentFullIndex === -1 || targetFullIndex === -1) return false;
        
        // Swap positions
        allSubtasks[currentFullIndex].position = targetPosition;
        allSubtasks[targetFullIndex].position = currentPosition;
        
        localStorage.setItem(supabaseConfig.localStorageKeys.subtasks, JSON.stringify(allSubtasks));
        return true;
      } catch (error) {
        console.error('Error moving subtask in localStorage:', error);
        return false;
      }
    }
    return false;
  }

  // INTERRUPTION TASKS
  
  /**
   * Get all interruption tasks
   */
  async getInterruptionTasks() {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('interruption_tasks')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error fetching interruption tasks:', error);
        return [];
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.interruptions) || '[]');
        return tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } catch (error) {
        console.error('Error fetching interruption tasks from localStorage:', error);
        return [];
      }
    }
    return [];
  }
  
  /**
   * Create a new interruption task
   */
  async createInterruptionTask(taskData) {
    const timestamp = this.getCurrentTimestamp();
    const newTask = {
      ...taskData,
      id: this.generateUUID(),
      elapsed_time: 0,
      added_to_main: false,
      created_at: timestamp,
      updated_at: timestamp
    };

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('interruption_tasks')
          .insert([newTask])
          .select();
        
        if (error) throw error;
        return data[0];
      } catch (error) {
        console.error('Error creating interruption task:', error);
        return null;
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.interruptions) || '[]');
        tasks.push(newTask);
        localStorage.setItem(supabaseConfig.localStorageKeys.interruptions, JSON.stringify(tasks));
        return newTask;
      } catch (error) {
        console.error('Error creating interruption task in localStorage:', error);
        return null;
      }
    }
    return null;
  }
  
  /**
   * Delete an interruption task
   */
  async deleteInterruptionTask(taskId) {
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('interruption_tasks')
          .delete()
          .eq('id', taskId);
        
        if (error) throw error;
        return true;
      } catch (error) {
        console.error('Error deleting interruption task:', error);
        return false;
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.interruptions) || '[]');
        const filteredTasks = tasks.filter(task => task.id !== taskId);
        
        localStorage.setItem(supabaseConfig.localStorageKeys.interruptions, JSON.stringify(filteredTasks));
        return true;
      } catch (error) {
        console.error('Error deleting interruption task from localStorage:', error);
        return false;
      }
    }
    return false;
  }
  
  /**
   * Move interruption task to main task list
   */
  async moveToMainTasks(interruptionId) {
    // Get the interruption task
    let interruptionTask;
    
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('interruption_tasks')
          .select('*')
          .eq('id', interruptionId)
          .single();
        
        if (error) throw error;
        interruptionTask = data;
      } catch (error) {
        console.error('Error fetching interruption task:', error);
        return null;
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.interruptions) || '[]');
        interruptionTask = tasks.find(task => task.id === interruptionId);
        
        if (!interruptionTask) return null;
      } catch (error) {
        console.error('Error fetching interruption task from localStorage:', error);
        return null;
      }
    } else {
      return null;
    }
    
    // Create a new main task
    const newTask = await this.createTask({
      title: interruptionTask.title,
      notes: interruptionTask.notes
    });
    
    if (!newTask) return null;
    
    // Mark interruption as added to main
    if (this.supabase) {
      try {
        await this.supabase
          .from('interruption_tasks')
          .update({ added_to_main: true })
          .eq('id', interruptionId);
      } catch (error) {
        console.error('Error updating interruption task status:', error);
      }
    } else if (supabaseConfig.useLocalStorage) {
      try {
        const tasks = JSON.parse(localStorage.getItem(supabaseConfig.localStorageKeys.interruptions) || '[]');
        const taskIndex = tasks.findIndex(task => task.id === interruptionId);
        
        if (taskIndex !== -1) {
          tasks[taskIndex].added_to_main = true;
          localStorage.setItem(supabaseConfig.localStorageKeys.interruptions, JSON.stringify(tasks));
        }
      } catch (error) {
        console.error('Error updating interruption task status in localStorage:', error);
      }
    }
    
    return newTask;
  }
}

// Create a single instance to be used throughout the app
const taskAPI = new TaskAPI();