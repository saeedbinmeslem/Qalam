---
name: qalam-brand-ui
description: Audit and improve Qalam's visual identity, UI consistency, Arabic RTL experience, responsive layouts, and usability while preserving existing product behavior and the current pen-based logo. Use when working on Qalam's frontend, design system, pages, or components.
---

# Qalam Brand & UI Skill

## Mission

Improve Qalam as a modern Arabic-first learning product. Make the interface feel clear, trustworthy, focused, and contemporary—not like a generic school portal, a template dashboard, or an over-decorated AI product.

Qalam organizes free learning resources into structured paths, measures actual understanding, and adjusts the learner's plan based on performance. The UI must communicate that value clearly.

**Core brand line:** Learn. Build. Grow.  
**Arabic expression:** تعلّم بوضوح، وطبّق بثقة، وتقدّم باستمرار.

## Non-negotiable working rules

1. **Audit before editing.** Inspect the repository, package scripts, framework, routing, styling approach, design tokens, shared components, current logo assets, and relevant page flows before changing code.
2. **Preserve the existing pen logo.** The current logo contains a pen and the product owner likes it. Do not replace it with an open-book symbol or redraw it without explicit approval. Treat the existing logo as the source of truth. Build the surrounding visual identity to complement it.
3. **Do not redesign by assumption.** Inspect the actual current implementation and identify what is already good. Keep strong existing patterns.
4. **Protect product behavior.** Do not change business logic, data models, API contracts, authentication, routing behavior, analytics, or learning algorithms as part of a visual task unless explicitly requested and necessary.
5. **No unrelated changes.** Keep the diff focused. Do not reformat or rewrite unrelated files.
6. **No fabricated product features or data.** Never add fake course counts, testimonials, ratings, progress, AI capabilities, or claims. Use actual application data and existing capabilities.
7. **Do not remove incomplete features silently.** If a feature is marked as under construction, preserve that truth and present its status clearly.
8. **Check all states.** Consider loading, empty, error, disabled, hover, focus, active, success, and responsive states—not only the ideal desktop screenshot.
9. **Prefer the smallest coherent change.** Reuse existing components and styling conventions. Avoid adding dependencies unless there is a strong reason.
10. **Explain trade-offs.** Before major structural changes, describe the issue, proposed change, affected files, and risks.

## Brand foundation

### Brand personality
- Modern Tech
- Balanced: professional with approachable energy
- Intelligent, clear, encouraging, and human
- Arabic-first, with a consistent English experience where supported
- Minimal and purposeful; visual polish must not compete with learning content

### Brand positioning
Qalam is not simply a directory of YouTube links or a conventional course marketplace. It organizes learning into structured paths, measures understanding rather than video views alone, and adapts the learner's plan based on evidence.

### Color system

Use these as the preferred brand tokens. First inspect existing tokens and map them carefully; do not blindly replace colors where they encode semantic status.

| Token | Hex | Intended use |
|---|---|---|
| Primary / Deep Navy | `#142B4A` | Main brand color, headings, primary controls, navigation emphasis |
| Secondary / Teal | `#20B6A5` | Progress, positive interaction, active learning states |
| Accent / Violet | `#8B7CF6` | AI-related or advanced features, used sparingly |
| Accent / Soft Gold | `#C8A96A` | Achievement, mastery, certificates, selected premium details |
| Background | `#F5F7FA` | Main light page background |
| Surface | `#FFFFFF` | Cards, dialogs, panels |
| Secondary Text | `#64748B` | Supporting text and metadata |

### Color usage rules
- The visual foundation is light, calm, and readable.
- Navy leads; teal supports interaction and progress.
- Violet is a small accent, not a second primary color.
- Gold is a **restrained fourth accent**, not a replacement for teal and not a general-purpose button color.
- Use gold for meaningful achievement or mastery moments, certificates, selected highlights, and tiny decorative details. Avoid gold on every card, every icon, or large page backgrounds.
- Approximate overall balance: 60% light surfaces, 25% navy, 10% teal, 3% gold, 2% violet. Treat this as a visual guide, not a rigid CSS calculation.
- Ensure text contrast. Do not use pale gold or bright teal for small text on white backgrounds unless contrast is verified. Prefer navy/darker accessible variants for text.
- Keep semantic colors (error, warning, success) distinct from brand accents.

### Typography
Preferred family:
- Arabic headings: IBM Plex Sans Arabic
- Arabic body: Tajawal
- English and numeric UI: Inter

Before adding fonts, check whether they are already loaded and how the project manages fonts. Avoid duplicate downloads and unnecessary font-weight variants. Suggested weights: 400 body, 500 controls, 600 subheadings, 700 major headings. Keep line-height generous for Arabic.

### Logo
- Preserve the current pen-based Qalam logo and its proportions, colors, and clear space.
- Do not substitute a book icon.
- Do not place the logo inside a decorative badge unless the existing design system calls for it.
- If the logo needs improvement, first report the specific issue and propose a separate logo refinement; do not silently alter the brand mark.
- Use the wordmark and icon consistently across navigation, auth screens, favicon/app icon, and footer.

## Visual language

- Modern, calm, structured, and content-first.
- Use consistent spacing, alignment, and component rhythm.
- Prefer subtle borders and very light shadows over heavy elevation.
- Use restrained corner radii, generally 10–16px for cards and controls, matching existing conventions.
- Use simple consistent icons from the project's current icon library.
- Use gradients only when they add meaning; avoid large decorative gradients and excessive glassmorphism.
- Avoid cartoon school imagery, random stock illustrations, oversized blobs, and generic AI sparkles.
- Use motion sparingly and respect reduced-motion preferences.
- Keep layouts visually balanced in both RTL and LTR.

## UX principles specific to Qalam

Prioritize these product concepts in the interface:
1. Learning paths: where the learner is going and what comes next.
2. Understanding: assessment and exercises, not passive video consumption.
3. Adaptive learning: explain why Qalam recommends review, an alternative lesson, or faster progression.
4. Progress: make meaningful progress visible without turning the experience into a noisy gamification system.
5. Sources and trust: make lesson sources, human review, and content ownership easy to understand.

Do not imply that Qalam hosts or owns YouTube videos if it uses the official YouTube player. Preserve source attribution and rights messaging.

## Website audit notes

The public site currently communicates a strong product proposition:
- Homepage headline: “تعلّم ما تحتاجه، وأثبت أنك فهمته.”
- It explains a four-step flow: diagnose level, follow an organized path, test understanding, and adapt the plan.
- It presents learning paths, a lesson library, concept map, practical exercises, learner progress, and review.
- The “How Qalam works” page explains evidence-based decisions, reasons behind recommendations, human lesson review, deterministic plan rules, and AI-assisted explanation.
- The site currently lists two learning paths and indicates that practical exercises are under construction.

Use these observations as starting context only. Re-check the live implementation and repository before making decisions; the site may have changed.

### Initial improvement opportunities to investigate
Do not assume every item is a defect; verify it in the current UI:
- Strengthen the homepage hero hierarchy so the value proposition, primary action, and secondary action are immediately obvious.
- Make the unique mechanism (assessment → structured path → understanding check → adaptive plan) more visually tangible, ideally with a small real product preview rather than generic decorative art.
- Give learning-path cards a consistent hierarchy: subject/category, title, concise outcome, units/lessons/duration, and a clear action. Avoid dense paragraphs in cards.
- Present statistics only when they are accurate and current; ensure units and duration labels are unambiguous.
- Make the “under construction” state for practical exercises honest and visually calm; do not present it as a fully available destination.
- Make trust information (manual review, source attribution, transparent recommendation reasons) easy to discover without overwhelming the homepage.
- Check navigation labels and grouping, especially on mobile; keep the main learning actions easy to reach.
- Review the footer and informational pages for consistency with the core brand and clear rights/privacy explanations.
- Ensure the logo, Arabic typography, and brand colors remain consistent across homepage, paths, lesson detail, library, concept map, review, account, and authentication flows.

## Required workflow

### Phase 1 — Audit only
Before editing:
1. Inspect project structure and identify the frontend entry points.
2. Inspect package scripts and determine available checks.
3. Locate logo assets, fonts, global styles, tokens, theme setup, shared layout, buttons, cards, navigation, and page components.
4. Inspect all key routes and representative mobile layouts.
5. Record current behavior and identify any route or state that must not regress.
6. Produce a concise audit with:
   - What is already working well
   - Highest-impact visual/UX issues
   - Accessibility and RTL issues
   - Design inconsistencies
   - Exact files likely to change
   - Risks and items that should not be changed

Do not start implementation until the user asks to proceed or the task explicitly requests implementation.

### Phase 2 — Design system
When asked to implement:
1. Map the brand colors to the project's existing token architecture.
2. Define consistent typography, spacing, radii, borders, shadows, and focus states.
3. Reuse existing components where possible.
4. Ensure light and dark themes both work if the product supports them.
5. Document token names and usage in the project's established location.

### Phase 3 — Page-by-page refinement
Prioritize in this order unless the user specifies otherwise:
1. Shared shell: header, navigation, footer, page container.
2. Homepage: hero, product explanation, paths preview, trust signals.
3. Learning paths and path details.
4. Lesson pages and player experience.
5. Learner dashboard and progress/review.
6. Lesson library and concept map.
7. Authentication, account, privacy, and informational pages.
8. Practical exercises and other in-progress areas.

For each page:
- State the user goal.
- Improve information hierarchy and action clarity.
- Preserve existing data and behavior.
- Check desktop, tablet, and mobile.
- Check Arabic RTL and English LTR if supported.
- Include loading, empty, error, and disabled states where relevant.

### Phase 4 — Verification
After implementation:
1. Run the project's existing lint, typecheck, tests, and build scripts where available.
2. Fix issues introduced by the changes.
3. Inspect the actual rendered result at desktop and mobile sizes if browser tooling is available.
4. Check keyboard navigation, visible focus, semantic headings, labels, contrast, and reduced motion.
5. Confirm routes and key user flows still work.
6. Summarize changed files, visual improvements, checks run, and any remaining issues.
7. Never claim a check passed unless it was actually run.

## Accessibility and responsive requirements

- Correct RTL direction and alignment for Arabic, including mixed Arabic/English text, numbers, code, and URLs.
- Do not reverse icons whose meaning should remain stable (e.g. play, external link, brand mark).
- Use semantic HTML and accessible names for icon-only buttons.
- Keep keyboard focus visible.
- Ensure sufficient contrast and usable target sizes.
- Avoid communicating state by color alone.
- Respect browser zoom and reduced-motion preferences.
- Avoid horizontal overflow at common mobile widths.
- Keep primary actions reachable on small screens without covering content.

## Implementation constraints

- Follow the repository's current framework, component patterns, naming, and styling approach.
- Do not introduce Tailwind, a component library, or a new design framework unless the repository already uses it or the user explicitly approves.
- Do not add `!important` as a shortcut.
- Do not duplicate CSS rules or create parallel token systems.
- Do not change database schemas, security rules, authentication, or API behavior during a visual refresh.
- Do not remove working features to simplify the design.
- Do not make a large rewrite when a targeted refinement will solve the problem.

## Expected response format

For an audit request, return:
1. Overall impression
2. What should stay
3. Highest-priority improvements (ranked)
4. Suggested design direction
5. Files/components to inspect or change
6. Risks and questions requiring approval

For an implementation request, return:
1. Brief plan
2. Changes made
3. Files changed
4. Verification performed and results
5. Remaining issues

Be candid and specific. Prefer actionable observations over generic praise.
