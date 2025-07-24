# Project Lifecycle & Modes of Operation

## 1. Purpose
This document defines the lifecycle for all development work. Your first responsibility is to select the correct **Mode of Operation** for any given task. This choice dictates your level of autonomy and the protocol you must follow.

## 2. Mandatory First Step: Mode Selection
You must classify every request into one of three modes. State the chosen mode in your response.

> **Mode 1: `Execution Mode`**
> **Trigger:** For direct commands and self-contained tasks (fixes, refactors, simple updates).
> **Autonomy:** **High.** You will show your plan and execute in a single, atomic step.

> **Mode 2: `Planning Mode`**
> **Trigger:** For collaborative creation of a new feature plan or PRD.
> **Autonomy:** **Collaborative.** You will act as an iterative partner.

> **Mode 3: `Implementation Mode`**
> **Trigger:** For executing a feature from a completed and approved PRD.
> **Autonomy:** **Low.** You must wait for explicit approval before executing the plan.

---

## 3. Mode Protocols

### `Execution Mode` Protocol
1.  **Formulate Plan:** Create a concise `<execution_plan>`, including your Verification Log and Execution Steps. The plan's detail should match the task's simplicity.
2.  **Execute & Report:** In a single, atomic response, present the `<execution_plan>` immediately followed by the final, complete code. **Do not wait for approval.**
3.  **Safety Escalation:** If you discover the task is more complex than anticipated, you **MUST** halt, announce a switch to `Implementation Mode`, and present your plan for approval.

### `Planning Mode` Protocol
1.  **Initiate:** Create a new draft PRD file in `docs/prd/drafts/`.
2.  **Collaborate:** Work iteratively with the human developer to build the PRD section by section.
3.  **Manage State:** Ensure progress is saved on pause and the draft is reloaded on resume.
4.  **Finalize:** Upon user approval, move the completed PRD to `docs/prd/` and mark it as "Ready for Development."

### `Implementation Mode` Protocol
1.  **Formulate Plan:** Review the approved PRD and produce a detailed `<execution_plan>`.
2.  **Present & Wait for Approval:** Present the `<execution_plan>` as a standalone response. You **MUST** stop and wait for an explicit "Go" or "Approved" command.
3.  **Execute:** After approval, implement the code strictly following the **`docs/TDD_FRAMEWORK.md`**.
4.  **Manage State:** If the task is paused, you **MUST** use the "WIP Snapshot" protocol defined in the appendix.
5.  **Complete:** Follow the formal completion process: clean the WIP Snapshot from the PRD, archive it, and update the `MEMORY_BANK.md`.

---

### Appendix: WIP Snapshot Template
> Use this exact template when pausing in `Implementation Mode`.

```markdown
---
## Work-in-Progress (WIP) Snapshot
*   **Pause Date:** YYYY-MM-DD
*   **Last Completed Step:** [Describe the last fully completed step.]
*   **Next Step:** [Describe the immediate next step upon resuming.]
*   **Files Modified:** [`path/to/file1.ts`, `path/to/file2.test.ts`]
---
```
