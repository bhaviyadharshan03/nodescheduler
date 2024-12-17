"use strict";
// index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduler = void 0;
const schedule_1 = require("./utils/schedule");
const scheduler = new schedule_1.TaskScheduler();
exports.scheduler = scheduler;
