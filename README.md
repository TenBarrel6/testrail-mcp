# TestRail MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for seamless TestRail integration. This server enables AI assistants like Claude, Cursor, and other MCP-compatible clients to interact directly with your TestRail instance.

## Features

- 🔐 **Secure Authentication** - API key-based authentication with TestRail
- 📊 **Full TestRail API Coverage** - Support for TestRail API v9.7.2
- 🚀 **Easy Integration** - Works with Cursor, Claude Desktop, and other MCP clients
- 📦 **Zero Configuration** - Run directly with `npx`

## Installation

### Global Installation

```bash
npm i -g @tenbarrel6/testrail-mcp
```

### Local Installation

```bash
npm i @tenbarrel6/testrail-mcp
```

### Using npx

No installation required - run directly in downloaded github repository:

```bash
npx @tenbarrel6/testrail-mcp
```

## Configuration

### Environment Variables

Create a `.env` file in your project root or set environment variables:

```env
TESTRAIL_URL=https://your-domain.testrail.io
TESTRAIL_USERNAME=your-email@example.com
TESTRAIL_API_KEY=your-api-key-here
```

### Cursor IDE Configuration

Add to your Cursor settings (`.cursor/mcp.json` or global settings):

```json
{
  "mcpServers": {
    "testrail": {
      "command": "npx",
      "args": ["-y", "@tenbarrel6/testrail-mcp"],
      "env": {
        "TESTRAIL_URL": "https://your-company.testrail.io",
        "TESTRAIL_USERNAME": "your-email@company.com",
        "TESTRAIL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Claude Desktop Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "testrail": {
      "command": "npx",
      "args": ["-y", "@tenbarrel6/testrail-mcp"],
      "env": {
        "TESTRAIL_URL": "https://your-company.testrail.io",
        "TESTRAIL_USERNAME": "your-email@company.com",
        "TESTRAIL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Getting Your TestRail API Key

1. Log in to your TestRail instance
2. Go to **My Settings** (click your name in the top right)
3. Navigate to the **API Keys** tab
4. Click **Add Key** to generate a new API key
5. Copy and save the key securely

## Available Tools

### Projects

| Tool | Description |
|------|-------------|
| `get_projects` | Get all TestRail projects |
| `get_project` | Get a specific project by ID |

### Test Suites

| Tool | Description |
|------|-------------|
| `get_suites` | Get all test suites for a project |
| `get_suite` | Get a specific test suite by ID |
| `add_suite` | Create a new test suite |
| `update_suite` | Update an existing test suite |

### Sections

| Tool | Description |
|------|-------------|
| `get_sections` | Get all sections for a project/suite |
| `get_section` | Get a specific section by ID |
| `add_section` | Create a new section |
| `update_section` | Update an existing section |
| `delete_section` | Delete a section |
| `move_section` | Move a section to another parent or position |

### Test Cases

| Tool | Description |
|------|-------------|
| `get_cases` | Get test cases for a project/suite |
| `get_case` | Get a specific test case by ID |
| `add_case` | Create a new test case |
| `update_case` | Update an existing test case |
| `delete_case` | Delete a test case |
| `delete_cases` | Delete multiple test cases |
| `copy_cases_to_section` | Copy test cases to another section |
| `move_cases_to_section` | Move test cases to another section |
| `get_case_types` | Get all available test case types |
| `get_case_fields` | Get all available test case fields |
| `get_history_for_case` | Get the edit history for a test case |

### Test Runs

| Tool | Description |
|------|-------------|
| `get_runs` | Get test runs for a project |
| `get_run` | Get a specific test run by ID |
| `add_run` | Create a new test run |
| `update_run` | Update an existing test run |
| `close_run` | Close a test run |
| `delete_run` | Delete a test run |

### Tests

| Tool | Description |
|------|-------------|
| `get_tests` | Get tests for a test run |
| `get_test` | Get a specific test by ID |

### Results

| Tool | Description |
|------|-------------|
| `get_results` | Get results for a test |
| `get_results_for_case` | Get results for a test case in a run |
| `get_results_for_run` | Get all results for a test run |
| `add_result` | Add a test result |
| `add_result_for_case` | Add a test result for a specific case in a run |
| `add_results` | Add multiple test results by test IDs |
| `add_results_for_cases` | Add multiple test results for cases in a run |

### Test Plans

| Tool | Description |
|------|-------------|
| `get_plans` | Get test plans for a project |
| `get_plan` | Get a specific test plan by ID |
| `add_plan` | Create a new test plan |
| `update_plan` | Update an existing test plan |
| `close_plan` | Close a test plan |
| `delete_plan` | Delete a test plan |
| `add_plan_entry` | Add test runs to a test plan |
| `update_plan_entry` | Update a test plan entry |
| `delete_plan_entry` | Delete a test plan entry |
| `add_run_to_plan_entry` | Add a test run to an existing plan entry |
| `update_run_in_plan_entry` | Update a test run inside a plan entry |
| `delete_run_from_plan_entry` | Delete a test run from a plan entry |

### Milestones

| Tool | Description |
|------|-------------|
| `get_milestones` | Get milestones for a project |
| `get_milestone` | Get a specific milestone by ID |
| `add_milestone` | Create a new milestone |
| `update_milestone` | Update an existing milestone |
| `delete_milestone` | Delete a milestone |

### Users

| Tool | Description |
|------|-------------|
| `get_users` | Get all users (optionally filtered by project) |
| `get_user` | Get a user by ID |
| `get_user_by_email` | Get a user by email address |
| `get_current_user` | Get the current authenticated user |

### Statuses & Priorities

| Tool | Description |
|------|-------------|
| `get_statuses` | Get all available test result statuses |
| `get_case_statuses` | Get all available test case statuses (Enterprise) |
| `get_priorities` | Get all available test case priorities |

### Templates & Configurations

| Tool | Description |
|------|-------------|
| `get_templates` | Get all templates for a project |
| `get_configs` | Get all configurations for a project |
| `get_result_fields` | Get all available result custom fields |

### Attachments

| Tool | Description |
|------|-------------|
| `add_attachment_to_case` | Add an attachment to a test case |
| `add_attachment_to_result` | Add an attachment to a test result |
| `add_attachment_to_run` | Add an attachment to a test run |
| `add_attachment_to_plan` | Add an attachment to a test plan |
| `add_attachment_to_plan_entry` | Add an attachment to a test plan entry |
| `get_attachment` | Get/download an attachment by ID |
| `get_attachments_for_case` | Get all attachments for a test case |
| `get_attachments_for_test` | Get all attachments for a test |
| `get_attachments_for_run` | Get all attachments for a test run |
| `get_attachments_for_plan` | Get all attachments for a test plan |
| `get_attachments_for_plan_entry` | Get all attachments for a test plan entry |
| `delete_attachment` | Delete an attachment |

## Usage Examples

Once configured, you can interact with TestRail through your AI assistant:

### Get all projects
```
"List all TestRail projects"
```

### Create a test case
```
"Create a new test case in section 123 with title 'Verify login functionality'"
```

### Add test results
```
"Add a passed result for test case 456 in run 789 with comment 'All checks passed'"
```

### Get test run results
```
"Show me all results for test run 101"
```

## Test Result Status IDs

When adding results, use these standard status IDs:

| Status ID | Status |
|-----------|--------|
| 1 | Passed |
| 2 | Blocked |
| 3 | Untested |
| 4 | Retest |
| 5 | Failed |

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/TenBarrel6/testrail-mcp.git
cd testrail-mcp

# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev
```

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run the compiled server
- `npm run dev` - Run in development mode with hot reload

## Requirements

- Node.js 18+
- TestRail instance with API access enabled
- Valid TestRail API key

## Troubleshooting

### "Not authenticated" Error

Ensure your environment variables are correctly set:
- `TESTRAIL_URL` should include the protocol (https://)
- `TESTRAIL_USERNAME` should be your email address
- `TESTRAIL_API_KEY` should be a valid API key (not your password)

### Connection Issues

- Verify your TestRail URL is accessible
- Check if API access is enabled in your TestRail administration settings
- Ensure your user has appropriate permissions

### MCP Client Not Connecting

- Restart your MCP client (Cursor/Claude Desktop)
- Verify the configuration JSON syntax is valid
- Check that `npx` is available in your PATH

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Ruslan Sapun**

- GitHub: [@TenBarrel6](https://github.com/TenBarrel6)

## Links

- [npm Package](https://www.npmjs.com/package/@tenbarrel6/testrail-mcp)
- [GitHub Repository](https://github.com/TenBarrel6/testrail-mcp)
- [TestRail API Documentation](https://support.testrail.com/hc/en-us/articles/7077039051412-Introduction-to-the-TestRail-API)
- [Model Context Protocol](https://modelcontextprotocol.io/)
