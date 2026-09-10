# Anti-slop source

Source: https://github.com/dmmulroy/anti-slop

This copy comes from the installed `install-anti-slop` skill on 10 September 2026.
The skill lock records folder hash `aaf5942ffe5b7be7fdec40d613d74b784dee6b39`.
The upstream commit is unknown. `PRISTINE.sha256` identifies every copied TypeScript file; Git retains this pristine copy.

The entry point is `tools/oxlint/anti-slop/index.ts`. The copied source has no local changes.
`@oxlint/plugins` matches installed Oxlint 1.82.0. Update both together.

The user requests minimal rules for this hackathon. `.oxlintrc.json` enables five anti-slop rules and the native accumulating-spread rule.
They prevent chained assertions, undocumented assertions, widening before assertions, module mocking, and repeated accumulator copies.
The remaining generic rules and the Effect plugin are inactive. The repository has no direct Effect dependency.
