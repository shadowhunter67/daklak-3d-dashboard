# License history

## Ownership and contribution audit (performed before this transition)

Before changing the license, the repository's full history and GitHub
metadata were checked:

- `git shortlog -sne --all` shows three distinct commit identities:
  `shadowhunter67` (the repository owner and sole GitHub collaborator/admin
  per the GitHub API), `Codex <codex@local>` (an AI coding tool invoked
  locally by the owner — not a separate GitHub account, not a distinct
  copyright claimant), and `dependabot[bot]` (automated dependency-version
  bumps with no creative/copyrightable contribution).
- `gh api repos/shadowhunter67/daklak-3d-dashboard/contributors` and
  `.../collaborators` confirm `shadowhunter67` as the only human
  GitHub-attributed contributor and the only collaborator with any
  repository permission.
- No pull request in this repository's history was authored or merged from
  a GitHub account other than `shadowhunter67`.
- Conclusion: there is no external contributor with an independent
  copyright claim whose consent would be required to relicense future
  versions. If that ever changes (an external contributor's PR is merged),
  this document must be updated and that contributor's explicit
  relicensing consent obtained before including their work in a
  non-MIT release.
- Third-party dependencies and data (see `THIRD_PARTY_NOTICES.md`,
  `ATTRIBUTION.md`) retain their own licenses regardless of this project's
  license — this transition does not, and cannot, relicense them.

## The `mit-final-1.0.0` tag

`mit-final-1.0.0` marks the last commit released under the MIT License,
before this Source-Available Evaluation License transition. See the
[GitHub release](https://github.com/shadowhunter67/daklak-3d-dashboard/releases/tag/mit-final-1.0.0).

**This transition is not retroactive.** Anyone who obtained a copy of this
repository at or before `mit-final-1.0.0` keeps full MIT rights (use,
modify, distribute, sublicense, sell) over that historical copy, exactly as
granted by the MIT License text present in `LICENSE` at that commit. This
document does not revoke, and cannot revoke, those already-granted rights.

## Timeline

| Version tag          | License                                    | Notes                                                      |
| -------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| `mit-final-1.0.0`    | MIT                                        | Last MIT release. All commits at/before this tag stay MIT. |
| (next commit onward) | Source-Available Evaluation License (SAEL) | See `LICENSE`, `COMMERCIAL-LICENSE.md`, `TRADEMARKS.md`.   |

## Not legal advice

This history is provided for transparency. It is not a legal opinion on
the validity or enforceability of either license in any jurisdiction.
