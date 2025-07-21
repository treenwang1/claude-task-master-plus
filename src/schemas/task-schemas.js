/**
 * task-schemas.js
 * Centralized Zod schemas for task and subtask validation
 */

import { z } from 'zod';

// Base verification schema used in both tasks and subtasks
export const verificationSchema = z.object({
    description: z.string().describe('Description of what to verify'),
    passed: z.boolean().describe('Whether this verification has passed')
});

// Result entry schema for tracking task/subtask execution results
export const resultSchema = z.object({
    action: z.string().describe('The action that was performed'),
    updateTime: z.string().datetime().describe('ISO datetime string when this result was recorded'),
    result: z.string().describe('The outcome or result of the action')
});

// Results schema for tracking task/subtask execution results
export const resultsSchema = z.array(resultSchema).describe('Array of result entries tracking the execution history of the task/subtask');

// Metadata field schema used in both tasks and subtasks
export const metadataFieldSchema = z.object({
    key: z.string().describe('Field key'),
    label: z.string().describe('Field label'),
    type: z.string().describe('Field input type'),
    description: z.string().describe('Field description'),
    required: z.boolean().describe('Whether field is required'),
    enum: z.array(z.string()).optional().describe('Enum values for select fields'),
    value: z.string().optional().describe('The value for the field')
});

// Task group linkage schema
export const taskGroupLinkageSchema = z.object({
    taskGroup: z.string().describe('Task group this item links to')
});

// Base metadata schema used in both tasks and subtasks
export const metadataSchema = z.object({
    fields: z
        .array(metadataFieldSchema)
        .optional()
        .describe('Custom fields for this item'),
    mcp: z
        .array(z.string())
        .optional()
        .describe('MCP servers required for this item'),
    linksTo: taskGroupLinkageSchema
        .optional()
        .describe('Task group linkage'),
    linkedBy: taskGroupLinkageSchema
        .optional()
        .describe('Task group linked by this item')
});

// Subtask schema - used for task expansion and subtask validation
export const subtaskSchema = z
    .object({
        id: z
            .number()
            .int()
            .positive()
            .describe('Sequential subtask ID starting from 1'),
        title: z.string().min(5).describe('Clear, specific title for the subtask'),
        description: z
            .string()
            .min(10)
            .describe('Detailed description of the subtask'),
        dependencies: z
            .array(z.number().int())
            .describe('IDs of prerequisite subtasks within this expansion'),
        details: z.string().min(20).describe('Implementation details and guidance'),
        status: z
            .string()
            .describe(
                'The current status of the subtask (should be pending initially)'
            ),
        testStrategy: z
            .string()
            .optional()
            .describe('Approach for testing this subtask'),
        executor: z
            .enum(['agent', 'human'])
            .optional()
            .default('agent')
            .describe('Who should execute this subtask: "agent" for AI agents or "human" for manual execution'),
        verifications: z
            .array(verificationSchema)
            .optional()
            .describe('Array of verification steps to check if the subtask is completed correctly'),
        metadata: metadataSchema
            .optional()
            .describe('Metadata for subtask configuration and relationships')
    })
    .strict();

// Array of subtasks schema
export const subtaskArraySchema = z.array(subtaskSchema);

// Subtask wrapper schema for AI responses
export const subtaskWrapperSchema = z.object({
    subtasks: subtaskArraySchema.describe('The array of generated subtasks.')
});

// Task schema for PRD parsing and task creation
export const taskSchema = z.object({
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
        .array(verificationSchema)
        .optional()
        .default([])
        .describe('Array of verification steps to check if the task is completed correctly'),
    results: resultsSchema
        .optional()
        .describe('Array of result entries tracking the execution history of the task'),
    metadata: metadataSchema
        .optional()
        .default({})
        .describe('Metadata for task configuration and relationships'),
    subtasks: subtaskArraySchema
        .optional()
        .describe('Array of subtasks for this task')
});

// Task array schema
export const taskArraySchema = z.array(taskSchema);

// AI task data schema for add-task functionality
export const aiTaskDataSchema = z.object({
    title: z.string().describe('Clear, concise title for the task'),
    description: z
        .string()
        .describe('A one or two sentence description of the task'),
    details: z
        .string()
        .describe('In-depth implementation details, considerations, and guidance'),
    testStrategy: z
        .string()
        .describe('Detailed approach for verifying task completion'),
    dependencies: z
        .array(z.number())
        .optional()
        .describe(
            'Array of task IDs that this task depends on (must be completed before this task can start)'
        ),
    assignees: z
        .array(z.string())
        .optional()
        .describe('Array of people or teams assigned to this task (usernames, emails, or team names)'),
    executor: z
        .enum(['agent', 'human'])
        .optional()
        .describe('Who should execute this task: "agent" for AI agents to handle automatically, "human" for manual execution by humans. Defaults to "agent".'),
    verifications: z
        .array(verificationSchema)
        .optional()
        .describe('Array of verification steps to check if the task is completed correctly'),
    metadata: metadataSchema
        .optional()
        .describe('Metadata for task configuration and relationships')
});
export const aiUpdateTaskDataSchema = aiTaskDataSchema.extend({
    id: z.number().int().describe('ID of the task to update'),
    subtasks: subtaskArraySchema
        .optional()
        .describe('Array of subtasks for this task')

});

// Updated task schema for task updates (more flexible)
export const updatedTaskSchema = z
    .object({
        id: z.number().int(),
        title: z.string(),
        description: z.string(),
        status: z.string(),
        dependencies: z.array(z.union([z.number().int(), z.string()])),
        priority: z.string().optional(),
        details: z.string().optional(),
        testStrategy: z.string().optional(),
        executor: z.enum(['agent', 'human']).optional().default('agent'),
        subtasks: z.array(z.any()).optional() // Keep subtasks flexible for updates
    })
    .strip(); // Allow potential extra fields during parsing

// Updated task array schema
export const updatedTaskArraySchema = z.array(updatedTaskSchema);

// PRD response schema
export const prdResponseSchema = z.object({
    tasks: taskArraySchema,
    metadata: z.object({
        projectName: z.string(),
        totalTasks: z.number(),
        sourceFile: z.string(),
        generatedAt: z.string()
    })
});

// Provided tasks schema for PRD parsing
export const providedTasksSchema = taskArraySchema; 