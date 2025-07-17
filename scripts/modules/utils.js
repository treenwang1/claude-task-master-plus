/**
 * utils.js
 * Utility functions for the Task Master CLI
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
// Import specific config getters needed here
import { getLogLevel, getDebugFlag } from './config-manager.js';
import {
	COMPLEXITY_REPORT_FILE,
	LEGACY_COMPLEXITY_REPORT_FILE,
	LEGACY_CONFIG_FILE,
	getTaskGroupComplexityReportFile,
	getWorkingTaskGroup
} from '../../src/constants/paths.js';

// Global silent mode flag
let silentMode = false;

// --- Project Root Finding Utility ---
/**
 * Recursively searches upwards for project root starting from a given directory.
 * @param {string} [startDir=process.cwd()] - The directory to start searching from.
 * @param {string[]} [markers=['package.json', '.git', LEGACY_CONFIG_FILE]] - Marker files/dirs to look for.
 * @returns {string|null} The path to the project root, or null if not found.
 */
function findProjectRoot(
	startDir = process.cwd(),
	markers = ['package.json', '.git', '.taskmaster', LEGACY_CONFIG_FILE]
) {
	let currentPath = path.resolve(startDir);
	const rootPath = path.parse(currentPath).root;

	while (currentPath !== rootPath) {
		// Check if any marker exists in the current directory
		const hasMarker = markers.some((marker) => {
			const markerPath = path.join(currentPath, marker);
			return fs.existsSync(markerPath);
		});

		if (hasMarker) {
			return currentPath;
		}

		// Move up one directory
		currentPath = path.dirname(currentPath);
	}

	// Check the root directory as well
	const hasMarkerInRoot = markers.some((marker) => {
		const markerPath = path.join(rootPath, marker);
		return fs.existsSync(markerPath);
	});

	return hasMarkerInRoot ? rootPath : null;
}

// --- Dynamic Configuration Function --- (REMOVED)

// --- Logging and Utility Functions ---

// Set up logging based on log level
const LOG_LEVELS = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
	success: 1 // Treat success like info level
};

/**
 * Returns the task manager module
 * @returns {Promise<Object>} The task manager module object
 */
async function getTaskManager() {
	return import('./task-manager.js');
}

/**
 * Enable silent logging mode
 */
function enableSilentMode() {
	silentMode = true;
}

/**
 * Disable silent logging mode
 */
function disableSilentMode() {
	silentMode = false;
}

/**
 * Check if silent mode is enabled
 * @returns {boolean} True if silent mode is enabled
 */
function isSilentMode() {
	return silentMode;
}

/**
 * Logs a message at the specified level
 * @param {string} level - The log level (debug, info, warn, error)
 * @param  {...any} args - Arguments to log
 */
function log(level, ...args) {
	// Immediately return if silentMode is enabled
	if (isSilentMode()) {
		return;
	}

	// GUARD: Prevent circular dependency during config loading
	// Use a simple fallback log level instead of calling getLogLevel()
	let configLevel = 'info'; // Default fallback
	try {
		// Only try to get config level if we're not in the middle of config loading
		configLevel = getLogLevel() || 'info';
	} catch (error) {
		// If getLogLevel() fails (likely due to circular dependency),
		// use default 'info' level and continue
		configLevel = 'info';
	}

	// Use text prefixes instead of emojis
	const prefixes = {
		debug: chalk.gray('[DEBUG]'),
		info: chalk.blue('[INFO]'),
		warn: chalk.yellow('[WARN]'),
		error: chalk.red('[ERROR]'),
		success: chalk.green('[SUCCESS]')
	};

	// Ensure level exists, default to info if not
	const currentLevel = LOG_LEVELS.hasOwnProperty(level) ? level : 'info';

	// Check log level configuration
	if (
		LOG_LEVELS[currentLevel] >= (LOG_LEVELS[configLevel] ?? LOG_LEVELS.info)
	) {
		const prefix = prefixes[currentLevel] || '';
		// Use console.log for all levels, let chalk handle coloring
		// Construct the message properly
		const message = args
			.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
			.join(' ');
		console.log(`${prefix} ${message}`);
	}
}

/**
 * Parses a JSON string, if the string is markdown json, it will remove the markdown code block and parse the json
 * @param {string} text - The JSON string to parse
 * @returns {Object|null} The parsed JSON object or null if parsing fails
 */
function parseJson(text) {
	try {
		text = text.trim();
		// If the string is markdown json, it will remove the markdown code block and parse the json
		if (text.startsWith('```json') && text.endsWith('```')) {
			text = text.substring(7, text.length - 3);
		}
		return JSON.parse(text);
	} catch (error) {
		log('error', `Error parsing JSON: ${error.message}`);
		throw error;
	}
}

/**
 * Reads and parses a JSON file
 * @param {string} filepath - Path to the JSON file
 * @returns {Object|null} Parsed JSON data or null if error occurs
 */
function readJSON(filepath) {
	// GUARD: Prevent circular dependency during config loading
	let isDebug = false; // Default fallback
	try {
		// Only try to get debug flag if we're not in the middle of config loading
		isDebug = getDebugFlag();
	} catch (error) {
		// If getDebugFlag() fails (likely due to circular dependency),
		// use default false and continue
		isDebug = false;
	}

	try {
		const rawData = fs.readFileSync(filepath, 'utf8');
		return JSON.parse(rawData);
	} catch (error) {
		log('error', `Error reading JSON file ${filepath}:`, error.message);
		if (isDebug) {
			// Use dynamic debug flag
			// Use log utility for debug output too
			log('error', 'Full error details:', error);
		}
		return null;
	}
}

/**
 * Writes data to a JSON file
 * @param {string} filepath - Path to the JSON file
 * @param {Object} data - Data to write
 */
function writeJSON(filepath, data) {
	// GUARD: Prevent circular dependency during config loading
	let isDebug = false; // Default fallback
	try {
		// Only try to get debug flag if we're not in the middle of config loading
		isDebug = getDebugFlag();
	} catch (error) {
		// If getDebugFlag() fails (likely due to circular dependency),
		// use default false and continue
		isDebug = false;
	}

	try {
		const dir = path.dirname(filepath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
	} catch (error) {
		log('error', `Error writing JSON file ${filepath}:`, error.message);
		if (isDebug) {
			// Use dynamic debug flag
			// Use log utility for debug output too
			log('error', 'Full error details:', error);
		}
	}
}

/**
 * Sanitizes a prompt string for use in a shell command
 * @param {string} prompt The prompt to sanitize
 * @returns {string} Sanitized prompt
 */
function sanitizePrompt(prompt) {
	// Replace double quotes with escaped double quotes
	return prompt.replace(/"/g, '\\"');
}





/**
 * Checks if a task exists in the tasks array
 * @param {Array} tasks - The tasks array
 * @param {string|number} taskId - The task ID to check
 * @returns {boolean} True if the task exists, false otherwise
 */
function taskExists(tasks, taskId) {
	if (!taskId || !tasks || !Array.isArray(tasks)) {
		return false;
	}

	// Handle both regular task IDs and subtask IDs (e.g., "1.2")
	if (typeof taskId === 'string' && taskId.includes('.')) {
		const [parentId, subtaskId] = taskId
			.split('.')
			.map((id) => parseInt(id, 10));
		const parentTask = tasks.find((t) => t.id === parentId);

		if (!parentTask || !parentTask.subtasks) {
			return false;
		}

		return parentTask.subtasks.some((st) => st.id === subtaskId);
	}

	const id = parseInt(taskId, 10);
	return tasks.some((t) => t.id === id);
}

/**
 * Formats a task ID as a string
 * @param {string|number} id - The task ID to format
 * @returns {string} The formatted task ID
 */
function formatTaskId(id) {
	if (typeof id === 'string' && id.includes('.')) {
		return id; // Already formatted as a string with a dot (e.g., "1.2")
	}

	if (typeof id === 'number') {
		return id.toString();
	}

	return id;
}

/**
 * Finds a task by ID in the tasks array. Optionally filters subtasks by status.
 * @param {Array} tasks - The tasks array
 * @param {string|number} taskId - The task ID to find
 * @param {Object|null} complexityReport - Optional pre-loaded complexity report
 * @returns {Object|null} The task object or null if not found
 * @param {string} [statusFilter] - Optional status to filter subtasks by
 * @returns {{task: Object|null, originalSubtaskCount: number|null}} The task object (potentially with filtered subtasks) and the original subtask count if filtered, or nulls if not found.
 */
function findTaskById(
	tasks,
	taskId,
	complexityReport = null,
	statusFilter = null
) {
	if (!taskId || !tasks || !Array.isArray(tasks)) {
		return { task: null, originalSubtaskCount: null };
	}

	// Check if it's a subtask ID (e.g., "1.2")
	if (typeof taskId === 'string' && taskId.includes('.')) {
		// If looking for a subtask, statusFilter doesn't apply directly here.
		const [parentId, subtaskId] = taskId
			.split('.')
			.map((id) => parseInt(id, 10));
		const parentTask = tasks.find((t) => t.id === parentId);

		if (!parentTask || !parentTask.subtasks) {
			return { task: null, originalSubtaskCount: null };
		}

		const subtask = parentTask.subtasks.find((st) => st.id === subtaskId);
		if (subtask) {
			// Add reference to parent task for context
			subtask.parentTask = {
				id: parentTask.id,
				title: parentTask.title,
				status: parentTask.status,
				assignees: parentTask.assignees
			};
			subtask.isSubtask = true;
		}

		// Complexity analysis removed

		return { task: subtask || null, originalSubtaskCount: null };
	}

	let taskResult = null;
	const originalSubtaskCount = null;

	// Find the main task
	const id = parseInt(taskId, 10);
	const task = tasks.find((t) => t.id === id) || null;

	// If task not found, return nulls
	if (!task) {
		return { task: null, originalSubtaskCount: null };
	}

	taskResult = task;

	// If task found and statusFilter provided, filter its subtasks
	if (statusFilter && task.subtasks && Array.isArray(task.subtasks)) {
		// Clone the task to avoid modifying the original array
		const filteredTask = { ...task };
		filteredTask.subtasks = task.subtasks.filter(
			(subtask) =>
				subtask.status &&
				subtask.status.toLowerCase() === statusFilter.toLowerCase()
		);

		taskResult = filteredTask;
	}

	// Complexity analysis removed

	// Return the found task and original subtask count
	return { task: taskResult, originalSubtaskCount };
}

/**
 * Truncates text to a specified length
 * @param {string} text - The text to truncate
 * @param {number} maxLength - The maximum length
 * @returns {string} The truncated text
 */
function truncate(text, maxLength) {
	if (!text || text.length <= maxLength) {
		return text;
	}

	return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Find cycles in a dependency graph using DFS
 * @param {string} subtaskId - Current subtask ID
 * @param {Map} dependencyMap - Map of subtask IDs to their dependencies
 * @param {Set} visited - Set of visited nodes
 * @param {Set} recursionStack - Set of nodes in current recursion stack
 * @returns {Array} - List of dependency edges that need to be removed to break cycles
 */
function findCycles(
	subtaskId,
	dependencyMap,
	visited = new Set(),
	recursionStack = new Set(),
	path = []
) {
	// Mark the current node as visited and part of recursion stack
	visited.add(subtaskId);
	recursionStack.add(subtaskId);
	path.push(subtaskId);

	const cyclesToBreak = [];

	// Get all dependencies of the current subtask
	const dependencies = dependencyMap.get(subtaskId) || [];

	// For each dependency
	for (const depId of dependencies) {
		// If not visited, recursively check for cycles
		if (!visited.has(depId)) {
			const cycles = findCycles(depId, dependencyMap, visited, recursionStack, [
				...path
			]);
			cyclesToBreak.push(...cycles);
		}
		// If the dependency is in the recursion stack, we found a cycle
		else if (recursionStack.has(depId)) {
			// Find the position of the dependency in the path
			const cycleStartIndex = path.indexOf(depId);
			// The last edge in the cycle is what we want to remove
			const cycleEdges = path.slice(cycleStartIndex);
			// We'll remove the last edge in the cycle (the one that points back)
			cyclesToBreak.push(depId);
		}
	}

	// Remove the node from recursion stack before returning
	recursionStack.delete(subtaskId);

	return cyclesToBreak;
}

/**
 * Convert a string from camelCase to kebab-case
 * @param {string} str - The string to convert
 * @returns {string} The kebab-case version of the string
 */
const toKebabCase = (str) => {
	// Special handling for common acronyms
	const withReplacedAcronyms = str
		.replace(/ID/g, 'Id')
		.replace(/API/g, 'Api')
		.replace(/UI/g, 'Ui')
		.replace(/URL/g, 'Url')
		.replace(/URI/g, 'Uri')
		.replace(/JSON/g, 'Json')
		.replace(/XML/g, 'Xml')
		.replace(/HTML/g, 'Html')
		.replace(/CSS/g, 'Css');

	// Insert hyphens before capital letters and convert to lowercase
	return withReplacedAcronyms
		.replace(/([A-Z])/g, '-$1')
		.toLowerCase()
		.replace(/^-/, ''); // Remove leading hyphen if present
};

/**
 * Detect camelCase flags in command arguments
 * @param {string[]} args - Command line arguments to check
 * @returns {Array<{original: string, kebabCase: string}>} - List of flags that should be converted
 */
function detectCamelCaseFlags(args) {
	const camelCaseFlags = [];
	for (const arg of args) {
		if (arg.startsWith('--')) {
			const flagName = arg.split('=')[0].slice(2); // Remove -- and anything after =

			// Skip single-word flags - they can't be camelCase
			if (!flagName.includes('-') && !/[A-Z]/.test(flagName)) {
				continue;
			}

			// Check for camelCase pattern (lowercase followed by uppercase)
			if (/[a-z][A-Z]/.test(flagName)) {
				const kebabVersion = toKebabCase(flagName);
				if (kebabVersion !== flagName) {
					camelCaseFlags.push({
						original: flagName,
						kebabCase: kebabVersion
					});
				}
			}
		}
	}
	return camelCaseFlags;
}

/**
 * Aggregates an array of telemetry objects into a single summary object.
 * @param {Array<Object>} telemetryArray - Array of telemetryData objects.
 * @param {string} overallCommandName - The name for the aggregated command.
 * @returns {Object|null} Aggregated telemetry object or null if input is empty.
 */
function aggregateTelemetry(telemetryArray, overallCommandName) {
	if (!telemetryArray || telemetryArray.length === 0) {
		return null;
	}

	const aggregated = {
		timestamp: new Date().toISOString(), // Use current time for aggregation time
		userId: telemetryArray[0].userId, // Assume userId is consistent
		commandName: overallCommandName,
		modelUsed: 'Multiple', // Default if models vary
		providerName: 'Multiple', // Default if providers vary
		inputTokens: 0,
		outputTokens: 0,
		totalTokens: 0,
		totalCost: 0,
		currency: telemetryArray[0].currency || 'USD' // Assume consistent currency or default
	};

	const uniqueModels = new Set();
	const uniqueProviders = new Set();
	const uniqueCurrencies = new Set();

	telemetryArray.forEach((item) => {
		aggregated.inputTokens += item.inputTokens || 0;
		aggregated.outputTokens += item.outputTokens || 0;
		aggregated.totalCost += item.totalCost || 0;
		uniqueModels.add(item.modelUsed);
		uniqueProviders.add(item.providerName);
		uniqueCurrencies.add(item.currency || 'USD');
	});

	aggregated.totalTokens = aggregated.inputTokens + aggregated.outputTokens;
	aggregated.totalCost = parseFloat(aggregated.totalCost.toFixed(6)); // Fix precision

	if (uniqueModels.size === 1) {
		aggregated.modelUsed = [...uniqueModels][0];
	}
	if (uniqueProviders.size === 1) {
		aggregated.providerName = [...uniqueProviders][0];
	}
	if (uniqueCurrencies.size > 1) {
		aggregated.currency = 'Multiple'; // Mark if currencies actually differ
	} else if (uniqueCurrencies.size === 1) {
		aggregated.currency = [...uniqueCurrencies][0];
	}

	return aggregated;
}

/**
 * Updates task IDs and all references when inserting a task at a specific position
 * @param {Array} tasks - Array of all tasks
 * @param {number} insertPosition - The position where the new task will be inserted
 * @returns {Array} Updated tasks array with shifted IDs
 */
function shiftTaskIds(tasks, insertPosition) {
	// First pass: update task IDs and subtask IDs
	const updatedTasks = tasks.map(task => {
		const updatedTask = { ...task };
		
		// Shift main task ID if it's at or after the insert position
		if (task.id >= insertPosition) {
			updatedTask.id = task.id + 1;
		}
		
		// Shift subtask IDs if they exist
		if (task.subtasks && task.subtasks.length > 0) {
			updatedTask.subtasks = task.subtasks.map(subtask => ({
				...subtask,
				// Subtask IDs don't change, only parent task ID affects them
			}));
		}
		
		return updatedTask;
	});
	
	// Second pass: update dependency references
	const finalTasks = updatedTasks.map(task => {
		const updatedTask = { ...task };
		
		// Update dependencies to point to new task IDs
		if (task.dependencies && task.dependencies.length > 0) {
			updatedTask.dependencies = task.dependencies.map(depId => {
				// If the dependency task ID was shifted, update the reference
				return depId >= insertPosition ? depId + 1 : depId;
			});
		}
		
		// Update subtask dependencies
		if (task.subtasks && task.subtasks.length > 0) {
			updatedTask.subtasks = task.subtasks.map(subtask => {
				const updatedSubtask = { ...subtask };
				
				// Update subtask dependencies to point to new task IDs
				if (subtask.dependencies && subtask.dependencies.length > 0) {
					updatedSubtask.dependencies = subtask.dependencies.map(depId => {
						// Check if it's a task dependency (whole number) or subtask dependency (decimal)
						if (Number.isInteger(depId)) {
							// Task dependency - shift if needed
							return depId >= insertPosition ? depId + 1 : depId;
						} else {
							// Subtask dependency (e.g., 1.2) - check parent task ID
							const [parentId, subtaskIndex] = depId.toString().split('.').map(Number);
							if (parentId >= insertPosition) {
								return parseFloat(`${parentId + 1}.${subtaskIndex}`);
							}
							return depId;
						}
					});
				}
				
				return updatedSubtask;
			});
		}
		
		return updatedTask;
	});
	
	return finalTasks;
}

/**
 * Regenerates sequential task IDs from 1 to N and updates all dependency references
 * Also makes subtask IDs sequential integers (1, 2, 3, etc.) within each parent task
 * @param {Array} tasks - Array of all tasks
 * @param {boolean} sortTasksById - Whether to sort tasks and subtasks by ID before regenerating (default: true)
 * @returns {Array} Updated tasks array with sequential IDs starting from 1
 */
function regenerateSequentialTaskIds(tasks, sortTasksById = true) {
	if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
		return tasks;
	}

	// Sort tasks to maintain a consistent order (by current ID) if requested
	const sortedTasks = sortTasksById ? [...tasks].sort((a, b) => a.id - b.id) : [...tasks];
	
	// Create mapping for task IDs: old task ID -> new task ID
	const taskIdMapping = new Map();
	
	// Create mapping for subtask IDs: "oldParentId.oldSubtaskId" -> "newParentId.newSubtaskId"
	const subtaskIdMapping = new Map();
	
	// Build the task ID mapping - assign new sequential IDs starting from 1
	sortedTasks.forEach((task, index) => {
		const newTaskId = index + 1;
		taskIdMapping.set(task.id, newTaskId);
		
		// If task has subtasks, create sequential subtask IDs
		if (task.subtasks && task.subtasks.length > 0) {
			// Sort subtasks by their current ID to maintain order (if requested)
			const sortedSubtasks = sortTasksById ? 
				[...task.subtasks].sort((a, b) => a.id - b.id) : 
				[...task.subtasks];
			
			sortedSubtasks.forEach((subtask, subtaskIndex) => {
				const newSubtaskId = subtaskIndex + 1;
				const oldSubtaskKey = `${task.id}.${subtask.id}`;
				const newSubtaskKey = `${newTaskId}.${newSubtaskId}`;
				subtaskIdMapping.set(oldSubtaskKey, newSubtaskKey);
			});
		}
	});
	
	// First pass: update task IDs and subtask IDs
	const updatedTasks = sortedTasks.map((task, index) => {
		const newTaskId = index + 1;
		const updatedTask = {
			...task,
			id: newTaskId
		};
		
		// Update subtasks if they exist
		if (task.subtasks && task.subtasks.length > 0) {
			// Sort subtasks by their current ID to maintain order (if requested)
			const sortedSubtasks = sortTasksById ? 
				[...task.subtasks].sort((a, b) => a.id - b.id) : 
				[...task.subtasks];
			
			updatedTask.subtasks = sortedSubtasks.map((subtask, subtaskIndex) => ({
				...subtask,
				id: subtaskIndex + 1  // Sequential subtask IDs: 1, 2, 3, etc.
			}));
		}
		
		return updatedTask;
	});
	
	// Second pass: update all dependency references
	const finalTasks = updatedTasks.map(task => {
		const updatedTask = { ...task };
		
		// Update main task dependencies
		if (task.dependencies && task.dependencies.length > 0) {
			updatedTask.dependencies = task.dependencies.map(depId => {
				const newDepId = taskIdMapping.get(depId);
				if (newDepId === undefined) {
					// This dependency doesn't exist in the current task list
					log('warn', `Dependency reference to non-existent task ${depId} found and removed`);
					return null;
				}
				return newDepId;
			}).filter(depId => depId !== null);
		}
		
		// Update subtask dependencies
		if (task.subtasks && task.subtasks.length > 0) {
			updatedTask.subtasks = task.subtasks.map((subtask, subtaskIndex) => {
				const updatedSubtask = { ...subtask };
				
				if (subtask.dependencies && subtask.dependencies.length > 0) {
					updatedSubtask.dependencies = subtask.dependencies.map(depId => {
						// Check if it's a task dependency (whole number) or subtask dependency (decimal)
						if (Number.isInteger(depId)) {
							// Task dependency - map to new task ID
							const newDepId = taskIdMapping.get(depId);
							if (newDepId === undefined) {
								// This dependency doesn't exist
								log('warn', `Subtask dependency reference to non-existent task ${depId} found and removed`);
								return null;
							}
							return newDepId;
						} else {
							// Subtask dependency (e.g., 1.2) - need to map both parent and subtask IDs
							const depString = depId.toString();
							const [oldParentId, oldSubtaskId] = depString.split('.').map(Number);
							
							// Find the original subtask mapping key
							const oldSubtaskKey = `${oldParentId}.${oldSubtaskId}`;
							const newSubtaskKey = subtaskIdMapping.get(oldSubtaskKey);
							
							if (newSubtaskKey === undefined) {
								// This subtask dependency doesn't exist
								log('warn', `Subtask dependency reference to non-existent subtask ${depString} found and removed`);
								return null;
							}
							
							// Parse the new subtask key and return as float
							const [newParentId, newSubtaskId] = newSubtaskKey.split('.').map(Number);
							return parseFloat(`${newParentId}.${newSubtaskId}`);
						}
					}).filter(depId => depId !== null);
				}
				
				return updatedSubtask;
			});
		}
		
		return updatedTask;
	});
	
	return finalTasks;
}

/**
 * Rewrites sequential task IDs in a task file
 * @param {string} task_file_path - Path to the task file
 * @param {boolean} sortTasksById - Whether to sort tasks and subtasks by ID before regenerating (default: true)
 */
function rewriteSequentialTaskIds(task_file_path, sortTasksById = true) {
	const taskObject = readJSON(task_file_path);
	const updatedTasks = regenerateSequentialTaskIds(taskObject?.tasks, sortTasksById);
	writeJSON(task_file_path, { ...taskObject, tasks: updatedTasks });
	return updatedTasks;
}

/**
 * Updates task IDs and all references when a task is removed, compacting the ID sequence
 * @param {Array} tasks - Array of all tasks
 * @param {Array} removedTaskIds - Array of task IDs that were removed (numbers only, not subtask IDs)
 * @returns {Array} Updated tasks array with compacted IDs
 */
function compactTaskIds(tasks, removedTaskIds) {
	// Sort removed IDs in ascending order to process them correctly
	const sortedRemovedIds = [...removedTaskIds].sort((a, b) => a - b);
	
	// Create a mapping of old ID to new ID
	const idMapping = new Map();
	let currentNewId = 1;
	
	// Build the ID mapping by walking through all possible IDs
	for (let oldId = 1; oldId <= Math.max(...tasks.map(t => t.id), ...sortedRemovedIds); oldId++) {
		if (!sortedRemovedIds.includes(oldId)) {
			// This ID wasn't removed, so it gets mapped to the next available position
			idMapping.set(oldId, currentNewId);
			currentNewId++;
		}
		// Removed IDs don't get a mapping (they're gone)
	}
	
	// First pass: update task IDs
	const updatedTasks = tasks.map(task => {
		const newId = idMapping.get(task.id);
		if (newId === undefined) {
			// This shouldn't happen if we're calling this function correctly
			throw new Error(`Task ID ${task.id} was supposed to be removed but is still in tasks array`);
		}
		
		return {
			...task,
			id: newId
		};
	});
	
	// Second pass: update all dependency references
	const finalTasks = updatedTasks.map(task => {
		const updatedTask = { ...task };
		
		// Update main task dependencies
		if (task.dependencies && task.dependencies.length > 0) {
			updatedTask.dependencies = task.dependencies.map(depId => {
				const newDepId = idMapping.get(depId);
				if (newDepId === undefined) {
					// This dependency was removed, so we filter it out
					// Note: The caller should have already cleaned up references to removed tasks
					// This is a safety check
					log('warn', `Dependency reference to removed task ${depId} found and removed`);
					return null;
				}
				return newDepId;
			}).filter(depId => depId !== null);
		}
		
		// Update subtask dependencies
		if (task.subtasks && task.subtasks.length > 0) {
			updatedTask.subtasks = task.subtasks.map(subtask => {
				const updatedSubtask = { ...subtask };
				
				if (subtask.dependencies && subtask.dependencies.length > 0) {
					updatedSubtask.dependencies = subtask.dependencies.map(depId => {
						// Check if it's a task dependency (whole number) or subtask dependency (decimal)
						if (Number.isInteger(depId)) {
							// Task dependency - map to new ID
							const newDepId = idMapping.get(depId);
							if (newDepId === undefined) {
								// This dependency was removed
								log('warn', `Subtask dependency reference to removed task ${depId} found and removed`);
								return null;
							}
							return newDepId;
						} else {
							// Subtask dependency (e.g., 1.2) - check parent task ID
							const [parentId, subtaskIndex] = depId.toString().split('.').map(Number);
							const newParentId = idMapping.get(parentId);
							if (newParentId === undefined) {
								// Parent task was removed
								log('warn', `Subtask dependency reference to removed task ${parentId}.${subtaskIndex} found and removed`);
								return null;
							}
							return parseFloat(`${newParentId}.${subtaskIndex}`);
						}
					}).filter(depId => depId !== null);
				}
				
				return updatedSubtask;
			});
		}
		
		return updatedTask;
	});
	
	return finalTasks;
}

// Export all utility functions and configuration
export {
	LOG_LEVELS,
	log,
	parseJson,
	readJSON,
	writeJSON,
	sanitizePrompt,


	taskExists,
	formatTaskId,
	findTaskById,
	truncate,
	findCycles,
	toKebabCase,
	detectCamelCaseFlags,
	disableSilentMode,
	enableSilentMode,
	getTaskManager,
	isSilentMode,

	findProjectRoot,
	aggregateTelemetry,
	shiftTaskIds,
	compactTaskIds,
	regenerateSequentialTaskIds,
	rewriteSequentialTaskIds
};
