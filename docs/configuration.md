# Configuration

Taskmaster uses two primary methods for configuration:

1.  **`.taskmaster/config.json` File (Recommended - New Structure)**

    - This JSON file stores most configuration settings, including AI model selections, parameters, logging levels, and project defaults.
    - **Location:** This file is created in the `.taskmaster/` directory when you run the `task-master models --setup` interactive setup or initialize a new project with `task-master init`.
    - **Migration:** Existing projects with `.taskmasterconfig` in the root will continue to work, but should be migrated to the new structure using `task-master migrate`.
    - **Management:** Use the `task-master models --setup` command (or `models` MCP tool) to interactively create and manage this file. You can also set specific models directly using `task-master models --set-<role>=<model_id>`, adding `--ollama` or `--openrouter` flags for custom models. Manual editing is possible but not recommended unless you understand the structure.
    - **Example Structure:**
      ```json
      {
        "models": {
          "main": {
            "provider": "anthropic",
            "modelId": "claude-3-7-sonnet-20250219",
            "maxTokens": 64000,
            "temperature": 0.2,
            "baseURL": "https://api.anthropic.com/v1"
          },
          "research": {
            "provider": "perplexity",
            "modelId": "sonar-pro",
            "maxTokens": 8700,
            "temperature": 0.1,
            "baseURL": "https://api.perplexity.ai/v1"
          },
          "fallback": {
            "provider": "anthropic",
            "modelId": "claude-3-5-sonnet",
            "maxTokens": 64000,
            "temperature": 0.2
          }
        },
        "global": {
          "logLevel": "info",
          "debug": false,
          "defaultSubtasks": 5,
          "defaultPriority": "medium",
          "projectName": "Your Project Name",
          "defaultFlow": [
            {"status": "pending", "executor": "agent"}, 
            {"status": "in-progress", "executor": "agent"}, 
            {"status": "review", "executor": "agent"}, 
            {"status": "review", "executor": "human"}
          ],
          "ollamaBaseURL": "http://localhost:11434/api",
          "azureBaseURL": "https://your-endpoint.azure.com/",
          "vertexProjectId": "your-gcp-project-id",
          "vertexLocation": "us-central1"
        }
      }
      ```

2.  **Legacy `.taskmasterconfig` File (Backward Compatibility)**

    - For projects that haven't migrated to the new structure yet.
    - **Location:** Project root directory.
    - **Migration:** Use `task-master migrate` to move this to `.taskmaster/config.json`.
    - **Deprecation:** While still supported, you'll see warnings encouraging migration to the new structure.

## Environment Variables (`.env` file or MCP `env` block - For API Keys Only)

- Used **exclusively** for sensitive API keys and specific endpoint URLs.
- **Location:**
  - For CLI usage: Create a `.env` file in your project root.
  - For MCP/Cursor usage: Configure keys in the `env` section of your `.cursor/mcp.json` file.
- **Required API Keys (Depending on configured providers):**
  - `ANTHROPIC_API_KEY`: Your Anthropic API key.
  - `PERPLEXITY_API_KEY`: Your Perplexity API key.
  - `OPENAI_API_KEY`: Your OpenAI API key.
  - `GOOGLE_API_KEY`: Your Google API key (also used for Vertex AI provider).
  - `MISTRAL_API_KEY`: Your Mistral API key.
  - `AZURE_OPENAI_API_KEY`: Your Azure OpenAI API key (also requires `AZURE_OPENAI_ENDPOINT`).
  - `OPENROUTER_API_KEY`: Your OpenRouter API key.
  - `XAI_API_KEY`: Your X-AI API key.
- **Optional Endpoint Overrides:**
  - **Per-role `baseURL` in `.taskmasterconfig`:** You can add a `baseURL` property to any model role (`main`, `research`, `fallback`) to override the default API endpoint for that provider. If omitted, the provider's standard endpoint is used.
  - `AZURE_OPENAI_ENDPOINT`: Required if using Azure OpenAI key (can also be set as `baseURL` for the Azure model role).
  - `OLLAMA_BASE_URL`: Override the default Ollama API URL (Default: `http://localhost:11434/api`).
  - `VERTEX_PROJECT_ID`: Your Google Cloud project ID for Vertex AI. Required when using the 'vertex' provider.
  - `VERTEX_LOCATION`: Google Cloud region for Vertex AI (e.g., 'us-central1'). Default is 'us-central1'.
  - `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account credentials JSON file for Google Cloud auth (alternative to API key for Vertex AI).

**Important:** Settings like model ID selections (`main`, `research`, `fallback`), `maxTokens`, `temperature`, `logLevel`, `defaultSubtasks`, `defaultPriority`, `defaultFlow`, and `projectName` are **managed in `.taskmaster/config.json`** (or `.taskmasterconfig` for unmigrated projects), not environment variables.

## Workflow Configuration

### Default Task Flow

Taskmaster supports configurable task workflow states through the `defaultFlow` setting in the `global` section of your configuration. This provides a standard progression for tasks through your development workflow.

**Default Flow:** `["pending", "in-progress", "review", "done"]`

- **pending**: Tasks ready to be worked on
- **in-progress**: Tasks currently being implemented  
- **review**: Tasks completed and awaiting verification (use `executor` field to specify reviewer type)
- **done**: Fully completed and verified tasks

**Custom Workflow Example:**
```json
{
  "global": {
    "defaultFlow": ["backlog", "ready", "doing", "testing", "review", "done", "deployed"]
  }
}
```

**Usage Notes:**
- The `defaultFlow` provides guidance but doesn't restrict status values
- Tasks can use any status values (including custom ones like 'blocked', 'deferred')
- The flow serves as a recommended progression for typical task lifecycle
- Workflow states help organize task management and team coordination

### Review Status and Executor Field

The `review` status is designed to work with the `executor` field to distinguish between different types of reviews:

- **Agent Review**: `status="review"` with `executor="agent"` - Tasks completed by AI/agents awaiting verification
- **Human Review**: `status="review"` with `executor="human"` - Tasks requiring human validation or approval

Use the set-status command with executor parameter:
```bash
# Set task for agent review
task-master set-status --id=5 --status=review --executor=agent

# Set task for human review  
task-master set-status --id=5 --status=review --executor=human
```

## Example `.env` File (for API Keys)

```
# Required API keys for providers configured in .taskmasterconfig
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
PERPLEXITY_API_KEY=pplx-your-key-here
# OPENAI_API_KEY=sk-your-key-here
# GOOGLE_API_KEY=AIzaSy...
# etc.

# Optional Endpoint Overrides
# AZURE_OPENAI_ENDPOINT=https://your-azure-endpoint.openai.azure.com/
# OLLAMA_BASE_URL=http://custom-ollama-host:11434/api

# Google Vertex AI Configuration (Required if using 'vertex' provider)
# VERTEX_PROJECT_ID=your-gcp-project-id
# VERTEX_LOCATION=us-central1
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-credentials.json
```

## Troubleshooting

### Configuration Errors

- If Task Master reports errors about missing configuration or cannot find the config file, run `task-master models --setup` in your project root to create or repair the file.
- For new projects, config will be created at `.taskmaster/config.json`. For legacy projects, you may want to use `task-master migrate` to move to the new structure.
- Ensure API keys are correctly placed in your `.env` file (for CLI) or `.cursor/mcp.json` (for MCP) and are valid for the providers selected in your config file.

### If `task-master init` doesn't respond:

Try running it with Node directly:

```bash
node node_modules/claude-task-master/scripts/init.js
```

Or clone the repository and run:

```bash
git clone https://github.com/eyaltoledano/claude-task-master.git
cd claude-task-master
node scripts/init.js
```

## Provider-Specific Configuration

### Google Vertex AI Configuration

Google Vertex AI is Google Cloud's enterprise AI platform and requires specific configuration:

1. **Prerequisites**:
   - A Google Cloud account with Vertex AI API enabled
   - Either a Google API key with Vertex AI permissions OR a service account with appropriate roles
   - A Google Cloud project ID
2. **Authentication Options**:
   - **API Key**: Set the `GOOGLE_API_KEY` environment variable
   - **Service Account**: Set `GOOGLE_APPLICATION_CREDENTIALS` to point to your service account JSON file
3. **Required Configuration**:
   - Set `VERTEX_PROJECT_ID` to your Google Cloud project ID
   - Set `VERTEX_LOCATION` to your preferred Google Cloud region (default: us-central1)
4. **Example Setup**:

   ```bash
   # In .env file
   GOOGLE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX
   VERTEX_PROJECT_ID=my-gcp-project-123
   VERTEX_LOCATION=us-central1
   ```

   Or using service account:

   ```bash
   # In .env file
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   VERTEX_PROJECT_ID=my-gcp-project-123
   VERTEX_LOCATION=us-central1
   ```

5. **In .taskmasterconfig**:
   ```json
   "global": {
     "vertexProjectId": "my-gcp-project-123",
     "vertexLocation": "us-central1"
   }
   ```
