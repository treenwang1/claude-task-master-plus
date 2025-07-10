#!/usr/bin/env node

/**
 * Manual test script for the update_task MCP tool
 * 
 * This script allows you to test the actual MCP server update_task tool implementation
 * in a controlled environment with real data.
 * 
 * Usage:
 *   node test-update-task-mcp.js
 * 
 * Prerequisites:
 *   1. Have a valid .taskmaster/default/tasks/tasks.json file
 *   2. Set up your API keys in .env file
 *   3. Ensure the MCP server can start
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing MCP Server update_task tool');
console.log('=====================================\n');

// Test configuration
const testConfig = {
    serverPath: path.join(__dirname, 'mcp-server', 'server.js'),
    projectRoot: __dirname,
    tasksFile: path.join(__dirname, '.taskmaster', 'default', 'tasks', 'tasks.json'),
    testTaskId: "1", // Change this to an existing task ID in your tasks.json
    testPrompt: "Update this task with new testing information and add more implementation details.",
    testTimeout: 30000 // 30 seconds
};

// Verify prerequisites
function verifyPrerequisites() {
    console.log('🔍 Verifying prerequisites...');
    
    // Check if tasks.json exists
    if (!fs.existsSync(testConfig.tasksFile)) {
        console.error(`❌ Tasks file not found: ${testConfig.tasksFile}`);
        console.error('   Please run "npx task-master-ai init" first');
        process.exit(1);
    }
    
    // Check if MCP server exists
    if (!fs.existsSync(testConfig.serverPath)) {
        console.error(`❌ MCP server not found: ${testConfig.serverPath}`);
        process.exit(1);
    }
    
    // Check if .env file exists
    const envFile = path.join(__dirname, '.env');
    if (!fs.existsSync(envFile)) {
        console.warn(`⚠️  .env file not found: ${envFile}`);
        console.warn('   You may need to set up API keys for AI operations');
    }
    
    // Load and display existing tasks
    try {
        const tasks = JSON.parse(fs.readFileSync(testConfig.tasksFile, 'utf8'));
        console.log(`✅ Found ${tasks.length} existing tasks`);
        
        // Show first few tasks for reference
        console.log('\n📋 Available tasks for testing:');
        tasks.slice(0, 5).forEach(task => {
            console.log(`   - Task ${task.id}: ${task.title}`);
        });
        
        if (tasks.length > 5) {
            console.log(`   ... and ${tasks.length - 5} more`);
        }
        
        // Verify test task exists
        const testTask = tasks.find(task => task.id.toString() === testConfig.testTaskId);
        if (!testTask) {
            console.error(`❌ Test task ID "${testConfig.testTaskId}" not found`);
            console.error('   Please update testTaskId in the script to an existing task ID');
            process.exit(1);
        }
        
        console.log(`✅ Test task found: "${testTask.title}"`);
        
    } catch (error) {
        console.error(`❌ Error reading tasks file: ${error.message}`);
        process.exit(1);
    }
    
    console.log('✅ All prerequisites verified\n');
}

// Create test request for the MCP server
function createTestRequest() {
    return {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
            name: "update_task",
            arguments: {
                id: testConfig.testTaskId,
                prompt: testConfig.testPrompt,
                research: false, // Set to true if you want to test with research
                projectRoot: testConfig.projectRoot
            }
        }
    };
}

// Start MCP server and test the update_task tool
async function testUpdateTask() {
    console.log('🚀 Starting MCP server...');
    
    const serverProcess = spawn('node', [testConfig.serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: testConfig.projectRoot,
        env: {
            ...process.env,
            NODE_ENV: 'development'
        }
    });
    
    let serverOutput = '';
    let serverError = '';
    let requestSent = false;
    
    // Handle server stdout
    serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        serverOutput += output;
        
        // Wait for server to be ready, then send test request
        if (!requestSent && output.includes('MCP server ready')) {
            console.log('✅ MCP server is ready');
            requestSent = true;
            sendTestRequest();
        }
    });
    
    // Handle server stderr
    serverProcess.stderr.on('data', (data) => {
        serverError += data.toString();
    });
    
    // Handle server exit
    serverProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`❌ MCP server exited with code ${code}`);
            if (serverError) {
                console.error('Server error output:');
                console.error(serverError);
            }
        }
    });
    
    // Send the test request
    function sendTestRequest() {
        console.log('📤 Sending update_task request...');
        console.log(`   Task ID: ${testConfig.testTaskId}`);
        console.log(`   Prompt: "${testConfig.testPrompt}"`);
        
        const request = createTestRequest();
        const requestJson = JSON.stringify(request) + '\n';
        
        console.log('\n📋 Request payload:');
        console.log(JSON.stringify(request, null, 2));
        
        serverProcess.stdin.write(requestJson);
    }
    
    // Set up response handling
    let responseBuffer = '';
    
    serverProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        responseBuffer += chunk;
        
        // Try to parse complete JSON responses
        const lines = responseBuffer.split('\n');
        responseBuffer = lines.pop() || ''; // Keep incomplete line
        
        for (const line of lines) {
            if (line.trim()) {
                try {
                    const response = JSON.parse(line);
                    if (response.id === 1) {
                        handleTestResponse(response);
                        setTimeout(() => {
                            serverProcess.kill();
                            process.exit(0);
                        }, 1000);
                    }
                } catch (error) {
                    // Ignore non-JSON lines (server logs)
                }
            }
        }
    });
    
    // Handle timeout
    setTimeout(() => {
        console.error('❌ Test timed out');
        serverProcess.kill();
        process.exit(1);
    }, testConfig.testTimeout);
}

// Handle the response from the MCP server
function handleTestResponse(response) {
    console.log('\n📥 Received response:');
    console.log(JSON.stringify(response, null, 2));
    
    if (response.error) {
        console.error('\n❌ Test failed with error:');
        console.error(`   Code: ${response.error.code}`);
        console.error(`   Message: ${response.error.message}`);
        if (response.error.data) {
            console.error(`   Data: ${JSON.stringify(response.error.data, null, 2)}`);
        }
        return;
    }
    
    if (response.result) {
        console.log('\n✅ Test successful!');
        
        if (response.result.content) {
            response.result.content.forEach((content, index) => {
                console.log(`\n📄 Response content ${index + 1}:`);
                if (content.type === 'text') {
                    console.log(content.text);
                } else {
                    console.log(JSON.stringify(content, null, 2));
                }
            });
        }
        
        // Verify the task was actually updated
        verifyTaskUpdate();
    }
}

// Verify that the task was actually updated in the file
function verifyTaskUpdate() {
    try {
        console.log('\n🔍 Verifying task update...');
        const tasks = JSON.parse(fs.readFileSync(testConfig.tasksFile, 'utf8'));
        const updatedTask = tasks.find(task => task.id.toString() === testConfig.testTaskId);
        
        if (updatedTask) {
            console.log('✅ Task found after update:');
            console.log(`   Title: ${updatedTask.title}`);
            console.log(`   Description: ${updatedTask.description || 'No description'}`);
            console.log(`   Details length: ${updatedTask.details ? updatedTask.details.length : 0} characters`);
            console.log(`   Status: ${updatedTask.status}`);
            
            if (updatedTask.details && updatedTask.details.includes(testConfig.testPrompt.substring(0, 20))) {
                console.log('✅ Task appears to have been updated with new content');
            } else {
                console.log('⚠️  Cannot confirm if task content was updated');
            }
        } else {
            console.error('❌ Updated task not found in file');
        }
    } catch (error) {
        console.error(`❌ Error verifying task update: ${error.message}`);
    }
}

// Main execution
async function main() {
    try {
        verifyPrerequisites();
        await testUpdateTask();
    } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
        process.exit(1);
    }
}

// Handle process interruption
process.on('SIGINT', () => {
    console.log('\n⏹️  Test interrupted by user');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error(`❌ Uncaught exception: ${error.message}`);
    process.exit(1);
});

// Run the test
main(); 