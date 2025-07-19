/**
 * tools/add-result.js
 * Tool to add result entries to a task's results field
 */

import { z } from 'zod';
import {
	handleApiResult,
	createErrorResponse,
	withNormalizedProjectRoot
} from './utils.js';
import { addResultDirect } from '../core/task-master-core.js';

/**
 * Register the add-result tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerAddResultTool(server) {
	server.addTool({
		name: 'add_result',
		description:
			'Add a result entry to a task\'s results field. This is used to track actions performed and their outcomes.',
		parameters: z.object({
			id: z
				.union([z.number().int(), z.string()])
				.describe(
					"ID of the task (e.g. 15) or subtask (e.g. '15.2') to add result to"
				),
			action: z
				.string()
				.describe('The action that was performed (e.g., "Implemented authentication", "Fixed bug in login")'),
			result: z
				.string()
				.describe('The outcome or result of the action (e.g., "Successfully added JWT middleware", "Login now works correctly")'),
			file: z.string().optional().describe('Absolute path to the tasks file'),
			projectRoot: z
				.string()
				.describe('The directory of the project. Must be an absolute path.')
		}),
		execute: withNormalizedProjectRoot(async (args, { log, session }) => {
			try {
				log.info(`Executing add_result for task ${args.id}`);

				// Call the direct function
				const result = await addResultDirect(
					args,
					log,
					{ session }
				);

				return handleApiResult(result, log);
			} catch (error) {
				log.error(`Error in add_result: ${error.message}`);
				return createErrorResponse(`Failed to add result to task: ${error.message}`);
			}
		})
	});
} 