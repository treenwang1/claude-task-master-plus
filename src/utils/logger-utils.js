/**
 * Logger utility functions for Task Master
 * Provides standardized logging patterns for both CLI and utility contexts
 */

import chalk from 'chalk';

/**
 * Creates a standard logger object that wraps the utility log function
 * This provides a consistent logger interface across different parts of the application
 * @returns {Object} A logger object with standard logging methods (info, warn, error, debug, success)
 */
export function createStandardLogger() {
	return {
		info: (msg, ...args) => console.log(chalk.green(msg), ...args),
		warn: (msg, ...args) => console.warn(chalk.yellow(msg), ...args),
		error: (msg, ...args) => console.error(chalk.red(msg), ...args),
		debug: (msg, ...args) => console.log(chalk.gray(msg), ...args),
		success: (msg, ...args) => console.log(chalk.green(msg), ...args)
	};
}

/**
 * Creates a logger using either the provided logger or a default standard logger
 * This is the recommended pattern for functions that accept an optional logger parameter
 * @param {Object|null} providedLogger - Optional logger object passed from caller
 * @returns {Object} A logger object with standard logging methods
 */
export function getLoggerOrDefault(providedLogger = null) {
	return providedLogger || createStandardLogger();
}
