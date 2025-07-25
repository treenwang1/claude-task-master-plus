
# Claude Task Master - Product Requirements Document

<PRD>
# Technical Architecture  

## System Components
1. **Task Management Core**
   - Tasks.json file structure (single source of truth)
   - Task model with dependencies, priorities, and metadata
   - Task state management system
   - Task file generation subsystem

2. **AI Integration Layer**
   - Anthropic Claude API integration
   - Perplexity API integration (optional)
   - Prompt engineering components
   - Response parsing and processing

3. **Command Line Interface**
   - Command parsing and execution
   - Interactive user input handling
   - Display and formatting utilities
   - Status reporting and feedback system

4. **Cursor AI Integration**
   - Cursor rules documentation
   - Agent interaction patterns
   - Workflow guideline specifications

## Data Models

### Task Model
```json
{
  "id": 1,
  "title": "Task Title",
  "description": "Brief task description",
  "status": "pending|done|deferred",
  "dependencies": [0],
  "priority": "high|medium|low",
  "details": "Detailed implementation instructions",
  "testStrategy": "Verification approach details",
  "subtasks": [
    {
      "id": 1,
      "title": "Subtask Title",
      "description": "Subtask description",
      "status": "pending|done|deferred",
      "dependencies": [],
      "acceptanceCriteria": "Verification criteria"
    }
  ]
}
```

### Tasks Collection Model
```json
{
  "meta": {
    "projectName": "Project Name",
    "version": "1.0.0",
    "prdSource": "path/to/prd.md",
    "createdAt": "ISO-8601 timestamp",
    "updatedAt": "ISO-8601 timestamp"
  },
  "tasks": [
    // Array of Task objects
  ]
}
```

### Task File Format
```
# Task ID: <id>
# Title: <title>
# Status: <status>
# Dependencies: <comma-separated list of dependency IDs>
# Priority: <priority>
# Description: <brief description>
# Details:
<detailed implementation notes>

# Test Strategy:
<verification approach>

# Subtasks:
1. <subtask title> - <subtask description>
```

## APIs and Integrations
1. **Anthropic Claude API**
   - Authentication via API key
   - Prompt construction and streaming
   - Response parsing and extraction
   - Error handling and retries

2. **Perplexity API (via OpenAI client)**
   - Authentication via API key
   - Research-oriented prompt construction
   - Enhanced contextual response handling
   - Fallback mechanisms to Claude

3. **File System API**
   - Reading/writing tasks.json
   - Managing individual task files
   - Command execution logging
   - Debug logging system

## Infrastructure Requirements
1. **Node.js Runtime**
   - Version 14.0.0 or higher
   - ES Module support
   - File system access rights
   - Command execution capabilities

2. **Configuration Management**
   - Environment variable handling
   - .env file support
   - Configuration validation
   - Sensible defaults with overrides

3. **Development Environment**
   - Git repository
   - NPM package management
   - Cursor editor integration
   - Command-line terminal access

# Development Roadmap  

## Phase 1: Core Task Management System
1. **Task Data Structure**
   - Design and implement the tasks.json structure
   - Create task model validation
   - Implement basic task operations (create, read, update)
   - Develop file system interactions

2. **Command Line Interface Foundation**
   - Implement command parsing with Commander.js
   - Create help documentation
   - Implement colorized console output
   - Add logging system with configurable levels

3. **Basic Task Operations**
   - Implement task listing functionality
   - Create task status update capability
   - Add dependency tracking
   - Implement priority management

4. **Task File Generation**
   - Create task file templates
   - Implement generation from tasks.json
   - Add bi-directional synchronization
   - Implement proper file naming and organization

## Phase 2: AI Integration
1. **Claude API Integration**
   - Implement API authentication
   - Create prompt templates for PRD parsing
   - Design response handlers
   - Add error management and retries

2. **PRD Parsing System**
   - Implement PRD file reading
   - Create PRD to task conversion logic
   - Add intelligent dependency inference
   - Implement priority assignment logic

3. **Task Expansion With Claude**
   - Create subtask generation prompts
   - Implement subtask creation workflow
   - Add context-aware expansion capabilities
   - Implement parent-child relationship management

4. **Implementation Drift Handling**
   - Add capability to update future tasks
   - Implement task rewriting based on new context
   - Create dependency chain updates
   - Preserve completed work while updating future tasks

## Phase 3: Advanced Features
1. **Perplexity Integration**
   - Implement Perplexity API authentication
   - Create research-oriented prompts
   - Add fallback to Claude when unavailable
   - Implement response quality comparison logic

2. **Research-Backed Subtask Generation**
   - Create specialized research prompts
   - Implement context enrichment
   - Add domain-specific knowledge incorporation
   - Create more detailed subtask generation

3. **Batch Operations**
   - Implement multi-task status updates
   - Add bulk subtask generation
   - Create task filtering and querying
   - Implement advanced dependency management

4. **Project Initialization**
   - Create project templating system
   - Implement interactive setup
   - Add environment configuration
   - Create documentation generation

## Phase 4: Cursor AI Integration
1. **Cursor Rules Implementation**
   - Create dev_workflow.mdc documentation
   - Implement cursor_rules.mdc
   - Add self_improve.mdc
   - Design rule integration documentation

2. **Agent Workflow Guidelines**
   - Document task discovery workflow
   - Create task selection guidelines
   - Implement implementation guidance
   - Add verification procedures

3. **Agent Command Integration**
   - Document command syntax for agents
   - Create example interactions
   - Implement agent response patterns
   - Add context management for agents

4. **User Documentation**
   - Create detailed README
   - Add scripts documentation
   - Implement example workflows
   - Create troubleshooting guides

# Logical Dependency Chain

## Foundation Layer
1. **Task Data Structure**
   - Must be implemented first as all other functionality depends on this
   - Defines the core data model for the entire system
   - Establishes the single source of truth concept

2. **Command Line Interface**
   - Built on top of the task data structure
   - Provides the primary user interaction mechanism
   - Required for all subsequent operations to be accessible

3. **Basic Task Operations**
   - Depends on both task data structure and CLI
   - Provides the fundamental operations for task management
   - Enables the minimal viable workflow

## Functional Layer
4. **Task File Generation**
   - Depends on task data structure and basic operations
   - Creates the individual task files for reference
   - Enables the file-based workflow complementing tasks.json

5. **Claude API Integration**
   - Independent of most previous components but needs the task data structure
   - Provides the AI capabilities that enhance the system
   - Gateway to advanced task generation features

6. **PRD Parsing System**
   - Depends on Claude API integration and task data structure
   - Enables the initial task generation workflow
   - Creates the starting point for new projects

## Enhancement Layer
7. **Task Expansion With Claude**
   - Depends on Claude API integration and basic task operations
   - Enhances existing tasks with more detailed subtasks
   - Improves the implementation guidance

8. **Implementation Drift Handling**
   - Depends on Claude API integration and task operations
   - Addresses a key challenge in AI-driven development
   - Maintains the relevance of task planning as implementation evolves

9. **Perplexity Integration**
   - Can be developed in parallel with other features after Claude integration
   - Enhances the quality of generated content
   - Provides research-backed improvements

## Advanced Layer
10. **Research-Backed Subtask Generation**
    - Depends on Perplexity integration and task expansion
    - Provides higher quality, more contextual subtasks
    - Enhances the value of the task breakdown

11. **Batch Operations**
    - Depends on basic task operations
    - Improves efficiency for managing multiple tasks
    - Quality-of-life enhancement for larger projects

12. **Project Initialization**
    - Depends on most previous components being stable
    - Provides a smooth onboarding experience
    - Creates a complete project setup in one step

## Integration Layer
13. **Cursor Rules Implementation**
    - Can be developed in parallel after basic functionality
    - Provides the guidance for Cursor AI agent
    - Enhances the AI-driven workflow

14. **Agent Workflow Guidelines**
    - Depends on Cursor rules implementation
    - Structures how the agent interacts with the system
    - Ensures consistent agent behavior

15. **Agent Command Integration**
    - Depends on agent workflow guidelines
    - Provides specific command patterns for the agent
    - Optimizes the agent-user interaction

16. **User Documentation**
    - Should be developed alongside all features
    - Must be completed before release
    - Ensures users can effectively use the system

# Risks and Mitigations  

## Technical Challenges

### API Reliability
**Risk**: Anthropic or Perplexity API could have downtime, rate limiting, or breaking changes.
**Mitigation**: 
- Implement robust error handling with exponential backoff
- Add fallback mechanisms (Claude fallback for Perplexity)
- Cache important responses to reduce API dependency
- Support offline mode for critical functions

### Model Output Variability
**Risk**: AI models may produce inconsistent or unexpected outputs.
**Mitigation**:
- Design robust prompt templates with strict output formatting requirements
- Implement response validation and error detection
- Add self-correction mechanisms and retries with improved prompts
- Allow manual editing of generated content

### Node.js Version Compatibility
**Risk**: Differences in Node.js versions could cause unexpected behavior.
**Mitigation**:
- Clearly document minimum Node.js version requirements
- Use transpilers if needed for compatibility
- Test across multiple Node.js versions
- Handle version-specific features gracefully

## MVP Definition

### Feature Prioritization
**Risk**: Including too many features in the MVP could delay release and adoption.
**Mitigation**:
- Define MVP as core task management + basic Claude integration
- Ensure each phase delivers a complete, usable product
- Implement feature flags for easy enabling/disabling of features
- Get early user feedback to validate feature importance

### Scope Creep
**Risk**: The project could expand beyond its original intent, becoming too complex.
**Mitigation**:
- Maintain a strict definition of what the tool is and isn't
- Focus on task management for AI-driven development
- Evaluate new features against core value proposition
- Implement extensibility rather than building every feature

### User Expectations
**Risk**: Users might expect a full project management solution rather than a task tracking system.
**Mitigation**:
- Clearly communicate the tool's purpose and limitations
- Provide integration points with existing project management tools
- Focus on the unique value of AI-driven development
- Document specific use cases and example workflows

## Resource Constraints

### Development Capacity
**Risk**: Limited development resources could delay implementation.
**Mitigation**:
- Phase implementation to deliver value incrementally
- Focus on core functionality first
- Leverage open source libraries where possible
- Design for extensibility to allow community contributions

### AI Cost Management
**Risk**: Excessive API usage could lead to high costs.
**Mitigation**:
- Implement token usage tracking and reporting
- Add configurable limits to prevent unexpected costs
- Cache responses where appropriate
- Optimize prompts for token efficiency
- Support local LLM options in the future

### Documentation Overhead
**Risk**: Complexity of the system requires extensive documentation that is time-consuming to maintain.
**Mitigation**:
- Use AI to help generate and maintain documentation
- Create self-documenting commands and features
- Implement progressive documentation (basic to advanced)
- Build help directly into the CLI

# Appendix  

## AI Prompt Engineering Specifications

### PRD Parsing Prompt Structure
```
You are assisting with transforming a Product Requirements Document (PRD) into a structured set of development tasks.

Given the following PRD, create a comprehensive list of development tasks that would be needed to implement the described product.

For each task:
1. Assign a short, descriptive title
2. Write a concise description
3. Identify dependencies (which tasks must be completed before this one)
4. Assign a priority (high, medium, low)
5. Include detailed implementation notes
6. Describe a test strategy to verify completion

Structure the tasks in a logical order of implementation.

PRD:
{prd_content}
```

### Task Expansion Prompt Structure
```
You are helping to break down a development task into more manageable subtasks.

Main task:
Title: {task_title}
Description: {task_description}
Details: {task_details}

Please create {num_subtasks} specific subtasks that together would accomplish this main task.

For each subtask, provide:
1. A clear, actionable title
2. A concise description
3. Any dependencies on other subtasks
4. Specific acceptance criteria to verify completion

Additional context:
{additional_context}
```

### Research-Backed Expansion Prompt Structure
```
You are a technical researcher and developer helping to break down a software development task into detailed, well-researched subtasks.

Main task:
Title: {task_title}
Description: {task_description}
Details: {task_details}

Research the latest best practices, technologies, and implementation patterns for this type of task. Then create {num_subtasks} specific, actionable subtasks that together would accomplish the main task.

For each subtask:
1. Provide a clear, specific title
2. Write a detailed description including technical approach
3. Identify dependencies on other subtasks
4. Include specific acceptance criteria
5. Reference any relevant libraries, tools, or resources that should be used

Consider security, performance, maintainability, and user experience in your recommendations.
```

## Task File System Specification

### Directory Structure
```
/
├── .cursor/
│   └── rules/
│       ├── dev_workflow.mdc
│       ├── cursor_rules.mdc
│       └── self_improve.mdc
├── scripts/
│   ├── dev.js
│   └── README.md
├── tasks/
│   ├── task_001.txt
│   ├── task_002.txt
│   └── ...
├── .env
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── tasks.json
```

### Task ID Specification
- Main tasks: Sequential integers (1, 2, 3, ...)
- Subtasks: Parent ID + dot + sequential integer (1.1, 1.2, 2.1, ...)
- ID references: Used in dependencies, command parameters
- ID ordering: Implies suggested implementation order

## Command-Line Interface Specification

### Global Options
- `--help`: Display help information
- `--version`: Display version information
- `--file=<file>`: Specify an alternative tasks.json file
- `--quiet`: Reduce output verbosity
- `--debug`: Increase output verbosity
- `--json`: Output in JSON format (for programmatic use)

### Command Structure
- `node scripts/dev.js <command> [options]`
- All commands operate on tasks.json by default
- Commands follow consistent parameter naming
- Common parameter styles: `--id=<id>`, `--status=<status>`, `--prompt="<text>"`
- Boolean flags: `--all`, `--force`, `--with-subtasks`

## API Integration Specifications

### Anthropic API Configuration
- Authentication: ANTHROPIC_API_KEY environment variable
- Model selection: MODEL environment variable
- Default model: claude-3-7-sonnet-20250219
- Maximum tokens: MAX_TOKENS environment variable (default: 4000)
- Temperature: TEMPERATURE environment variable (default: 0.7)

### Perplexity API Configuration
- Authentication: PERPLEXITY_API_KEY environment variable
- Model selection: PERPLEXITY_MODEL environment variable
- Default model: sonar-medium-online
- Connection: Via OpenAI client
- Fallback: Use Claude if Perplexity unavailable
</PRD>
