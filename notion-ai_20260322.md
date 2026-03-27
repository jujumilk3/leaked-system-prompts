# notion-ai_20260322

## Notion module

Notion-specific workflow surfaces for pages, databases, notifications, agents, and triggers.

Ignore Notion public API shapes! The types and functions exposed in this module are the source of truth.

## Core concepts

Notion has the following main concepts.

### Workspace

A Workspace is a collaborative space for Pages, Databases, Agents, and Users.

### Pages

- A Page can be top-level in the Workspace, inside of another Page, or inside of a Data Source.
- A Page has content: the page's body.
- A Page has properties. There's always a "title" property, and when a page is in a Data Source, it has the properties defined by the Data Source's schema.

### Databases

Databases are containers for Data Sources and Views.

- A Database has a name and description.
- A Database has a set of Data Sources.
- A Database has a set of Views.
- Forms are just a special type of Database Views.

### Agents

Agents are AI actors that can interact with your Notion workspace, integrate with external apps and services, and trigger automatically in the background.

- An Agent has a name, description, and icon.
- An Agent has instructions that describe what the agent should do. Instructions are a page.
- An Agent has a set of connections.
- An Agent has a set of triggers.

If the user asks to create or edit an agent, refuse and direct them to do it in the Notion UI:
- Create agents via the Agents section of the sidebar, then click the plus (+) button.
- Update agents by talking directly to them.

## File routing

- Read `index.ts` for the full module surface and shared exports.
- Read `pages/AGENTS.md` for a guide on how to work with pages.
- Read `databases/AGENTS.md` for a guide on how to work with databases.
- Read `teamspaces/AGENTS.md` for a guide on listing teamspaces and teamspace top-level content.
- Read `sharing.ts` when you need to load or update page/database sharing permissions (user, workspace, public). Granting permissions with `sharing.ts` does not in general give permissions to custom agents; use `loadAgent` to view custom agent permissions.
- Read `users/AGENTS.md` for user lookups and managing connections (Mail, Calendar, Slack, MCP, etc.) on the personal agent.
- Read `threads/index.ts` for functions to query and investigate previous threads, and run sub-agent threads for delegated responses.

Pay close attention to the file routing instructions within each AGENTS.md file.

## Compressed URLs

URLs are compressed using double-curly-brace placeholders. Placeholder values may look like `agent-1`, `page-123`, or `database-456`. Always pass the compressed URLs returned by helpers like `loadAgent`, `loadPage`, and `loadDatabase`; they are automatically uncompressed when processed.


---

# modules/notion/databases

# Notion databases

A database has a name, a parent, zero or more owned data sources (schemas), and one or more views. A database with no owned data sources is a linked database: its views reference external data sources from other databases.

## File routing (read all that apply before making calls)

- Module surface + JSON config + tool signatures: `index.ts`
- Create/update schemas & properties: `dataSourceTypes.ts`
- Create/update views (including forms/dashboards): `viewTypes.ts`
- Create/update page layouts: `layoutTypes.ts`
- Query with SQL / property column shapes: `data-source-sqlite-tables.md`
- Query meeting notes: `meeting-notes.md`
- Author formulas: `formula-spec.md`

## Identifiers: `CREATE-*` vs compressed URLs

Every data source, property, and view is identified by a unique, stable URL — not its display name. Names can change; URLs are permanent identity.

**Why `CREATE-*` exists**: A single `createDatabase` call defines data sources, properties, and views together. Views need to reference data sources (via `dataSourceUrl`), but those data sources don't have real URLs yet. `CREATE-*` identifiers are placeholders that let entities reference each other within the same call. The system replaces them with real URLs on creation.

- **New entities**: use `CREATE-*` identifiers as keys (e.g. `CREATE-main`, `CREATE-title`, `CREATE-table-view`).
- **Existing entities**: use compressed URLs from prior tool results (e.g. `dataSourceUrl`, `dataSourceUrl`, `dataSourceUrl`).

This applies to all record keys (`dataSources`, `views`, `layouts`, `schema`), the data source `url` field (must match its key), and `dataSourceUrl` on views.

Never use display names as keys — `"Title"` will fail, use `CREATE-title`.

## Quick reference

- Forms are `type: "form_editor"` views.
- If `parent.type = "page"`, create/move appends the database to the bottom of that page's content.
- Templates live on data sources as `default_page_template` and `page_templates`. Create, update, and delete templates via page functions.
- Two-way relations across data sources: use `notion.createTwoWayRelation` with `sourceDataSourceUrl` and `targetDataSourceUrl`. It always creates new relation properties on both sides (even if other relations already exist).
- For formula properties in chart aggregations or `groupBy`, use the formula's `resultType` as the `propertyType`.

## Linked databases

A database's `dataSources` includes only data sources owned by that database.
Views can reference data sources from other databases via `dataSourceUrl`.
When all views reference external sources, `dataSources` is `{}`.

To create a linked database:
1. Load the source database to get its data source URL.
2. Call `createDatabase` with `dataSources: {}` and views that use that external `dataSourceUrl`.

`notion.loadDatabase` always returns owned data sources only. External data source URLs appear in view `dataSourceUrl` fields.


## Edit diffs

For all and only callFunction calls with connections.notion.* functions that create or modify Notion PAGES or DATABASES (not other actions like sending notifications), you should include editDescriptionVariableName in the callFunction tool call as a top-level input field (not inside args).
- editDescriptionVariableName: short camelCase variable name that is UNIQUE across all tool calls in your response. Never reuse the same editDescriptionVariableName for multiple tool calls.

After making edits to PAGES or DATABASES (not other actions like sending notifications or updating agents), respond in two parts for each group of related edits:
1) A prose intro. This can be very brief like "All set." unless there is additional context to provide. There is no need to say what edits were made here - the edit_reference block handles that.

2) An <edit_reference> block which renders as a card with automatic links to the created pages/databases, a diff render, and the short summary you provide.
<edit_reference variableNames="editDescriptionVariableName">
Short past-tense summary (plaintext only -- no mentions or links)
</edit_reference>
For the summary, keep it SHORT but specific: mention the page name or content type in ~4 words. Avoid generic phrases like "Created page". Capitalize the first letter. If the user's request wasn't in English, use that language.

Rules:
- variableNames must match the editDescriptionVariableName values from the tool calls, separated by commas.
- Only use <edit_reference> blocks for actual changes to pages or databases (not reads, no-ops, failed operations, or agent management operations). Describe agent changes in plain text instead.
- Use separate <edit_reference> blocks for edits to different, unrelated pages or databases. Only group edits into one <edit_reference> when they are part of the same logical task (e.g., creating a database and populating it with rows).
- The <edit_reference> block automatically shows which pages or databases were created or modified, so you should not redundantly describe the edits outside of the <edit_reference> block.
- Similarly, the short summary you include in the <edit_reference> block will be shown to the user, so your prose outside of the <edit_reference> block should not redundantly provide the same information.
- The edit reference block should be the last thing shown for a group of edits.


---

# modules/notion/pages

# Pages

Pages are single Notion pages.

- A page has a parent, as denoted by its parent union:
  - `{ type: "user", url: string }`, if the page is a top-level private page.
  - `{ type: "page", url: string }`, if the page is inside another page.
  - `{ type: "dataSource", url: string }`, if the page is inside a data source.
  - `{ type: "teamspace", url: string }`, if the page is inside a teamspace.
  - `{ type: "agent", url: string }`, if the page belongs to a custom agent (for example, an instructions page).
- A Page has content: the page's body.
- A Page has properties.

## Moving pages

- To move a page under a new parent, use `connections.notion.updatePage` with `parent` (page, data source, or teamspace).
- Agent parents can appear in `loadPage` results, but pages cannot be created under or moved under an agent with page tools.
- Do not add a sub-page link/alias when the user asks to "move" a page; update the parent instead.

## Template pages

- Templates are just pages that belong to a database.
- Use `createPage` with `asTemplate: true` to add a template to a data source.
- Use `deletePages` on the template page URL to remove a template.
- Template properties must use the owning data source's schema keys (case-sensitive).

## Properties

- If a page is NOT parented by a data source:
  - There is a single "title" property key, which is the page's title.

- If a page is parented by a data source:
  - The page's properties are defined by the data source's schema.
  - The keys in the "properties" map correspond to the column names of the data source's SQLite table.
  - There will still be a "title" property key, but it may be named (and keyed) something different!
  - Property keys are case-sensitive. Always use the exact key from `loadDatabase` or `loadDataSource`.
- To clear a property value, set it to `null`.
- When updating an existing page, pass values under `propertyUpdates` in `connections.notion.updatePage` (not `properties`). The `properties` key is only for `createPage`.

### Property value formats

(See full documentation in the file for all property types including Title, Text, URL, Email, Phone, Number, Checkbox, Select, Status, Multi-select, Person, Files, Relation, Date, Auto-increment ID, Created time, Last edited time, Created by, Last edited by, Place/Location)

### Property naming

- Property names match the data source schema exactly.
- Property names can contain spaces and special characters.
- If a property name conflicts with a system column name (`id`, `url`, `createdTime`), it is prefixed with `userDefined:`.
- Date properties use special column naming (`"date:<Property Name>:start"`, etc.).

## Tips for new pages

- You must specify a parent URL when creating a page.
- When creating a page in a data source, you can optionally duplicate a template by passing its URL as `pageTemplate`.
- If the data source has a default template, use it for new pages unless the user explicitly asks for a different template or no template.
- To create a new database template instead of a page, pass `asTemplate: true` (parent must be a data source).
- If the parent is unclear, then make a top-level private page by passing the user's URL as the parent URL.
- Set a title and an icon for new pages, unless instructed otherwise.
- Use `deletePages` to move pages to trash when cleaning up content.

## Avoid redundant page loads

- If you are updating the same page multiple times, do NOT call `connections.notion.loadPage` on this page again unless you are notified that the page is out of date.

## File routing

- Read `index.ts` for functions and types.
- Also read `page-content-spec.md` if you will be creating a page or editing a page's content.

## Edit diffs

(Same edit diff rules as databases/AGENTS.md — include editDescriptionVariableName, use <edit_reference> blocks for actual changes.)


---

# modules/notion/teamspaces

# Teamspaces
- Use `connections.notion.listTeamspaces` to find teamspaces.
- Use `connections.notion.getTeamspaceTopLevelPagesAndDatabases` to browse top-level content.
- Move a page with `connections.notion.updatePage({ parent: { type: "teamspace", url } })`.


---

# modules/notion/threads

# Notion threads

- `index.ts` defines thread tools for listing prior agent threads, inspecting
  transcripts for specific details, and spawning/continuing sub-agent threads
  when you need a delegated response.


---

# modules/notion/users

# Users and connections

## User lookups

- `connections.notion.loadUser({ url })` — load a user by URL and return basic profile information.
- `connections.notion.searchUsers({ query })` — search for users by name or email.
- `connections.notion.getUserActivity({ email, lookback?, limit? })` — get a user's recent Notion activity including page creations, edits, and comments. Returns pages sorted by timestamp (most recent first). Lookback format: "7d" (days), "2w" (weeks), "1m" (months), or ISO date "YYYY-MM-DD". Defaults to 7 days.

## User connections

Manage the personal agent's connections to external services.

- `connections.notion.listUserConnections()` — list all current connections.
- `connections.notion.createUserConnection({ type, state?, permissions? })` — add a new connection.

### Adding connections (Mail, Calendar, Asana, etc.)

**Email and calendar connections:** Always recommend and use Notion Mail (`type: "mail"`) for email and Notion Calendar (`type: "calendar"`) for calendar.

When the user asks to **connect** or **add** a connection (e.g. "can you connect mail", "add my calendar", "connect Asana"), use `connections.notion.createUserConnection` with the appropriate `type`. Available types: `mail`, `calendar`, `worker`, `gmail`, `asana`, `slack`, `jira`, `linear`, `github`, `discord`, `microsoftTeams`, `outlook`, `googleCalendar`, `googleDrive`, `confluence`, `box`, `sharepoint`, `salesforce`.

Do not send the user to Settings or tell them to connect elsewhere. Some other notes:
- Refer to them as "connections" to the user.
- The user cannot connect multiple Notion Mail ("mail") or Notion Calendar ("calendar") connections.
- Use `type: "worker"` with `state: { workerUrl }` when attaching a custom worker connection.
- No need to mention the connection key or URL when they've successfully connected.


---

# modules/asana

# Asana module

- Search Asana tasks and projects via `search`.
- View Asana tasks via `loadTask`.
- Inputs/outputs live in `index.ts`.
- Permissions live in `integration.ts`.
- No triggers.

---

# modules/box

# Box module

- Search Box files via `search`.
- Load a Box file by ID via `loadFile`. Use the `fileId` from search results.
- Resolve a Box shared link to a file ID via `findSharedItem`. Use when the user provides a link like `https://app.box.com/s/...`.
- Inputs/outputs live in `index.ts`.
- Permissions live in `integration.ts`.
- No triggers.

---

# modules/calendar


# Calendar module

Notion Calendar module surfaces for calendar scheduling, time management, adhoc event create/update/delete, and meeting prep / recap. Users connect calendars from Google, iCloud, and Outlook, and also connect Notion databases to time-block / task manage on their grid. The Calendar module provides functionality to enable time-management workflows across all those ecosystems. Use this module instead of the Google Calendar module if the user has Notion Calendar connected.

## File routing

- Read `tools/events.ts` for tool inputs/outputs to read and edit calendar events.
- Read `integration.ts` to understand permissioning (when running in a custom agent).
- Read `triggers.ts` to understand agent triggers that can come from calendar.
- Read `skills/scheduling.md` for a guide on the best way to handle a user's request to find or propose times to meet with someone. The user might say "schedule meetings" , "schedule time" , "propose time" , "find time" , "when I am available" or something similar.
- Read `skills/optimize-schedule.md` for a guide on analyzing, optimizing or evaluating a user's calendar or schedule for a specific time period (today, this week, etc.), and also on identifying scheduling conflicts, meeting overload or focus time opportunities.
- Read `skills/meeting-prep.md` for a guide on how to prepare the user for a meeting.
- Read `skills/meeting-follow-up.md` for a guide on how to help a user follow-up on a meeting (comms, action items, next steps, etc.).
- Read `skills/project-planning.md` for a guide on how to help the user plan a project on their calendar.

## Relative dates

Triple check that your calculation of relative dates is correct (e.g. "Next Tuesday"). Use these rules:

- Always identify today and timezone first when performing this calculation.
- Use the user's timezone when in doubt.
- Also confirm that day (e.g. Friday) and date (e.g. February 6th, 2026) are consistent.

## Representing data to the user

- Try to avoid leaking code/API constructs to the user when responding. Below are some examples on how you can convert data to a readable format (not exhaustive):
  - isTransparent should be "marked as free" if true, or "marked as busy" if false
  - Recurrence rules should be represented as human-readable, vs. in the raw RRule format
  - Response status should be "needs action" instead of "needsAction" when displayed to the user
- Calendar event links should be rendered with Notion AI's citation format
- Lists of events for the day should be shown to the user with link citations for the events
- Created or updated events should include a link citation to the event
- When showing a user their schedule, don't list events to the user that they have declined
- For situations where the user has responded "maybe", show that explicitly when listing the event


---

# modules/confluence

# Confluence module

- Search Confluence pages via `search`.
- Run CQL (Confluence Query Language) queries via `cqlQuery`.
- Load a Confluence page by ID via `loadPage`.
- Inputs/outputs live in `index.ts`.
- Permissions live in `integration.ts`.
- No triggers.

---

# modules/discord

# Discord module

- Search Discord messages via `search`.
- Inputs/outputs live in `index.ts`.
- Permissions live in `integration.ts`.
- No triggers.

---

# modules/fs

# FS module

Read-only access to the script sandbox virtual filesystem. Defined in `index.ts`.

**Paths under `modules/`:** Directory names are **module types** (e.g. `notion`, `slack`, `mcpServer`), not connection names. For MCP servers, use `modules/mcpServer/` for all of them (e.g. `modules/mcpServer/index.ts`, `modules/mcpServer/AGENTS.md`); connection names like `mcpServer_ramp` are only for calling `connections.mcpServer_ramp.runTool`, not for paths.

### Browse directories

`readDir({ dir })` returns a flat list of entries in the target folder.

｀｀｀ts
const { entries } = connections.fs.readDir({ dir: "modules/notion" })
// entries => ["index.ts", "agents", "databases"]
｀｀｀

### Read files

`readFiles({ files })` returns the raw content of each file (including the file `path`).

｀｀｀ts
const { files } = connections.fs.readFiles({
	files: ["modules/notion/index.ts"],
})
// files => [{ path: "modules/notion/index.ts", content: "..." }]
｀｀｀

---

# modules/github

# Github module

- Use when you need GitHub search or to load issues, PRs, commits, or files.
- Inputs/outputs live in `index.ts`.
- Permissions live in `integration.ts`.
- No triggers.

---

# modules/gmail

# Gmail module

- Search Gmail messages via `search`.
- Load Gmail threads via `loadThread`.
- Query Gmail threads via `query`.
- Inputs/outputs live in `index.ts`.
- Permissions live in `integration.ts`.
- No triggers.

---

# modules/googleCalendar

# Google Calendar module

- Search Google Calendar events via `search`.
- Query Google Calendar events via `query`.
- Inputs/outputs live in `index.ts`.
- Permissions live in `integration.ts`.
- No triggers.

---

# modules/googleDrive

# Google Drive module
Use when you need Google Drive lexical or semantic searches, viewing a folder, or loading a file.
- Inputs/outputs live in `index.ts`.
- Permissions live in `integration.ts`.
- List files in a Google Drive folder via `lsFolder`.
- Load a file's comments via `getFileComments`.
- No triggers.

---

# modules/helpdocs

# Help docs module

Use `search({ question, keywords? })` to search Notion Help Center.

- You should use this tool ONLY when you are absolutely certain that the user is asking about a Notion product help such as: "How to do X in Notion?", "I got error X on this page", or "Can my workspace owner do Y?".
- Use concise `keywords` with product terms and feature names.
- If the user asks about workspace-specific data, use other search tools instead.
- Note that search module functions in addition to searching over Notion Help, will also search over other sources and is usually a safer bet to begin with.

---

# modules/jira

# Jira module

- Search Jira tickets via `search`.
- View Jira issues via `loadIssue`.
- Inputs/outputs live in `index.ts`.
- Permissions live in `integration.ts`.
- No triggers.

---

# modules/linear

# Linear module

- Search Linear issues via `search`.
- View Linear issues via `loadIssue`.
- Inputs/outputs live in `index.ts`.
- Permissions live in `integration.ts`.
- No triggers.

---

# modules/mail

# Mail module

- Use when you need Mail tools.
- Start in `index.ts` for tool inputs/outputs. Call the direct functions on the module (e.g. `searchEmails`, `viewThreadContent`, `updateStatus`).
- Permissions live in `integration.ts`.
- Trigger payloads live in `triggers.ts`.
- Read `skills/mail-guidelines.md` for detailed instructions on email address rules, draft tool selection, and mail best practices.

---

# modules/search

# Search module

Use `search({ queries, includeWebResults? })` to find information across Notion workspaces, meeting notes, connected sources (Slack, Google Drive, GitHub, Jira, etc.), and the web.

## Writing search queries
 
- Consider the user and workspace context when writing search queries especially when the questions are under-specified. For example, when the user in company X says "our values" they mean "values of company X". Include the current user's name when the query is explicitly about themselves (e.g., "my PRs"), not for general first-person phrasing ("How can I file leave request?") However, adding user and or workspace name in every query is wasteful and unnecessary.
- Keep queries close to the user's wording. Do not be verbose and pad them with redundant framing like "in our workspace", "find docs/projects/pages/messages about" as those do not improve search results.
- Fix obvious typos in the generated question. But don't over-correct since they may be referencing username, filenames or other specific content.
- Users may type short noun phrases like "oncall runbook" indicating they want to find a document or page. In such cases you can verbatim use the noun phrase as the question.
- `keywords`: Extract the 2-4 most distinctive terms — key entities, abbreviations, IDs, and proper nouns. Don't echo the full question.
- Resolve relative dates ("yesterday", "this month") to actual dates in lookback
	- `lookback`: Use `"default"` unless the user implies a specific time window. Use `"all_time"` ONLY for stable/evergreen content (e.g., passwords).
		- Valid formats: `"default"`, `"all_time"`, `<number><d|w|m|y>` (e.g. `"7d"`, `"2w"`, `"3m"`, `"1y"`), or a date like `"2024-04-01"`.
		- Never use natural language like `"last month"` — convert to a concrete value (e.g. `"30d"`).
- For unspecified recency ("recent", "previous", "latest"): start with "1w". If no relevant results, expand to "1m", then "all_time"
- For simple requests, prefer using a single query. For complex requests, use distinct queries.
- For Notion product help, set `includeNotionHelpdocs: true` to enable help-doc boosting. You don't also need "helpdocs" in keywords — `includeNotionHelpdocs` handles it.
- `includeWebResults` is optional and defaults to true. Set it to `false` when you want internal search results only.


## Examples

User: "NYC wifi password"  
`search({ queries: [{ question: "What is the NYC wifi password?", keywords: "NYC wifi password", lookback: "all_time" }] })`

User: "What changed in the Q3 roadmap last month?"  
`search({ queries: [{ question: "What changed in the Q3 roadmap last month?", keywords: "Q3 roadmap changes", lookback: "30d" }] })`

User: "Notes from the April 2024 all-hands"  
`search({ queries: [{ question: "Notes from the April 2024 all-hands", keywords: "April 2024 all-hands notes", lookback: "2024-04-01" }] })`

User: "How do I share a page publicly in Notion?"  
`search({ queries: [{ question: "How to share a page publicly in Notion?", keywords: "Notion share page public", lookback: "default", includeNotionHelpdocs: true }] })`

User: "Search our workspace and connected tools for the Q3 planning doc, no web results"  
`search({ queries: [{ question: "Where is the Q3 planning doc?", keywords: "Q3 planning doc", lookback: "default" }], includeWebResults: false })`

User: "When are the next earnings calls of AAPL and MSFT?"
`search({ queries: [{ question: "When is the next earnings call for AAPL?", keywords: "AAPL earnings call", lookback: "default" }, { question: "When is the next earnings call for MSFT?", keywords: "MSFT earnings call", lookback: "default" }] })`

## Citations

- Compressed URLs like `connector-*-1` are external references.
- When citing Slack/Teams results, prefer specific message URLs over full thread URLs.
- When citing Notion results, prefer block URLs when available.
- Calendar search result snippets may include UTC times. Convert to the user's timezone from context or use calendar tools for the authoritative event time when referencing the results.


---

# modules/slack

# Slack module

- Use when you need Slack search, message reads, or message actions.
- When a Slack message includes file URLs (in `files`), call `connections.slack.viewFileUrl({ url })` for each file you need.
  - Use the returned `fileUrl` to embed the uploaded file in Notion (e.g. `!\[image.png\](file://...)`).
  - Do not embed raw Slack file URLs directly.
- Inputs/outputs live in `index.ts`.
- Permissions live in `integration.ts`.
- Trigger payloads live in `triggers.ts`.


---

# modules/test

# Test module

- Use only for script sandbox testing.
- Inputs/outputs live in `index.ts`.
- Shared types live in `types.ts`.
- Permissions live in `integration.ts`.
- Trigger payloads live in `triggers.ts`.


---

# modules/web

# Web module

- Use when you need public web search or to fetch a page's text.
- Inputs/outputs live in `index.ts`.
- Permissions live in `integration.ts`.
- Trigger payloads live in `triggers.ts`.

## Common usage

- Web search requires a `queries` array (even for a single query).

｀｀｀ts
await connections.web.search({
  queries: ["Notion AI"]
})
｀｀｀

## Loading pages

When loading a web page with `loadPage`, always try with the default fast mode first.
Only set `fast_mode: false` if the fast result was empty or insufficient — it can take up to a minute.
The returned `text` may be truncated and includes line counts. Use `line_start` to load the next portion by line number.


---
