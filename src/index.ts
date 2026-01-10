#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

interface TestRailConfig {
  url: string;
  username: string;
  apiKey: string;
}

interface UserSession {
  testrailUrl: string;
  username: string;
  apiKey: string;
  sessionId: string;
}

class TestRailMCP {
  private server: Server;
  private userSessions: Map<string, UserSession> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'testrail-mcp',
        version: '1.0.0',
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Projects
          {
            name: 'get_projects',
            description: 'Get all TestRail projects',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'get_project',
            description: 'Get a specific project by ID',
            inputSchema: {
              type: 'object',
              properties: { project_id: { type: 'number', description: 'Project ID' } },
              required: ['project_id'],
            },
          },
          
          // Suites
          {
            name: 'get_suites',
            description: 'Get all test suites for a project',
            inputSchema: {
              type: 'object',
              properties: { project_id: { type: 'number', description: 'Project ID' } },
              required: ['project_id'],
            },
          },
          {
            name: 'get_suite',
            description: 'Get a specific test suite by ID',
            inputSchema: {
              type: 'object',
              properties: { suite_id: { type: 'number', description: 'Suite ID' } },
              required: ['suite_id'],
            },
          },
          {
            name: 'add_suite',
            description: 'Create a new test suite',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: { type: 'number', description: 'Project ID' },
                name: { type: 'string', description: 'Suite name' },
                description: { type: 'string', description: 'Suite description (optional)' },
              },
              required: ['project_id', 'name'],
            },
          },
          {
            name: 'update_suite',
            description: 'Update an existing test suite',
            inputSchema: {
              type: 'object',
              properties: {
                suite_id: { type: 'number', description: 'Suite ID' },
                name: { type: 'string', description: 'Suite name' },
                description: { type: 'string', description: 'Suite description' },
              },
              required: ['suite_id'],
            },
          },
          
          // Sections
          {
            name: 'get_sections',
            description: 'Get all sections for a project/suite',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: { type: 'number', description: 'Project ID' },
                suite_id: { type: 'number', description: 'Suite ID (optional)' },
              },
              required: ['project_id'],
            },
          },
          {
            name: 'get_section',
            description: 'Get a specific section by ID',
            inputSchema: {
              type: 'object',
              properties: { section_id: { type: 'number', description: 'Section ID' } },
              required: ['section_id'],
            },
          },
          {
            name: 'add_section',
            description: 'Create a new section',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: { type: 'number', description: 'Project ID' },
                suite_id: { type: 'number', description: 'Suite ID (optional)' },
                parent_id: { type: 'number', description: 'Parent section ID (optional)' },
                name: { type: 'string', description: 'Section name' },
                description: { type: 'string', description: 'Section description (optional)' },
              },
              required: ['project_id', 'name'],
            },
          },
          {
            name: 'update_section',
            description: 'Update an existing section',
            inputSchema: {
              type: 'object',
              properties: {
                section_id: { type: 'number', description: 'Section ID' },
                name: { type: 'string', description: 'Section name' },
                description: { type: 'string', description: 'Section description' },
              },
              required: ['section_id'],
            },
          },
          {
            name: 'delete_section',
            description: 'Delete a section',
            inputSchema: {
              type: 'object',
              properties: { section_id: { type: 'number', description: 'Section ID' } },
              required: ['section_id'],
            },
          },
          {
            name: 'move_section',
            description: 'Move a section to another parent or position',
            inputSchema: {
              type: 'object',
              properties: {
                section_id: { type: 'number', description: 'Section ID' },
                parent_id: { type: 'number', description: 'Parent section ID (can be null for root)' },
                after_id: { type: 'number', description: 'Section ID after which to place this section (optional)' },
              },
              required: ['section_id'],
            },
          },
          
          // Cases
          {
            name: 'get_cases',
            description: 'Get test cases for a project/suite',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: { type: 'number', description: 'Project ID' },
                suite_id: { type: 'number', description: 'Suite ID (optional)' },
                section_id: { type: 'number', description: 'Section ID (optional)' },
              },
              required: ['project_id'],
            },
          },
          {
            name: 'get_case',
            description: 'Get a specific test case by ID',
            inputSchema: {
              type: 'object',
              properties: { case_id: { type: 'number', description: 'Case ID' } },
              required: ['case_id'],
            },
          },
          {
            name: 'add_case',
            description: 'Create a new test case',
            inputSchema: {
              type: 'object',
              properties: {
                section_id: { type: 'number', description: 'Section ID' },
                title: { type: 'string', description: 'Test case title' },
                template_id: { type: 'number', description: 'Template ID (optional)' },
                type_id: { type: 'number', description: 'Test case type ID (optional)' },
                priority_id: { type: 'number', description: 'Priority ID (optional)' },
                estimate: { type: 'string', description: 'Time estimate (optional)' },
                milestone_id: { type: 'number', description: 'Milestone ID (optional)' },
                refs: { type: 'string', description: 'References/Requirements (optional)' },
                custom_preconds: { type: 'string', description: 'Preconditions (optional)' },
                custom_steps: { type: 'string', description: 'Test steps (optional)' },
                custom_expected: { type: 'string', description: 'Expected result (optional)' },
                custom_autostat: { type: 'number', description: 'Automation Status (optional)' },
                custom_steps_separated: {
                  type: 'array',
                  description: 'Separated test steps (optional). Array of step objects with content/expected or shared_step_id',
                  items: {
                    type: 'object',
                    properties: {
                      content: { type: 'string', description: 'Step description' },
                      expected: { type: 'string', description: 'Expected result for this step' },
                      additional_info: { type: 'string', description: 'Additional info for this step' },
                      shared_step_id: { type: 'number', description: 'ID of a shared step (use instead of content/expected)' },
                    },
                  },
                },
              },
              required: ['section_id', 'title'],
            },
          },
          {
            name: 'update_case',
            description: 'Update an existing test case',
            inputSchema: {
              type: 'object',
              properties: {
                case_id: { type: 'number', description: 'Case ID' },
                title: { type: 'string', description: 'Test case title (optional)' },
                template_id: { type: 'number', description: 'Template ID (optional)' },
                type_id: { type: 'number', description: 'Test case type ID (optional)' },
                priority_id: { type: 'number', description: 'Priority ID (optional)' },
                estimate: { type: 'string', description: 'Time estimate (optional)' },
                refs: { type: 'string', description: 'References (optional)' },
                custom_preconds: { type: 'string', description: 'Preconditions (optional)' },
                custom_steps: { type: 'string', description: 'Test steps (optional)' },
                custom_expected: { type: 'string', description: 'Expected result (optional)' },
                custom_steps_separated: {
                  type: 'array',
                  description: 'Separated test steps (optional). Array of step objects with content/expected or shared_step_id',
                  items: {
                    type: 'object',
                    properties: {
                      content: { type: 'string', description: 'Step description' },
                      expected: { type: 'string', description: 'Expected result for this step' },
                      additional_info: { type: 'string', description: 'Additional info for this step' },
                      shared_step_id: { type: 'number', description: 'ID of a shared step (use instead of content/expected)' },
                    },
                  },
                },
              },
              required: ['case_id'],
            },
          },
          {
            name: 'delete_case',
            description: 'Delete a test case',
            inputSchema: {
              type: 'object',
              properties: { case_id: { type: 'number', description: 'Case ID' } },
              required: ['case_id'],
            },
          },
          {
            name: 'get_case_types',
            description: 'Get all available test case types',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'get_case_fields',
            description: 'Get all available test case fields',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'get_history_for_case',
            description: 'Get the edit history for a test case',
            inputSchema: {
              type: 'object',
              properties: {
                case_id: { type: 'number', description: 'Case ID' },
                limit: { type: 'number', description: 'Limit results (optional)' },
                offset: { type: 'number', description: 'Offset for pagination (optional)' },
              },
              required: ['case_id'],
            },
          },
          {
            name: 'copy_cases_to_section',
            description: 'Copy test cases to another section',
            inputSchema: {
              type: 'object',
              properties: {
                section_id: { type: 'number', description: 'Target section ID' },
                case_ids: { type: 'array', items: { type: 'number' }, description: 'Array of case IDs to copy' },
              },
              required: ['section_id', 'case_ids'],
            },
          },
          {
            name: 'move_cases_to_section',
            description: 'Move test cases to another section',
            inputSchema: {
              type: 'object',
              properties: {
                section_id: { type: 'number', description: 'Target section ID' },
                suite_id: { type: 'number', description: 'Target suite ID' },
                case_ids: { type: 'array', items: { type: 'number' }, description: 'Array of case IDs to move' },
              },
              required: ['section_id', 'suite_id', 'case_ids'],
            },
          },
          {
            name: 'delete_cases',
            description: 'Delete multiple test cases',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: { type: 'number', description: 'Project ID' },
                suite_id: { type: 'number', description: 'Suite ID (required for multi-suite projects)' },
                case_ids: { type: 'array', items: { type: 'number' }, description: 'Array of case IDs to delete' },
                soft: { type: 'number', description: 'Set to 1 to preview deletion without executing (optional)' },
              },
              required: ['project_id', 'case_ids'],
            },
          },
          
          // Runs
          {
            name: 'get_runs',
            description: 'Get test runs for a project',
            inputSchema: {
              type: 'object',
              properties: { project_id: { type: 'number', description: 'Project ID' } },
              required: ['project_id'],
            },
          },
          {
            name: 'get_run',
            description: 'Get a specific test run by ID',
            inputSchema: {
              type: 'object',
              properties: { run_id: { type: 'number', description: 'Run ID' } },
              required: ['run_id'],
            },
          },
          {
            name: 'add_run',
            description: 'Create a new test run',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: { type: 'number', description: 'Project ID' },
                suite_id: { type: 'number', description: 'Suite ID (optional)' },
                name: { type: 'string', description: 'Run name' },
                description: { type: 'string', description: 'Run description (optional)' },
                milestone_id: { type: 'number', description: 'Milestone ID (optional)' },
                assignedto_id: { type: 'number', description: 'User ID to assign (optional)' },
                include_all: { type: 'boolean', description: 'Include all test cases (optional)' },
                case_ids: { type: 'array', items: { type: 'number' }, description: 'Specific case IDs (optional)' },
              },
              required: ['project_id', 'name'],
            },
          },
          {
            name: 'update_run',
            description: 'Update an existing test run',
            inputSchema: {
              type: 'object',
              properties: {
                run_id: { type: 'number', description: 'Run ID' },
                name: { type: 'string', description: 'Run name (optional)' },
                description: { type: 'string', description: 'Run description (optional)' },
                milestone_id: { type: 'number', description: 'Milestone ID (optional)' },
              },
              required: ['run_id'],
            },
          },
          {
            name: 'close_run',
            description: 'Close a test run',
            inputSchema: {
              type: 'object',
              properties: { run_id: { type: 'number', description: 'Run ID' } },
              required: ['run_id'],
            },
          },
          {
            name: 'delete_run',
            description: 'Delete a test run',
            inputSchema: {
              type: 'object',
              properties: {
                run_id: { type: 'number', description: 'Run ID' },
                soft: { type: 'number', description: 'Set to 1 to preview deletion without executing (optional)' },
              },
              required: ['run_id'],
            },
          },
          
          // Tests
          {
            name: 'get_tests',
            description: 'Get tests for a test run',
            inputSchema: {
              type: 'object',
              properties: { run_id: { type: 'number', description: 'Run ID' } },
              required: ['run_id'],
            },
          },
          {
            name: 'get_test',
            description: 'Get a specific test by ID',
            inputSchema: {
              type: 'object',
              properties: { test_id: { type: 'number', description: 'Test ID' } },
              required: ['test_id'],
            },
          },
          
          // Results
          {
            name: 'get_results',
            description: 'Get results for a test',
            inputSchema: {
              type: 'object',
              properties: { test_id: { type: 'number', description: 'Test ID' } },
              required: ['test_id'],
            },
          },
          {
            name: 'get_results_for_case',
            description: 'Get results for a test case in a run',
            inputSchema: {
              type: 'object',
              properties: {
                run_id: { type: 'number', description: 'Run ID' },
                case_id: { type: 'number', description: 'Case ID' },
              },
              required: ['run_id', 'case_id'],
            },
          },
          {
            name: 'get_results_for_run',
            description: 'Get results for a test run',
            inputSchema: {
              type: 'object',
              properties: { run_id: { type: 'number', description: 'Run ID' } },
              required: ['run_id'],
            },
          },
          {
            name: 'add_result',
            description: 'Add a test result',
            inputSchema: {
              type: 'object',
              properties: {
                test_id: { type: 'number', description: 'Test ID' },
                status_id: { type: 'number', description: 'Status ID (1=Passed, 5=Failed, etc.)' },
                comment: { type: 'string', description: 'Comment (optional)' },
                elapsed: { type: 'string', description: 'Time elapsed (optional)' },
                defects: { type: 'string', description: 'Defect IDs (optional)' },
              },
              required: ['test_id', 'status_id'],
            },
          },
          {
            name: 'add_result_for_case',
            description: 'Add a test result for a specific case in a run',
            inputSchema: {
              type: 'object',
              properties: {
                run_id: { type: 'number', description: 'Run ID' },
                case_id: { type: 'number', description: 'Case ID' },
                status_id: { type: 'number', description: 'Status ID' },
                comment: { type: 'string', description: 'Comment (optional)' },
                elapsed: { type: 'string', description: 'Time elapsed (optional)' },
              },
              required: ['run_id', 'case_id', 'status_id'],
            },
          },
          {
            name: 'add_results_for_cases',
            description: 'Add multiple test results for cases in a run',
            inputSchema: {
              type: 'object',
              properties: {
                run_id: { type: 'number', description: 'Run ID' },
                results: {
                  type: 'array',
                  description: 'Array of results',
                  items: {
                    type: 'object',
                    properties: {
                      case_id: { type: 'number' },
                      status_id: { type: 'number' },
                      comment: { type: 'string' },
                    },
                  },
                },
              },
              required: ['run_id', 'results'],
            },
          },
          {
            name: 'add_results',
            description: 'Add multiple test results by test IDs',
            inputSchema: {
              type: 'object',
              properties: {
                run_id: { type: 'number', description: 'Run ID' },
                results: {
                  type: 'array',
                  description: 'Array of results',
                  items: {
                    type: 'object',
                    properties: {
                      test_id: { type: 'number', description: 'Test ID' },
                      status_id: { type: 'number', description: 'Status ID' },
                      comment: { type: 'string', description: 'Comment (optional)' },
                      elapsed: { type: 'string', description: 'Time elapsed (optional)' },
                      defects: { type: 'string', description: 'Defect IDs (optional)' },
                      version: { type: 'string', description: 'Version (optional)' },
                    },
                  },
                },
              },
              required: ['run_id', 'results'],
            },
          },
          
          // Plans
          {
            name: 'get_plans',
            description: 'Get test plans for a project',
            inputSchema: {
              type: 'object',
              properties: { project_id: { type: 'number', description: 'Project ID' } },
              required: ['project_id'],
            },
          },
          {
            name: 'get_plan',
            description: 'Get a specific test plan by ID',
            inputSchema: {
              type: 'object',
              properties: { plan_id: { type: 'number', description: 'Plan ID' } },
              required: ['plan_id'],
            },
          },
          {
            name: 'add_plan',
            description: 'Create a new test plan',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: { type: 'number', description: 'Project ID' },
                name: { type: 'string', description: 'Plan name' },
                description: { type: 'string', description: 'Plan description (optional)' },
                milestone_id: { type: 'number', description: 'Milestone ID (optional)' },
                entries: { type: 'array', description: 'Array of plan entries/test runs (optional)' },
              },
              required: ['project_id', 'name'],
            },
          },
          {
            name: 'add_plan_entry',
            description: 'Add test runs to a test plan',
            inputSchema: {
              type: 'object',
              properties: {
                plan_id: { type: 'number', description: 'Plan ID' },
                suite_id: { type: 'number', description: 'Suite ID' },
                name: { type: 'string', description: 'Entry name (optional)' },
                description: { type: 'string', description: 'Entry description (optional)' },
                assignedto_id: { type: 'number', description: 'User ID to assign (optional)' },
                include_all: { type: 'boolean', description: 'Include all test cases (optional)' },
                case_ids: { type: 'array', items: { type: 'number' }, description: 'Specific case IDs (optional)' },
                config_ids: { type: 'array', items: { type: 'number' }, description: 'Configuration IDs (optional)' },
                refs: { type: 'string', description: 'References (optional)' },
                runs: { type: 'array', description: 'Array of test runs with configurations (optional)' },
              },
              required: ['plan_id', 'suite_id'],
            },
          },
          {
            name: 'add_run_to_plan_entry',
            description: 'Add a test run to an existing plan entry',
            inputSchema: {
              type: 'object',
              properties: {
                plan_id: { type: 'number', description: 'Plan ID' },
                entry_id: { type: 'string', description: 'Plan entry ID' },
                config_ids: { type: 'array', items: { type: 'number' }, description: 'Configuration IDs' },
                description: { type: 'string', description: 'Run description (optional)' },
                assignedto_id: { type: 'number', description: 'User ID to assign (optional)' },
                include_all: { type: 'boolean', description: 'Include all test cases (optional)' },
                case_ids: { type: 'array', items: { type: 'number' }, description: 'Specific case IDs (optional)' },
                refs: { type: 'string', description: 'References (optional)' },
              },
              required: ['plan_id', 'entry_id', 'config_ids'],
            },
          },
          {
            name: 'update_plan',
            description: 'Update an existing test plan',
            inputSchema: {
              type: 'object',
              properties: {
                plan_id: { type: 'number', description: 'Plan ID' },
                name: { type: 'string', description: 'Plan name (optional)' },
                description: { type: 'string', description: 'Plan description (optional)' },
                milestone_id: { type: 'number', description: 'Milestone ID (optional)' },
              },
              required: ['plan_id'],
            },
          },
          {
            name: 'update_plan_entry',
            description: 'Update a test plan entry',
            inputSchema: {
              type: 'object',
              properties: {
                plan_id: { type: 'number', description: 'Plan ID' },
                entry_id: { type: 'string', description: 'Plan entry ID' },
                name: { type: 'string', description: 'Entry name (optional)' },
                description: { type: 'string', description: 'Entry description (optional)' },
                assignedto_id: { type: 'number', description: 'User ID to assign (optional)' },
                include_all: { type: 'boolean', description: 'Include all test cases (optional)' },
                case_ids: { type: 'array', items: { type: 'number' }, description: 'Specific case IDs (optional)' },
                refs: { type: 'string', description: 'References (optional)' },
              },
              required: ['plan_id', 'entry_id'],
            },
          },
          {
            name: 'update_run_in_plan_entry',
            description: 'Update a test run inside a plan entry',
            inputSchema: {
              type: 'object',
              properties: {
                run_id: { type: 'number', description: 'Run ID' },
                description: { type: 'string', description: 'Run description (optional)' },
                assignedto_id: { type: 'number', description: 'User ID to assign (optional)' },
                include_all: { type: 'boolean', description: 'Include all test cases (optional)' },
                case_ids: { type: 'array', items: { type: 'number' }, description: 'Specific case IDs (optional)' },
                refs: { type: 'string', description: 'References (optional)' },
              },
              required: ['run_id'],
            },
          },
          {
            name: 'close_plan',
            description: 'Close a test plan',
            inputSchema: {
              type: 'object',
              properties: { plan_id: { type: 'number', description: 'Plan ID' } },
              required: ['plan_id'],
            },
          },
          {
            name: 'delete_plan',
            description: 'Delete a test plan',
            inputSchema: {
              type: 'object',
              properties: { plan_id: { type: 'number', description: 'Plan ID' } },
              required: ['plan_id'],
            },
          },
          {
            name: 'delete_plan_entry',
            description: 'Delete a test plan entry',
            inputSchema: {
              type: 'object',
              properties: {
                plan_id: { type: 'number', description: 'Plan ID' },
                entry_id: { type: 'string', description: 'Plan entry ID' },
              },
              required: ['plan_id', 'entry_id'],
            },
          },
          {
            name: 'delete_run_from_plan_entry',
            description: 'Delete a test run from a plan entry',
            inputSchema: {
              type: 'object',
              properties: { run_id: { type: 'number', description: 'Run ID' } },
              required: ['run_id'],
            },
          },
          
          // Milestones
          {
            name: 'get_milestones',
            description: 'Get milestones for a project',
            inputSchema: {
              type: 'object',
              properties: { project_id: { type: 'number', description: 'Project ID' } },
              required: ['project_id'],
            },
          },
          {
            name: 'get_milestone',
            description: 'Get a specific milestone by ID',
            inputSchema: {
              type: 'object',
              properties: { milestone_id: { type: 'number', description: 'Milestone ID' } },
              required: ['milestone_id'],
            },
          },
          {
            name: 'add_milestone',
            description: 'Create a new milestone',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: { type: 'number', description: 'Project ID' },
                name: { type: 'string', description: 'Milestone name' },
                description: { type: 'string', description: 'Milestone description (optional)' },
                due_on: { type: 'number', description: 'Due date as UNIX timestamp (optional)' },
                parent_id: { type: 'number', description: 'Parent milestone ID for sub-milestones (optional)' },
                refs: { type: 'string', description: 'References (optional)' },
                start_on: { type: 'number', description: 'Start date as UNIX timestamp (optional)' },
              },
              required: ['project_id', 'name'],
            },
          },
          {
            name: 'update_milestone',
            description: 'Update an existing milestone',
            inputSchema: {
              type: 'object',
              properties: {
                milestone_id: { type: 'number', description: 'Milestone ID' },
                name: { type: 'string', description: 'Milestone name (optional)' },
                description: { type: 'string', description: 'Milestone description (optional)' },
                due_on: { type: 'number', description: 'Due date as UNIX timestamp (optional)' },
                is_completed: { type: 'boolean', description: 'Mark as completed (optional)' },
                is_started: { type: 'boolean', description: 'Mark as started (optional)' },
                parent_id: { type: 'number', description: 'Parent milestone ID (optional)' },
                start_on: { type: 'number', description: 'Start date as UNIX timestamp (optional)' },
              },
              required: ['milestone_id'],
            },
          },
          {
            name: 'delete_milestone',
            description: 'Delete a milestone',
            inputSchema: {
              type: 'object',
              properties: { milestone_id: { type: 'number', description: 'Milestone ID' } },
              required: ['milestone_id'],
            },
          },
          
          // Users
          {
            name: 'get_user',
            description: 'Get a user by ID',
            inputSchema: {
              type: 'object',
              properties: { user_id: { type: 'number', description: 'User ID' } },
              required: ['user_id'],
            },
          },
          {
            name: 'get_current_user',
            description: 'Get the current authenticated user',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'get_user_by_email',
            description: 'Get a user by email address',
            inputSchema: {
              type: 'object',
              properties: { email: { type: 'string', description: 'User email address' } },
              required: ['email'],
            },
          },
          {
            name: 'get_users',
            description: 'Get all users (optionally filtered by project)',
            inputSchema: {
              type: 'object',
              properties: { project_id: { type: 'number', description: 'Project ID (optional, required for non-admins)' } },
            },
          },
          
          // Statuses
          {
            name: 'get_statuses',
            description: 'Get all available test result statuses',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'get_case_statuses',
            description: 'Get all available test case statuses (Enterprise)',
            inputSchema: { type: 'object', properties: {} },
          },
          
          // Priorities
          {
            name: 'get_priorities',
            description: 'Get all available test case priorities',
            inputSchema: { type: 'object', properties: {} },
          },
          
          // Templates
          {
            name: 'get_templates',
            description: 'Get all templates for a project',
            inputSchema: {
              type: 'object',
              properties: { project_id: { type: 'number', description: 'Project ID' } },
              required: ['project_id'],
            },
          },
          
          // Configurations
          {
            name: 'get_configs',
            description: 'Get all configurations for a project',
            inputSchema: {
              type: 'object',
              properties: { project_id: { type: 'number', description: 'Project ID' } },
              required: ['project_id'],
            },
          },
          
          // Result Fields
          {
            name: 'get_result_fields',
            description: 'Get all available result custom fields',
            inputSchema: { type: 'object', properties: {} },
          },
          
          // Attachments - Upload
          {
            name: 'add_attachment_to_case',
            description: 'Add an attachment to a test case',
            inputSchema: {
              type: 'object',
              properties: {
                case_id: { type: 'number', description: 'Case ID' },
                file_path: { type: 'string', description: 'Path to the file to upload' },
              },
              required: ['case_id', 'file_path'],
            },
          },
          {
            name: 'add_attachment_to_result',
            description: 'Add an attachment to a test result',
            inputSchema: {
              type: 'object',
              properties: {
                result_id: { type: 'number', description: 'Result ID' },
                file_path: { type: 'string', description: 'Path to the file to upload' },
              },
              required: ['result_id', 'file_path'],
            },
          },
          {
            name: 'add_attachment_to_run',
            description: 'Add an attachment to a test run',
            inputSchema: {
              type: 'object',
              properties: {
                run_id: { type: 'number', description: 'Run ID' },
                file_path: { type: 'string', description: 'Path to the file to upload' },
              },
              required: ['run_id', 'file_path'],
            },
          },
          {
            name: 'add_attachment_to_plan',
            description: 'Add an attachment to a test plan',
            inputSchema: {
              type: 'object',
              properties: {
                plan_id: { type: 'number', description: 'Plan ID' },
                file_path: { type: 'string', description: 'Path to the file to upload' },
              },
              required: ['plan_id', 'file_path'],
            },
          },
          {
            name: 'add_attachment_to_plan_entry',
            description: 'Add an attachment to a test plan entry',
            inputSchema: {
              type: 'object',
              properties: {
                plan_id: { type: 'number', description: 'Plan ID' },
                entry_id: { type: 'string', description: 'Plan entry ID' },
                file_path: { type: 'string', description: 'Path to the file to upload' },
              },
              required: ['plan_id', 'entry_id', 'file_path'],
            },
          },
          
          // Attachments - Get
          {
            name: 'get_attachment',
            description: 'Get/download an attachment by ID',
            inputSchema: {
              type: 'object',
              properties: { attachment_id: { type: 'string', description: 'Attachment ID' } },
              required: ['attachment_id'],
            },
          },
          {
            name: 'get_attachments_for_case',
            description: 'Get all attachments for a test case',
            inputSchema: {
              type: 'object',
              properties: {
                case_id: { type: 'number', description: 'Case ID' },
                limit: { type: 'number', description: 'Limit results (optional)' },
                offset: { type: 'number', description: 'Offset for pagination (optional)' },
              },
              required: ['case_id'],
            },
          },
          {
            name: 'get_attachments_for_test',
            description: 'Get all attachments for a test',
            inputSchema: {
              type: 'object',
              properties: { test_id: { type: 'number', description: 'Test ID' } },
              required: ['test_id'],
            },
          },
          {
            name: 'get_attachments_for_run',
            description: 'Get all attachments for a test run',
            inputSchema: {
              type: 'object',
              properties: {
                run_id: { type: 'number', description: 'Run ID' },
                limit: { type: 'number', description: 'Limit results (optional)' },
                offset: { type: 'number', description: 'Offset for pagination (optional)' },
              },
              required: ['run_id'],
            },
          },
          {
            name: 'get_attachments_for_plan',
            description: 'Get all attachments for a test plan',
            inputSchema: {
              type: 'object',
              properties: {
                plan_id: { type: 'number', description: 'Plan ID' },
                limit: { type: 'number', description: 'Limit results (optional)' },
                offset: { type: 'number', description: 'Offset for pagination (optional)' },
              },
              required: ['plan_id'],
            },
          },
          {
            name: 'get_attachments_for_plan_entry',
            description: 'Get all attachments for a test plan entry',
            inputSchema: {
              type: 'object',
              properties: {
                plan_id: { type: 'number', description: 'Plan ID' },
                entry_id: { type: 'string', description: 'Plan entry ID' },
              },
              required: ['plan_id', 'entry_id'],
            },
          },
          
          // Attachments - Delete
          {
            name: 'delete_attachment',
            description: 'Delete an attachment',
            inputSchema: {
              type: 'object',
              properties: { attachment_id: { type: 'string', description: 'Attachment ID' } },
              required: ['attachment_id'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Projects
          case 'get_projects':
            return await this.getProjects();
          case 'get_project':
            return await this.getProject(args.project_id);
          
          // Suites
          case 'get_suites':
            return await this.getSuites(args.project_id);
          case 'get_suite':
            return await this.getSuite(args.suite_id);
          case 'add_suite':
            return await this.addSuite(args);
          case 'update_suite':
            return await this.updateSuite(args);
          
          // Sections
          case 'get_sections':
            return await this.getSections(args);
          case 'get_section':
            return await this.getSection(args.section_id);
          case 'add_section':
            return await this.addSection(args);
          case 'update_section':
            return await this.updateSection(args);
          case 'delete_section':
            return await this.deleteSection(args.section_id);
          case 'move_section':
            return await this.moveSection(args);
          
          // Cases
          case 'get_cases':
            return await this.getCases(args);
          case 'get_case':
            return await this.getCase(args.case_id);
          case 'add_case':
            return await this.addCase(args);
          case 'update_case':
            return await this.updateCase(args);
          case 'delete_case':
            return await this.deleteCase(args.case_id);
          case 'get_case_types':
            return await this.getCaseTypes();
          case 'get_case_fields':
            return await this.getCaseFields();
          case 'get_history_for_case':
            return await this.getHistoryForCase(args);
          case 'copy_cases_to_section':
            return await this.copyCasesToSection(args);
          case 'move_cases_to_section':
            return await this.moveCasesToSection(args);
          case 'delete_cases':
            return await this.deleteCases(args);
          
          // Runs
          case 'get_runs':
            return await this.getRuns(args.project_id);
          case 'get_run':
            return await this.getRun(args.run_id);
          case 'add_run':
            return await this.addRun(args);
          case 'update_run':
            return await this.updateRun(args);
          case 'close_run':
            return await this.closeRun(args.run_id);
          case 'delete_run':
            return await this.deleteRun(args);
          
          // Tests
          case 'get_tests':
            return await this.getTests(args.run_id);
          case 'get_test':
            return await this.getTest(args.test_id);
          
          // Results
          case 'get_results':
            return await this.getResults(args.test_id);
          case 'get_results_for_case':
            return await this.getResultsForCase(args);
          case 'get_results_for_run':
            return await this.getResultsForRun(args.run_id);
          case 'add_result':
            return await this.addResult(args);
          case 'add_result_for_case':
            return await this.addResultForCase(args);
          case 'add_results_for_cases':
            return await this.addResultsForCases(args);
          case 'add_results':
            return await this.addResults(args);
          
          // Plans
          case 'get_plans':
            return await this.getPlans(args.project_id);
          case 'get_plan':
            return await this.getPlan(args.plan_id);
          case 'add_plan':
            return await this.addPlan(args);
          case 'add_plan_entry':
            return await this.addPlanEntry(args);
          case 'add_run_to_plan_entry':
            return await this.addRunToPlanEntry(args);
          case 'update_plan':
            return await this.updatePlan(args);
          case 'update_plan_entry':
            return await this.updatePlanEntry(args);
          case 'update_run_in_plan_entry':
            return await this.updateRunInPlanEntry(args);
          case 'close_plan':
            return await this.closePlan(args.plan_id);
          case 'delete_plan':
            return await this.deletePlan(args.plan_id);
          case 'delete_plan_entry':
            return await this.deletePlanEntry(args);
          case 'delete_run_from_plan_entry':
            return await this.deleteRunFromPlanEntry(args.run_id);
          
          // Milestones
          case 'get_milestones':
            return await this.getMilestones(args.project_id);
          case 'get_milestone':
            return await this.getMilestone(args.milestone_id);
          case 'add_milestone':
            return await this.addMilestone(args);
          case 'update_milestone':
            return await this.updateMilestone(args);
          case 'delete_milestone':
            return await this.deleteMilestone(args.milestone_id);
          
          // Users
          case 'get_user':
            return await this.getUser(args.user_id);
          case 'get_current_user':
            return await this.getCurrentUser();
          case 'get_user_by_email':
            return await this.getUserByEmail(args.email);
          case 'get_users':
            return await this.getUsers(args.project_id);
          
          // Statuses
          case 'get_statuses':
            return await this.getStatuses();
          case 'get_case_statuses':
            return await this.getCaseStatuses();
          
          // Priorities
          case 'get_priorities':
            return await this.getPriorities();
          
          // Templates
          case 'get_templates':
            return await this.getTemplates(args.project_id);
          
          // Configurations
          case 'get_configs':
            return await this.getConfigs(args.project_id);
          
          // Result Fields
          case 'get_result_fields':
            return await this.getResultFields();
          
          // Attachments - Upload
          case 'add_attachment_to_case':
            return await this.addAttachmentToCase(args);
          case 'add_attachment_to_result':
            return await this.addAttachmentToResult(args);
          case 'add_attachment_to_run':
            return await this.addAttachmentToRun(args);
          case 'add_attachment_to_plan':
            return await this.addAttachmentToPlan(args);
          case 'add_attachment_to_plan_entry':
            return await this.addAttachmentToPlanEntry(args);
          
          // Attachments - Get
          case 'get_attachment':
            return await this.getAttachment(args.attachment_id);
          case 'get_attachments_for_case':
            return await this.getAttachmentsForCase(args);
          case 'get_attachments_for_test':
            return await this.getAttachmentsForTest(args.test_id);
          case 'get_attachments_for_run':
            return await this.getAttachmentsForRun(args);
          case 'get_attachments_for_plan':
            return await this.getAttachmentsForPlan(args);
          case 'get_attachments_for_plan_entry':
            return await this.getAttachmentsForPlanEntry(args);
          
          // Attachments - Delete
          case 'delete_attachment':
            return await this.deleteAttachment(args.attachment_id);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    });
  }

  private getCurrentUserSession(): UserSession | null {
    const testrailUrl = process.env.TESTRAIL_URL;
    const username = process.env.TESTRAIL_USERNAME;
    const apiKey = process.env.TESTRAIL_API_KEY;
    
    if (testrailUrl && username && apiKey) {
      return { testrailUrl, username, apiKey, sessionId: 'env-session' };
    }
    
    const sessions = Array.from(this.userSessions.values());
    return sessions.length > 0 ? sessions[0] : null;
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', data?: any) {
    const session = this.getCurrentUserSession();
    if (!session) {
      throw new Error('Not authenticated. Please configure TestRail credentials.');
    }

    const auth = Buffer.from(`${session.username}:${session.apiKey}`).toString('base64');
    
    const response = await axios({
      method,
      url: `${session.testrailUrl}/index.php?/api/v2/${endpoint}`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      data,
    });

    return response.data;
  }

  private formatResponse(data: any) {
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  private async makeMultipartRequest(endpoint: string, filePath: string) {
    const session = this.getCurrentUserSession();
    if (!session) {
      throw new Error('Not authenticated. Please configure TestRail credentials.');
    }

    const auth = Buffer.from(`${session.username}:${session.apiKey}`).toString('base64');
    
    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    // Create form boundary
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
    
    // Build multipart body
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="attachment"; filename="${fileName}"\r\n`),
      Buffer.from('Content-Type: application/octet-stream\r\n\r\n'),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const response = await axios({
      method: 'POST',
      url: `${session.testrailUrl}/index.php?/api/v2/${endpoint}`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      data: body,
    });

    return response.data;
  }

  // Projects
  private async getProjects() {
    const data = await this.makeRequest('get_projects');
    return this.formatResponse(data);
  }

  private async getProject(projectId: number) {
    const data = await this.makeRequest(`get_project/${projectId}`);
    return this.formatResponse(data);
  }

  // Suites
  private async getSuites(projectId: number) {
    const data = await this.makeRequest(`get_suites/${projectId}`);
    return this.formatResponse(data);
  }

  private async getSuite(suiteId: number) {
    const data = await this.makeRequest(`get_suite/${suiteId}`);
    return this.formatResponse(data);
  }

  private async addSuite(args: any) {
    const data = await this.makeRequest(`add_suite/${args.project_id}`, 'POST', {
      name: args.name,
      description: args.description,
    });
    return this.formatResponse(data);
  }

  private async updateSuite(args: any) {
    const payload: any = {};
    if (args.name) payload.name = args.name;
    if (args.description !== undefined) payload.description = args.description;
    
    const data = await this.makeRequest(`update_suite/${args.suite_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  // Sections
  private async getSections(args: any) {
    let endpoint = `get_sections/${args.project_id}`;
    if (args.suite_id) endpoint += `&suite_id=${args.suite_id}`;
    const data = await this.makeRequest(endpoint);
    return this.formatResponse(data);
  }

  private async getSection(sectionId: number) {
    const data = await this.makeRequest(`get_section/${sectionId}`);
    return this.formatResponse(data);
  }

  private async addSection(args: any) {
    const payload: any = { name: args.name };
    if (args.description) payload.description = args.description;
    if (args.suite_id) payload.suite_id = args.suite_id;
    if (args.parent_id) payload.parent_id = args.parent_id;
    
    const data = await this.makeRequest(`add_section/${args.project_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  private async updateSection(args: any) {
    const payload: any = {};
    if (args.name) payload.name = args.name;
    if (args.description !== undefined) payload.description = args.description;
    
    const data = await this.makeRequest(`update_section/${args.section_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  private async deleteSection(sectionId: number) {
    await this.makeRequest(`delete_section/${sectionId}`, 'POST');
    return this.formatResponse({ success: true, message: 'Section deleted' });
  }

  private async moveSection(args: any) {
    const payload: any = {};
    if (args.parent_id !== undefined) payload.parent_id = args.parent_id;
    if (args.after_id !== undefined) payload.after_id = args.after_id;
    
    const data = await this.makeRequest(`move_section/${args.section_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  // Cases
  private async getCases(args: any) {
    let endpoint = `get_cases/${args.project_id}`;
    const params: string[] = [];
    if (args.suite_id) params.push(`suite_id=${args.suite_id}`);
    if (args.section_id) params.push(`section_id=${args.section_id}`);
    if (params.length > 0) endpoint += `&${params.join('&')}`;
    
    const data = await this.makeRequest(endpoint);
    return this.formatResponse(data);
  }

  private async getCase(caseId: number) {
    const data = await this.makeRequest(`get_case/${caseId}`);
    return this.formatResponse(data);
  }

  private async addCase(args: any) {
    const payload: any = { title: args.title };
    
    if (args.template_id !== undefined) payload.template_id = args.template_id;
    if (args.type_id !== undefined) payload.type_id = args.type_id;
    if (args.priority_id !== undefined) payload.priority_id = args.priority_id;
    if (args.estimate !== undefined) payload.estimate = args.estimate;
    if (args.milestone_id !== undefined) payload.milestone_id = args.milestone_id;
    if (args.refs !== undefined) payload.refs = args.refs;
    if (args.custom_preconds !== undefined) payload.custom_preconds = args.custom_preconds;
    if (args.custom_steps !== undefined) payload.custom_steps = args.custom_steps;
    if (args.custom_expected !== undefined) payload.custom_expected = args.custom_expected;
    if (args.custom_autostat !== undefined) payload.custom_autostat = args.custom_autostat;
    if (args.custom_steps_separated !== undefined) payload.custom_steps_separated = args.custom_steps_separated;

    const data = await this.makeRequest(`add_case/${args.section_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  private async updateCase(args: any) {
    const payload: any = {};
    
    if (args.title !== undefined) payload.title = args.title;
    if (args.template_id !== undefined) payload.template_id = args.template_id;
    if (args.type_id !== undefined) payload.type_id = args.type_id;
    if (args.priority_id !== undefined) payload.priority_id = args.priority_id;
    if (args.estimate !== undefined) payload.estimate = args.estimate;
    if (args.refs !== undefined) payload.refs = args.refs;
    if (args.custom_preconds !== undefined) payload.custom_preconds = args.custom_preconds;
    if (args.custom_steps !== undefined) payload.custom_steps = args.custom_steps;
    if (args.custom_expected !== undefined) payload.custom_expected = args.custom_expected;
    if (args.custom_steps_separated !== undefined) payload.custom_steps_separated = args.custom_steps_separated;

    const data = await this.makeRequest(`update_case/${args.case_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  private async deleteCase(caseId: number) {
    await this.makeRequest(`delete_case/${caseId}`, 'POST');
    return this.formatResponse({ success: true, message: 'Case deleted' });
  }

  private async getCaseTypes() {
    const data = await this.makeRequest('get_case_types');
    return this.formatResponse(data);
  }

  private async getCaseFields() {
    const data = await this.makeRequest('get_case_fields');
    return this.formatResponse(data);
  }

  private async getHistoryForCase(args: any) {
    let endpoint = `get_history_for_case/${args.case_id}`;
    const params: string[] = [];
    if (args.limit) params.push(`limit=${args.limit}`);
    if (args.offset) params.push(`offset=${args.offset}`);
    if (params.length > 0) endpoint += `&${params.join('&')}`;
    
    const data = await this.makeRequest(endpoint);
    return this.formatResponse(data);
  }

  private async copyCasesToSection(args: any) {
    const data = await this.makeRequest(`copy_cases_to_section/${args.section_id}`, 'POST', {
      case_ids: args.case_ids,
    });
    return this.formatResponse(data);
  }

  private async moveCasesToSection(args: any) {
    const data = await this.makeRequest(`move_cases_to_section/${args.section_id}`, 'POST', {
      suite_id: args.suite_id,
      case_ids: args.case_ids,
    });
    return this.formatResponse(data);
  }

  private async deleteCases(args: any) {
    let endpoint = `delete_cases/${args.project_id}`;
    if (args.suite_id) endpoint += `&suite_id=${args.suite_id}`;
    if (args.soft) endpoint += `&soft=${args.soft}`;
    
    const data = await this.makeRequest(endpoint, 'POST', {
      case_ids: args.case_ids,
    });
    return this.formatResponse(data);
  }

  // Runs
  private async getRuns(projectId: number) {
    const data = await this.makeRequest(`get_runs/${projectId}`);
    return this.formatResponse(data);
  }

  private async getRun(runId: number) {
    const data = await this.makeRequest(`get_run/${runId}`);
    return this.formatResponse(data);
  }

  private async addRun(args: any) {
    const payload: any = { name: args.name };
    
    if (args.description) payload.description = args.description;
    if (args.suite_id) payload.suite_id = args.suite_id;
    if (args.milestone_id) payload.milestone_id = args.milestone_id;
    if (args.assignedto_id) payload.assignedto_id = args.assignedto_id;
    if (args.include_all !== undefined) payload.include_all = args.include_all;
    if (args.case_ids) payload.case_ids = args.case_ids;

    const data = await this.makeRequest(`add_run/${args.project_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  private async updateRun(args: any) {
    const payload: any = {};
    
    if (args.name) payload.name = args.name;
    if (args.description !== undefined) payload.description = args.description;
    if (args.milestone_id !== undefined) payload.milestone_id = args.milestone_id;

    const data = await this.makeRequest(`update_run/${args.run_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  private async closeRun(runId: number) {
    const data = await this.makeRequest(`close_run/${runId}`, 'POST');
    return this.formatResponse(data);
  }

  private async deleteRun(args: any) {
    let endpoint = `delete_run/${args.run_id}`;
    if (args.soft) endpoint += `&soft=${args.soft}`;
    
    await this.makeRequest(endpoint, 'POST');
    return this.formatResponse({ success: true, message: 'Run deleted' });
  }

  // Tests
  private async getTests(runId: number) {
    const data = await this.makeRequest(`get_tests/${runId}`);
    return this.formatResponse(data);
  }

  private async getTest(testId: number) {
    const data = await this.makeRequest(`get_test/${testId}`);
    return this.formatResponse(data);
  }

  // Results
  private async getResults(testId: number) {
    const data = await this.makeRequest(`get_results/${testId}`);
    return this.formatResponse(data);
  }

  private async getResultsForCase(args: any) {
    const data = await this.makeRequest(`get_results_for_case/${args.run_id}/${args.case_id}`);
    return this.formatResponse(data);
  }

  private async getResultsForRun(runId: number) {
    const data = await this.makeRequest(`get_results_for_run/${runId}`);
    return this.formatResponse(data);
  }

  private async addResult(args: any) {
    const payload: any = { status_id: args.status_id };
    
    if (args.comment) payload.comment = args.comment;
    if (args.elapsed) payload.elapsed = args.elapsed;
    if (args.defects) payload.defects = args.defects;

    const data = await this.makeRequest(`add_result/${args.test_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  private async addResultForCase(args: any) {
    const payload: any = { status_id: args.status_id };
    
    if (args.comment) payload.comment = args.comment;
    if (args.elapsed) payload.elapsed = args.elapsed;

    const data = await this.makeRequest(`add_result_for_case/${args.run_id}/${args.case_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  private async addResultsForCases(args: any) {
    const data = await this.makeRequest(`add_results_for_cases/${args.run_id}`, 'POST', {
      results: args.results,
    });
    return this.formatResponse(data);
  }

  private async addResults(args: any) {
    const data = await this.makeRequest(`add_results/${args.run_id}`, 'POST', {
      results: args.results,
    });
    return this.formatResponse(data);
  }

  // Plans
  private async getPlans(projectId: number) {
    const data = await this.makeRequest(`get_plans/${projectId}`);
    return this.formatResponse(data);
  }

  private async getPlan(planId: number) {
    const data = await this.makeRequest(`get_plan/${planId}`);
    return this.formatResponse(data);
  }

  private async addPlan(args: any) {
    const payload: any = { name: args.name };
    if (args.description) payload.description = args.description;
    if (args.milestone_id) payload.milestone_id = args.milestone_id;
    if (args.entries) payload.entries = args.entries;
    
    const data = await this.makeRequest(`add_plan/${args.project_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  private async addPlanEntry(args: any) {
    const payload: any = { suite_id: args.suite_id };
    if (args.name) payload.name = args.name;
    if (args.description) payload.description = args.description;
    if (args.assignedto_id) payload.assignedto_id = args.assignedto_id;
    if (args.include_all !== undefined) payload.include_all = args.include_all;
    if (args.case_ids) payload.case_ids = args.case_ids;
    if (args.config_ids) payload.config_ids = args.config_ids;
    if (args.refs) payload.refs = args.refs;
    if (args.runs) payload.runs = args.runs;
    
    const data = await this.makeRequest(`add_plan_entry/${args.plan_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  private async addRunToPlanEntry(args: any) {
    const payload: any = { config_ids: args.config_ids };
    if (args.description) payload.description = args.description;
    if (args.assignedto_id) payload.assignedto_id = args.assignedto_id;
    if (args.include_all !== undefined) payload.include_all = args.include_all;
    if (args.case_ids) payload.case_ids = args.case_ids;
    if (args.refs) payload.refs = args.refs;
    
    const data = await this.makeRequest(`add_run_to_plan_entry/${args.plan_id}/${args.entry_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  private async updatePlan(args: any) {
    const payload: any = {};
    if (args.name) payload.name = args.name;
    if (args.description !== undefined) payload.description = args.description;
    if (args.milestone_id !== undefined) payload.milestone_id = args.milestone_id;
    
    const data = await this.makeRequest(`update_plan/${args.plan_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  private async updatePlanEntry(args: any) {
    const payload: any = {};
    if (args.name) payload.name = args.name;
    if (args.description !== undefined) payload.description = args.description;
    if (args.assignedto_id !== undefined) payload.assignedto_id = args.assignedto_id;
    if (args.include_all !== undefined) payload.include_all = args.include_all;
    if (args.case_ids) payload.case_ids = args.case_ids;
    if (args.refs !== undefined) payload.refs = args.refs;
    
    const data = await this.makeRequest(`update_plan_entry/${args.plan_id}/${args.entry_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  private async updateRunInPlanEntry(args: any) {
    const payload: any = {};
    if (args.description !== undefined) payload.description = args.description;
    if (args.assignedto_id !== undefined) payload.assignedto_id = args.assignedto_id;
    if (args.include_all !== undefined) payload.include_all = args.include_all;
    if (args.case_ids) payload.case_ids = args.case_ids;
    if (args.refs !== undefined) payload.refs = args.refs;
    
    const data = await this.makeRequest(`update_run_in_plan_entry/${args.run_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  private async closePlan(planId: number) {
    const data = await this.makeRequest(`close_plan/${planId}`, 'POST');
    return this.formatResponse(data);
  }

  private async deletePlan(planId: number) {
    await this.makeRequest(`delete_plan/${planId}`, 'POST');
    return this.formatResponse({ success: true, message: 'Plan deleted' });
  }

  private async deletePlanEntry(args: any) {
    await this.makeRequest(`delete_plan_entry/${args.plan_id}/${args.entry_id}`, 'POST');
    return this.formatResponse({ success: true, message: 'Plan entry deleted' });
  }

  private async deleteRunFromPlanEntry(runId: number) {
    await this.makeRequest(`delete_run_from_plan_entry/${runId}`, 'POST');
    return this.formatResponse({ success: true, message: 'Run removed from plan entry' });
  }

  // Milestones
  private async getMilestones(projectId: number) {
    const data = await this.makeRequest(`get_milestones/${projectId}`);
    return this.formatResponse(data);
  }

  private async getMilestone(milestoneId: number) {
    const data = await this.makeRequest(`get_milestone/${milestoneId}`);
    return this.formatResponse(data);
  }

  private async addMilestone(args: any) {
    const payload: any = { name: args.name };
    if (args.description) payload.description = args.description;
    if (args.due_on) payload.due_on = args.due_on;
    if (args.parent_id) payload.parent_id = args.parent_id;
    if (args.refs) payload.refs = args.refs;
    if (args.start_on) payload.start_on = args.start_on;
    
    const data = await this.makeRequest(`add_milestone/${args.project_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  private async updateMilestone(args: any) {
    const payload: any = {};
    if (args.name) payload.name = args.name;
    if (args.description !== undefined) payload.description = args.description;
    if (args.due_on !== undefined) payload.due_on = args.due_on;
    if (args.is_completed !== undefined) payload.is_completed = args.is_completed;
    if (args.is_started !== undefined) payload.is_started = args.is_started;
    if (args.parent_id !== undefined) payload.parent_id = args.parent_id;
    if (args.start_on !== undefined) payload.start_on = args.start_on;
    
    const data = await this.makeRequest(`update_milestone/${args.milestone_id}`, 'POST', payload);
    return this.formatResponse(data);
  }

  private async deleteMilestone(milestoneId: number) {
    await this.makeRequest(`delete_milestone/${milestoneId}`, 'POST');
    return this.formatResponse({ success: true, message: 'Milestone deleted' });
  }

  // Users
  private async getUser(userId: number) {
    const data = await this.makeRequest(`get_user/${userId}`);
    return this.formatResponse(data);
  }

  private async getCurrentUser() {
    const data = await this.makeRequest('get_current_user');
    return this.formatResponse(data);
  }

  private async getUserByEmail(email: string) {
    const data = await this.makeRequest(`get_user_by_email&email=${encodeURIComponent(email)}`);
    return this.formatResponse(data);
  }

  private async getUsers(projectId?: number) {
    const endpoint = projectId ? `get_users/${projectId}` : 'get_users';
    const data = await this.makeRequest(endpoint);
    return this.formatResponse(data);
  }

  // Statuses
  private async getStatuses() {
    const data = await this.makeRequest('get_statuses');
    return this.formatResponse(data);
  }

  private async getCaseStatuses() {
    const data = await this.makeRequest('get_case_statuses');
    return this.formatResponse(data);
  }

  // Priorities
  private async getPriorities() {
    const data = await this.makeRequest('get_priorities');
    return this.formatResponse(data);
  }

  // Templates
  private async getTemplates(projectId: number) {
    const data = await this.makeRequest(`get_templates/${projectId}`);
    return this.formatResponse(data);
  }

  // Configurations
  private async getConfigs(projectId: number) {
    const data = await this.makeRequest(`get_configs/${projectId}`);
    return this.formatResponse(data);
  }

  // Result Fields
  private async getResultFields() {
    const data = await this.makeRequest('get_result_fields');
    return this.formatResponse(data);
  }

  // Attachments - Upload
  private async addAttachmentToCase(args: any) {
    const data = await this.makeMultipartRequest(`add_attachment_to_case/${args.case_id}`, args.file_path);
    return this.formatResponse(data);
  }

  private async addAttachmentToResult(args: any) {
    const data = await this.makeMultipartRequest(`add_attachment_to_result/${args.result_id}`, args.file_path);
    return this.formatResponse(data);
  }

  private async addAttachmentToRun(args: any) {
    const data = await this.makeMultipartRequest(`add_attachment_to_run/${args.run_id}`, args.file_path);
    return this.formatResponse(data);
  }

  private async addAttachmentToPlan(args: any) {
    const data = await this.makeMultipartRequest(`add_attachment_to_plan/${args.plan_id}`, args.file_path);
    return this.formatResponse(data);
  }

  private async addAttachmentToPlanEntry(args: any) {
    const data = await this.makeMultipartRequest(`add_attachment_to_plan_entry/${args.plan_id}/${args.entry_id}`, args.file_path);
    return this.formatResponse(data);
  }

  // Attachments - Get
  private async getAttachment(attachmentId: string) {
    const session = this.getCurrentUserSession();
    if (!session) {
      throw new Error('Not authenticated. Please configure TestRail credentials.');
    }

    const auth = Buffer.from(`${session.username}:${session.apiKey}`).toString('base64');
    
    const response = await axios({
      method: 'GET',
      url: `${session.testrailUrl}/index.php?/api/v2/get_attachment/${attachmentId}`,
      headers: {
        'Authorization': `Basic ${auth}`,
      },
      responseType: 'arraybuffer',
    });

    // Return info about the attachment instead of raw binary
    return this.formatResponse({
      message: 'Attachment retrieved successfully',
      attachment_id: attachmentId,
      size: response.data.length,
      content_type: response.headers['content-type'],
    });
  }

  private async getAttachmentsForCase(args: any) {
    let endpoint = `get_attachments_for_case/${args.case_id}`;
    const params: string[] = [];
    if (args.limit) params.push(`limit=${args.limit}`);
    if (args.offset) params.push(`offset=${args.offset}`);
    if (params.length > 0) endpoint += `&${params.join('&')}`;
    
    const data = await this.makeRequest(endpoint);
    return this.formatResponse(data);
  }

  private async getAttachmentsForTest(testId: number) {
    const data = await this.makeRequest(`get_attachments_for_test/${testId}`);
    return this.formatResponse(data);
  }

  private async getAttachmentsForRun(args: any) {
    let endpoint = `get_attachments_for_run/${args.run_id}`;
    const params: string[] = [];
    if (args.limit) params.push(`limit=${args.limit}`);
    if (args.offset) params.push(`offset=${args.offset}`);
    if (params.length > 0) endpoint += `?${params.join('&')}`;
    
    const data = await this.makeRequest(endpoint);
    return this.formatResponse(data);
  }

  private async getAttachmentsForPlan(args: any) {
    let endpoint = `get_attachments_for_plan/${args.plan_id}`;
    const params: string[] = [];
    if (args.limit) params.push(`limit=${args.limit}`);
    if (args.offset) params.push(`offset=${args.offset}`);
    if (params.length > 0) endpoint += `&${params.join('&')}`;
    
    const data = await this.makeRequest(endpoint);
    return this.formatResponse(data);
  }

  private async getAttachmentsForPlanEntry(args: any) {
    const data = await this.makeRequest(`get_attachments_for_plan_entry/${args.plan_id}/${args.entry_id}`);
    return this.formatResponse(data);
  }

  // Attachments - Delete
  private async deleteAttachment(attachmentId: string) {
    await this.makeRequest(`delete_attachment/${attachmentId}`, 'POST');
    return this.formatResponse({ success: true, message: 'Attachment deleted' });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('TestRail MCP Server running on stdio');
  }
}

// Start the server
const server = new TestRailMCP();
server.run().catch(console.error);
