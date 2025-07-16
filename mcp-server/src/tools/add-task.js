/**
 * tools/add-task.js
 * Tool to add a new task using AI
 */

import { z } from 'zod';
import {
	createErrorResponse,
	handleApiResult,
	withNormalizedProjectRoot
} from './utils.js';
import { addTaskDirect } from '../core/task-master-core.js';
import { findTasksPath } from '../core/utils/path-utils.js';

/**
 * Register the addTask tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerAddTaskTool(server) {
	server.addTool({
		name: 'add_task',
		description: 'Add a new task using AI',
		parameters: z.object({
			// prompt: z
			// 	.string()
			// 	.optional()
			// 	.describe(
			// 		'Description of the task to add (required if not using manual fields)'
			// 	),
			title: z
				.string()
				.optional()
				.describe('Task title (for manual task creation)'),
			description: z
				.string()
				.optional()
				.describe('Task description (for manual task creation)'),
			details: z
				.string()
				.optional()
				.describe('Implementation details (for manual task creation)'),
			testStrategy: z
				.string()
				.optional()
				.describe('Test strategy (for manual task creation)'),
			dependencies: z
				.string()
				.optional()
				.describe('Comma-separated list of task IDs this task depends on'),
			priority: z
				.string()
				.optional()
				.describe('Task priority (high, medium, low)'),
			assignees: z
				.string()
				.optional()
				.describe('Comma-separated list of people or teams assigned to this task'),
			executor: z
				.string()
				.optional()
				.describe('Who should execute this task: "agent" or "human" (default: agent)'),
			id: z
				.number()
				.optional()
				.describe('Insert the new task at this specific position (existing tasks will be shifted). If not provided, adds to the end.'),
			file: z
				.string()
				.optional()
				.describe('Path to the tasks file (default: tasks/tasks.json)'),
			projectRoot: z
				.string()
				.describe('The directory of the project. Must be an absolute path.'),
			research: z
				.boolean()
				.optional()
				.describe('Whether to use research capabilities for task creation')
		}),
		execute: withNormalizedProjectRoot(async (args, { log, session }) => {
			try {
				log.info(`Starting add-task with args: ${JSON.stringify(args)}`);

				// Use args.projectRoot directly (guaranteed by withNormalizedProjectRoot)
				let tasksJsonPath;
				try {
					tasksJsonPath = findTasksPath(
						{ projectRoot: args.projectRoot, file: args.file },
						log
					);
				} catch (error) {
					log.error(`Error finding tasks.json: ${error.message}`);
					return createErrorResponse(
						`Failed to find tasks.json: ${error.message}`
					);
				}

				// Call the direct functionP
				const result = await addTaskDirect(
					{
						tasksJsonPath: tasksJsonPath,
						prompt: args.prompt,
						title: args.title,
						description: args.description,
						details: args.details,
						testStrategy: args.testStrategy,
						dependencies: args.dependencies,
						priority: args.priority,
						assignees: args.assignees,
						executor: args.executor,
						id: args.id,
						research: args.research,
						projectRoot: args.projectRoot
					},
					log,
					{ session }
				);

				return handleApiResult(result, log);
			} catch (error) {
				log.error(`Error in add-task tool: ${error.message}`);
				return createErrorResponse(error.message);
			}
		})
	});
}
