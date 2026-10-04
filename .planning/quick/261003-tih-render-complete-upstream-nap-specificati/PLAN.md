# Render complete upstream specifications

User correction: NAP detail pages must show the specification itself, including the full NAP-BLOSSOM proposal at `/protocol/nap-blossom-pr-71/`.

1. Preserve complete upstream Markdown and revision-specific source URLs in the generated snapshot, including fork proposals and removed files.
2. Render sanitized Markdown with tables, code examples, headings, working source-relative links and a contents navigation. Keep upstream authority, merge state and fetched revision explicit; no rewritten requirements.
3. Regenerate and assemble the local preview on port 8101. Verify fidelity, sanitization, responsive layout, static routes and workspace checks; update documentation and PR #222.

This implements the user's explicit request to display the source specification. The snapshot is generated upstream content, not an independently maintained or normative fork.
