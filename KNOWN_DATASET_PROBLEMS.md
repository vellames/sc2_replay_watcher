# Known dataset and inference problems

This document tracks known problems in the frozen 455-feature R1 contract used by the win-probability models, their observable impact, and the temporary mitigations applied by SC2 Replay Watcher.

The current production model is `LightGBMFullDecay`. Its training corpus has not yet been regenerated with these mitigations. Consequently, the inference filters below intentionally trade exact training-distribution compatibility for removal of signals that have no competitive meaning.

## Frame-zero account and cosmetic events

StarCraft II replays expose account loadouts and cosmetic entitlements as completed upgrades at frame zero. Examples observed in production-compatible replays include:

- `RewardDance*`;
- `SprayTerran`, `SprayProtoss`, and `SprayZerg`;
- `GameHeartActive`;
- `GhostAlternate`.

These values differ between players but do not describe the match state. In the audited TvT replay, removing frame-zero artifacts reduced an implausible 71.38% prediction at approximately one minute to 59.05%; canonicalizing the two Supply Depot modes reduced it further to 57.65%.

Current mitigation: all frame-zero completed upgrades are excluded from inference. Known cosmetic upgrade prefixes are also excluded if they appear later.

Permanent correction: remove these events while rebuilding the training corpus and retrain every model derived from R1.

## Internal helper entities

The tracker stream contains engine implementation objects that may be assigned to a player. They can contaminate entity maps, entity totals, and the `born`, `lost`, `init`, and `done` flow features.

The following objects are excluded from inference:

| Entity | Observed events in the audited corpus | Games | Reason |
| --- | ---: | ---: | --- |
| `InvisibleTargetDummy` | 1,577,041 | 574 | Transient targeting helper |
| `BroodlingEscort` | 228,989 | 825 | Internal companion object; duplicates Brood Lord state |
| `ParasiticBombDummy` | 2,601 | 706 | Spell implementation object |
| `ParasiticBombRelayDummy` | 2,245 | 604 | Spell relay object |
| `ReleaseInterceptorsBeacon` | 6 | 1 | Internal ability beacon |

All `Beacon*` entities are also excluded. Filtering happens before state and flow accounting, so ignored objects do not increment totals or lifecycle counters.

`LocustMPPrecursor` remains enabled. It is a transitional gameplay object rather than an unambiguous dummy, and should be studied for canonicalization to `LocustMP` before changing production behavior.

Permanent correction: define a versioned competitive-entity allowlist or ontology, rebuild R1, and retrain. A denylist is only an interim defense against protocol artifacts.

## Equivalent entity modes

The entity JSON fields are feature-hashed by their exact names. The model therefore treats mode variants as unrelated tokens unless they are canonicalized before hashing.

Current mitigation:

```text
SupplyDepotLowered -> SupplyDepot
SupplyDepotRaised  -> SupplyDepot
```

In the audited TvT snapshot, this changed the prediction from 59.05% to 57.65% while making both otherwise equivalent depots use the same feature.

Other mode families remain unresolved, including siege, burrowed, flying, phasing, uprooted, and deployed forms. They may contain real tactical information, so they must not be collapsed indiscriminately. A future contract should represent base identity and tactical mode as separate features.

## Command taxonomy ambiguity

`sc2reader` may expose a meaningful `ability_name` while reporting `has_ability=False`. Real commands observed in this condition include `ChannelSnipe`, `SpawnLarva`, `Attack`, `CalldownMULE`, `QueenTransfusion`, and `CausticSpray`. The current taxonomy can therefore place real abilities in `no_explicit_ability`.

Cosmetic command filtering is deliberately narrow. It excludes command names beginning with known dance, emote, taunt, or race-specific spray prefixes. It must not use a generic substring match: `CausticSpray` is a legitimate Corruptor ability and is retained.

The same player intent can also be encoded differently by race and unit. In the audited Washout PvT, Terran worker actions appeared as explicit `Gather` and `ReturnCargo` abilities while most Protoss equivalents appeared as unresolved `RightClick` commands. Terran-only `LowerSupplyDepot` and `RaiseSupplyDepot` commands added more protocol-specific activity. At 2:25, these routine commands inflated the Terran prediction from approximately 49.78% to 63.33%.

Current mitigation:

- exclude `Gather`, `ReturnCargo`, `LowerSupplyDepot`, and `RaiseSupplyDepot` from inference command accounting;
- retain the behavioral columns required by the frozen contract, but set each self/enemy command and control-group pair to their midpoint and every corresponding difference to zero;
- continue accounting for causal lifecycle flows such as births, completions, losses, kills, and upgrades.

This midpoint neutralization is intentionally temporary. It prevents APM, control-group habits, race-specific command availability, and protocol resolution from expressing a relative advantage while avoiding an all-zero behavioral vector that is far outside the training distribution.

Replay-level verification after applying the mitigation:

| Replay point | Before | After | Interpretation |
| --- | ---: | ---: | --- |
| Washout PvT at 2:25 | 63.33% | 49.80% | No state-based Terran advantage |
| Washout PvT at 5:05 | 92.17% | 80.35% | Real Terran army and damage advantage remains |
| Audited opening TvT at 1:00 | 57.65% | 51.89% | Symmetric opening moves closer to neutral |

Permanent correction: rebuild command semantics from normalized ability identifiers rather than relying primarily on `has_ability`, validate the mapping by patch, then regenerate and retrain R1.

## Perspective asymmetry

The model is not guaranteed to satisfy:

```text
P(self wins | x) = 1 - P(enemy wins | swap(x))
```

Across 16 locally audited unique replays, symmetric opening TvT states returned approximately 46.9% to 47.7% instead of 50%. Cross-race perspective gaps reached approximately 6.8 percentage points.

Current mitigation: none.

Proposed correction: infer both perspectives and combine their logits symmetrically. This should be evaluated on held-out games before production use and incorporated into training through paired examples or an explicit symmetry constraint.

## Early-game calibration

The model returns raw LightGBM probabilities and has no temporal or state-conditional calibration layer. Sparse early-game evidence can therefore produce probabilities that are too extreme.

A fixed time-based temperature is not recommended because a real rush can make an early state highly informative. The preferred approach is an out-of-fold state-oriented calibrator whose confidence depends on causal evidence such as worker, army, production, loss, technology, and combat differences.

The calibrator must be grouped by replay during validation and must not use final game duration or any other future information.

## Feature hashing

Categorical and entity features use deterministic hashing into fixed dimensions. Exact entity names receive independent hashes, and collisions are possible. This makes unknown protocol objects immediately consumable by the model but also makes attribution and ontology enforcement more difficult.

Current mitigation: sanitize names before hashing and keep the filter covered by replay-level tests.

Permanent correction: publish the cleaned vocabulary, collision audit, aliases, exclusions, and preprocessing hash with every trained artifact.

## Validation requirements for the next corpus

Before replacing the current temporary inference filters, a cleaned training run should verify:

1. No cosmetic, loadout, beacon, dummy, visual, or account-entitlement objects remain.
2. Perspective pairs are complementary within numerical tolerance.
3. Base entity identity and tactical mode are represented separately.
4. Command taxonomy is validated against observed ability identifiers for every supported patch.
5. Calibration is reported by matchup, game phase, evidence level, and short-game/rush subsets.
6. Brier score, log loss, calibration error, and reliability plots use replay-disjoint out-of-fold predictions.
7. Inference and training apply the same versioned sanitization contract.
