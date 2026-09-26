# 03: img2threejs suitability assessment (Phase 13)

**Verdict: img2threejs assessed; 3D treatment rejected because it would reduce
authenticity and usability.**

Assessed 2026-09-26 with the img2threejs skill. The run stopped at intake
validation (`grimoire/intake/validation_rubric.md`) with a reject decision. No
reconstruction state was initialised: `forge/next.py` reports no state file, and
starting one needs an admissible reference image.

## What was asked

Could ONE restrained procedural 3D moment materially improve the site? The
candidates were:

- an abstract massing study;
- a facade or object study;
- an editorial transition;
- a hero detail.

A spinning house, a 3D tour or a model viewer were out of scope from the start.

## Rubric evaluation

The site's source imagery is the account's Instagram photography: homes in their
settings, pools, views and interiors. The rubric is applied to that imagery.

| Rubric criterion | Finding |
| --- | --- |
| One obvious target object | No. Property photographs are scenes (house, landscape, sky, water, interiors), not object references. The rubric names "photo is a scene, not an object reference" as a reject reason. |
| Hidden sides reasonably inferred | No. Each residence is usually seen from a handful of framed angles. Rear elevations, roof forms and site sections are not visible, so any massing would be invention. |
| Materials that have a reconstruction path | Poor. Contemporary South African residences lean heavily on floor-to-ceiling glazing, rim-flow pools and water. The rubric rejects subjects that rely on glass and liquid. |
| Exact dimensions not required | Not satisfiable honestly. A massing model of a real, named home reads as a claim about its form and size, which the brief's no-fabrication rule forbids. |
| Reference available now | No. Extraction is still pending. The only local images are synthetic placeholders, which are never admissible references. |

Suitability score: **1 / 5** (reject).

## Why each candidate was rejected

| Candidate | Reason |
| --- | --- |
| Abstract massing study of a featured home | It would present an invented building form as that residence, which is a fabrication risk. It would also compete with the real photography. |
| Facade or object study | Single, framed, often wide-angle views cannot support it. Glass-dominant facades have no reconstruction path. |
| Editorial transition | It adds a WebGL runtime (three.js, several hundred kB) to a fast static site whose visitors are mostly on phones. The brief values mobile legibility and speed over effects. |
| Hero detail | The cover is a real photograph by design (direction contract: "Photography edge to edge"). A procedural detail there would be decoration standing in for content. |

## Product and design principles it would break

- **"The homes are the product. Photography and place lead."** (PRODUCT.md) A
  procedural model is an interpretation, and the photographs are the evidence.
- **"Every fact traces back to its post."** A 3D form has no post to trace to.
- **Classic editorial register** (the owner's choice, with a Sotheby's International
  Realty quality bar). That register is photography-led and does not use 3D moments.
- **Performance and accessibility.** A WebGL canvas adds weight, needs its own
  reduced-motion and keyboard handling, and adds nothing a screen reader can use.

## When to revisit

Only if the source changes in kind. For example, if an architect supplies drawings
or a model of a specific residence and consents to its use, or if the account
publishes multi-view drone sets clear enough to meet the rubric's pass criteria.
A non-architectural 3D element, such as a relief map of South Africa for the Places
page, is not an image-to-3D reconstruction and falls outside this skill's scope. It
would need its own case.
