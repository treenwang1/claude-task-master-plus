/**
 * Tests for the add-task.js module
 */
import { jest } from '@jest/globals';

// Mock the dependencies before importing the module under test
jest.unstable_mockModule('../../../../../scripts/modules/utils.js', () => ({
	readJSON: jest.fn(),
	writeJSON: jest.fn(),
	log: jest.fn(),
	CONFIG: {
		model: 'mock-claude-model',
		maxTokens: 4000,
		temperature: 0.7,
		debug: false
	},
	truncate: jest.fn((text) => text)
}));

jest.unstable_mockModule('../../../../../scripts/modules/ui.js', () => ({
	displayBanner: jest.fn(),
	getStatusWithColor: jest.fn((status) => status),
	startLoadingIndicator: jest.fn(),
	stopLoadingIndicator: jest.fn(),
	succeedLoadingIndicator: jest.fn(),
	failLoadingIndicator: jest.fn(),
	warnLoadingIndicator: jest.fn(),
	infoLoadingIndicator: jest.fn(),
	displayAiUsageSummary: jest.fn()
}));

jest.unstable_mockModule(
	'../../../../../scripts/modules/ai-services-unified.js',
	() => ({
		generateObjectService: jest.fn().mockResolvedValue({
			mainResult: {
				object: {
					title: 'Task from prompt: Create a new authentication system',
					description:
						'Task generated from: Create a new authentication system',
					details:
						'Implementation details for task generated from prompt: Create a new authentication system',
					testStrategy: 'Write unit tests to verify functionality',
					dependencies: []
				}
			},
			telemetryData: {
				timestamp: new Date().toISOString(),
				userId: '1234567890',
				commandName: 'add-task',
				modelUsed: 'claude-3-5-sonnet',
				providerName: 'anthropic',
				inputTokens: 1000,
				outputTokens: 500,
				totalTokens: 1500,
				totalCost: 0.012414,
				currency: 'USD'
			}
		})
	})
);

jest.unstable_mockModule(
	'../../../../../scripts/modules/config-manager.js',
	() => ({
		getDefaultPriority: jest.fn(() => 'medium')
	})
);

jest.unstable_mockModule(
	'../../../../../scripts/modules/task-manager/generate-task-files.js',
	() => ({
		default: jest.fn().mockResolvedValue()
	})
);

// Mock external UI libraries
jest.unstable_mockModule('chalk', () => ({
	default: {
		white: { bold: jest.fn((text) => text) },
		cyan: Object.assign(
			jest.fn((text) => text),
			{
				bold: jest.fn((text) => text)
			}
		),
		green: jest.fn((text) => text),
		yellow: jest.fn((text) => text),
		bold: jest.fn((text) => text)
	}
}));

jest.unstable_mockModule('boxen', () => ({
	default: jest.fn((text) => text)
}));

jest.unstable_mockModule('cli-table3', () => ({
	default: jest.fn().mockImplementation(() => ({
		push: jest.fn(),
		toString: jest.fn(() => 'mocked table')
	}))
}));

// Import the mocked modules
const { readJSON, writeJSON, log } = await import(
	'../../../../../scripts/modules/utils.js'
);

const { generateObjectService } = await import(
	'../../../../../scripts/modules/ai-services-unified.js'
);

const generateTaskFiles = await import(
	'../../../../../scripts/modules/task-manager/generate-task-files.js'
);

// Import the module under test
const { default: addTask } = await import(
	'../../../../../scripts/modules/task-manager/add-task.js'
);

describe('addTask', () => {
	const sampleTasks = {
		tasks: [
			{
				id: 1,
				title: 'Task 1',
				description: 'First task',
				status: 'pending',
				dependencies: []
			},
			{
				id: 2,
				title: 'Task 2',
				description: 'Second task',
				status: 'pending',
				dependencies: []
			},
			{
				id: 3,
				title: 'Task 3',
				description: 'Third task',
				status: 'pending',
				dependencies: [1]
			}
		]
	};

	// Create a helper function for consistent mcpLog mock
	const createMcpLogMock = () => ({
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		success: jest.fn()
	});

	beforeEach(() => {
		jest.clearAllMocks();
		readJSON.mockReturnValue(JSON.parse(JSON.stringify(sampleTasks)));
		// Reset writeJSON to its default mock implementation
		writeJSON.mockImplementation(() => {});

		// Mock console.log to avoid output during tests
		jest.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		console.log.mockRestore();
	});

	test('should add a new task using AI', async () => {
		// Arrange
		const prompt = 'Create a new authentication system';
		const context = {
			mcpLog: createMcpLogMock()
		};

		// Act
		const result = await addTask(
			'tasks/tasks.json',
			prompt,
			[],
			'medium',
			context,
			'json'
		);

		// Assert
		expect(readJSON).toHaveBeenCalledWith('tasks/tasks.json');
		expect(generateObjectService).toHaveBeenCalledWith(expect.any(Object));
		expect(writeJSON).toHaveBeenCalledWith(
			'tasks/tasks.json',
			expect.objectContaining({
				tasks: expect.arrayContaining([
					expect.objectContaining({
						id: 4, // Next ID after existing tasks
						title: expect.stringContaining(
							'Create a new authentication system'
						),
						status: 'pending'
					})
				])
			})
		);
		expect(generateTaskFiles.default).toHaveBeenCalled();
		expect(result).toEqual(
			expect.objectContaining({
				newTaskId: 4,
				telemetryData: expect.any(Object)
			})
		);
	});

	test('should validate dependencies when adding a task', async () => {
		// Arrange
		const prompt = 'Create a new authentication system';
		const validDependencies = [1, 2]; // These exist in sampleTasks
		const context = {
			mcpLog: createMcpLogMock()
		};

		// Act
		const result = await addTask(
			'tasks/tasks.json',
			prompt,
			validDependencies,
			'medium',
			context,
			'json'
		);

		// Assert
		expect(writeJSON).toHaveBeenCalledWith(
			'tasks/tasks.json',
			expect.objectContaining({
				tasks: expect.arrayContaining([
					expect.objectContaining({
						id: 4,
						dependencies: validDependencies
					})
				])
			})
		);
	});

	test('should filter out invalid dependencies', async () => {
		// Arrange
		const prompt = 'Create a new authentication system';
		const invalidDependencies = [999]; // Non-existent task ID
		const context = { mcpLog: createMcpLogMock() };

		// Act
		const result = await addTask(
			'tasks/tasks.json',
			prompt,
			invalidDependencies,
			'medium',
			context,
			'json'
		);

		// Assert
		expect(writeJSON).toHaveBeenCalledWith(
			'tasks/tasks.json',
			expect.objectContaining({
				tasks: expect.arrayContaining([
					expect.objectContaining({
						id: 4,
						dependencies: [] // Invalid dependencies should be filtered out
					})
				])
			})
		);
		expect(context.mcpLog.warn).toHaveBeenCalledWith(
			expect.stringContaining(
				'The following dependencies do not exist or are invalid: 999'
			)
		);
	});

	test('should use specified priority', async () => {
		// Arrange
		const prompt = 'Create a new authentication system';
		const priority = 'high';
		const context = {
			mcpLog: createMcpLogMock()
		};

		// Act
		await addTask('tasks/tasks.json', prompt, [], priority, context, 'json');

		// Assert
		expect(writeJSON).toHaveBeenCalledWith(
			'tasks/tasks.json',
			expect.objectContaining({
				tasks: expect.arrayContaining([
					expect.objectContaining({
						priority: priority
					})
				])
			})
		);
	});

	test('should handle empty tasks file', async () => {
		// Arrange
		readJSON.mockReturnValue({ tasks: [] });
		const prompt = 'Create a new authentication system';
		const context = {
			mcpLog: createMcpLogMock()
		};

		// Act
		const result = await addTask(
			'tasks/tasks.json',
			prompt,
			[],
			'medium',
			context,
			'json'
		);

		// Assert
		expect(result.newTaskId).toBe(1); // First task should have ID 1
		expect(writeJSON).toHaveBeenCalledWith(
			'tasks/tasks.json',
			expect.objectContaining({
				tasks: expect.arrayContaining([
					expect.objectContaining({
						id: 1
					})
				])
			})
		);
	});

	test('should handle missing tasks file', async () => {
		// Arrange
		readJSON.mockReturnValue(null);
		const prompt = 'Create a new authentication system';
		const context = {
			mcpLog: createMcpLogMock()
		};

		// Act
		const result = await addTask(
			'tasks/tasks.json',
			prompt,
			[],
			'medium',
			context,
			'json'
		);

		// Assert
		expect(result.newTaskId).toBe(1); // First task should have ID 1
		expect(writeJSON).toHaveBeenCalledTimes(2); // Once to create file, once to add task
	});

	test('should handle AI service errors', async () => {
		// Arrange
		generateObjectService.mockRejectedValueOnce(new Error('AI service failed'));
		const prompt = 'Create a new authentication system';
		const context = {
			mcpLog: createMcpLogMock()
		};

		// Act & Assert
		await expect(
			addTask('tasks/tasks.json', prompt, [], 'medium', context, 'json')
		).rejects.toThrow('AI service failed');
	});

	test('should handle file read errors', async () => {
		// Arrange
		readJSON.mockImplementation(() => {
			throw new Error('File read failed');
		});
		const prompt = 'Create a new authentication system';
		const context = {
			mcpLog: createMcpLogMock()
		};

		// Act & Assert
		await expect(
			addTask('tasks/tasks.json', prompt, [], 'medium', context, 'json')
		).rejects.toThrow('File read failed');
	});

	test('should handle file write errors', async () => {
		// Arrange
		writeJSON.mockImplementation(() => {
			throw new Error('File write failed');
		});
		const prompt = 'Create a new authentication system';
		const context = {
			mcpLog: createMcpLogMock()
		};

		// Act & Assert
		await expect(
			addTask('tasks/tasks.json', prompt, [], 'medium', context, 'json')
		).rejects.toThrow('File write failed');
	});

	// New tests for manual task data and positioning functionality
	describe('Manual Task Data', () => {
		test('should use manual task data when provided', async () => {
			// Arrange
			const prompt = 'Create a new authentication system';
			const manualTaskData = {
				title: 'Custom Title',
				description: 'Custom Description',
				assignees: ['user1', 'user2'],
				executor: 'human',
				priority: 'high'
			};
			const context = { mcpLog: createMcpLogMock() };

			// Act
			const result = await addTask(
				'tasks/tasks.json',
				prompt,
				[], // dependencies
				null, // priority (should use manual data)
				context,
				'json',
				manualTaskData,
				false // useResearch
			);

			// Assert
			expect(writeJSON).toHaveBeenCalledWith(
				'tasks/tasks.json',
				expect.objectContaining({
					tasks: expect.arrayContaining([
						expect.objectContaining({
							id: 4,
							title: 'Custom Title',
							description: 'Custom Description',
							assignees: ['user1', 'user2'],
							executor: 'human',
							// Note: priority comes from manualTaskData when parameter priority is null
							priority: 'high'
						})
					])
				})
			);
		});

		test('should use default values when manual task data is missing fields', async () => {
			// Arrange
			const prompt = 'Create a new authentication system';
			const manualTaskData = {
				title: 'Custom Title',
				description: 'Custom Description'
				// Missing other fields
			};
			const context = { mcpLog: createMcpLogMock() };

			// Act
			await addTask(
				'tasks/tasks.json',
				prompt,
				[],
				'medium',
				context,
				'json',
				manualTaskData,
				false
			);

			// Assert
			expect(writeJSON).toHaveBeenCalledWith(
				'tasks/tasks.json',
				expect.objectContaining({
					tasks: expect.arrayContaining([
						expect.objectContaining({
							title: 'Custom Title',
							assignees: [],
							executor: 'agent'
						})
					])
				})
			);
		});
	});

	describe('Task ID Positioning', () => {
		test('should insert task at specific position when taskId is provided', async () => {
			// Arrange
			const prompt = 'New Task';
			const manualTaskData = {
				title: 'Inserted Task',
				description: 'Task inserted at position 2',
				id: 2 // Insert at position 2
			};
			const context = { mcpLog: createMcpLogMock() };

			// Act
			const result = await addTask(
				'tasks/tasks.json',
				prompt,
				[],
				'medium',
				context,
				'json',
				manualTaskData,
				false
			);

			// Assert
			expect(result.newTaskId).toBe(2);
			expect(writeJSON).toHaveBeenCalledWith(
				'tasks/tasks.json',
				expect.objectContaining({
					tasks: expect.arrayContaining([
						expect.objectContaining({ id: 1, title: 'Task 1' }), // Unchanged
						expect.objectContaining({ id: 2, title: 'Inserted Task' }), // New task
						expect.objectContaining({ id: 3, title: 'Task 2' }), // Shifted from 2 to 3
						expect.objectContaining({ id: 4, title: 'Task 3' }) // Shifted from 3 to 4
					])
				})
			);
		});

		test('should append to end when taskId is not provided', async () => {
			// Arrange
			const prompt = 'New Task';
			const manualTaskData = {
				title: 'Appended Task',
				description: 'Task appended to end'
				// No taskId
			};
			const context = { mcpLog: createMcpLogMock() };

			// Act
			const result = await addTask(
				'tasks/tasks.json',
				prompt,
				[],
				'medium',
				context,
				'json',
				manualTaskData,
				false
			);

			// Assert
			expect(result.newTaskId).toBe(4);
			expect(writeJSON).toHaveBeenCalledWith(
				'tasks/tasks.json',
				expect.objectContaining({
					tasks: expect.arrayContaining([
						expect.objectContaining({ id: 1, title: 'Task 1' }),
						expect.objectContaining({ id: 2, title: 'Task 2' }),
						expect.objectContaining({ id: 3, title: 'Task 3' }),
						expect.objectContaining({ id: 4, title: 'Appended Task' })
					])
				})
			);
		});

		test('should handle inserting at position 1', async () => {
			// Arrange
			const prompt = 'First Task';
			const manualTaskData = {
				title: 'New First Task',
				description: 'Task inserted at position 1',
				id: 1
			};
			const context = { mcpLog: createMcpLogMock() };

			// Act
			const result = await addTask(
				'tasks/tasks.json',
				prompt,
				[],
				'medium',
				context,
				'json',
				manualTaskData,
				false
			);

			// Assert
			expect(result.newTaskId).toBe(1);
			expect(writeJSON).toHaveBeenCalledWith(
				'tasks/tasks.json',
				expect.objectContaining({
					tasks: expect.arrayContaining([
						expect.objectContaining({ id: 1, title: 'New First Task' }),
						expect.objectContaining({ id: 2, title: 'Task 1' }), // Shifted
						expect.objectContaining({ id: 3, title: 'Task 2' }), // Shifted
						expect.objectContaining({ id: 4, title: 'Task 3' }) // Shifted
					])
				})
			);
		});

		test('should handle inserting beyond existing tasks', async () => {
			// Arrange
			const prompt = 'Future Task';
			const manualTaskData = {
				title: 'Task at Position 10',
				description: 'Task inserted beyond existing tasks',
				id: 10 // Beyond current tasks
			};
			const context = { mcpLog: createMcpLogMock() };

			// Act
			const result = await addTask(
				'tasks/tasks.json',
				prompt,
				[],
				'medium',
				context,
				'json',
				manualTaskData,
				false
			);

			// Assert
			expect(result.newTaskId).toBe(10); // Should use the specified taskId even if beyond existing tasks
		});
	});

	describe('Dependency Updating', () => {
		test('should update dependencies when task IDs shift', async () => {
			// Arrange - Task 3 depends on Task 1 originally
			const tasksWithDependencies = {
				tasks: [
					{ id: 1, title: 'Task 1', dependencies: [] },
					{ id: 2, title: 'Task 2', dependencies: [] },
					{ id: 3, title: 'Task 3', dependencies: [1, 2] }, // Depends on 1 and 2
					{ id: 4, title: 'Task 4', dependencies: [3] } // Depends on 3
				]
			};
			readJSON.mockReturnValue(tasksWithDependencies);

			const prompt = 'Inserted Task';
			const manualTaskData = {
				title: 'Inserted at Position 2',
				description: 'Task that will shift other tasks',
				id: 2 // Insert at position 2, shifting everything >= 2
			};
			const context = { mcpLog: createMcpLogMock() };

			// Act
			await addTask(
				'tasks/tasks.json',
				prompt,
				[],
				'medium',
				context,
				'json',
				manualTaskData,
				false
			);

			// Assert - Dependencies should be updated
			expect(writeJSON).toHaveBeenCalledWith(
				'tasks/tasks.json',
				expect.objectContaining({
					tasks: expect.arrayContaining([
						expect.objectContaining({ id: 1, dependencies: [] }), // Unchanged
						expect.objectContaining({ id: 2, title: 'Inserted at Position 2' }), // New task
						expect.objectContaining({ id: 3, title: 'Task 2', dependencies: [] }), // Shifted, no deps to update
						expect.objectContaining({ id: 4, title: 'Task 3', dependencies: [1, 3] }), // Updated: 2 -> 3
						expect.objectContaining({ id: 5, title: 'Task 4', dependencies: [4] }) // Updated: 3 -> 4
					])
				})
			);
		});

		test('should handle subtask dependencies during ID shifting', async () => {
			// Arrange
			const tasksWithSubtasks = {
				tasks: [
					{ id: 1, title: 'Task 1', dependencies: [] },
					{ 
						id: 2, 
						title: 'Task 2', 
						dependencies: [],
						subtasks: [
							{ id: 1, title: 'Subtask 2.1', dependencies: [1] }, // Depends on Task 1
							{ id: 2, title: 'Subtask 2.2', dependencies: [2.1] } // Depends on Subtask 2.1
						]
					},
					{ id: 3, title: 'Task 3', dependencies: [2] } // Depends on Task 2
				]
			};
			readJSON.mockReturnValue(tasksWithSubtasks);

			const prompt = 'Inserted Task';
			const manualTaskData = {
				title: 'Inserted at Position 2',
				description: 'Task with subtask dependency handling',
				id: 2 // This will shift Task 2 to Task 3
			};
			const context = { mcpLog: createMcpLogMock() };

			// Act
			await addTask(
				'tasks/tasks.json',
				prompt,
				[],
				'medium',
				context,
				'json',
				manualTaskData,
				false
			);

			// Assert
			expect(writeJSON).toHaveBeenCalledWith(
				'tasks/tasks.json',
				expect.objectContaining({
					tasks: expect.arrayContaining([
						expect.objectContaining({ id: 1, title: 'Task 1' }),
						expect.objectContaining({ id: 2, title: 'Inserted at Position 2' }),
						expect.objectContaining({ 
							id: 3, 
							title: 'Task 2',
							subtasks: expect.arrayContaining([
								expect.objectContaining({ 
									id: 1, 
									title: 'Subtask 2.1', 
									dependencies: [1] // Task dependency unchanged (1 < 2)
								}),
								expect.objectContaining({ 
									id: 2, 
									title: 'Subtask 2.2', 
									dependencies: [3.1] // Subtask dependency updated (2.1 -> 3.1)
								})
							])
						}),
						expect.objectContaining({ 
							id: 4, 
							title: 'Task 3', 
							dependencies: [3] // Updated: 2 -> 3
						})
					])
				})
			);
		});
	});

	describe('Updated Function Signature', () => {
		test('should work with new function signature parameters', async () => {
			// Arrange
			const prompt = 'New Task';
			const dependencies = [1, 2];
			const priority = 'high';
			const context = { mcpLog: createMcpLogMock() };
			const manualTaskData = {
				title: 'Manual Task',
				description: 'Manual task description',
				assignees: ['user1'],
				executor: 'human',
				priority: 'medium'
			};
			const useResearch = false;

			// Act
			const result = await addTask(
				'tasks/tasks.json',
				prompt,
				dependencies,
				priority,
				context,
				'json',
				manualTaskData,
				useResearch
			);

			// Assert
			expect(result).toHaveProperty('newTaskId');
			expect(result).toHaveProperty('telemetryData');
			expect(writeJSON).toHaveBeenCalledWith(
				'tasks/tasks.json',
				expect.objectContaining({
					tasks: expect.arrayContaining([
						expect.objectContaining({
							title: 'Manual Task',
							dependencies: dependencies,
							priority: priority,
							assignees: ['user1'],
							executor: 'human'
						})
					])
				})
			);
		});

		test('should handle null manualTaskData gracefully', async () => {
			// Arrange
			const prompt = 'New Task';
			const context = { mcpLog: createMcpLogMock() };

			// Act
			const result = await addTask(
				'tasks/tasks.json',
				prompt,
				[],
				'medium',
				context,
				'json',
				null, // manualTaskData is null
				false
			);

			// Assert
			expect(result.newTaskId).toBe(4);
			expect(writeJSON).toHaveBeenCalledWith(
				'tasks/tasks.json',
				expect.objectContaining({
					tasks: expect.arrayContaining([
						expect.objectContaining({
							assignees: [], // Should use default
							executor: 'agent' // Should use default
						})
					])
				})
			);
		});
	});
});
