/**
 * tools/update-subtask.js
 * Tool to append additional information to a specific subtask
 */

import { z } from 'zod';
import {
	handleApiResult,
	createErrorResponse,
	withNormalizedProjectRoot
} from './utils.js';
import { updateSubtaskByIdDirect } from '../core/task-master-core.js';
import { findTasksPath } from '../core/utils/path-utils.js';
import { metadataSchema, verificationSchema } from '../../../src/schemas/task-schemas.js';

/**
 * Register the update-subtask tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerUpdateSubtaskTool(server) {
	server.addTool({
		name: 'update_subtask',
		description:
			'Appends timestamped information to a specific subtask without replacing existing content. If you just want to update the subtask status, use set_task_status instead.',
		parameters: z.object({
			id: z
				.string()
				.describe(
					'ID of the subtask to update in format "parentId.subtaskId" (e.g., "5.2"). Parent ID is the ID of the task that contains the subtask.'
				),
			// prompt: z.string().describe('Information to add to the subtask'),
			// research: z
			// 	.boolean()
			// 	.optional()
			// 	.describe('Use Perplexity AI for research-backed updates'),
			file: z.string().optional().describe('Absolute path to the tasks file'),
			projectRoot: z
				.string()
				.describe('The directory of the project. Must be an absolute path.'),
			verifications: z.array(verificationSchema).optional().describe('Verifications to update'),
			metadata: z.array(metadataSchema).optional().describe('Metadata to update')
		}),
		execute: withNormalizedProjectRoot(async (args, { log, session }) => {
			const toolName = 'update_subtask';
			try {
				log.info(`Updating subtask with args: ${JSON.stringify(args)}`);

				let tasksJsonPath;
				try {
					tasksJsonPath = findTasksPath(
						{ projectRoot: args.projectRoot, file: args.file },
						log
					);
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
				if (args.verifications) {
					directAttributes.verifications = args.verifications;
				}
				if (args.metadata) {
					directAttributes.metadata = args.metadata;
				}

				const result = await updateSubtaskByIdDirect(
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

				if (result.success) {
					log.info(`Successfully updated subtask with ID ${args.id}`);
				} else {
					log.error(
						`Failed to update subtask: ${result.error?.message || 'Unknown error'}`
					);
				}

				return handleApiResult(result, log, 'Error updating subtask');
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
