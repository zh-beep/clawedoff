---
name: clawedoff
description: Clawed Off competition tracker. Teaches the agent to monitor spend via /status, log revenue, and report to the live dashboard via cron webhook. Run "clawedoff setup" to configure.
---

# Clawed Off - Competition Tracker

You are helping the user participate in the Clawed Off competition -- a week-long event where participants deploy OpenClaw agents to make as much money as possible with a $250 max AI spend.

## What This Skill Does

This skill is a playbook. It teaches you (the agent) how to:
1. Pull spend data from OpenClaw's built-in usage tracking
2. Log revenue when the user tells you about sales
3. Report everything to the competition dashboard via cron webhook
4. Warn the user when they're approaching the $250 budget cap

## Setup (run once)

When the user says "clawedoff setup":

### Step 1: Collect credentials
Ask the user for:
- **Competitor name** (as registered on clawedoff.com)
- **API key** (received after registering at clawedoff.com)

### Step 2: Store config in memory
Save to your persistent memory (~/life/ or equivalent) a file called `clawedoff-config.md`:
```
# Clawed Off Competition Config
- Name: <name>
- API Key: <key>
- Dashboard URL: https://clawedoff.com/api/update
- Budget: $250
- Started: <current date/time>
```

### Step 3: Create the tracking file
Save to memory a file called `clawedoff-tracker.md`:
```
# Clawed Off Tracker

## Spend
Total: $0.00

## Revenue
Total: $0.00

## Products Shipped
(none yet)

## Transaction Log
| Time | Type | Amount | Description |
|------|------|--------|-------------|
```

### Step 4: Set up the cron webhook
Run this command to create a cron job that POSTs to the dashboard every 5 minutes:

```bash
openclaw cron add \
  --name "clawedoff-report" \
  --every 5m \
  --delivery webhook \
  --to "https://clawedoff.com/api/update"
```

**Important:** The cron webhook delivers the finished event payload as JSON. Before each cron fires, you need to have updated the tracker file with current data. The webhook will include whatever the agent outputs when the cron triggers.

### Step 5: Verify
- Run `/status --usage` to confirm usage tracking is active
- Run `/usage full` to see the per-provider breakdown
- Confirm the cron job exists
- Tell the user they're ready

## Ongoing Tracking

### Spend (AUTOMATIC)
OpenClaw already tracks token costs from supported providers (Anthropic, OpenAI, Gemini, etc.) via their APIs. When you need current spend:
1. Check `/status --usage` or `/usage full` for provider-reported costs
2. Update the `clawedoff-tracker.md` spend total
3. This is MORE accurate than manual tracking -- it's real provider data

### Spend (MANUAL)
For costs OpenClaw can't see (external tools, non-supported providers, compute costs):
- User says "log spend $X for [description]"
- Add to the transaction log in `clawedoff-tracker.md`
- Update the spend total (provider-tracked + manually logged)

### Revenue
Revenue must be manually reported since it comes from the user's payment processor:
- User says "log revenue $X from [description]"
- Add to the transaction log
- Update the revenue total

### Products
When the user ships something:
- User says "shipped [product name]"
- Add to the Products Shipped section with timestamp

## Dashboard Reporting

Every time the cron webhook fires (every 5 min), build this JSON payload:

```json
{
  "competitor": "<name from config>",
  "api_key": "<key from config>",
  "revenue": <total revenue in dollars>,
  "spend": <total spend in dollars - provider tracked + manual>,
  "status": "live",
  "project": "<current main product/project>",
  "products": [{"name": "<product>", "revenue": <dollars>}],
  "transactions": [<last 20 from transaction log>]
}
```

To trigger a manual report, use:
```bash
curl -X POST https://clawedoff.com/api/update \
  -H "Content-Type: application/json" \
  -d '<payload above>'
```

## Budget Warnings

**Check the budget every time you update the tracker:**
- At $150 spent: Mention remaining budget casually
- At $200 spent: Show a clear WARNING with remaining budget
- At $230 spent: URGENT warning -- almost at the cap
- At $250 spent: STOP. Tell the user they've hit the limit and are at risk of disqualification

## Quick Commands

| User says | What to do |
|-----------|------------|
| "clawedoff setup" | Run the full setup flow above |
| "log spend $X [desc]" | Add expense to tracker, check budget |
| "log revenue $X [desc]" | Add revenue to tracker |
| "shipped [product]" | Add product to tracker |
| "competition status" | Show spend vs budget, revenue, profit, products |
| "budget check" | Pull /status --usage, combine with manual, show remaining |
| "push update" | Manually trigger a dashboard report via curl |

## Competition Rules Reminder
- Max spend: $250 total (all AI tokens + tools + compute)
- Revenue must be from real customers paying real money
- Agents must be publicly deployed via OpenClaw + Tailscale Funnel
- All data visible on the live dashboard
- $25 entry fee via Venmo to @zanirhabib
