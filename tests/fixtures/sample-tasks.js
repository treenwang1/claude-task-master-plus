/**
 * Sample task data for testing
 */

export const sampleTasks = {
	meta: {
		projectName: 'Test Project',
		projectVersion: '1.0.0',
		createdAt: '2023-01-01T00:00:00.000Z',
		updatedAt: '2023-01-01T00:00:00.000Z'
	},
	tasks: [
		{
			id: 1,
			title: 'Initialize Project',
			description: 'Set up the project structure and dependencies',
			status: 'done',
			dependencies: [],
			priority: 'high',
			details:
				'Create directory structure, initialize package.json, and install dependencies',
			testStrategy: 'Verify all directories and files are created correctly',
			verifications: [
				{
					description: 'Check if package.json exists',
					passed: true
				},
				{
					description: 'Verify directory structure is correct',
					passed: true
				}
			],
			results: 'Project initialized successfully with all required files and directories',
			metadata: {
				fields: [
					{
						key: 'projectName',
						label: 'Project Name',
						type: 'text',
						description: 'Name of the project',
						required: true
					}
				],
				mcp: ['filesystem'],
				linksTo: {
					taskGroup: 'setup'
				}
			}
		},
		{
			id: 2,
			title: 'Create Core Functionality',
			description: 'Implement the main features of the application',
			status: 'in-progress',
			dependencies: [1],
			priority: 'high',
			details:
				'Implement user authentication, data processing, and API endpoints',
			testStrategy: 'Write unit tests for all core functions',
			verifications: [
				{
					description: 'Authentication system is working',
					passed: true
				},
				{
					description: 'Database connection established',
					passed: false
				}
			],
			results: 'Authentication implemented, database setup in progress',
			metadata: {
				fields: [
					{
						key: 'authProvider',
						label: 'Authentication Provider',
						type: 'select',
						description: 'Choose authentication provider',
						required: true,
						enum: ['jwt', 'oauth', 'session']
					}
				],
				mcp: ['database', 'authentication'],
				linkedBy: {
					taskGroup: 'setup'
				}
			},
			subtasks: [
				{
					id: 1,
					title: 'Implement Authentication',
					description: 'Create user authentication system',
					status: 'done',
					dependencies: [],
					verifications: [
						{
							description: 'Login functionality works',
							passed: true
						}
					],
					results: 'JWT authentication implemented successfully',
					metadata: {
						fields: [
							{
								key: 'tokenExpiry',
								label: 'Token Expiry',
								type: 'number',
								description: 'Token expiry time in hours',
								required: true
							}
						],
						mcp: ['jwt']
					}
				},
				{
					id: 2,
					title: 'Set Up Database',
					description: 'Configure database connection and models',
					status: 'pending',
					dependencies: [1],
					verifications: [
						{
							description: 'Database connection established',
							passed: false
						}
					],
					results: '',
					metadata: {
						fields: [
							{
								key: 'dbType',
								label: 'Database Type',
								type: 'select',
								description: 'Type of database to use',
								required: true,
								enum: ['postgresql', 'mysql', 'mongodb']
							}
						],
						mcp: ['database']
					}
				}
			]
		},
		{
			id: 3,
			title: 'Implement UI Components',
			description: 'Create the user interface components',
			status: 'pending',
			dependencies: [2],
			priority: 'medium',
			details: 'Design and implement React components for the user interface',
			testStrategy: 'Test components with React Testing Library',
			subtasks: [
				{
					id: 1,
					title: 'Create Header Component',
					description: 'Implement the header component',
					status: 'pending',
					dependencies: [],
					details: 'Create a responsive header with navigation links'
				},
				{
					id: 2,
					title: 'Create Footer Component',
					description: 'Implement the footer component',
					status: 'pending',
					dependencies: [],
					details: 'Create a footer with copyright information and links'
				}
			]
		}
	]
};

export const emptySampleTasks = {
	meta: {
		projectName: 'Empty Project',
		projectVersion: '1.0.0',
		createdAt: '2023-01-01T00:00:00.000Z',
		updatedAt: '2023-01-01T00:00:00.000Z'
	},
	tasks: []
};
