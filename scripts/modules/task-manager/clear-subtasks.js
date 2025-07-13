import path from 'path';
import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';

import { log, readJSON, writeJSON, truncate, isSilentMode } from '../utils.js';
import { displayBanner } from '../ui.js';
import generateTaskFiles from './generate-task-files.js';

/**
 * Clear subtasks from specified tasks
 * @param {string} tasksPath - Path to the tasks.json file
 * @param {string} taskIds - Task IDs to clear subtasks from
 * @param {string} outputFormat - Output format ('text' or 'json')
 * @returns {Object} Result object with success/error information
 */
function clearSubtasks(tasksPath, taskIds, outputFormat = 'text') {
	try {
		log('info', `Reading tasks from ${tasksPath}...`);
		const data = readJSON(tasksPath);
		if (!data || !data.tasks) {
			return {
				success: false,
				error: {
					code: 'INVALID_TASKS_FILE',
					message: 'No valid tasks found in the tasks file'
				}
			};
		}

		if (outputFormat === 'text' && !isSilentMode()) {
			console.log(
				boxen(chalk.white.bold('Clearing Subtasks'), {
					padding: 1,
					borderColor: 'blue',
					borderStyle: 'round',
					margin: { top: 1, bottom: 1 }
				})
			);
		}

		// Handle multiple task IDs (comma-separated)
		const taskIdArray = taskIds.split(',').map((id) => id.trim());
		let clearedCount = 0;
		const results = [];
		const errors = [];

		// Create a summary table for the cleared subtasks
		const summaryTable = new Table({
			head: [
				chalk.cyan.bold('Task ID'),
				chalk.cyan.bold('Task Title'),
				chalk.cyan.bold('Subtasks Cleared')
			],
			colWidths: [10, 50, 20],
			style: { head: [], border: [] }
		});

		taskIdArray.forEach((taskId) => {
			const id = parseInt(taskId, 10);
			if (isNaN(id)) {
				const error = `Invalid task ID: ${taskId}`;
				log('error', error);
				errors.push(error);
				return;
			}

			const task = data.tasks.find((t) => t.id === id);
			if (!task) {
				const error = `Task ${id} not found`;
				log('error', error);
				errors.push(error);
				return;
			}

			if (!task.subtasks || task.subtasks.length === 0) {
				log('info', `Task ${id} has no subtasks to clear`);
				summaryTable.push([
					id.toString(),
					truncate(task.title, 47),
					chalk.yellow('No subtasks')
				]);
				results.push({
					taskId: id,
					taskTitle: task.title,
					subtasksCleared: 0,
					message: 'No subtasks to clear'
				});
				return;
			}

			const subtaskCount = task.subtasks.length;
			task.subtasks = [];
			clearedCount++;
			log('info', `Cleared ${subtaskCount} subtasks from task ${id}`);

			summaryTable.push([
				id.toString(),
				truncate(task.title, 47),
				chalk.green(`${subtaskCount} subtasks cleared`)
			]);

			results.push({
				taskId: id,
				taskTitle: task.title,
				subtasksCleared: subtaskCount,
				message: `${subtaskCount} subtasks cleared`
			});
		});

		if (clearedCount > 0) {
			writeJSON(tasksPath, data);

			// Show summary table
			if (outputFormat === 'text' && !isSilentMode()) {
				console.log(
					boxen(chalk.white.bold('Subtask Clearing Summary:'), {
						padding: { left: 2, right: 2, top: 0, bottom: 0 },
						margin: { top: 1, bottom: 0 },
						borderColor: 'blue',
						borderStyle: 'round'
					})
				);
				console.log(summaryTable.toString());
			}

			// Regenerate task files to reflect changes
			log('info', 'Regenerating task files...');
			try {
				generateTaskFiles(tasksPath, path.dirname(tasksPath));
			} catch (generateError) {
				log('error', `Failed to regenerate task files: ${generateError.message}`);
				// Continue execution even if file generation fails
			}

			// Success message
			if (outputFormat === 'text' && !isSilentMode()) {
				console.log(
					boxen(
						chalk.green(
							`Successfully cleared subtasks from ${chalk.bold(clearedCount)} task(s)`
						),
						{
							padding: 1,
							borderColor: 'green',
							borderStyle: 'round',
							margin: { top: 1 }
						}
					)
				);

				// Next steps suggestion
				console.log(
					boxen(
						chalk.white.bold('Next Steps:') +
							'\n\n' +
							`${chalk.cyan('1.')} Run ${chalk.yellow('task-master expand --id=<id>')} to generate new subtasks\n` +
							`${chalk.cyan('2.')} Run ${chalk.yellow('task-master list --with-subtasks')} to verify changes`,
						{
							padding: 1,
							borderColor: 'cyan',
							borderStyle: 'round',
							margin: { top: 1 }
						}
					)
				);
			}
		} else {
			if (outputFormat === 'text' && !isSilentMode()) {
				console.log(
					boxen(chalk.yellow('No subtasks were cleared'), {
						padding: 1,
						borderColor: 'yellow',
						borderStyle: 'round',
						margin: { top: 1 }
					})
				);
			}
		}

		// Return success result
		return {
			success: true,
			data: {
				clearedCount,
				results,
				errors: errors.length > 0 ? errors : undefined
			}
		};

	} catch (error) {
		log('error', `Error clearing subtasks: ${error.message}`);
		return {
			success: false,
			error: {
				code: 'CLEAR_SUBTASKS_ERROR',
				message: `Failed to clear subtasks: ${error.message}`
			}
		};
	}
}

export default clearSubtasks;
