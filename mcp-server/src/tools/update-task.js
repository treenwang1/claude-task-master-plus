/**
 * tools/update-task.js
 * Tool to update a single task by ID with new information
 */

import { z } from 'zod';
import {
	handleApiResult,
	createErrorResponse,
	withNormalizedProjectRoot
} from './utils.js';
import { updateTaskByIdDirect } from '../core/task-master-core.js';
import { findTasksPath } from '../core/utils/path-utils.js';
import { aiTaskDataSchema, aiUpdateTaskDataSchema, metadataSchema, subtaskSchema, updatedTaskSchema, verificationSchema } from '../../../src/schemas/task-schemas.js';

/**
 * Register the update-task tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerUpdateTaskTool(server) {
	server.addTool({
		name: 'update_task',
		description:
			'Updates a single task by ID with new information or context provided in the prompt.',
		parameters: aiUpdateTaskDataSchema.extend({
			// id: z
			// 	.number().int() // ID can be number or string like "1"
			// 	.describe(
			// 		"ID of the task (e.g. '15') to update. Subtasks are supported using the update-subtask tool."
			// 	),
			// prompt: z
			// 	.string()
			// 	.describe('New information or context to incorporate into the task'),
			// research: z
			// 	.boolean()
			// 	.optional()
			// 	.describe('Use Perplexity AI for research-backed updates'),
			file: z.string().optional().describe('Absolute path to the tasks file'),
			projectRoot: z
				.string()
				.describe('The directory of the project. Must be an absolute path.')
		}),
		execute: withNormalizedProjectRoot(async (args, { log, session }) => {
			const toolName = 'update_task';
			try {
				log.info(
					`Executing ${toolName} tool with args: ${JSON.stringify(args)}`
				);

				let tasksJsonPath;
				try {
					tasksJsonPath = findTasksPath(
						{ projectRoot: args.projectRoot, file: args.file },
						log
					);
					log.info(`${toolName}: Resolved tasks path: ${tasksJsonPath}`);
				} catch (error) {
					log.error(`${toolName}: Error finding tasks.json: ${error.message}`);
					return createErrorResponse(
						`Failed to find tasks.json: ${error.message}`
					);
				}

				const directAttributes = {};
				if (args.title) {
					directAttributes.title = args.title;
				}
				if (args.description) {
					directAttributes.description = args.description;
				}
				if (args.details) {
					directAttributes.details = args.details;
				}
				if (args.testStrategy) {
					directAttributes.testStrategy = args.testStrategy;
				}
				if (args.dependencies) {
					directAttributes.dependencies = args.dependencies;
				}
				if (args.assignees) {
					directAttributes.assignees = args.assignees;
				}
				if (args.executor) {
					directAttributes.executor = args.executor;
				}
				if (args.subtasks) {
					directAttributes.subtasks = args.subtasks;
				}
				if (args.verifications) {
					directAttributes.verifications = args.verifications;
				}
				if (args.metadata) {
					directAttributes.metadata = args.metadata;
				}

				// 3. Call Direct Function - Include projectRoot
				const result = await updateTaskByIdDirect(
					{
						tasksJsonPath: tasksJsonPath,
						id: args.id,
						prompt: args.prompt,
						research: args.research,
						projectRoot: args.projectRoot,
						directAttributes
					},
					log,
					{ session }
				);

				// 4. Handle Result
				log.info(
					`${toolName}: Direct function result: success=${result.success}`
				);
				return handleApiResult(result, log, 'Error updating task');
			} catch (error) {
				log.error(
					`Critical error in ${toolName} tool execute: ${error.message}`
				);
				return createErrorResponse(
					`Internal tool error (${toolName}): ${error.message}`
				);
			}
		})
	});
}
