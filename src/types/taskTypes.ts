/**
 * Types for Task Scheduler
 */

export declare type TimeZoneOptions = {
  format?: string;
  strictParsing?: boolean;
  locale?: string;
};

export declare type ReturnType = 'date' | 'moment' | 'timestamp' | 'time';

export declare type Options = {
  return: ReturnType | 'string';
  returnFormat?: string;
  timeZone?: string;
  inputFormat?: string;
};

export type Interval = 
  | { unit: 'minutes' | 'hours' | 'days'; value: number } // Recurring intervals
  | { type: 'once'; date: Date }                         // One-time task
  | { next: () => Date };                                // Cron-based intervals

export interface ScheduleOptions {
  type?: 'cron' | 'once';
  retryOnError?: boolean;
  retryDelay?: number;
}

export interface Task {
  callback: () => void;
  interval: Interval;
  options?: ScheduleOptions;
  status: 'scheduled' | 'paused';
}


export type CronInterval = {
  next: () => Date;
};

