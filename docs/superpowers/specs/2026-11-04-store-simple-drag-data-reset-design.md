# Store Simplification, Tablet Drag-and-Drop, and Weekly Material Data

Date: 2026-11-04

## Objective

Simplify the Store experience, make drag-and-drop the only issuing interaction on tablet and desktop, replace the sample tool catalog with simple tools, add Amharic category labels, and add a Store Data tab for weekly material issue history that resets every Saturday night.

## Approved Decisions

- The weekly reset clears **material issue history only**.
- Active `Issued` material records are kept during reset.
- Issuing is drag-only, **1 unit per drop**. Drag repeatedly for more.
- Keep existing add/edit, search, category filters, and return controls.
- Add a new **Data** tab inside Store, visible to storekeeper, manager, and admin.
- Manager drag-and-drop assigns a job immediately to a team, with no assignment screen.
- Tablet drag starts with a **long-press**, then drag.
- Use a custom pointer-based drag system, not a new dependency.
- The Saturday reset runs **on app open** by comparing the last reset time with the most recent Saturday 11:59 PM.

## 1. Store Inventory Simplification

### Sample tools

Replace the long Italian sample tool names with short, clear tool names:

- 10mm Deep Socket
- 10mm Open-End Wrench
- 10mm Close/Box Wrench
- Hammer
- Oil Filter Remover
- Screwdriver Set
- Pliers
- Adjustable Wrench
- Tire Wrench
- Floor Jack
- OBD Diagnostic Scanner
- Air Impact Wrench

Update all sample checkout records so their `toolName` values match the simplified tool names.

### Categories

Keep the existing category values stable:

- `All`
- `Wrench`
- `Power`
- `Diagnostic`
- `Lifting`
- `Body`
- `Other`

Translate the displayed labels into Amharic while keeping the stored values unchanged. `All` is a UI-only filter, not a `ToolCategory`.

Suggested labels:

| Value | Amharic |
| --- | --- |
| All | ሁሉም |
| Wrench | ቁልፍ መጥረቢያ |
| Power | ኃይል |
| Diagnostic | ምርመራ |
| Lifting | ማንሳት |
| Body | ተሽከርካሪ አካል |
| Other | ሌላ |

### Removed Store interactions

Remove:

- Tap-to-select of a tool or material.
- The material quantity stepper.
- The instruction banner that says to tap a mechanic below.
- Any selected-tool/selected-material state that exists only for tap issuing.

Keep:

- Add/edit tool.
- Add/edit material.
- Search.
- Category filters.
- Return tool.
- Return material.
- Parts Requests tab.

## 2. Shared Long-Press Drag System

### Behavior

Create a shared pointer-based drag interaction used by Store and Manager.

- Mouse: press and move, or long-press then move. Desktop must still feel responsive.
- Touch/tablet: press and hold for about 250ms, then drag. This prevents accidental drags while scrolling.
- While dragging:
  - Show a floating drag preview.
  - Highlight valid drop targets.
  - Do not scroll the page during the active drag.
- On drop:
  - Store tool/material onto a mechanic issues 1 unit.
  - Manager job onto a team assigns the job.
  - Manager job onto Waiting unassigns it.
- On cancel or drop outside a target, no data changes.

### Store issuing

- Every successful material drop creates one `MaterialIssueRecord` with quantity `1`.
- Every successful tool drop checks out one available unit.
- If the item is out of stock, do not issue and show a short message.
- Store returns remain button-based.

### Manager assignment

- Remove the tap-to-pick and tap-to-send flow.
- Remove the manager assignment modal trigger from drag/drop.
- Dropping a prepared job on a team directly updates:
  - `assignedTeamId`
  - `assignedTeamName`
  - `assignedMechanicName`
  - `assignedMechanicPhone`
  - status to `Ready to Start` when the job is still waiting or unassigned; keep the current status if the job is already in progress
  - audit trail
- Dropping on Waiting clears the team and mechanic assignment and returns the job to the waiting list.
- If Finance has not set a price, do not assign; show the existing finance-price message.
- Dropping on Completed keeps the existing completion behavior.

## 3. Store Data Tab

### Placement and access

Add a fourth tab in `StoreDashboard`:

- Tools
- Materials
- Requests
- Data

Access:

- Storekeeper: yes
- Manager: yes
- Admin: yes

Managers must be allowed to open the Store tab so they can see Store Data.

### Data shown

Display weekly material issue records with:

- Material name
- Mechanic name
- Quantity and unit
- Issued date/time
- Status (`Issued` or `Returned`)
- Returned date/time when available
- Issued by

Add summary cards:

- Active issued records
- Returned records this week
- Total quantity issued this week

### Sample data

Add sample material issue records for the current week:

- At least 2 active `Issued` records.
- At least 3 `Returned` records.
- Different mechanics and materials.

Sample dates should be relative to the current date so they remain useful after the weekly reset. Initialize sample material issues only when no stored issue data exists. When initializing samples, also set the last reset timestamp to the most recent Saturday cutoff so the returned samples are not cleared immediately on first open.

### Saturday reset

- Store the last reset timestamp in localStorage.
- On app open, compute the most recent Saturday 23:59 local time.
- If the last reset timestamp is earlier than that Saturday cutoff:
  - Remove only records with status `Returned`.
  - Keep all `Issued` records.
  - Save the new reset timestamp.
- Do not change material stock during reset.
- Show a short note in the Data tab: weekly history resets Saturday night; active issued materials remain until returned.

No manual reset button is required.

## 4. Data and Storage Changes

- Add a localStorage key for the last weekly material reset timestamp.
- Add a storage method to run the weekly reset check.
- Call the reset check once when the app opens.
- Initialize sample material issues when the issue store is empty for the first time.
- Keep existing `MaterialIssueRecord` fields; no schema migration is required.
- Update sample tool names and checkout sample names.
- Do not alter stock quantities during reset.

## 5. Internationalization

Add Amharic and English strings for:

- Store category labels.
- Data tab label.
- Data summary labels.
- Data table/card labels.
- Drag hint and reset note.
- New short messages for out-of-stock and successful drag issuance.
- Manager direct-assignment messages.

Tool names remain short English technical names unless a natural Amharic term is clearly better.

## 6. Verification

Run:

```powershell
npm run lint
npm run build
npx tsx "C:\Users\Hp\AppData\Local\Temp\opencode\material-issue-test.ts"
```

Manual checks:

- Store categories display in Amharic.
- Long-press drag works on touch and mouse.
- Dragging a tool or material to a mechanic issues exactly 1 unit.
- Out-of-stock items do not issue.
- Manager drop assigns immediately and does not open the assignment screen.
- Manager drop on Waiting unassigns.
- Store Data shows sample current-week records.
- Saturday reset removes returned records only and keeps issued records.
- Existing add/edit/search/filter/return flows still work.

## Out of Scope

- Backend sync or cross-device real-time updates.
- Changes to PDF layouts.
- Automatic SMS on manager drop.
- Manual weekly reset button.
- Reworking payroll, finance, or reception workflows.
