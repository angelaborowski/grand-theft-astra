# Character refinement verification

Exported runtime files passed GLB framing, finite accessors, index bounds, normalized skin weights, 13 joints, Idle/Walk/Greet clips with time samples, embedded PNG dimensions, and geometry budgets.

| Model | Triangles | Embedded maps | Bytes |
|---|---:|---:|---:|
| mila-study | 33,016 | 6 | 3,000,584 |
| lev | 31,664 | 5 | 2,854,856 |
| niko | 30,616 | 5 | 2,764,908 |
| irina | 36,636 | 5 | 3,082,896 |
| sasha | 32,836 | 5 | 3,269,768 |
| alexei | 30,364 | 5 | 2,757,036 |
| courier-prototype | 6,072 | 5 | 1,969,368 |

The complete SHA-256 records are in `validation.json`. The old cast validator and Mila source/runtime equality validator also pass. `pnpm check` passes lint, format, typecheck, tests and build in the isolated clone.

Independent review identified pale source hair, a protruding neck patch, brown crowd tint, ear overlap in the scalp mask and a shoulder opening. These were corrected in the build source. Reimported GLB Idle/Walk/Greet renders are provided for all seven bodies. They are sampled deformation checks rather than full animation certification.

Art limits: shared anatomical topology and related hair bases remain visible; costumes and features are approximate, not approved exact likeness. No facial/finger rig, foot IK or root motion is included. The 92 residents share the lightweight crowd body with runtime jacket colors. Team-photo avatar meshes are outside this currently rendered roster. Browser integration is coordinated with the parent app task and reported separately.
