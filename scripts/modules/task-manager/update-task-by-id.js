import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import { z } from 'zod'; // Keep Zod for post-parse validation

import {
	log as consoleLog,
	readJSON,
	writeJSON,
	truncate,
	isSilentMode,
	findProjectRoot,
	parseJson
} from '../utils.js';

import {
	getStatusWithColor,
	startLoadingIndicator,
	stopLoadingIndicator,
	displayAiUsageSummary
} from '../ui.js';

import { generateTextService } from '../ai-services-unified.js';
import {
	getDebugFlag,
	isApiKeySet // Keep this check
} from '../config-manager.js';
import generateTaskFiles from './generate-task-files.js';
import { updatedTaskSchema } from '../../../src/schemas/task-schemas.js'; // Allows parsing even if AI adds extra fields, but validation focuses on schema

/**
 * Parses a single updated task object from AI's text response.
 * @param {string} text - Response text from AI.
 * @param {number} expectedTaskId - The ID of the task expected.
 * @param {Function | Object} logFn - Logging function or MCP logger.
 * @param {boolean} isMCP - Flag indicating MCP context.
 * @returns {Object} Parsed and validated task object.
 * @throws {Error} If parsing or validation fails.
 */
function parseUpdatedTaskFromText(text, expectedTaskId, logFn, isMCP) {
	// Report helper consistent with the established pattern
	const report = (level, ...args) => {
		if (isMCP) {
			if (typeof logFn[level] === 'function') logFn[level](...args);
			else logFn.info(...args);
		} else if (!isSilentMode()) {
			logFn(level, ...args);
		}
	};

	report(
		'info',
		'Attempting to parse updated task object from text response...'
	);
	if (!text || text.trim() === '')
		throw new Error('AI response text is empty.');

	let cleanedResponse = text.trim();
	const originalResponseForDebug = cleanedResponse;
	let parseMethodUsed = 'raw'; // Keep track of which method worked

	// --- NEW Step 1: Try extracting between {} first ---
	const firstBraceIndex = cleanedResponse.indexOf('{');
	const lastBraceIndex = cleanedResponse.lastIndexOf('}');
	let potentialJsonFromBraces = null;

	if (firstBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
		potentialJsonFromBraces = cleanedResponse.substring(
			firstBraceIndex,
			lastBraceIndex + 1
		);
		if (potentialJsonFromBraces.length <= 2) {
			potentialJsonFromBraces = null; // Ignore empty braces {}
		}
	}

	// If {} extraction yielded something, try parsing it immediately
	if (potentialJsonFromBraces) {
		try {
			const testParse = JSON.parse(potentialJsonFromBraces);
			// It worked! Use this as the primary cleaned response.
			cleanedResponse = potentialJsonFromBraces;
			parseMethodUsed = 'braces';
		} catch (e) {
			report(
				'info',
				'Content between {} looked promising but failed initial parse. Proceeding to other methods.'
			);
			// Reset cleanedResponse to original if brace parsing failed
			cleanedResponse = originalResponseForDebug;
		}
	}

	// --- Step 2: If brace parsing didn't work or wasn't applicable, try code block extraction ---
	if (parseMethodUsed === 'raw') {
		const codeBlockMatch = cleanedResponse.match(
			/```(?:json|javascript)?\s*([\s\S]*?)\s*```/i
		);
		if (codeBlockMatch) {
			cleanedResponse = codeBlockMatch[1].trim();
			parseMethodUsed = 'codeblock';
			report('info', 'Extracted JSON content from Markdown code block.');
		} else {
			// --- Step 3: If code block failed, try stripping prefixes ---
			const commonPrefixes = [
				'json\n',
				'javascript\n'
				// ... other prefixes ...
			];
			let prefixFound = false;
			for (const prefix of commonPrefixes) {
				if (cleanedResponse.toLowerCase().startsWith(prefix)) {
					cleanedResponse = cleanedResponse.substring(prefix.length).trim();
					parseMethodUsed = 'prefix';
					report('info', `Stripped prefix: "${prefix.trim()}"`);
					prefixFound = true;
					break;
				}
			}
			if (!prefixFound) {
				report(
					'warn',
					'Response does not appear to contain {}, code block, or known prefix. Attempting raw parse.'
				);
			}
		}
	}

	// --- Step 4: Attempt final parse ---
	let parsedTask;
	try {
		parsedTask = JSON.parse(cleanedResponse);
	} catch (parseError) {
		report('error', `Failed to parse JSON object: ${parseError.message}`);
		report(
			'error',
			`Problematic JSON string (first 500 chars): ${cleanedResponse.substring(0, 500)}`
		);
		report(
			'error',
			`Original Raw Response (first 500 chars): ${originalResponseForDebug.substring(0, 500)}`
		);
		throw new Error(
			`Failed to parse JSON response object: ${parseError.message}`
		);
	}

	if (!parsedTask || typeof parsedTask !== 'object') {
		report(
			'error',
			`Parsed content is not an object. Type: ${typeof parsedTask}`
		);
		report(
			'error',
			`Parsed content sample: ${JSON.stringify(parsedTask).substring(0, 200)}`
		);
		throw new Error('Parsed AI response is not a valid JSON object.');
	}

	// Validate the parsed task object using Zod
	const validationResult = updatedTaskSchema.safeParse(parsedTask);
	if (!validationResult.success) {
		report('error', 'Parsed task object failed Zod validation.');
		validationResult.error.errors.forEach((err) => {
			report('error', `  - Field '${err.path.join('.')}': ${err.message}`);
		});
		throw new Error(
			`AI response failed task structure validation: ${validationResult.error.message}`
		);
	}

	// Final check: ensure ID matches expected ID (AI might hallucinate)
	if (validationResult.data.id !== expectedTaskId) {
		report(
			'warn',
			`AI returned task with ID ${validationResult.data.id}, but expected ${expectedTaskId}. Overwriting ID.`
		);
		validationResult.data.id = expectedTaskId; // Enforce correct ID
	}

	report('info', 'Successfully validated updated task structure.');
	return validationResult.data; // Return the validated task data
}

/**
 * Update a single task by ID using the unified AI service.
 * @param {string} tasksPath - Path to the tasks.json file
 * @param {number} taskId - Task ID to update
 * @param {string} key - Key to update
 * @param {string} value - Value to set
 * @returns {Promise<Object>} - Updated task data
 */
async function updateTaskNormalAttributeById(tasksPath, taskId, key, value) {
	const data = readJSON(tasksPath);
	const tasksToUpdate = data.tasks.find(
		(task) => task.id === taskId
	);

	if(tasksToUpdate){
		tasksToUpdate[key] = value;
		writeJSON(tasksPath, data);
	}

	return tasksToUpdate;
}

/**
 * Update a single task by ID using the unified AI service.
 * @param {string} tasksPath - Path to the tasks.json file
 * @param {number} taskId - Task ID to update
 * @param {Object} attributes - Attributes to update
 * @returns {Promise<Object>} - Updated task data
 */
async function updateTaskNormalAttributesById(tasksPath, taskId, attributes) {
	const data = readJSON(tasksPath);
	const tasksToUpdate = data.tasks.find(
		(task) => task.id === taskId
	);
	
	if(tasksToUpdate){
		// merge attributes into tasksToUpdate
		Object.assign(tasksToUpdate, attributes);

		writeJSON(tasksPath, data);
	}
	return tasksToUpdate;
}

/**
 * Update metadata field value single task by ID using the unified AI service.
 * @param {string} tasksPath - Path to the tasks.json file
 * @param {number} taskId - Task ID to update
 * @param {string} key - Key to update
 * @param {string} value - Value to set
 * @returns {Promise<Object>} - Updated task data
 */
async function updateTaskMetadataFieldValueById(tasksPath, taskId, fieldKey, fieldValue) {
	const data = readJSON(tasksPath);
	const tasksToUpdate = data.tasks.find(
		(task) => task.id === taskId
	);

	if (tasksToUpdate && tasksToUpdate.metadata && tasksToUpdate.metadata.fields) {

		const field = tasksToUpdate.metadata.fields.find(field => field.key === fieldKey);
		if (field) {
			field.value = fieldValue;
			writeJSON(tasksPath, data);
			return tasksToUpdate;
		} else {
			throw new Error(`Task ${taskId} has no metadata field ${fieldKey}`);
		}
	} else {
		throw new Error(`Task ${taskId} has no metadata field`);
	}
}

/**
 * Delete a task's metadata field by ID
 * @param {string} tasksPath - Path to the tasks.json file
 * @param {number} taskId - Task ID to update
 * @param {string} fieldKey - Metadata field key to delete
 * @returns {Promise<Object>} - Updated task data
 */
async function deleteTaskMetadataFieldById(tasksPath, taskId, fieldKey) {
	if (!fieldKey || typeof fieldKey !== 'string') {
		throw new Error('Metadata field key must be a non-empty string');
	}

	const data = readJSON(tasksPath);
	const tasksToUpdate = data.tasks.find(
		(task) => task.id === taskId
	);

	if (!tasksToUpdate) {
		throw new Error(`Task with ID ${taskId} not found`);
	}

	if (!tasksToUpdate.metadata || !tasksToUpdate.metadata.fields) {
		throw new Error(`Task ${taskId} has no metadata fields`);
	}

	const fieldIndex = tasksToUpdate.metadata.fields.findIndex(field => field.key === fieldKey);
	if (fieldIndex === -1) {
		throw new Error(`Task ${taskId} has no metadata field ${fieldKey}`);
	}

	// Remove the field from the array
	tasksToUpdate.metadata.fields.splice(fieldIndex, 1);

	writeJSON(tasksPath, data);
	return tasksToUpdate;
}

/**
 * Add a new metadata field to a task by ID
 * @param {string} tasksPath - Path to the tasks.json file
 * @param {number} taskId - Task ID to update
 * @param {Object} fieldData - Metadata field data (key, label, type, description, required, enum, value)
 * @returns {Promise<Object>} - Updated task data
 */
async function addTaskMetadataFieldById(tasksPath, taskId, fieldData) {
	if (!fieldData || !fieldData.key || typeof fieldData.key !== 'string') {
		throw new Error('Metadata field data must include a valid key');
	}

	const data = readJSON(tasksPath);
	const tasksToUpdate = data.tasks.find(
		(task) => task.id === taskId
	);

	if (!tasksToUpdate) {
		throw new Error(`Task with ID ${taskId} not found`);
	}

	// Initialize metadata and fields if they don't exist
	if (!tasksToUpdate.metadata) {
		tasksToUpdate.metadata = {};
	}
	if (!tasksToUpdate.metadata.fields) {
		tasksToUpdate.metadata.fields = [];
	}

	// Check if field with same key already exists
	const existingFieldIndex = tasksToUpdate.metadata.fields.findIndex(
		field => field.key === fieldData.key
	);
	if (existingFieldIndex !== -1) {
		throw new Error(`Metadata field with key '${fieldData.key}' already exists`);
	}

	// Create the new field with default values
	const newField = {
		key: fieldData.key,
		label: fieldData.label || fieldData.key,
		type: fieldData.type || 'text',
		description: fieldData.description || '',
		required: fieldData.required || false,
		...(fieldData.enum && { enum: fieldData.enum }),
		...(fieldData.value && { value: fieldData.value })
	};

	// Add the new field
	tasksToUpdate.metadata.fields.push(newField);

	writeJSON(tasksPath, data);
	return tasksToUpdate;
}

/**
 * Update a single task by ID using the unified AI service and/or normal attribute updates.
 * @param {string} tasksPath - Path to the tasks.json file
 * @param {number} taskId - Task ID to update
 * @param {string} prompt - Prompt with new context (optional)
 * @param {boolean} [useResearch=false] - Whether to use the research AI role.
 * @param {Object} context - Context object containing session and mcpLog.
 * @param {Object} [context.session] - Session object from MCP server.
 * @param {Object} [context.mcpLog] - MCP logger object.
 * @param {string} [outputFormat='text'] - Output format ('text' or 'json').
 * @param {Object} [normalAttributes={}] - Object of normal (non-AI) attributes to update (e.g. assignees, executor)
 * @returns {Promise<Object|null>} - Updated task data or null if task wasn't updated/found.
 */
async function updateTaskById(
	tasksPath,
	taskId,
	prompt,
	useResearch = false,
	context = {},
	outputFormat = 'text',
	normalAttributes = {}
) {
	const { session, mcpLog, projectRoot } = {projectRoot: findProjectRoot(path.dirname(tasksPath)), ...context };
	const logFn = mcpLog || consoleLog;
	const isMCP = !!mcpLog;

	// Use report helper for logging
	const report = (level, ...args) => {
		if (isMCP) {
			if (typeof logFn[level] === 'function') logFn[level](...args);
			else logFn.info(...args);
		} else if (!isSilentMode()) {
			logFn(level, ...args);
		}
	};

	let updatedTask = null;

	// 1. Update normal attributes if provided
	if (normalAttributes && Object.keys(normalAttributes).length > 0) {
		try {
			await updateTaskNormalAttributesById(tasksPath, taskId, normalAttributes);
			report('info', `Updated normal attributes for task ${taskId}: ${JSON.stringify(normalAttributes)}`);
		} catch (err) {
			report('error', `Failed to update normal attributes for task ${taskId}: ${err.message}`);
			throw err;
		}
	}

	// 2. If prompt is provided, run AI update logic
	if (prompt && typeof prompt === 'string' && prompt.trim() !== '') {
		try {
			report('info', `Updating single task ${taskId} with prompt: "${prompt}"`);

			// --- Input Validations (Keep existing) ---
			if (!Number.isInteger(taskId) || taskId <= 0)
				throw new Error(
					`Invalid task ID: ${taskId}. Task ID must be a positive integer.`
				);
			if (useResearch && !isApiKeySet('perplexity', session)) {
				report(
					'warn',
					'Perplexity research requested but API key not set. Falling back.'
				);
				if (outputFormat === 'text')
					console.log(
						chalk.yellow('Perplexity AI not available. Falling back to main AI.')
					);
				useResearch = false;
			}
			if (!fs.existsSync(tasksPath))
				throw new Error(`Tasks file not found: ${tasksPath}`);
			// --- End Input Validations ---

			// --- Task Loading and Status Check (Keep existing) ---
			const data = readJSON(tasksPath);
			if (!data || !data.tasks)
				throw new Error(`No valid tasks found in ${tasksPath}.`);
			const taskIndex = data.tasks.findIndex((task) => task.id === taskId);
			if (taskIndex === -1) throw new Error(`Task with ID ${taskId} not found.`);
			const taskToUpdate = data.tasks[taskIndex];
			if (taskToUpdate.status === 'done' || taskToUpdate.status === 'completed') {
				report(
					'warn',
					`Task ${taskId} is already marked as done and cannot be updated`
				);

				// Only show warning box for text output (CLI)
				if (outputFormat === 'text') {
					console.log(
						boxen(
							chalk.yellow(
								`Task ${taskId} is already marked as ${taskToUpdate.status} and cannot be updated.`
							) +
							'\n\n' +
							chalk.white(
								'Completed tasks are locked to maintain consistency. To modify a completed task, you must first:'
							) +
							'\n' +
							chalk.white(
								'1. Change its status to "pending" or "in-progress"'
							) +
							'\n' +
							chalk.white('2. Then run the update-task command'),
						{ padding: 1, borderColor: 'yellow', borderStyle: 'round' }
						)
					);
				}
				return null;
			}
			// --- End Task Loading ---

			// --- Display Task Info (CLI Only - Keep existing) ---
			if (outputFormat === 'text') {
				// Show the task that will be updated
				const table = new Table({
					head: [
						chalk.cyan.bold('ID'),
						chalk.cyan.bold('Title'),
						chalk.cyan.bold('Status')
					],
					colWidths: [5, 60, 10]
				});

				table.push([
					taskToUpdate.id,
					truncate(taskToUpdate.title, 57),
					getStatusWithColor(taskToUpdate.status)
				]);

				console.log(
					boxen(chalk.white.bold(`Updating Task #${taskId}`), {
						padding: 1,
						borderColor: 'blue',
						borderStyle: 'round',
						margin: { top: 1, bottom: 0 }
					})
				);

				console.log(table.toString());

				// Display a message about how completed subtasks are handled
				console.log(
					boxen(
						chalk.cyan.bold('How Completed Subtasks Are Handled:') +
						'\n\n' +
						chalk.white(
							'• Subtasks marked as "done" or "completed" will be preserved\n'
						) +
						chalk.white(
							'• New subtasks will build upon what has already been completed\n'
						) +
						chalk.white(
							'• If completed work needs revision, a new subtask will be created instead of modifying done items\n'
						) +
						chalk.white(
							'• This approach maintains a clear record of completed work and new requirements'
						),
						{
							padding: 1,
							borderColor: 'blue',
							borderStyle: 'round',
							margin: { top: 1, bottom: 1 }
						}
					)
				);
			}

			// --- Build Prompts (Keep EXACT original prompts) ---
			const systemPrompt = `You are an AI assistant helping to update a software development task based on new context.
You will be given a task and a prompt describing changes or new implementation details.
Your job is to update the task to reflect these changes, while preserving its basic structure.

Guidelines:
1. VERY IMPORTANT: NEVER change the title of the task - keep it exactly as is
2. Maintain the same ID, status, and dependencies unless specifically mentioned in the prompt
3. Update the description, details, and test strategy to reflect the new information
4. Do not change anything unnecessarily - just adapt what needs to change based on the prompt
5. Return a complete valid JSON object representing the updated task
6. VERY IMPORTANT: Preserve all subtasks marked as "done" or "completed" - do not modify their content
7. For tasks with completed subtasks, build upon what has already been done rather than rewriting everything
8. If an existing completed subtask needs to be changed/undone based on the new context, DO NOT modify it directly
9. Instead, add a new subtask that clearly indicates what needs to be changed or replaced
10. Use the existence of completed subtasks as an opportunity to make new subtasks more specific and targeted
11. Ensure any new subtasks have unique IDs that don't conflict with existing ones

The changes described in the prompt should be thoughtfully applied to make the task more accurate and actionable.`;

			const taskDataString = JSON.stringify(taskToUpdate, null, 2); // Use original task data
			const userPrompt = `Here is the task to update:\n${taskDataString}\n\nPlease update this task based on the following new context:\n${prompt}\n\nIMPORTANT: In the task JSON above, any subtasks with "status": "done" or "status": "completed" should be preserved exactly as is. Build your changes around these completed items.\n\nReturn only the updated task as a valid JSON object.`;
			// --- End Build Prompts ---

			let loadingIndicator = null;
			let aiServiceResponse = null;

			if (!isMCP && outputFormat === 'text') {
				loadingIndicator = startLoadingIndicator(
					useResearch ? 'Updating task with research...\n' : 'Updating task...\n'
				);
			}

			try {
				const serviceRole = useResearch ? 'research' : 'main';
				aiServiceResponse = await generateTextService({
					role: serviceRole,
					session: session,
					projectRoot: projectRoot,
					systemPrompt: systemPrompt,
					prompt: userPrompt,
					commandName: 'update-task',
					outputType: isMCP ? 'mcp' : 'cli'
				});

				if (!aiServiceResponse || !aiServiceResponse.mainResult) {
					throw new Error('AI service did not return a valid result.');
				}

				let updatedTaskObj = null;
				try {
					updatedTaskObj = parseJson(aiServiceResponse.mainResult);
				} catch (parseErr) {
					throw new Error('Failed to parse AI response as valid JSON.');
				}

				// Overwrite the task in the data
				data.tasks[taskIndex] = updatedTaskObj;
				writeJSON(tasksPath, data);
				updatedTask = updatedTaskObj;

				if (!isMCP && outputFormat === 'text' && loadingIndicator) {
					stopLoadingIndicator(loadingIndicator);
				}

				if (outputFormat === 'text') {
					console.log(
						boxen(
							chalk.green(`Successfully updated task #${taskId}`) +
							'\n\n' +
							chalk.white.bold('Title:') +
							' ' +
							updatedTaskObj.title,
							{ padding: 1, borderColor: 'green', borderStyle: 'round' }
						)
					);
				}

				if (outputFormat === 'text' && aiServiceResponse.telemetryData) {
					displayAiUsageSummary(aiServiceResponse.telemetryData, 'cli');
				}

				return {
					updatedTask: updatedTaskObj,
					telemetryData: aiServiceResponse.telemetryData
				};
			} catch (aiError) {
				if (!isMCP && outputFormat === 'text' && loadingIndicator) {
					stopLoadingIndicator(loadingIndicator);
				}
				report('error', `AI service call failed: ${aiError.message}`);
				if (outputFormat === 'text') {
					console.error(chalk.red(`Error: ${aiError.message}`));
				}
				throw aiError;
			}
		} catch (error) {
			report('error', `Error updating task: ${error.message}`);
			if (outputFormat === 'text') {
				console.error(chalk.red(`Error: ${error.message}`));
			}
			throw error;
		}
	}

	// If only normal attributes were updated, return the updated task
	if (!prompt && normalAttributes && Object.keys(normalAttributes).length > 0) {
		// Reload and return the updated task
		const data = readJSON(tasksPath);
		const task = data.tasks.find((t) => t.id === taskId);
		return { updatedTask: task };
	}

	return updatedTask;
}

export default updateTaskById;
export { updateTaskNormalAttributeById, updateTaskNormalAttributesById, updateTaskMetadataFieldValueById, deleteTaskMetadataFieldById, addTaskMetadataFieldById };