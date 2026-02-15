# Claude Code Automation Setup Guide

This guide will help you complete the setup of all recommended Claude Code automations for your chess opening explorer project.

## ✅ What's Already Configured

The following have been automatically configured:

1. **Hooks** (`.claude/settings.local.json`)
   - Auto-lint after editing web/API code
   - Type-check after editing TypeScript
   - Block direct .env file edits for security

2. **Subagents** (`.claude/agents/`)
   - `test-writer.md` - Generate comprehensive tests
   - `pipeline-reviewer.md` - Review data pipeline code

3. **Prettier** (`.prettierrc`, `.prettierignore`)
   - Code formatting configuration
   - Added to package.json scripts

4. **GitHub Actions** (`.github/workflows/`)
   - `ci.yml` - Run tests, linting, and type-check on PRs
   - `coverage.yml` - Enforce 90% coverage threshold

## 📋 Manual Steps Required

### Step 1: Install Node Dependencies

Install Prettier:

```bash
npm install
```

### Step 2: Install MCP Servers

Install the recommended MCP servers for enhanced functionality:

```bash
# context7 - Live documentation for React, Express, Vite, etc.
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest

# GitHub MCP - Manage issues, PRs, workflows
# First, make sure you have a GitHub Personal Access Token
# Set it as an environment variable or you'll be prompted:
# export GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here

claude mcp add-json github '{"command":"npx","args":["-y","@modelcontextprotocol/server-github"],"env":{"GITHUB_PERSONAL_ACCESS_TOKEN":"'$GITHUB_TOKEN'"}}'
```

**Alternative for GitHub MCP** (if you have `gh` CLI installed and authenticated):
```bash
# This uses your gh CLI authentication
gh auth login
claude mcp add github -- gh api graphql
```

### Step 3: Install Claude Code Plugins

Install plugins using the interactive `/plugin` command in Claude Code:

**Option 1: Interactive Installation (Recommended)**
1. In your Claude Code session, type: `/plugin`
2. Select "Add MarketPlace"
3. Enter: `anthropics/claude-code`
4. Select "Browse and install plugins"
5. Choose `commit-commands` and `frontend-design`
6. Confirm installation

**Option 2: Command Line (if available)**
```bash
# These commands may work depending on your Claude Code version
claude plugin add anthropic-agent-skills/commit-commands
claude plugin add anthropic-agent-skills/frontend-design
```

### Step 4: Verify Hooks are Working

Edit a file to test the hooks:

```bash
# Edit a TypeScript file in the web package
# After saving, you should see auto-lint and type-check run automatically
```

If hooks aren't running, restart your Claude Code session to reload the configuration.

### Step 5: Run Initial Formatting (Optional)

Format all code with Prettier:

```bash
npm run format
```

This will format all JavaScript, TypeScript, JSON, and Markdown files according to the project's style guide.

### Step 6: Test GitHub Actions (Optional)

Push to a branch and create a PR to see GitHub Actions in action:

```bash
git checkout -b test/setup-verification
git add .
git commit -m "chore: configure Claude Code automations"
git push -u origin test/setup-verification

# Then create a PR on GitHub to see CI/CD run
```

## 🎯 How to Use Your New Automations

### MCP Servers

#### context7
Ask Claude questions about libraries and it will fetch live documentation:

- "Show me the latest React 19 concurrent features"
- "How do I use Vite's environment variables?"
- "What's the Vertex AI API for text generation?"

#### GitHub MCP
Manage your repository directly from Claude:

- "Show me open issues labeled 'bug'"
- "Create a GitHub Actions workflow for deployment"
- "What's the status of PR #42?"

### Plugins

#### /commit
Automatically create conventional commits:

```bash
# Make your changes, then use:
/commit

# Claude will:
# 1. Review changed files
# 2. Generate a conventional commit message
# 3. Commit with Co-Authored-By attribution
```

#### /frontend-design
Generate production-ready React components:

```bash
/frontend-design

# Then describe your component:
# "Create a chess board selector with opening preview"
```

### Subagents

#### test-writer
Invoke manually or let Claude use it:

```
"Use the test-writer subagent to generate tests for the video matcher"
```

#### pipeline-reviewer
Invoke for code reviews:

```
"Use the pipeline-reviewer to review the course discovery pipeline"
```

### Hooks

Hooks run automatically - you don't need to do anything! They'll:

- **Auto-lint** your code after every edit
- **Type-check** TypeScript files after changes
- **Block** accidental .env edits

## 🔧 Customization

### Adding More Hooks

Edit `.claude/settings.local.json` to add custom hooks. See the existing hooks for examples.

### Adding More Subagents

Create new `.md` files in `.claude/agents/` following the pattern of the existing agents.

### Adjusting Prettier Rules

Edit `.prettierrc` to customize formatting rules.

### Extending GitHub Actions

Add new workflow files to `.github/workflows/` for additional CI/CD steps.

## 🆘 Troubleshooting

### Hooks not running?
- Restart your Claude Code session
- Check `.claude/settings.local.json` for syntax errors
- Ensure permissions include the hook commands

### MCP servers not working?
- Run `claude mcp list` to see installed servers
- Check that servers are enabled in Claude settings
- For GitHub MCP, ensure `gh` CLI is authenticated

### Plugins not found?
- Run `claude plugin list` to see installed plugins
- Try `claude plugin update` to refresh the plugin cache

### GitHub Actions failing?
- Check that all tests pass locally first
- Ensure Node 18+ is used in workflows
- Review the action logs on GitHub for specific errors

## 📚 Learn More

- **Claude Code Docs**: https://docs.anthropic.com/claude/docs/claude-code
- **MCP Protocol**: https://modelcontextprotocol.io
- **GitHub Actions**: https://docs.github.com/actions

## 🎉 You're All Set!

Your Claude Code environment is now fully configured with:
- ✅ Automated linting and type-checking
- ✅ Specialized subagents for testing and pipeline review
- ✅ Live documentation access via MCP
- ✅ Convenient commit and frontend design workflows
- ✅ CI/CD pipelines for quality assurance

Happy coding! 🚀
