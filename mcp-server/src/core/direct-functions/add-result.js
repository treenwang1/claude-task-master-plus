/**
 * add-result.js
 * Direct function implementation for adding result entries to a task's results field
 */

import { findTaskById } from '../../../../scripts/modules/task-manager.js';
import { findTasksJsonPath } from '../utils/path-utils.js';
import {
	enableSilentMode,
	disableSilentMode,
	readJSON,
	writeJSON
} from '../../../../scripts/modules/utils.js';
import { createLogWrapper } from '../../tools/utils.js';

/**
 * Direct function wrapper for adding result entries to a task's results array.
 *
 * @param {Object} args - Command arguments containing id, action, result, and projectRoot.
 * @param {string|number} args.id - Task ID (or subtask ID like "1.2") to add result to.
 * @param {string} args.action - The action that was performed.
 * @param {string} args.result - The outcome or result of the action.
 * @param {string} [args.file] - Explicit path to the tasks.json file.
 * @param {string} [args.projectRoot] - Project root path.
 * @param {Object} log - Logger object.
 * @param {Object} context - Context object containing session data.
 * @returns {Promise<Object>} - Result object with success status and data/error information.
 */
export async function addResultDirect(args, log, context = {}) {
	const { session } = context;
	const { id, action, result, file, projectRoot } = args;

	const logWrapper = createLogWrapper(log);

	try {
		logWrapper.info(
			`Adding result to task via direct function. ID: ${id}, Action: ${action}, ProjectRoot: ${projectRoot}`
		);

		// Check required parameters
		if (!id) {
			const errorMessage = 'Task ID is required but was not provided.';
			logWrapper.error(errorMessage);
			return {
				success: false,
				error: { code: 'MISSING_ARGUMENT', message: errorMessage }
			};
		}

		if (!action) {
			const errorMessage = 'Action is required but was not provided.';
			logWrapper.error(errorMessage);
			return {
				success: false,
				error: { code: 'MISSING_ARGUMENT', message: errorMessage }
			};
		}

		if (!result) {
			const errorMessage = 'Result is required but was not provided.';
			logWrapper.error(errorMessage);
			return {
				success: false,
				error: { code: 'MISSING_ARGUMENT', message: errorMessage }
			};
		}

		// Get tasks file path
		const tasksPath = findTasksJsonPath({ projectRoot, file }, log);

		enableSilentMode();
		try {
			// Read tasks data
			const data = readJSON(tasksPath);
			if (!data || !data.tasks) {
				const errorMessage = 'Invalid or empty tasks file.';
				logWrapper.error(errorMessage);
				return {
					success: false,
					error: { code: 'INVALID_TASKS_FILE', message: errorMessage }
				};
			}

			// Create result entry
			const resultEntry = {
				action: action,
				updateTime: new Date().toISOString(),
				result: result
			};

			// Check if it's a subtask ID (contains dot)
			if (typeof id === 'string' && id.includes('.')) {
				const [parentIdStr, subtaskIdStr] = id.split('.');
				const parentId = parseInt(parentIdStr, 10);
				const subtaskId = parseInt(subtaskIdStr, 10);

				// Find parent task
				const parentTask = data.tasks.find(t => t.id === parentId);
				if (!parentTask) {
					const errorMessage = `Parent task with ID ${parentId} not found.`;
					logWrapper.error(errorMessage);
					return {
						success: false,
						error: { code: 'TASK_NOT_FOUND', message: errorMessage }
					};
				}

				// Find subtask
				const subtask = parentTask.subtasks?.find(st => st.id === subtaskId);
				if (!subtask) {
					const errorMessage = `Subtask with ID ${subtaskId} not found in task ${parentId}.`;
					logWrapper.error(errorMessage);
					return {
						success: false,
						error: { code: 'SUBTASK_NOT_FOUND', message: errorMessage }
					};
				}

				// Initialize results array if it doesn't exist
				if (!subtask.results) {
					subtask.results = [];
				}

				// Add result entry
				subtask.results.push(resultEntry);

				logWrapper.info(`Added result to subtask ${id}: ${action}`);
			} else {
				// Handle regular task
				const taskId = parseInt(id, 10);
				const task = data.tasks.find(t => t.id === taskId);

				if (!task) {
					const errorMessage = `Task with ID ${taskId} not found.`;
					logWrapper.error(errorMessage);
					return {
						success: false,
						error: { code: 'TASK_NOT_FOUND', message: errorMessage }
					};
				}

				// Initialize results array if it doesn't exist
				if (!task.results) {
					task.results = [];
				}

				// Add result entry
				task.results.push(resultEntry);

				logWrapper.info(`Added result to task ${taskId}: ${action}`);
			}

			// Write updated data back to file
			writeJSON(tasksPath, data);

			return {
				success: true,
				data: {
					taskId: id,
					resultEntry: resultEntry,
					message: `Successfully added result to ${typeof id === 'string' && id.includes('.') ? 'subtask' : 'task'} ${id}`
				},
				fromCache: false
			};

		} finally {
			disableSilentMode();
		}

	} catch (error) {
		logWrapper.error(`Failed to add result to task: ${error.message}`);
		return {
			success: false,
			error: {
				code: error.code || 'ADD_RESULT_ERROR',
				message: error.message,
				details: error.stack
			},
			fromCache: false
		};
	}
} 