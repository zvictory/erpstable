Here are the Claude tools and strategies you have available to optimize your development workflow:

  🛠️ Available Claude Tools

  1. Task/Agent System (Most Powerful)

  I can launch specialized agents for different work types:

  # Code exploration & codebase analysis
  /Task with subagent_type=Explore

  # Software architecture & design planning  
  /Task with subagent_type=Plan

  # Quick searches & complex multi-step tasks
  /Task with subagent_type=general-purpose

  # Git & terminal operations
  /Task with subagent_type=Bash

  # Claude Code CLI questions & MCP setup
  /Task with subagent_type=claude-code-guide

  Best for your project: Use Explore agent when you need to understand large parts of the codebase quickly.

  2. EnterPlanMode

  Before implementing complex features (like you did with the inline editor refactor):
  - I analyze the codebase first
  - Design the architecture
  - Create a step-by-step implementation plan
  - Get your approval before writing code

  Saves time on: Major refactors, architectural decisions, multi-file changes

  3. TodoWrite

  Already using—tracks progress and prevents forgotten tasks.

  4. Web Search & Fetch

  For finding:
  - Latest package versions & breaking changes
  - Third-party library documentation
  - Best practices & solutions for errors

  5. AskUserQuestion

  For making decisions mid-work without context switching:
  - Multiple choice questions
  - Confirms approach before implementation
  - Gathers preferences on design options

  ---
  📋 Optimization Strategies for Your ERP App

  For Development Speed:

  1. Use Explore Agent for Codebase Navigation
  When: "Where should I add this new feature?"
  Response: Agent maps entire component structure
  2. Batch Similar Changes
    - Instead of file-by-file edits, ask me to:
        - Update all translation files at once
      - Refactor similar components in parallel
      - Fix patterns across multiple files
  3. Request Parallel Work
    - When tasks are independent, ask: "Run these in parallel"
    - I'll execute multiple searches/reads simultaneously

  For Code Quality:

  1. Pre-Implementation Plans (EnterPlanMode)
    - Before touching VAT removal (your next task)
    - Before database schema changes
    - Before adding new features with 3+ affected files
  2. Automated Issue Finding
  Ask: "Find all places where [pattern] exists"
  Response: Full impact analysis

  For the VAT Removal Task (Next Item):

  Suggest approach:
  1. Use Explore agent to find all VAT references
  2. Plan mode to map removal strategy
  3. Execute changes in parallel (schemas, components, translations)
  4. Test with dev server

  ---
  🚀 Superpowers You Should Leverage

  1. Concurrent Search

  Instead of: "Search for X, then search for Y"
  Ask: "Find all VAT references AND all tax calculations AND VAT translation keys"
  → I'll run all 3 searches in parallel

  2. Multi-File Coordinated Changes

  For VAT removal:
  - Modify 8 files simultaneously (with dependency awareness)
  - Not sequentially
  - Saves 80% of time

  3. Architectural Pre-Analysis

  Before you ask "how do I implement X":
  Use EnterPlanMode → I explore → present options → you pick → implementation
  Better than: you describe idea → I code → you dislike approach

  4. Automated Testing Hints

  I can:
  - Identify test cases you should run
  - Suggest edge cases you're missing
  - Point out performance bottlenecks before they happen

  ---
  💡 Recommended Workflow for VAT Removal (Your Next Task)

  Instead of asking me to "remove VAT", do this:

  1. "Enter plan mode for VAT removal"
     → I'll explore codebase, show impact areas

  2. Review my findings (30 seconds)

  3. "Execute the plan"
     → I handle all file changes in coordinated way

  4. "Test this"
     → I verify against your existing data

  Time saved: ~2-3 hours of manual exploration

  ---
  🔍 What I Can't Do (Limitations)

  - ❌ Persistent memory between sessions (use this transcript)
  - ❌ Direct file system access beyond reading/writing
  - ❌ Real-time debugging (no breakpoints/stepping)
  - ❌ Running tests automatically (only viewing results)
  - ❌ Git history analysis (only current state)

  ---
  📊 Quick Reference: Tool Selection
  ┌───────────────────────┬────────────────────────────┬──────────────────────────────┐
  │         Task          │         Best Tool          │             Why              │
  ├───────────────────────┼────────────────────────────┼──────────────────────────────┤
  │ Understand codebase   │ Explore Agent              │ Maps entire structure        │
  ├───────────────────────┼────────────────────────────┼──────────────────────────────┤
  │ Find all X references │ Parallel Grep + Glob       │ Instant results              │
  ├───────────────────────┼────────────────────────────┼──────────────────────────────┤
  │ Architecture decision │ EnterPlanMode              │ Prevents rework              │
  ├───────────────────────┼────────────────────────────┼──────────────────────────────┤
  │ Multi-file changes    │ Task Agent                 │ Coordinates changes          │
  ├───────────────────────┼────────────────────────────┼──────────────────────────────┤
  │ VAT removal           │ Plan Mode + Parallel Edits │ Comprehensive impact         │
  ├───────────────────────┼────────────────────────────┼──────────────────────────────┤
  │ Quick questions       │ AskUserQuestion            │ Unblock without context loss │
  └───────────────────────┴────────────────────────────┴──────────────────────────────┘
  ---
  🎯 My Recommendation for Your Project

  Given your ERP complexity:

  1. Always use EnterPlanMode for:
    - Features touching 3+ files
    - Database schema changes
    - Translation/i18n updates
    - UI refactors
  2. Use Explore Agent before tackling:
    - New modules
    - Bug fixes in unfamiliar areas
    - Performance improvements
  3. Batch translations (all languages at once, not one-by-one)
  4. Run searches in parallel when possible
  5. Ask me to verify impact before major changes

  ---
  Would you like me to start the VAT removal task using PlanMode? That would let me map out all affected files and get your approval before making changes.