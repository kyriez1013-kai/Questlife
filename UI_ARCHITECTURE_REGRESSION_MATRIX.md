# QuestLife UI Architecture Regression Matrix

Scope: presentation-only overhaul. Existing data, APIs, routes, feature flags, and business behavior remain unchanged.

| Area | Protected behavior | Local verification |
| --- | --- | --- |
| Smart Capture | Input, submit, history, retry, parsed result, and completion review handlers remain mounted | Rendered and controls reachable; production API flow required |
| Daily Decision Brief | Recommendation, evidence, confidence, refresh, feedback, proposal review, apply, and undo handlers remain mounted | Rendered; useful feedback interaction passed |
| State | Quick check-in, detailed check-in, before/after semantics, and Instant Read remain mounted | Quick check-in and Instant Read fallback passed |
| Objective Context | Paste, parse, preview, save, and saved context rendering remain mounted | Natural-language sleep parse and save passed |
| Today plan | Skill and schedule rows, Start, Done, and logging entry points remain mounted | Rows and actions rendered |
| Today records | Existing record grouping, contribution labels, and delete confirmation remain mounted | Empty/live states rendered |
| Goals | Goal list, Skill Library entry, create, open, edit, and delete handlers remain mounted | Goal list and Goal Detail navigation passed |
| Schedule | Day/week/month/year views, current-time card, block actions, and log flow remain mounted | Day view rendered; proposal mutation logic unchanged |
| Insights | Main judgement, evidence, state/context/pattern signals, Ability Map, and advanced analysis remain available | Main-to-advanced hierarchy rendered |
| Pattern Memory | Candidate/accepted/rejected/archived controls and debug visibility remain unchanged | Source handlers unchanged; production debug check required |
| Settings | Language, theme, accent, onboarding, integrity, Decision AI debug, import/export/reset behavior remain present | Theme switch and dark-theme contrast passed |
| Navigation | Existing five tabs, Goal/Skill stacks, back behavior, fixed bottom navigation | All five tabs and Goal Detail route passed |
| Persistence | No schema, migration, store action, API, or data-model changes | Refresh retained local test data |

## Responsive checks

| Viewport | Result |
| --- | --- |
| 375 x 812 | No horizontal overflow; Today brief and Current State visible in the first viewport |
| 390 x 844 | No horizontal overflow; compact bottom navigation does not cover primary controls |
| 430 x 932 | No horizontal overflow; Insights shows judgement, evidence, advanced summary, and first core signal |
| 1280 x 900 | Main content and bottom navigation are centered and capped at 760px |

Production verification remains required after the matching GitHub commit is deployed to Vercel.
