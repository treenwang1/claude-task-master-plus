/**
 * Direct function wrapper for clearSubtasks
 */

import { clearSubtasks } from '../../../../scripts/modules/task-manager.js';
import fs from 'fs';

/**
 * Clear subtasks from specified tasks
 * @param {Object} args - Function arguments
 * @param {string} args.tasksJsonPath - Explicit path to the tasks.json file.
 * @param {string} [args.id] - Task IDs (comma-separated) to clear subtasks from
 * @param {boolean} [args.all] - Clear subtasks from all tasks
 * @param {Object} log - Logger object
 * @returns {Promise<{success: boolean, data?: Object, error?: {code: string, message: string}}>}
 */
export async function clearSubtasksDirect(args, log) {
	// Destructure expected args
	const { tasksJsonPath, id, all } = args;
	try {
		log.info(`Clearing subtasks with args: ${JSON.stringify(args)}`);

		// Check if tasksJsonPath was provided
		if (!tasksJsonPath) {
			log.error('clearSubtasksDirect called without tasksJsonPath');
			return {
				success: false,
				error: {
					code: 'MISSING_ARGUMENT',
					message: 'tasksJsonPath is required'
				}
			};
		}

		// Either id or all must be provided
		if (!id && !all) {
			return {
				success: false,
				error: {
					code: 'INPUT_VALIDATION_ERROR',
					message:
						'Either task IDs with id parameter or all parameter must be provided'
				}
			};
		}

		// Use provided path
		const tasksPath = tasksJsonPath;

		// Check if tasks.json exists
		if (!fs.existsSync(tasksPath)) {
			return {
				success: false,
				error: {
					code: 'FILE_NOT_FOUND_ERROR',
					message: `Tasks file not found at ${tasksPath}`
				}
			};
		}

		let taskIds;

		// If all is specified, get all task IDs
		if (all) {
			log.info('Clearing subtasks from all tasks');
			const data = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
			if (!data || !data.tasks || data.tasks.length === 0) {
				return {
					success: false,
					error: {
						code: 'INPUT_VALIDATION_ERROR',
						message: 'No valid tasks found in the tasks file'
					}
				};
			}
			taskIds = data.tasks.map((t) => t.id).join(',');
		} else {
			// Use the provided task IDs
			taskIds = id;
		}

		log.info(`Clearing subtasks from tasks: ${taskIds}`);

		// Call the core function with json output format to suppress console output
		const result = clearSubtasks(tasksPath, taskIds, 'json');

		// The core function now returns a structured result
		if (!result.success) {
			return result; // Return the error as-is
		}

		// Return the success result
		return {
			success: true,
			data: {
				message: `Successfully cleared subtasks from ${result.data.clearedCount} task(s)`,
				clearedCount: result.data.clearedCount,
				results: result.data.results,
				errors: result.data.errors
			}
		};
	} catch (error) {
		log.error(`Error in clearSubtasksDirect: ${error.message}`);
		return {
			success: false,
			error: {
				code: 'CORE_FUNCTION_ERROR',
				message: error.message
			}
		};
	}
}
