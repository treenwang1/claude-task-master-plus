# MCP Tools Testing

This directory contains unit tests for the Task Master MCP server tools. These tests verify that the tools are registered correctly, handle parameters properly, and manage errors appropriately.

## Test Structure

Each MCP tool has its own test file that follows a consistent pattern:

- **Mocking**: All dependencies are mocked to isolate the tool logic
- **Registration Testing**: Verifies the tool is registered with correct parameters
- **Parameter Testing**: Tests various parameter combinations and edge cases
- **Error Handling**: Tests how the tool handles different error scenarios
- **Logging**: Verifies proper logging behavior

## Available Tests

### `add-task.test.js`
Tests the `add_task` MCP tool that creates new tasks using AI.

**Key test scenarios:**
- Tool registration with correct parameters
- Parameter passing to `addTaskDirect`
- Research parameter handling
- Priority parameter validation
- Error handling from direct functions

### `analyze-complexity.test.js`
Tests the `analyze_project_complexity` MCP tool that analyzes task complexity.

**Key test scenarios:**
- Threshold parameter handling (number and string)
- Decimal threshold support
- Research parameter functionality
- Error propagation from analysis functions

### `initialize-project.test.js`
Tests the `initialize_project` MCP tool that sets up new TaskMaster projects.

**Key test scenarios:**
- Command construction with proper arguments
- Special character escaping in arguments
- Success and error response handling
- Logging of execution details

### `update-task.test.js`
Tests the `update_task` MCP tool that updates existing tasks with new information.

**Key test scenarios:**
- Regular task and subtask ID handling
- Path resolution and validation
- Research parameter functionality
- Custom file path support
- Telemetry data handling
- Various task ID formats (1, 1.2, etc.)

## Running Tests

### Run All MCP Tool Tests
```bash
npm test -- tests/unit/mcp/tools/
```

### Run Individual Test Files
```bash
npm test -- tests/unit/mcp/tools/update-task.test.js
npm test -- tests/unit/mcp/tools/add-task.test.js
npm test -- tests/unit/mcp/tools/analyze-complexity.test.js
npm test -- tests/unit/mcp/tools/initialize-project.test.js
```

### Run with Verbose Output
```bash
npm test -- tests/unit/mcp/tools/ --verbose
```

## Test Patterns

### Mocking Strategy
Each test file follows this mocking pattern:

1. **Mock Direct Functions**: The core business logic functions (e.g., `updateTaskByIdDirect`)
2. **Mock Utilities**: Helper functions like `handleApiResult`, `createErrorResponse`
3. **Mock Path Utilities**: Path resolution functions like `findTasksPath`
4. **Mock Zod**: Schema validation library for parameter definitions

### Test Data
Tests use realistic test data that mirrors actual usage:

```javascript
const validArgs = {
    id: '1',
    prompt: 'Update task with new requirements',
    research: true,
    projectRoot: '/mock/project/root'
};
```

### Response Validation
Tests verify both success and error responses:

```javascript
const successResponse = {
    success: true,
    data: {
        taskId: '1',
        message: 'Successfully updated task #1',
        telemetryData: { /* ... */ }
    }
};

const errorResponse = {
    success: false,
    error: {
        code: 'UPDATE_TASK_ERROR',
        message: 'Failed to update task'
    }
};
```

## Manual Testing

For integration testing with real data, use the manual test script:

```bash
node test-update-task-mcp.js
```

This script:
- Starts a real MCP server
- Sends actual requests to the `update_task` tool
- Verifies responses and file changes
- Requires valid tasks.json and API keys

## Adding New Tests

When adding tests for new MCP tools:

1. **Follow the naming pattern**: `{tool-name}.test.js`
2. **Use the established mocking structure**
3. **Test all parameter variations**
4. **Include error scenarios**
5. **Verify logging behavior**
6. **Test telemetry data handling if applicable**

## Test Coverage

These tests focus on:
- ✅ Tool registration and configuration
- ✅ Parameter validation and passing
- ✅ Error handling and propagation
- ✅ Logging behavior
- ✅ Response format validation

These tests do NOT cover:
- ❌ Actual AI model interactions (mocked)
- ❌ File system operations (mocked)
- ❌ Network requests (mocked)
- ❌ End-to-end MCP protocol communication

For full integration testing, use the CLI tests or manual test scripts. 