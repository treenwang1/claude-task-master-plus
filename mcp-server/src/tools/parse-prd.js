/**
 * tools/parsePRD.js
 * Tool to parse PRD document and generate tasks
 */

import { z } from 'zod';
import {
	handleApiResult,
	withNormalizedProjectRoot,
	createErrorResponse
} from './utils.js';
import { parsePRDDirect } from '../core/task-master-core.js';
import {PRD_FILE, TASKMASTER_DOCS_DIR, TASKMASTER_TASKS_FILE} from '../../../src/constants/paths.js';

/**
 * Register the parse_prd tool
 * @param {Object} server - FastMCP server instance
 */
export function registerParsePRDTool(server) {
	server.addTool({
		name: 'parse_prd',
		description: `Parse a Product Requirements Document (PRD) text file to automatically generate initial tasks. Reinitializing the project is not necessary to run this tool. It is recommended to run parse-prd after initializing the project and creating/importing a prd.md file in the project root's ${TASKMASTER_DOCS_DIR} directory.`,
		parameters: z.object({
			input: z
				.string()
				.optional()
				.default(PRD_FILE)
				.describe(`Absolute path to the PRD document file (prd.md, prd.md, etc. default: ${PRD_FILE})`),
			projectRoot: z
				.string()
				.describe('The directory of the project. Must be an absolute path.'),
			output: z
				.string()
				.optional()
				.describe(
					`Output path for tasks.json file (default: ${TASKMASTER_TASKS_FILE})`
				),
			numTasks: z
				.string()
				.optional()
				.describe(
					'Approximate number of top-level tasks to generate (default: 10). As the agent, if you have enough information, ensure to enter a number of tasks that would logically scale with project complexity. Avoid entering numbers above 50 due to context window limitations.'
				),
			force: z
				.boolean()
				.optional()
				.default(false)
				.describe('Overwrite existing output file without prompting.'),
			research: z
				.boolean()
				.optional()
				.describe(
					'Enable Taskmaster to use the research role for potentially more informed task generation. Requires appropriate API key.'
				),
			append: z
				.boolean()
				.optional()
				.describe('Append generated tasks to existing file.'),
			tasks: z
				.array(z.object({
					id: z.number().int().positive(),
					title: z.string().min(1),
					description: z.string().min(1),
					details: z.string().optional().default(''),
					testStrategy: z.string().optional().default(''),
					priority: z.enum(['high', 'medium', 'low']).default('medium'),
					dependencies: z.array(z.number().int().positive()).optional().default([]),
					status: z.string().optional().default('pending'),
					executor: z.enum(['agent', 'human']).optional().default('agent'),
					verifications: z
						.array(z.object({
							description: z.string().describe('Description of what to verify'),
							passed: z.boolean().describe('Whether this verification has passed')
						}))
						.optional()
						.default([])
						.describe('Array of verification steps to check if the task is completed correctly'),
					results: z
						.string()
						.optional()
						.default('')
						.describe('Results or outcomes of the task execution'),
					metadata: z
						.object({
							fields: z
								.array(z.object({
									key: z.string().describe('Field key'),
									label: z.string().describe('Field label'),
									type: z.string().describe('Field input type'),
									description: z.string().describe('Field description'),
									required: z.boolean().describe('Whether field is required'),
									enum: z.array(z.string()).optional().describe('Enum values for select fields')
								}))
								.optional()
								.describe('Custom fields for this task'),
							mcp: z
								.array(z.string())
								.optional()
								.describe('MCP servers required for this task'),
							linksTo: z
								.object({
									taskGroup: z.string().describe('Task group this task links to')
								})
								.optional()
								.describe('Task group linkage'),
							linkedBy: z
								.object({
									taskGroup: z.string().describe('Task group linked by this task')
								})
								.optional()
								.describe('Task group linked by this task')
						})
						.optional()
						.default({})
						.describe('Metadata for task configuration and relationships')
				}))
				.optional()
				.describe('Pre-analyzed tasks array following the current tasks.json schema. If provided, skips third-party LLM generation and uses these tasks directly after analyzing the current project.')
		}),
		execute: withNormalizedProjectRoot(async (args, { log, session }) => {
			try {
				const result = await parsePRDDirect(args, log, { session });
				return handleApiResult(result, log);
			} catch (error) {
				log.error(`Error in parse_prd: ${error.message}`);
				return createErrorResponse(`Failed to parse PRD: ${error.message}`);
			}
		})
	});
}
