"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskScheduler = void 0;
const cron_parser_1 = require("cron-parser");
const date_fns_1 = require("date-fns");
class TaskScheduler {
    constructor() {
        this.tasks = new Map();
        this.scheduledJobs = new Map();
    }
    /**
     * Schedules a task to run at specified intervals.
     */
    scheduleTask(taskName, callback, interval, options) {
        if (this.tasks.has(taskName)) {
            throw new Error(`Task ${taskName} already exists`);
        }
        const task = {
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
    scheduleCron(taskName, callback, cronExpression, options) {
        const cronInterval = {
            next: () => (0, cron_parser_1.parseExpression)(cronExpression).next().toDate(),
        };
        return this.scheduleTask(taskName, callback, cronInterval, { ...options, type: 'cron' });
    }
    /**
     * Schedules a one-time task.
     */
    scheduleOnce(taskName, callback, date) {
        if (date <= new Date()) {
            throw new Error('Scheduled time must be in the future');
        }
        const interval = { type: 'once', date };
        return this.scheduleTask(taskName, callback, interval);
    }
    /**
     * Cancels a scheduled task.
     */
    cancelTask(taskName) {
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
    pauseTask(taskName) {
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
    resumeTask(taskName) {
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
    getTaskStatus(taskName) {
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
    _scheduleNextRun(taskName) {
        const task = this.tasks.get(taskName);
        if (!task || task.status === 'paused')
            return;
        const now = new Date();
        let nextRun;
        const interval = task.interval;
        if ('next' in interval) {
            // Cron-based interval
            nextRun = interval.next();
        }
        else if ('type' in interval && interval.type === 'once') {
            // One-time task
            nextRun = interval.date;
        }
        else if ('unit' in interval && 'value' in interval) {
            // Regular intervals
            nextRun = this._calculateNextRun(interval);
        }
        else {
            throw new Error('Invalid interval configuration');
        }
        const timeout = nextRun.getTime() - now.getTime();
        const scheduledJob = setTimeout(() => this._executeTask(taskName, task), timeout);
        this.scheduledJobs.set(taskName, { id: scheduledJob, scheduledTime: nextRun });
    }
    /**
     * Internal: Calculates the next run time for regular intervals.
     */
    _calculateNextRun(interval) {
        const now = new Date();
        switch (interval.unit) {
            case 'minutes':
                return (0, date_fns_1.addMinutes)(now, interval.value);
            case 'hours':
                return (0, date_fns_1.addHours)(now, interval.value);
            case 'days':
                return (0, date_fns_1.addDays)(now, interval.value);
            default:
                throw new Error(`Unsupported interval unit: ${interval.unit}`);
        }
    }
    /**
     * Internal: Executes a task and schedules the next run if necessary.
     */
    _executeTask(taskName, task) {
        try {
            task.callback();
            if ('type' in task.interval && task.interval.type === 'once') {
                // One-time task: remove the task after execution
                this.tasks.delete(taskName);
                this.scheduledJobs.delete(taskName);
            }
            else {
                // Re-schedule the task
                this._scheduleNextRun(taskName);
            }
        }
        catch (error) {
            console.error(`Error executing task ${taskName}:`, error);
        }
    }
    /**
     * Internal: Gets the next scheduled run time.
     */
    _getNextRunTime(taskName) {
        const scheduledJob = this.scheduledJobs.get(taskName);
        if (!scheduledJob)
            return null;
        return scheduledJob.scheduledTime;
    }
}
exports.TaskScheduler = TaskScheduler;
