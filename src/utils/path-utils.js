/**
 * Path utility functions for Task Master
 * Provides centralized path resolution logic for both CLI and MCP use cases
 */

import path from 'path';
import fs from 'fs';
import {
	TASKMASTER_TASKS_FILE,
	LEGACY_TASKS_FILE,
	COMPLEXITY_REPORT_FILE,
	TASKMASTER_CONFIG_FILE,
	LEGACY_CONFIG_FILE,
	DEFAULT_TASK_GROUP,
	getTaskGroupTasksFile,
	getTaskGroupDocsDir,
	getTaskGroupReportsDir,
	getTaskGroupComplexityReportFile,
	getTaskGroupPrdFile,
	getWorkingTaskGroup
} from '../constants/paths.js';
import { getLoggerOrDefault } from './logger-utils.js';
import dotenv from 'dotenv';
import chalk from 'chalk';

/**
 * Normalize project root to ensure it doesn't end with .taskmaster
 * This prevents double .taskmaster paths when using constants that include .taskmaster
 * @param {string} projectRoot - The project root path to normalize
 * @returns {string} - Normalized project root path
 */
export function normalizeProjectRoot(projectRoot) {
	if (!projectRoot) return projectRoot;

	// Split the path into segments
	const segments = projectRoot.split(path.sep);

	// Find the index of .taskmaster segment
	const taskmasterIndex = segments.findIndex(
		(segment) => segment === '.taskmaster'
	);

	if (taskmasterIndex !== -1) {
		// If .taskmaster is found, return everything up to but not including .taskmaster
		const normalizedSegments = segments.slice(0, taskmasterIndex);
		return normalizedSegments.join(path.sep) || path.sep;
	}

	return projectRoot;
}

/**
 * Find the project root directory by looking for project markers
 * @param {string} startDir - Directory to start searching from
 * @returns {string|null} - Project root path or null if not found
 */
export function findProjectRoot(startDir = process.cwd()) {
	const projectMarkers = [
		'.taskmaster',
		TASKMASTER_TASKS_FILE,
		'tasks.json',
		LEGACY_TASKS_FILE,
		'.git',
		'.svn',
		'package.json',
		'yarn.lock',
		'package-lock.json',
		'pnpm-lock.yaml'
	];

	let currentDir = path.resolve(startDir);
	const rootDir = path.parse(currentDir).root;

	while (currentDir !== rootDir) {
		// Check if current directory contains any project markers
		for (const marker of projectMarkers) {
			const markerPath = path.join(currentDir, marker);
			if (fs.existsSync(markerPath)) {
				return currentDir;
			}
		}
		currentDir = path.dirname(currentDir);
	}

	return null;
}

/**
 * Find the tasks.json file path with fallback logic and task group support
 * @param {string|null} explicitPath - Explicit path provided by user (highest priority)
 * @param {Object|null} args - Args object from MCP args (optional)
 * @param {Object|null} log - Logger object (optional)
 * @returns {Promise<string|null>} - Resolved tasks.json path or null if not found
 */
export async function findTasksPath(explicitPath = null, args = null, log = null) {
	// Use the passed logger if available, otherwise use the default logger
	const logger = getLoggerOrDefault(log);

	// 1. First determine project root to use as base for all path resolution
	const rawProjectRoot = args?.projectRoot || findProjectRoot();

	if (!rawProjectRoot) {
		logger.warn?.('Could not determine project root directory');
		return null;
	}

	// 2. Normalize project root to prevent double .taskmaster paths
	const projectRoot = normalizeProjectRoot(rawProjectRoot);

	// 3. If explicit path is provided, resolve it relative to project root (highest priority)
	if (explicitPath) {
		const resolvedPath = path.isAbsolute(explicitPath)
			? explicitPath
			: path.resolve(projectRoot, explicitPath);

		if (fs.existsSync(resolvedPath)) {
			logger.info?.(`Using explicit tasks path: ${resolvedPath}`);
			return resolvedPath;
		} else {
			logger.warn?.(
				`Explicit tasks path not found: ${resolvedPath}, trying fallbacks`
			);
		}
	}

	// 4. Get working task group and check task group-specific path first
	const taskGroup = getWorkingTaskGroup(projectRoot);
	const taskGroupTasksFile = path.join(projectRoot, getTaskGroupTasksFile(taskGroup));
	
	// 5. Check possible locations in order of preference
	const possiblePaths = [
		taskGroupTasksFile, // .taskmaster/{taskgroup}/tasks/tasks.json (NEW with task groups)
		path.join(projectRoot, TASKMASTER_TASKS_FILE), // .taskmaster/tasks/tasks.json (LEGACY)
		path.join(projectRoot, LEGACY_TASKS_FILE) // tasks/tasks.json (LEGACY)
	];

	for (const tasksPath of possiblePaths) {
		if (fs.existsSync(tasksPath)) {
			logger.info?.(`Found tasks file at: ${tasksPath}`);

			// Issue deprecation warning for legacy paths
			if (
				tasksPath.includes('tasks/tasks.json') &&
				!tasksPath.includes('.taskmaster')
			) {
				logger.warn?.(
					`⚠️  DEPRECATION WARNING: Found tasks.json in legacy location '${tasksPath}'. Please migrate to the new .taskmaster directory structure. Run 'task-master migrate' to automatically migrate your project.`
				);
			} else if (
				tasksPath.endsWith('tasks.json') &&
				!tasksPath.includes('.taskmaster') &&
				!tasksPath.includes('tasks/')
			) {
				logger.warn?.(
					`⚠️  DEPRECATION WARNING: Found tasks.json in legacy root location '${tasksPath}'. Please migrate to the new .taskmaster directory structure. Run 'task-master migrate' to automatically migrate your project.`
				);
			} else if (
				tasksPath === path.join(projectRoot, TASKMASTER_TASKS_FILE) &&
				taskGroup !== DEFAULT_TASK_GROUP
			) {
				logger.warn?.(
					`⚠️  Using legacy .taskmaster/tasks/tasks.json location. Consider using task group-specific location: ${taskGroupTasksFile}`
				);
			}

			return tasksPath;
		}
	}

	logger.warn?.(`No tasks.json found in project: ${projectRoot}`);
	return null;
}

/**
 * Find the PRD document file path with fallback logic and task group support
 * @param {string|null} explicitPath - Explicit path provided by user (highest priority)
 * @param {Object|null} args - Args object for MCP context (optional)
 * @param {Object|null} log - Logger object (optional)
 * @returns {Promise<string|null>} - Resolved PRD document path or null if not found
 */
export async function findPRDPath(explicitPath = null, args = null, log = null) {
	const logger = getLoggerOrDefault(log);

	// 1. If explicit path is provided, use it (highest priority)
	if (explicitPath) {
		const resolvedPath = path.isAbsolute(explicitPath)
			? explicitPath
			: path.resolve(process.cwd(), explicitPath);

		if (fs.existsSync(resolvedPath)) {
			logger.info?.(`Using explicit PRD path: ${resolvedPath}`);
			return resolvedPath;
		} else {
			logger.warn?.(
				`Explicit PRD path not found: ${resolvedPath}, trying fallbacks`
			);
		}
	}

	// 2. Try to get project root from args (MCP) or find it
	const rawProjectRoot = args?.projectRoot || findProjectRoot();

	if (!rawProjectRoot) {
		logger.warn?.('Could not determine project root directory');
		return null;
	}

	// 3. Normalize project root to prevent double .taskmaster paths
	const projectRoot = normalizeProjectRoot(rawProjectRoot);

	// 4. Get working task group
	const taskGroup = getWorkingTaskGroup(projectRoot);
	
	// 5. Check possible locations in order of preference
	const locations = [
		getTaskGroupDocsDir(taskGroup), // .taskmaster/{taskgroup}/docs/ (NEW with task groups)
		TASKMASTER_DOCS_DIR, // .taskmaster/docs/ (LEGACY)
		'scripts/', // Legacy location
		'' // Project root
	];

	const fileNames = ['PRD.md', 'prd.md', 'PRD.txt', 'prd.txt'];

	for (const location of locations) {
		for (const fileName of fileNames) {
			const prdPath = path.join(projectRoot, location, fileName);
			if (fs.existsSync(prdPath)) {
				logger.info?.(`Found PRD document at: ${prdPath}`);

				// Issue deprecation warning for legacy paths
				if (location === 'scripts/' || location === '') {
					logger.warn?.(
						`⚠️  DEPRECATION WARNING: Found PRD file in legacy location '${prdPath}'. Please migrate to .taskmaster/docs/ directory. Run 'task-master migrate' to automatically migrate your project.`
					);
				}

				return prdPath;
			}
		}
	}

	logger.warn?.(`No PRD document found in project: ${projectRoot}`);
	return null;
}

/**
 * Find the complexity report file path with fallback logic and task group support
 * @param {string|null} explicitPath - Explicit path provided by user (highest priority)
 * @param {Object|null} args - Args object for MCP context (optional)
 * @param {Object|null} log - Logger object (optional)
 * @returns {Promise<string|null>} - Resolved complexity report path or null if not found
 */
export async function findComplexityReportPath(
	explicitPath = null,
	args = null,
	log = null
) {
	const logger = getLoggerOrDefault(log);

	// 1. If explicit path is provided, use it (highest priority)
	if (explicitPath) {
		const resolvedPath = path.isAbsolute(explicitPath)
			? explicitPath
			: path.resolve(process.cwd(), explicitPath);

		if (fs.existsSync(resolvedPath)) {
			logger.info?.(`Using explicit complexity report path: ${resolvedPath}`);
			return resolvedPath;
		} else {
			logger.warn?.(
				`Explicit complexity report path not found: ${resolvedPath}, trying fallbacks`
			);
		}
	}

	// 2. Try to get project root from args (MCP) or find it
	const rawProjectRoot = args?.projectRoot || findProjectRoot();

	if (!rawProjectRoot) {
		logger.warn?.('Could not determine project root directory');
		return null;
	}

	// 3. Normalize project root to prevent double .taskmaster paths
	const projectRoot = normalizeProjectRoot(rawProjectRoot);

	// 4. Get working task group
	const taskGroup = getWorkingTaskGroup(projectRoot);

	// 5. Check possible locations in order of preference
	const locations = [
		getTaskGroupReportsDir(taskGroup), // .taskmaster/{taskgroup}/reports/ (NEW with task groups)
		'', // .taskmaster/reports/ (LEGACY)
		'scripts/', // Legacy location
		'' // Project root
	];

	const fileNames = ['task-complexity-report.json', 'complexity-report.json'];

	for (const location of locations) {
		for (const fileName of fileNames) {
			const reportPath = path.join(projectRoot, location, fileName);
			if (fs.existsSync(reportPath)) {
				logger.info?.(`Found complexity report at: ${reportPath}`);

				// Issue deprecation warning for legacy paths
				if (location === 'scripts/' || location === '') {
					logger.warn?.(
						`⚠️  DEPRECATION WARNING: Found complexity report in legacy location '${reportPath}'. Please migrate to .taskmaster/reports/ directory. Run 'task-master migrate' to automatically migrate your project.`
					);
				}

				return reportPath;
			}
		}
	}

	logger.warn?.(`No complexity report found in project: ${projectRoot}`);
	return null;
}

/**
 * Resolve output path for tasks.json (create if needed) with task group support
 * @param {string|null} explicitPath - Explicit output path provided by user
 * @param {Object|null} args - Args object for MCP context (optional)
 * @param {Object|null} log - Logger object (optional)
 * @returns {Promise<string>} - Resolved output path for tasks.json
 */
export async function resolveTasksOutputPath(
	explicitPath = null,
	args = null,
	log = null
) {
	const logger = getLoggerOrDefault(log);

	// 1. If explicit path is provided, use it
	if (explicitPath) {
		const resolvedPath = path.isAbsolute(explicitPath)
			? explicitPath
			: path.resolve(process.cwd(), explicitPath);

		logger.info?.(`Using explicit output path: ${resolvedPath}`);
		return resolvedPath;
	}

	// 2. Try to get project root from args (MCP) or find it
	const rawProjectRoot =
		args?.projectRoot || findProjectRoot() || process.cwd();

	// 3. Normalize project root to prevent double .taskmaster paths
	const projectRoot = normalizeProjectRoot(rawProjectRoot);

	// 4. Get working task group and use task group-specific path
	const taskGroup = getWorkingTaskGroup(projectRoot);
	const defaultPath = path.join(projectRoot, getTaskGroupTasksFile(taskGroup));
	
	logger.info?.(`Using task group '${taskGroup}' output path: ${defaultPath}`);

	// Ensure the directory exists
	const outputDir = path.dirname(defaultPath);
	if (!fs.existsSync(outputDir)) {
		logger.info?.(`Creating tasks directory: ${outputDir}`);
		fs.mkdirSync(outputDir, { recursive: true });
	}

	return defaultPath;
}

/**
 * Resolve output path for complexity report (create if needed) with task group support
 * @param {string|null} explicitPath - Explicit output path provided by user
 * @param {Object|null} args - Args object for MCP context (optional)
 * @param {Object|null} log - Logger object (optional)
 * @returns {Promise<string>} - Resolved output path for complexity report
 */
export async function resolveComplexityReportOutputPath(
	explicitPath = null,
	args = null,
	log = null
) {
	const logger = getLoggerOrDefault(log);

	// 1. If explicit path is provided, use it
	if (explicitPath) {
		const resolvedPath = path.isAbsolute(explicitPath)
			? explicitPath
			: path.resolve(process.cwd(), explicitPath);

		logger.info?.(
			`Using explicit complexity report output path: ${resolvedPath}`
		);
		return resolvedPath;
	}

	// 2. Try to get project root from args (MCP) or find it
	const rawProjectRoot =
		args?.projectRoot || findProjectRoot() || process.cwd();

	// 3. Normalize project root to prevent double .taskmaster paths
	const projectRoot = normalizeProjectRoot(rawProjectRoot);

	// 4. Get working task group and use task group-specific path
	const taskGroup = getWorkingTaskGroup(projectRoot);
	const defaultPath = path.join(projectRoot, getTaskGroupComplexityReportFile(taskGroup));
	
	logger.info?.(`Using task group '${taskGroup}' complexity report output path: ${defaultPath}`);

	// Ensure the directory exists
	const outputDir = path.dirname(defaultPath);
	if (!fs.existsSync(outputDir)) {
		logger.info?.(`Creating reports directory: ${outputDir}`);
		fs.mkdirSync(outputDir, { recursive: true });
	}

	return defaultPath;
}

/**
 * Find the configuration file path with fallback logic
 * @param {string|null} explicitPath - Explicit path provided by user (highest priority)
 * @param {Object|null} args - Args object for MCP context (optional)
 * @param {Object|null} log - Logger object (optional)
 * @returns {string|null} - Resolved config file path or null if not found
 */
export function findConfigPath(explicitPath = null, args = null, log = null) {
	const logger = getLoggerOrDefault(log);

	// 1. If explicit path is provided, use it (highest priority)
	if (explicitPath) {
		const resolvedPath = path.isAbsolute(explicitPath)
			? explicitPath
			: path.resolve(process.cwd(), explicitPath);

		if (fs.existsSync(resolvedPath)) {
			logger.info?.(`Using explicit config path: ${resolvedPath}`);
			return resolvedPath;
		} else {
			logger.warn?.(
				`Explicit config path not found: ${resolvedPath}, trying fallbacks`
			);
		}
	}

	// 2. Try to get project root from args (MCP) or find it
	const rawProjectRoot = args?.projectRoot || findProjectRoot();

	if (!rawProjectRoot) {
		logger.warn?.('Could not determine project root directory');
		return null;
	}

	// 3. Normalize project root to prevent double .taskmaster paths
	const projectRoot = normalizeProjectRoot(rawProjectRoot);

	// 4. Check possible locations in order of preference
	const possiblePaths = [
		path.join(projectRoot, TASKMASTER_CONFIG_FILE), // NEW location
		path.join(projectRoot, LEGACY_CONFIG_FILE) // LEGACY location
	];

	for (const configPath of possiblePaths) {
		if (fs.existsSync(configPath)) {
			// Issue deprecation warning for legacy paths
			if (configPath?.endsWith(LEGACY_CONFIG_FILE)) {
				logger.warn?.(
					`⚠️  DEPRECATION WARNING: Found configuration in legacy location '${configPath}'. Please migrate to .taskmaster/config.json. Run 'task-master migrate' to automatically migrate your project.`
				);
			}

			return configPath;
		}
	}

	logger.warn?.(`No configuration file found in project: ${projectRoot}`);
	return null;
}// --- Environment Variable Resolution Utility ---
/**
 * Resolves an environment variable's value.
 * Precedence:
 * 1. session.env (if session provided)
 * 2. process.env
 * 3. .env file at projectRoot (if projectRoot provided)
 * @param {string} key - The environment variable key.
 * @param {object|null} [session=null] - The MCP session object.
 * @param {string|null} [projectRoot=null] - The project root directory (for .env fallback).
 * @returns {string|undefined} The value of the environment variable or undefined if not found.
 */
export function resolveEnvVariable(key, session = null, projectRoot = null) {
	// 1. Check session.env
	if (session?.env?.[key]) {
		return session.env[key];
	}

	// 2. Read .env file at projectRoot
	if (projectRoot) {
		const envPath = path.join(projectRoot, '.env');
		if (fs.existsSync(envPath)) {
			try {
				const envFileContent = fs.readFileSync(envPath, 'utf-8');
				const parsedEnv = dotenv.parse(envFileContent); // Use dotenv to parse
				if (parsedEnv && parsedEnv[key]) {
					// console.log(`DEBUG: Found key ${key} in ${envPath}`); // Optional debug log
					return parsedEnv[key];
				}
			} catch (error) {
				// Log error but don't crash, just proceed as if key wasn't found in file
				console.warn(
					chalk.yellow(`Could not read or parse ${envPath}: ${error.message}`)
				);
			}
		}
	}

	// 3. Fallback: Check process.env
	if (process.env[key]) {
		return process.env[key];
	}

	// Not found anywhere
	return undefined;
}

