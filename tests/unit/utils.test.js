/**
 * Utils module tests
 */

import { jest } from '@jest/globals';

// Mock modules first before any imports
jest.mock('fs', () => ({
	existsSync: jest.fn((filePath) => {
		// Prevent Jest internal file access
		if (
			filePath.includes('jest-message-util') ||
			filePath.includes('node_modules')
		) {
			return false;
		}
		return false; // Default to false for config discovery prevention
	}),
	readFileSync: jest.fn(() => '{}'),
	writeFileSync: jest.fn(),
	mkdirSync: jest.fn()
}));

jest.mock('path', () => ({
	join: jest.fn((dir, file) => `${dir}/${file}`),
	dirname: jest.fn((filePath) => filePath.split('/').slice(0, -1).join('/')),
	resolve: jest.fn((...paths) => paths.join('/')),
	basename: jest.fn((filePath) => filePath.split('/').pop())
}));

jest.mock('chalk', () => ({
	red: jest.fn((text) => text),
	blue: jest.fn((text) => text),
	green: jest.fn((text) => text),
	yellow: jest.fn((text) => text),
	white: jest.fn((text) => ({
		bold: jest.fn((text) => text)
	})),
	reset: jest.fn((text) => text),
	dim: jest.fn((text) => text) // Add dim function to prevent chalk errors
}));

// Mock console to prevent Jest internal access
const mockConsole = {
	log: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn()
};
global.console = mockConsole;

// Mock path-utils to prevent file system discovery issues
jest.mock('../../src/utils/path-utils.js', () => ({
	__esModule: true,
	findProjectRoot: jest.fn(() => '/mock/project'),
	findConfigPath: jest.fn(() => null), // Always return null to prevent config discovery
	findTasksPath: jest.fn(() => '/mock/tasks.json'),
	findComplexityReportPath: jest.fn(() => null),
	resolveTasksOutputPath: jest.fn(() => '/mock/tasks.json'),
	resolveComplexityReportOutputPath: jest.fn(() => '/mock/report.json')
}));

jest.mock('../../src/constants/paths.js', () => ({
	__esModule: true,
	getWorkingTaskGroup: jest.fn(() => 'default'),
	getTaskGroupComplexityReportFile: jest.fn(() => '/path/to/report.json')
}));

// Import the actual module to test
import {
	truncate,
	log,
	readJSON,
	writeJSON,
	sanitizePrompt,
	readComplexityReport,
	findTaskInComplexityReport,
	taskExists,
	formatTaskId,
	findCycles,
	toKebabCase,
	regenerateSequentialTaskIds
} from '../../scripts/modules/utils.js';

// Import the mocked modules for use in tests
import fs from 'fs';
import path from 'path';

// Mock config-manager to provide config values
const mockGetLogLevel = jest.fn(() => 'info'); // Default log level for tests
const mockGetDebugFlag = jest.fn(() => false); // Default debug flag for tests
jest.mock('../../scripts/modules/config-manager.js', () => ({
	getLogLevel: mockGetLogLevel,
	getDebugFlag: mockGetDebugFlag
	// Mock other getters if needed by utils.js functions under test
}));

// Test implementation of detectCamelCaseFlags
function testDetectCamelCaseFlags(args) {
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

describe('Utils Module', () => {
	beforeEach(() => {
		// Clear all mocks before each test
		jest.clearAllMocks();
	});

	describe('truncate function', () => {
		test('should return the original string if shorter than maxLength', () => {
			const result = truncate('Hello', 10);
			expect(result).toBe('Hello');
		});

		test('should truncate the string and add ellipsis if longer than maxLength', () => {
			const result = truncate(
				'This is a long string that needs truncation',
				20
			);
			expect(result).toBe('This is a long st...');
		});

		test('should handle empty string', () => {
			const result = truncate('', 10);
			expect(result).toBe('');
		});

		test('should return null when input is null', () => {
			const result = truncate(null, 10);
			expect(result).toBe(null);
		});

		test('should return undefined when input is undefined', () => {
			const result = truncate(undefined, 10);
			expect(result).toBe(undefined);
		});

		test('should handle maxLength of 0 or negative', () => {
			// When maxLength is 0, slice(0, -3) returns 'He'
			const result1 = truncate('Hello', 0);
			expect(result1).toBe('He...');

			// When maxLength is negative, slice(0, -8) returns nothing
			const result2 = truncate('Hello', -5);
			expect(result2).toBe('...');
		});
	});

	describe.skip('log function', () => {
		// const originalConsoleLog = console.log; // Keep original for potential restore if needed
		beforeEach(() => {
			// Mock console.log for each test
			// console.log = jest.fn(); // REMOVE console.log spy
			mockGetLogLevel.mockClear(); // Clear mock calls
		});

		afterEach(() => {
			// Restore original console.log after each test
			// console.log = originalConsoleLog; // REMOVE console.log restore
		});

		test('should log messages according to log level from config-manager', () => {
			// Test with info level (default from mock)
			mockGetLogLevel.mockReturnValue('info');

			// Spy on console.log JUST for this test to verify calls
			const consoleSpy = jest
				.spyOn(console, 'log')
				.mockImplementation(() => {});

			log('debug', 'Debug message');
			log('info', 'Info message');
			log('warn', 'Warning message');
			log('error', 'Error message');

			// Debug should not be logged (level 0 < 1)
			expect(consoleSpy).not.toHaveBeenCalledWith(
				expect.stringContaining('Debug message')
			);

			// Info and above should be logged
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Info message')
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Warning message')
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Error message')
			);

			// Verify the formatting includes text prefixes
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[INFO]')
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[WARN]')
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[ERROR]')
			);

			// Verify getLogLevel was called by log function
			expect(mockGetLogLevel).toHaveBeenCalled();

			// Restore spy for this test
			consoleSpy.mockRestore();
		});

		test('should not log messages below the configured log level', () => {
			// Set log level to error via mock
			mockGetLogLevel.mockReturnValue('error');

			// Spy on console.log JUST for this test
			const consoleSpy = jest
				.spyOn(console, 'log')
				.mockImplementation(() => {});

			log('debug', 'Debug message');
			log('info', 'Info message');
			log('warn', 'Warning message');
			log('error', 'Error message');

			// Only error should be logged
			expect(consoleSpy).not.toHaveBeenCalledWith(
				expect.stringContaining('Debug message')
			);
			expect(consoleSpy).not.toHaveBeenCalledWith(
				expect.stringContaining('Info message')
			);
			expect(consoleSpy).not.toHaveBeenCalledWith(
				expect.stringContaining('Warning message')
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Error message')
			);

			// Verify getLogLevel was called
			expect(mockGetLogLevel).toHaveBeenCalled();

			// Restore spy for this test
			consoleSpy.mockRestore();
		});

		test('should join multiple arguments into a single message', () => {
			mockGetLogLevel.mockReturnValue('info');
			// Spy on console.log JUST for this test
			const consoleSpy = jest
				.spyOn(console, 'log')
				.mockImplementation(() => {});

			log('info', 'Message', 'with', 'multiple', 'parts');
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Message with multiple parts')
			);

			// Restore spy for this test
			consoleSpy.mockRestore();
		});
	});

	describe.skip('readJSON function', () => {
		test('should read and parse a valid JSON file', () => {
			const testData = { key: 'value', nested: { prop: true } };
			fsReadFileSyncSpy.mockReturnValue(JSON.stringify(testData));

			const result = readJSON('test.json');

			expect(fsReadFileSyncSpy).toHaveBeenCalledWith('test.json', 'utf8');
			expect(result).toEqual(testData);
		});

		test('should handle file not found errors', () => {
			fsReadFileSyncSpy.mockImplementation(() => {
				throw new Error('ENOENT: no such file or directory');
			});

			// Mock console.error
			const consoleSpy = jest
				.spyOn(console, 'error')
				.mockImplementation(() => {});

			const result = readJSON('nonexistent.json');

			expect(result).toBeNull();

			// Restore console.error
			consoleSpy.mockRestore();
		});

		test('should handle invalid JSON format', () => {
			fsReadFileSyncSpy.mockReturnValue('{ invalid json: }');

			// Mock console.error
			const consoleSpy = jest
				.spyOn(console, 'error')
				.mockImplementation(() => {});

			const result = readJSON('invalid.json');

			expect(result).toBeNull();

			// Restore console.error
			consoleSpy.mockRestore();
		});
	});

	describe.skip('writeJSON function', () => {
		test('should write JSON data to a file', () => {
			const testData = { key: 'value', nested: { prop: true } };

			writeJSON('output.json', testData);

			expect(fsWriteFileSyncSpy).toHaveBeenCalledWith(
				'output.json',
				JSON.stringify(testData, null, 2),
				'utf8'
			);
		});

		test('should handle file write errors', () => {
			const testData = { key: 'value' };

			fsWriteFileSyncSpy.mockImplementation(() => {
				throw new Error('Permission denied');
			});

			// Mock console.error
			const consoleSpy = jest
				.spyOn(console, 'error')
				.mockImplementation(() => {});

			// Function shouldn't throw, just log error
			expect(() => writeJSON('protected.json', testData)).not.toThrow();

			// Restore console.error
			consoleSpy.mockRestore();
		});
	});

	describe('sanitizePrompt function', () => {
		test('should escape double quotes in prompts', () => {
			const prompt = 'This is a "quoted" prompt with "multiple" quotes';
			const expected =
				'This is a \\"quoted\\" prompt with \\"multiple\\" quotes';

			expect(sanitizePrompt(prompt)).toBe(expected);
		});

		test('should handle prompts with no special characters', () => {
			const prompt = 'This is a regular prompt without quotes';

			expect(sanitizePrompt(prompt)).toBe(prompt);
		});

		test('should handle empty strings', () => {
			expect(sanitizePrompt('')).toBe('');
		});
	});

	describe('taskExists function', () => {
		const sampleTasks = [
			{ id: 1, title: 'Task 1' },
			{ id: 2, title: 'Task 2' },
			{
				id: 3,
				title: 'Task with subtasks',
				subtasks: [
					{ id: 1, title: 'Subtask 1' },
					{ id: 2, title: 'Subtask 2' }
				]
			}
		];

		test('should return true for existing task IDs', () => {
			expect(taskExists(sampleTasks, 1)).toBe(true);
			expect(taskExists(sampleTasks, 2)).toBe(true);
			expect(taskExists(sampleTasks, '2')).toBe(true); // String ID should work too
		});

		test('should return true for existing subtask IDs', () => {
			expect(taskExists(sampleTasks, '3.1')).toBe(true);
			expect(taskExists(sampleTasks, '3.2')).toBe(true);
		});

		test('should return false for non-existent task IDs', () => {
			expect(taskExists(sampleTasks, 99)).toBe(false);
			expect(taskExists(sampleTasks, '99')).toBe(false);
		});

		test('should return false for non-existent subtask IDs', () => {
			expect(taskExists(sampleTasks, '3.99')).toBe(false);
			expect(taskExists(sampleTasks, '99.1')).toBe(false);
		});

		test('should handle invalid inputs', () => {
			expect(taskExists(null, 1)).toBe(false);
			expect(taskExists(undefined, 1)).toBe(false);
			expect(taskExists([], 1)).toBe(false);
			expect(taskExists(sampleTasks, null)).toBe(false);
			expect(taskExists(sampleTasks, undefined)).toBe(false);
		});
	});

	describe('formatTaskId function', () => {
		test('should format numeric task IDs as strings', () => {
			expect(formatTaskId(1)).toBe('1');
			expect(formatTaskId(42)).toBe('42');
		});

		test('should preserve string task IDs', () => {
			expect(formatTaskId('1')).toBe('1');
			expect(formatTaskId('task-1')).toBe('task-1');
		});

		test('should preserve dot notation for subtask IDs', () => {
			expect(formatTaskId('1.2')).toBe('1.2');
			expect(formatTaskId('42.7')).toBe('42.7');
		});

		test('should handle edge cases', () => {
			// These should return as-is, though your implementation may differ
			expect(formatTaskId(null)).toBe(null);
			expect(formatTaskId(undefined)).toBe(undefined);
			expect(formatTaskId('')).toBe('');
		});
	});

	describe('findCycles function', () => {
		test('should detect simple cycles in dependency graph', () => {
			// A -> B -> A (cycle)
			const dependencyMap = new Map([
				['A', ['B']],
				['B', ['A']]
			]);

			const cycles = findCycles('A', dependencyMap);

			expect(cycles.length).toBeGreaterThan(0);
			expect(cycles).toContain('A');
		});

		test('should detect complex cycles in dependency graph', () => {
			// A -> B -> C -> A (cycle)
			const dependencyMap = new Map([
				['A', ['B']],
				['B', ['C']],
				['C', ['A']]
			]);

			const cycles = findCycles('A', dependencyMap);

			expect(cycles.length).toBeGreaterThan(0);
			expect(cycles).toContain('A');
		});

		test('should return empty array for acyclic graphs', () => {
			// A -> B -> C (no cycle)
			const dependencyMap = new Map([
				['A', ['B']],
				['B', ['C']],
				['C', []]
			]);

			const cycles = findCycles('A', dependencyMap);

			expect(cycles.length).toBe(0);
		});

		test('should handle empty dependency maps', () => {
			const dependencyMap = new Map();

			const cycles = findCycles('A', dependencyMap);

			expect(cycles.length).toBe(0);
		});

		test('should handle nodes with no dependencies', () => {
			const dependencyMap = new Map([
				['A', []],
				['B', []],
				['C', []]
			]);

			const cycles = findCycles('A', dependencyMap);

			expect(cycles.length).toBe(0);
		});

		test('should identify the breaking edge in a cycle', () => {
			// A -> B -> C -> D -> B (cycle)
			const dependencyMap = new Map([
				['A', ['B']],
				['B', ['C']],
				['C', ['D']],
				['D', ['B']]
			]);

			const cycles = findCycles('A', dependencyMap);

			expect(cycles).toContain('B');
		});
	});
});

describe('regenerateSequentialTaskIds function', () => {
	test('should regenerate sequential IDs starting from 1', () => {
		const tasks = [
			{ id: 5, title: 'Task 5', dependencies: [] },
			{ id: 2, title: 'Task 2', dependencies: [] },
			{ id: 8, title: 'Task 8', dependencies: [] }
		];

		const result = regenerateSequentialTaskIds(tasks);

		expect(result).toHaveLength(3);
		expect(result[0]).toEqual({ id: 1, title: 'Task 2', dependencies: [] }); // Task 2 becomes ID 1
		expect(result[1]).toEqual({ id: 2, title: 'Task 5', dependencies: [] }); // Task 5 becomes ID 2
		expect(result[2]).toEqual({ id: 3, title: 'Task 8', dependencies: [] }); // Task 8 becomes ID 3
	});

	test('should update task dependencies correctly', () => {
		const tasks = [
			{ id: 10, title: 'Task 10', dependencies: [5] },
			{ id: 5, title: 'Task 5', dependencies: [] },
			{ id: 15, title: 'Task 15', dependencies: [10, 5] }
		];

		const result = regenerateSequentialTaskIds(tasks);

		expect(result).toHaveLength(3);
		// Task 5 (originally) becomes ID 1
		expect(result[0]).toEqual({ id: 1, title: 'Task 5', dependencies: [] });
		// Task 10 (originally) becomes ID 2, dependency 5 becomes 1
		expect(result[1]).toEqual({ id: 2, title: 'Task 10', dependencies: [1] });
		// Task 15 (originally) becomes ID 3, dependencies 10,5 become 2,1
		expect(result[2]).toEqual({ id: 3, title: 'Task 15', dependencies: [2, 1] });
	});

	test('should update subtask dependencies correctly', () => {
		const tasks = [
			{
				id: 10,
				title: 'Task 10',
				dependencies: [],
				subtasks: [
					{ id: 3, title: 'Subtask 3', dependencies: [5] },
					{ id: 7, title: 'Subtask 7', dependencies: [10, 5.2] }
				]
			},
			{ id: 5, title: 'Task 5', dependencies: [], subtasks: [
				{ id: 4, title: 'Subtask 4 of Task 5', dependencies: [] },
				{ id: 2, title: 'Subtask 2 of Task 5', dependencies: [] }
			] }
		];

		const result = regenerateSequentialTaskIds(tasks);

		expect(result).toHaveLength(2);
		// Task 5 becomes ID 1
		expect(result[0].id).toBe(1);
		expect(result[0].title).toBe('Task 5');
		// Subtasks get sequential IDs: 2 becomes 1, 4 becomes 2 (sorted by original ID)
		expect(result[0].subtasks[0]).toEqual({ id: 1, title: 'Subtask 2 of Task 5', dependencies: [] });
		expect(result[0].subtasks[1]).toEqual({ id: 2, title: 'Subtask 4 of Task 5', dependencies: [] });
		
		// Task 10 becomes ID 2
		expect(result[1].id).toBe(2);
		expect(result[1].title).toBe('Task 10');
		// Subtasks get sequential IDs: 3 becomes 1, 7 becomes 2 (sorted by original ID)
		// Subtask dependencies: 5 becomes 1, 5.2 becomes 1.1 (task 5 subtask 2 -> task 1 subtask 1)
		expect(result[1].subtasks[0]).toEqual({ id: 1, title: 'Subtask 3', dependencies: [1] });
		expect(result[1].subtasks[1]).toEqual({ id: 2, title: 'Subtask 7', dependencies: [2, 1.1] });
	});

	test('should make subtask IDs sequential integers within each parent task', () => {
		const tasks = [
			{
				id: 1,
				title: 'Task 1',
				dependencies: [],
				subtasks: [
					{ id: 10, title: 'Subtask 10', dependencies: [] },
					{ id: 5, title: 'Subtask 5', dependencies: [] },
					{ id: 15, title: 'Subtask 15', dependencies: [] }
				]
			},
			{
				id: 2,
				title: 'Task 2',
				dependencies: [],
				subtasks: [
					{ id: 20, title: 'Subtask 20', dependencies: [] },
					{ id: 12, title: 'Subtask 12', dependencies: [] }
				]
			}
		];

		const result = regenerateSequentialTaskIds(tasks);

		expect(result).toHaveLength(2);
		
		// Task 1 subtasks should be renumbered 1, 2, 3 (sorted by original ID: 5, 10, 15)
		expect(result[0].subtasks[0]).toEqual({ id: 1, title: 'Subtask 5', dependencies: [] });
		expect(result[0].subtasks[1]).toEqual({ id: 2, title: 'Subtask 10', dependencies: [] });
		expect(result[0].subtasks[2]).toEqual({ id: 3, title: 'Subtask 15', dependencies: [] });
		
		// Task 2 subtasks should be renumbered 1, 2 (sorted by original ID: 12, 20)
		expect(result[1].subtasks[0]).toEqual({ id: 1, title: 'Subtask 12', dependencies: [] });
		expect(result[1].subtasks[1]).toEqual({ id: 2, title: 'Subtask 20', dependencies: [] });
	});

	test('should update subtask dependencies when referencing other subtasks', () => {
		const tasks = [
			{
				id: 10,
				title: 'Task 10',
				dependencies: [],
				subtasks: [
					{ id: 5, title: 'Subtask 5', dependencies: [] },
					{ id: 8, title: 'Subtask 8', dependencies: [10.5] }, // References subtask 5 of task 10
					{ id: 3, title: 'Subtask 3', dependencies: [10.8, 10.5] } // References subtasks 8 and 5 of task 10
				]
			}
		];

		const result = regenerateSequentialTaskIds(tasks);

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(1);
		
		// Subtasks should be renumbered based on sorted original IDs: 3->1, 5->2, 8->3
		expect(result[0].subtasks[0]).toEqual({ id: 1, title: 'Subtask 3', dependencies: [1.3, 1.2] }); // 10.8->1.3, 10.5->1.2
		expect(result[0].subtasks[1]).toEqual({ id: 2, title: 'Subtask 5', dependencies: [] });
		expect(result[0].subtasks[2]).toEqual({ id: 3, title: 'Subtask 8', dependencies: [1.2] }); // 10.5->1.2
	});

	test('should handle tasks with no dependencies', () => {
		const tasks = [
			{ id: 100, title: 'Task 100' },
			{ id: 50, title: 'Task 50' },
			{ id: 200, title: 'Task 200' }
		];

		const result = regenerateSequentialTaskIds(tasks);

		expect(result).toHaveLength(3);
		expect(result[0]).toEqual({ id: 1, title: 'Task 50' });
		expect(result[1]).toEqual({ id: 2, title: 'Task 100' });
		expect(result[2]).toEqual({ id: 3, title: 'Task 200' });
	});

	test('should handle empty task array', () => {
		const tasks = [];
		const result = regenerateSequentialTaskIds(tasks);
		expect(result).toEqual([]);
	});

	test('should handle null and undefined inputs', () => {
		expect(regenerateSequentialTaskIds(null)).toBe(null);
		expect(regenerateSequentialTaskIds(undefined)).toBe(undefined);
	});

	test('should handle single task', () => {
		const tasks = [{ id: 42, title: 'Single Task', dependencies: [] }];
		const result = regenerateSequentialTaskIds(tasks);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({ id: 1, title: 'Single Task', dependencies: [] });
	});

	test('should remove invalid dependency references', () => {
		// Create a console.log spy to capture warning messages
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

		const tasks = [
			{ id: 5, title: 'Task 5', dependencies: [999] }, // 999 doesn't exist
			{ id: 10, title: 'Task 10', dependencies: [5, 888] } // 888 doesn't exist
		];

		const result = regenerateSequentialTaskIds(tasks);

		expect(result).toHaveLength(2);
		// Task 5 becomes ID 1, invalid dependency 999 removed
		expect(result[0]).toEqual({ id: 1, title: 'Task 5', dependencies: [] });
		// Task 10 becomes ID 2, dependency 5 becomes 1, invalid dependency 888 removed
		expect(result[1]).toEqual({ id: 2, title: 'Task 10', dependencies: [1] });

		// Restore console.log
		logSpy.mockRestore();
	});

	test('should handle complex subtask dependency scenarios', () => {
		const tasks = [
			{
				id: 20,
				title: 'Task 20',
				dependencies: [],
				subtasks: [
					{ id: 3, title: 'Subtask 3', dependencies: [10.5, 999] }, // 999 invalid, 10.5 should become 1.2
					{ id: 1, title: 'Subtask 1', dependencies: [10] }
				]
			},
			{
				id: 10,
				title: 'Task 10',
				dependencies: [],
				subtasks: [
					{ id: 7, title: 'Subtask 7 of 10', dependencies: [] },
					{ id: 5, title: 'Subtask 5 of 10', dependencies: [20] }
				]
			}
		];

		// Create a console.log spy to capture warning messages
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

		const result = regenerateSequentialTaskIds(tasks);

		expect(result).toHaveLength(2);
		
		// Task 10 becomes ID 1, subtasks get sequential IDs: 5->1, 7->2 (sorted by original ID)
		expect(result[0].id).toBe(1);
		expect(result[0].title).toBe('Task 10');
		expect(result[0].subtasks[0]).toEqual({ id: 1, title: 'Subtask 5 of 10', dependencies: [2] }); // 20 becomes 2
		expect(result[0].subtasks[1]).toEqual({ id: 2, title: 'Subtask 7 of 10', dependencies: [] });
		
		// Task 20 becomes ID 2, subtasks get sequential IDs: 1->1, 3->2 (sorted by original ID)
		expect(result[1].id).toBe(2);
		expect(result[1].title).toBe('Task 20');
		expect(result[1].subtasks[0]).toEqual({ id: 1, title: 'Subtask 1', dependencies: [1] }); // 10 becomes 1
		expect(result[1].subtasks[1]).toEqual({ id: 2, title: 'Subtask 3', dependencies: [1.1] }); // 10.5 becomes 1.1, 999 removed

		// Restore console.log
		logSpy.mockRestore();
	});

	test('should preserve task order based on original IDs (sorted)', () => {
		const tasks = [
			{ id: 3, title: 'Task C', dependencies: [] },
			{ id: 1, title: 'Task A', dependencies: [] },
			{ id: 2, title: 'Task B', dependencies: [] }
		];

		const result = regenerateSequentialTaskIds(tasks);

		// Should be sorted by original ID: 1, 2, 3
		expect(result[0]).toEqual({ id: 1, title: 'Task A', dependencies: [] });
		expect(result[1]).toEqual({ id: 2, title: 'Task B', dependencies: [] });
		expect(result[2]).toEqual({ id: 3, title: 'Task C', dependencies: [] });
	});

	test('should handle gaps in original ID sequence', () => {
		const tasks = [
			{ id: 1, title: 'Task 1', dependencies: [] },
			{ id: 5, title: 'Task 5', dependencies: [1] },
			{ id: 10, title: 'Task 10', dependencies: [5] },
			{ id: 100, title: 'Task 100', dependencies: [10, 1] }
		];

		const result = regenerateSequentialTaskIds(tasks);

		expect(result).toHaveLength(4);
		expect(result[0]).toEqual({ id: 1, title: 'Task 1', dependencies: [] });
		expect(result[1]).toEqual({ id: 2, title: 'Task 5', dependencies: [1] });
		expect(result[2]).toEqual({ id: 3, title: 'Task 10', dependencies: [2] });
		expect(result[3]).toEqual({ id: 4, title: 'Task 100', dependencies: [3, 1] });
	});
});

describe('CLI Flag Format Validation', () => {
	test('toKebabCase should convert camelCase to kebab-case', () => {
		expect(toKebabCase('promptText')).toBe('prompt-text');
		expect(toKebabCase('userID')).toBe('user-id');
		expect(toKebabCase('numTasks')).toBe('num-tasks');
		expect(toKebabCase('alreadyKebabCase')).toBe('already-kebab-case');
	});

	test('detectCamelCaseFlags should identify camelCase flags', () => {
		const args = [
			'node',
			'task-master',
			'add-task',
			'--promptText=test',
			'--userID=123'
		];
		const flags = testDetectCamelCaseFlags(args);

		expect(flags).toHaveLength(2);
		expect(flags).toContainEqual({
			original: 'promptText',
			kebabCase: 'prompt-text'
		});
		expect(flags).toContainEqual({
			original: 'userID',
			kebabCase: 'user-id'
		});
	});

	test('detectCamelCaseFlags should not flag kebab-case flags', () => {
		const args = [
			'node',
			'task-master',
			'add-task',
			'--prompt-text=test',
			'--user-id=123'
		];
		const flags = testDetectCamelCaseFlags(args);

		expect(flags).toHaveLength(0);
	});

	test('detectCamelCaseFlags should respect single-word flags', () => {
		const args = [
			'node',
			'task-master',
			'add-task',
			'--prompt=test',
			'--file=test.json',
			'--priority=high',
			'--promptText=test'
		];
		const flags = testDetectCamelCaseFlags(args);

		// Should only flag promptText, not the single-word flags
		expect(flags).toHaveLength(1);
		expect(flags).toContainEqual({
			original: 'promptText',
			kebabCase: 'prompt-text'
		});
	});
});
