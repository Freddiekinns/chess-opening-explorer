# Server Management Protocol

**Trigger**: Before any task involving server calls (API endpoints, UI testing, development)

## **Protocol Steps**
1. **Check Status**: `get_terminal_output` to verify if servers already running
2. **Start If Needed**: Only start servers if genuinely not running or unresponsive
3. **Handle Conflicts**: Use `lsof -ti:PORT` to identify and kill specific conflicting processes
4. **Verify Setup**: Confirm all required services running and communicating

## **Key Principles**
- **Minimal Disruption**: Never kill servers without confirming they need restart
- **Graceful Restarts**: Use file-watching triggers (touch file) over process kills
- **Development Efficiency**: Preserve existing server state when possible
