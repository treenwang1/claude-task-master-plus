/**
 * Path constants for Task Master application
 */
import fs from 'fs';
import path from 'path';
import { findProjectRoot } from '../utils/path-utils.js';
// .taskmaster directory structure paths
export const TASKMASTER_DIR = '.taskmaster';


// Task group dynamic path builders
export function getTaskGroupPath(taskGroupName) {
	return `${TASKMASTER_DIR}/${taskGroupName}`;
}

export function getTaskGroupTasksDir(taskGroupName) {
	return `${TASKMASTER_DIR}/${taskGroupName}/tasks`;
}

export function getTaskGroupDocsDir(taskGroupName) {
	return `${TASKMASTER_DIR}/${taskGroupName}/docs`;
}

export function getTaskGroupReportsDir(taskGroupName) {
	return `${TASKMASTER_DIR}/${taskGroupName}/reports`;
}

export function getTaskGroupTemplatesDir(taskGroupName) {
	return `${TASKMASTER_DIR}/${taskGroupName}/templates`;
}

export function getTaskGroupTasksFile(taskGroupName) {
	return `${TASKMASTER_DIR}/${taskGroupName}/tasks/tasks.json`;
}

export function getTaskGroupComplexityReportFile(taskGroupName) {
	return `${TASKMASTER_DIR}/${taskGroupName}/reports/task-complexity-report.json`;
}

export function getTaskGroupPrdFile(taskGroupName) {
	return `${TASKMASTER_DIR}/${taskGroupName}/docs/prd.md`;
}

export function getTaskGroupExamplePrdFile(taskGroupName) {
	return `${TASKMASTER_DIR}/${taskGroupName}/templates/example_prd.md`;
}

// Task Master configuration files
export const TASKMASTER_CONFIG_FILE = '.taskmaster/config.json';
export const LEGACY_CONFIG_FILE = '.taskmasterconfig';
// Task Master report files (legacy paths for backwards compatibility)
export let COMPLEXITY_REPORT_FILE;
export const LEGACY_COMPLEXITY_REPORT_FILE =
	'scripts/task-complexity-report.json';

// Task Master PRD file paths (legacy paths for backwards compatibility)
export let PRD_FILE;
export const LEGACY_PRD_FILE = 'scripts/prd.md';

export let TASKMASTER_DOCS_DIR;

// Task Master template files (legacy paths for backwards compatibility)
export let EXAMPLE_PRD_FILE;
export const LEGACY_EXAMPLE_PRD_FILE = 'scripts/example_prd.md';

// Task Master task file paths (legacy paths for backwards compatibility)
export let TASKMASTER_TASKS_FILE;
export const LEGACY_TASKS_FILE = 'tasks/tasks.json';

// General project files (not Task Master specific but commonly used)
export const ENV_EXAMPLE_FILE = '.env.example';
export const GITIGNORE_FILE = '.gitignore';

// Task file naming pattern
export const TASK_FILE_PREFIX = 'task_';
export const TASK_FILE_EXTENSION = '.txt';

export let DEFAULT_TASK_GROUP = 'default';
if (fs.existsSync(TASKMASTER_CONFIG_FILE)) {
	DEFAULT_TASK_GROUP = JSON.parse(fs.readFileSync(TASKMASTER_CONFIG_FILE))?.global?.workingTaskGroup ?? DEFAULT_TASK_GROUP;
}

setDefaultTaskGroup(DEFAULT_TASK_GROUP);


export function setDefaultTaskGroup(taskGroupName) {
	DEFAULT_TASK_GROUP = taskGroupName;
	COMPLEXITY_REPORT_FILE = `.taskmaster/${DEFAULT_TASK_GROUP}/reports/task-complexity-report.json`;
	PRD_FILE = `.taskmaster/${DEFAULT_TASK_GROUP}/docs/prd.md`;
	EXAMPLE_PRD_FILE = `.taskmaster/${DEFAULT_TASK_GROUP}/templates/example_prd.md`;
	TASKMASTER_TASKS_FILE = `.taskmaster/${DEFAULT_TASK_GROUP}/tasks/tasks.json`;
	TASKMASTER_DOCS_DIR = `.taskmaster/${DEFAULT_TASK_GROUP}/docs`;
}
/**
 * Project markers used to identify a task-master project root
 * These files/directories indicate that a directory is a Task Master project
 */
export const PROJECT_MARKERS = [
	'.taskmaster', // New taskmaster directory
	LEGACY_CONFIG_FILE, // .taskmasterconfig
	'tasks.json', // Generic tasks file
	LEGACY_TASKS_FILE, // tasks/tasks.json (legacy location)
	TASKMASTER_TASKS_FILE, // .taskmaster/tasks/tasks.json (new location)
	'.git', // Git repository
	'.svn' // SVN repository
];/**
 * The same as the function in config-manager.js, but used for current file only to avoid circular dependency.
 * Gets the working task group from configuration.
 * @param {string|null} explicitRoot - Optional explicit path to the project root.
 * @returns {string} The working task group name (defaults to 'default').
 */
export function getWorkingTaskGroup(explicitRoot = null) {
	const projectRoot = findProjectRoot(explicitRoot);
	const config = JSON.parse(fs.readFileSync(path.join(projectRoot, TASKMASTER_CONFIG_FILE), 'utf-8'));
	return config.global?.workingTaskGroup || DEFAULT_TASK_GROUP;
}

