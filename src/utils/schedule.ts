import { parseExpression } from 'cron-parser';
import { addMinutes, addHours, addDays } from 'date-fns';
import { Task, Interval, ScheduleOptions } from '../types/taskTypes';

export class TaskScheduler {
  private tasks = new Map<string, Task>();
  private scheduledJobs = new Map<string, { id: NodeJS.Timeout; scheduledTime: Date }>();

  /**
   * Schedules a task to run at specified intervals.
   */
  scheduleTask(
    taskName: string,
    callback: () => void,
    interval: Interval,
    options?: ScheduleOptions
  ): string {
    if (this.tasks.has(taskName)) {
      throw new Error(`Task ${taskName} already exists`);
    }


    const task: Task = {
      callback,
      interval,
      options: options ?? {},
      status: 'scheduled',
    };

    this.tasks.set(taskName, task);
    this._scheduleNextRun(taskName);

    return taskName;
  }

  /**
   * Schedules a task using a cron expression.
   */
  scheduleCron(
    taskName: string,
    callback: () => void,
    cronExpression: string,
    options?: ScheduleOptions
  ): string {
    const cronInterval = {
      next: () => parseExpression(cronExpression).next().toDate(),
    };

    return this.scheduleTask(taskName, callback, cronInterval, { ...options, type: 'cron' });
  }

  /**
   * Schedules a one-time task.
   */
  scheduleOnce(taskName: string, callback: () => void, date: Date): string {
    if (date <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    const interval: Interval = { type: 'once', date };
    return this.scheduleTask(taskName, callback, interval);
  }

  /**
   * Cancels a scheduled task.
   */
  cancelTask(taskName: string): void {
    const scheduledJob = this.scheduledJobs.get(taskName);
    if (scheduledJob) {
      clearTimeout(scheduledJob.id);
      this.scheduledJobs.delete(taskName);
    }
    this.tasks.delete(taskName);
  }

  /**
   * Pauses a scheduled task.
   */
  pauseTask(taskName: string): void {
    const task = this.tasks.get(taskName);
    if (!task) {
      throw new Error(`Task ${taskName} not found`);
    }
    task.status = 'paused';
    this.cancelTask(taskName);
  }

  /**
   * Resumes a paused task.
   */
  resumeTask(taskName: string): void {
    const task = this.tasks.get(taskName);
    if (!task) {
      throw new Error(`Task ${taskName} not found`);
    }
    if (task.status === 'paused') {
      task.status = 'scheduled';
      this._scheduleNextRun(taskName);
    }
  }

  /**
   * Retrieves the status of a task.
   */
  getTaskStatus(taskName: string): { name: string; status: string; nextRun: Date | null } | null {
    const task = this.tasks.get(taskName);
    if (!task) {
      return null;
    }

    return {
      name: taskName,
      status: task.status,
      nextRun: this._getNextRunTime(taskName),
    };
  }

  /**
   * Internal: Schedules the next run of a task.
   */
  private _scheduleNextRun(taskName: string): void {
    const task = this.tasks.get(taskName);
    if (!task || task.status === 'paused') return;
  
    const now = new Date();
    let nextRun: Date;
  
    const interval = task.interval;
  
    if ('next' in interval) {
      // Cron-based interval
      nextRun = interval.next();
    } else if ('type' in interval && interval.type === 'once') {
      // One-time task
      nextRun = interval.date;
    } else if ('unit' in interval && 'value' in interval) {
      // Regular intervals
      nextRun = this._calculateNextRun(interval);
    } else {
      throw new Error('Invalid interval configuration');
    }
  
    const timeout = nextRun.getTime() - now.getTime();
    const scheduledJob = setTimeout(() => this._executeTask(taskName, task), timeout);
  
    this.scheduledJobs.set(taskName, { id: scheduledJob, scheduledTime: nextRun });
  }
  

  /**
   * Internal: Calculates the next run time for regular intervals.
   */
  private _calculateNextRun(interval: { unit: 'minutes' | 'hours' | 'days'; value: number }): Date {
    const now = new Date();
    switch (interval.unit) {
      case 'minutes':
        return addMinutes(now, interval.value);
      case 'hours':
        return addHours(now, interval.value);
      case 'days':
        return addDays(now, interval.value);
      default:
        throw new Error(`Unsupported interval unit: ${interval.unit}`);
    }
  }

  /**
   * Internal: Executes a task and schedules the next run if necessary.
   */
  private _executeTask(taskName: string, task: Task): void {
    try {
      task.callback();
  
      if ('type' in task.interval && task.interval.type === 'once') {
        // One-time task: remove the task after execution
        this.tasks.delete(taskName);
        this.scheduledJobs.delete(taskName);
      } else {
        // Re-schedule the task
        this._scheduleNextRun(taskName);
      }
    } catch (error) {
      console.error(`Error executing task ${taskName}:`, error);
    }
  }
  

  /**
   * Internal: Gets the next scheduled run time.
   */
  private _getNextRunTime(taskName: string): Date | null {
    const scheduledJob = this.scheduledJobs.get(taskName);
    if (!scheduledJob) return null;
    return scheduledJob.scheduledTime;
  }
}
