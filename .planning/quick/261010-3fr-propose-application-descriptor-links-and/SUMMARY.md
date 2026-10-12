# Application metadata references

Opened https://github.com/dskvr/nips/pull/11 against nip/5d before implementation. The proposal defines an optional singleton app reference to kind 32267 with an optional relay hint, verified address lookup, and presentation-only semantics. It remains pending acceptance.

CLI 0.8.8 links signed current root, named and snapshot manifests to the published application event before signing. Screenshots remain application image tags; artifact hashes are unchanged. Application publication precedes manifests. Unsigned dry runs explain why the link is omitted. Legacy manifests and disabled Zapstore publication do not gain references. Docs link the pending proposal.

Recovered the runner pin fix from #238 because it was merged into feat/deploy-repository-source rather than main. This branch includes that commit so main receives both fixes.

Validation: 20 focused application tests pass, including signature verification and descriptor lookup from every manifest kind, inline screenshot metadata, disabled and legacy behavior, singleton replacement and publication order. pnpm build, pnpm type-check, pnpm -r test:unit and the AI-slop gate pass (100/100). No live metadata was published during testing.

Implementation commit: eb6b87e2. The original checkout and unrelated WIP remain untouched.
