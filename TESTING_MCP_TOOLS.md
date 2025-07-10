# Testing MCP Tools in TaskMaster

This guide provides multiple approaches for testing the TaskMaster MCP server tools during development.

## Quick Testing Summary

There are **3 main ways** to test MCP tools:

1. **Unit Tests** - Fast, isolated testing of tool logic
2. **Manual Test Scripts** - Real MCP server with controlled requests  
3. **Cursor Integration** - Full end-to-end testing in actual development environment

## Method 1: Unit Tests (Fastest)

### Run All MCP Tool Tests
```bash
npm test -- tests/unit/mcp/tools/
```

### Test Specific Tool
```bash
npm test -- tests/unit/mcp/tools/update-task.test.js
```

**What this tests:**
- ✅ Tool registration and parameter definitions
- ✅ Argument validation and passing
- ✅ Error handling and response formatting
- ✅ Logging behavior

**What this doesn't test:**
- ❌ Real AI model calls
- ❌ Actual file system operations
- ❌ MCP protocol communication

## Method 2: Manual Test Scripts (Integration)

### For update_task Tool
```bash
node test-update-task-mcp.js
```

**Prerequisites:**
1. Have a valid `.taskmaster/default/tasks/tasks.json` file
2. Set up API keys in `.env` file (for AI operations)
3. Update `testTaskId` in the script to match an existing task

**What this tests:**
- ✅ Real MCP server startup
- ✅ Actual tool execution with real data
- ✅ File system changes
- ✅ AI model interactions (if enabled)
- ✅ End-to-end MCP communication

### Creating Tests for Other Tools

To create similar manual tests for other tools, follow this pattern:

```javascript
// Test configuration
const testConfig = {
    toolName: 'your_tool_name',
    testArgs: {
        // Your tool's arguments
        param1: 'value1',
        param2: 'value2',
        projectRoot: __dirname
    }
};

// Create MCP request
function createTestRequest() {
    return {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
            name: testConfig.toolName,
            arguments: testConfig.testArgs
        }
    };
}
```

## Method 3: Cursor Integration (Full E2E)

### Setup Cursor MCP Integration

1. **Configure `.cursor/mcp.json`:**
```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "node",
      "args": ["./mcp-server/server.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your_key_here",
        "PERPLEXITY_API_KEY": "your_key_here"
      }
    }
  }
}
```

2. **Restart Cursor** to load MCP configuration

3. **Test in Cursor Chat:**
```
Use the update_task tool to update task 1 with "Add more error handling"
```

**What this tests:**
- ✅ Full MCP protocol integration
- ✅ Real AI model usage
- ✅ Actual project file modifications
- ✅ User experience in real development environment

## Method 4: CLI Testing (Alternative)

You can also test the equivalent CLI commands:

### Direct CLI Testing
```bash
# Update a task
npx task-master-ai update-task --id=1 --prompt="Test update from CLI"

# Add a task  
npx task-master-ai add-task --prompt="Test new task" --priority=high

# Analyze complexity
npx task-master-ai analyze-complexity --research
```

## Development Workflow

### During Feature Development

1. **Write unit tests first** (`tests/unit/mcp/tools/`)
2. **Run unit tests** to verify basic functionality
3. **Test with manual script** to verify integration
4. **Test in Cursor** for full user experience

### Before Committing

```bash
# Run all MCP tool tests
npm test -- tests/unit/mcp/tools/

# Run broader test suite
npm test

# Manual verification (optional)
node test-update-task-mcp.js
```

## Debugging MCP Tools

### Enable Debug Logging

Add environment variables to your test environment:

```bash
export TASKMASTER_LOG_LEVEL=debug
export NODE_ENV=development
```

### View MCP Server Logs

When testing manually, server logs appear in the console:

```bash
node test-update-task-mcp.js
# Watch for server startup logs and request/response details
```

### Common Issues and Solutions

#### "Tool not found" Error
- Verify tool is registered in `mcp-server/src/tools/index.js`
- Check tool name matches exactly in requests

#### "API Key Missing" Error  
- Set up API keys in `.env` file (CLI) or `mcp.json` (Cursor)
- Verify the correct provider key for your selected model

#### "Tasks file not found" Error
- Run `npx task-master-ai init` to initialize project
- Verify `.taskmaster/default/tasks/tasks.json` exists

#### "Permission denied" Error
- Check file permissions on tasks.json
- Verify write access to project directory

## Performance Testing

### Load Testing MCP Tools

For performance testing, create scripts that send multiple requests:

```javascript
// Example: Test multiple update requests
for (let i = 1; i <= 10; i++) {
    const request = createTestRequest();
    request.params.arguments.id = i.toString();
    // Send request and measure response time
}
```

### Memory Usage Monitoring

Monitor MCP server memory usage during long-running operations:

```bash
# Monitor node process memory
top -pid $(pgrep -f "mcp-server/server.js")
```

## CI/CD Integration

### GitHub Actions Testing

```yaml
- name: Test MCP Tools
  run: |
    npm test -- tests/unit/mcp/tools/
    
- name: Integration Test (Mock APIs)  
  run: |
    export ANTHROPIC_API_KEY=mock_key
    node test-update-task-mcp.js || echo "Expected to fail without real API"
```

## Best Practices

1. **Always test with unit tests first** - they're fast and catch basic errors
2. **Use manual scripts for integration testing** - they test real behavior
3. **Test in Cursor for UX validation** - ensures the tool works as users expect
4. **Mock API calls in CI/CD** - avoid real API costs and rate limits
5. **Test error scenarios** - ensure tools handle failures gracefully
6. **Verify file changes** - ensure tools actually modify the intended files

## Troubleshooting Guide

| Problem | Solution |
|---------|----------|
| Tests fail with import errors | Check Node.js version (need 18+) |
| MCP server won't start | Verify all dependencies installed |
| API calls fail | Check API keys and network connection |
| File changes not persisting | Check file permissions and disk space |
| Timeout errors | Increase timeout in test configuration |

This comprehensive testing approach ensures your MCP tools work reliably across all usage scenarios. 