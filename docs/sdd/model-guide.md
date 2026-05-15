<!-- managed-by: golden-path v1 — generated from .agents/skills/golden-path/sdd-mode.md.
     Model references can drift as new Claude versions ship.
     Re-run `/golden-path apply` to refresh. -->
# SDD Model Guide

Reference model tiers for Spec-Driven Development (SDD) commands.

## Models per command

| Command | Tier | Reference model |
|---|---|---|
| `/speckit.constitution` | Tier 1 reasoning | Claude 4.7 Opus or higher |
| `/speckit.specify` | Tier 1 reasoning | Claude 4.7 Opus or higher |
| `/speckit.plan` | Tier 1 reasoning | Claude 4.7 Opus or higher |
| `/specification` | Tier 1 reasoning | Claude 4.7 Opus or higher |
| `/implementing` | Tier 1 reasoning | Claude 4.7 Opus or higher |
| `/speckit.clarify` | Standard execution | Claude 4.6 Sonnet or higher |
| `/speckit.tasks` | Standard execution | Claude 4.6 Sonnet or higher |
| `/speckit.analyze` | Standard execution | Claude 4.6 Sonnet or higher |
| `/speckit.implement` | Standard execution | Claude 4.6 Sonnet or higher |

## SDD approach for this repo

**SDD Lite** is the default for most tasks in this repository (bug fixes, minor
features, block prop additions, i18n updates).

Use **SDD Full** (spec-kit) when a task meets any of: effort > 5 days, high
ambiguity, cross-team dependencies, significant architectural impact, or
involvement in critical Delivery Promise flows.

For **public repos** (this repo is public), SpecKit artifacts must live in a
private spec-repo. See https://github.com/vtex/speckit-multi-repo.
