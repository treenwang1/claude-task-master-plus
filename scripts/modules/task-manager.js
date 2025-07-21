/**
 * task-manager.js
 * Task management functions for the Task Master CLI
 */

import { findTaskById } from './utils.js';
import parsePRD from './task-manager/parse-prd.js';
import updateTasks from './task-manager/update-tasks.js';
import updateTaskById, { updateTaskNormalAttributeById, updateTaskNormalAttributesById, updateTaskMetadataFieldValueById, addTaskMetadataFieldById, deleteTaskMetadataFieldById } from './task-manager/update-task-by-id.js';
import generateTaskFiles from './task-manager/generate-task-files.js';
import setTaskStatus from './task-manager/set-task-status.js';
import updateSingleTaskStatus from './task-manager/update-single-task-status.js';
import listTasks from './task-manager/list-tasks.js';
import expandTask from './task-manager/expand-task.js';
import expandAllTasks from './task-manager/expand-all-tasks.js';
import clearSubtasks from './task-manager/clear-subtasks.js';
import addTask from './task-manager/add-task.js';

import findNextTask, { findNextTaskFromRootPath } from './task-manager/find-next-task.js';
import addSubtask from './task-manager/add-subtask.js';
import removeSubtask from './task-manager/remove-subtask.js';
import updateSubtaskById, { updateSubtaskNormalAttributeById, updateSubtaskNormalAttributesById, updateSubtaskMetadataFieldValueById, addSubtaskMetadataFieldById, deleteSubtaskMetadataFieldById } from './task-manager/update-subtask-by-id.js';
import removeTask from './task-manager/remove-task.js';
import taskExists from './task-manager/task-exists.js';
import isTaskDependentOn from './task-manager/is-task-dependent.js';
import moveTask from './task-manager/move-task.js';
import { migrateProject } from './task-manager/migrate.js';
import { regenerateSequentialTaskIds, rewriteSequentialTaskIds } from './utils.js';
import { addDependency } from './dependency-manager.js';
// Export task manager functions
export {
	parsePRD,
	updateTasks,
	updateTaskById,
	updateTaskNormalAttributeById,
	updateTaskNormalAttributesById,
	updateTaskMetadataFieldValueById,
	addSubtaskMetadataFieldById,
	deleteSubtaskMetadataFieldById,
	updateSubtaskById,
	updateSubtaskNormalAttributeById,
	updateSubtaskNormalAttributesById,
	updateSubtaskMetadataFieldValueById,
	addTaskMetadataFieldById,
	deleteTaskMetadataFieldById,
	generateTaskFiles,
	setTaskStatus,
	updateSingleTaskStatus,
	listTasks,
	expandTask,
	expandAllTasks,
	clearSubtasks,
	addTask,
	addSubtask,
	removeSubtask,
	findNextTask,
	findNextTaskFromRootPath,

	removeTask,
	findTaskById,
	taskExists,
	isTaskDependentOn,
	moveTask,

	migrateProject,
	addDependency,
	regenerateSequentialTaskIds,
	rewriteSequentialTaskIds
};
