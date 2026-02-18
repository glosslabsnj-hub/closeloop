

# System Flowchart Page

## What This Does
Creates a dedicated, printable page at `/app/system-map` that displays the complete CloseLoop application flowchart -- all user flows, routing, and architecture in a clean, organized layout you can print or save as PDF from your browser (Ctrl+P / Cmd+P).

## Page Design
- Clean white background, optimized for printing
- Organized into numbered sections matching the flowchart from our conversation
- Monospaced code blocks for the ASCII flow diagrams
- Collapsible sections so you can focus on one area at a time
- A "Print" button at the top for easy save-to-PDF
- No sidebar/nav chrome -- standalone page for readability

## Sections Included
1. Top Level (Homepage to Auth routing)
2. Public Pages
3. Business Owner Flow (Onboarding, Dashboard, Sidebar Nav, Team)
4. Agency Flow (Application, Dashboard, Lead Finder, Team)
5. Admin Flow (Admin Panel, Debug Tools)
6. Driver Portal Flow
7. Inbound Call Flow (AI backend)
8. Subscription / Gating Flow
9. Not Yet Built (starred items)

## Technical Steps
1. Create `src/pages/SystemMapPage.tsx` -- a single self-contained page component with all flowchart content rendered as styled pre/code blocks and section cards
2. Add route `/app/system-map` in `App.tsx` inside the AppLayout routes
3. No database changes needed -- this is a static reference page

