---
phase: quick/260524-kxa
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - README.md
autonomous: true
requirements:
  - QUICK-260524-KXA
---

<objective>
Add README badges for the repository's GitHub workflows and for each published package on npm and JSR.
</objective>

<tasks>

<task type="auto">
  <name>Add workflow and registry badges to README</name>
  <files>README.md</files>
  <action>
Add workflow status badges for `.github/workflows/ci.yml`, `.github/workflows/publish.yml`, and `.github/workflows/publish-jsr.yml` below the README title. Update the Packages table to include npm and JSR badge columns for each workspace package: `@napplet/core`, `@napplet/shim`, `@napplet/sdk`, `@napplet/nub`, and `@napplet/vite-plugin`.
  </action>
  <verify>
Confirm all referenced badge endpoints return HTTP 200, all package rows have npm and JSR badges, and README formatting remains valid Markdown.
  </verify>
</task>

</tasks>
