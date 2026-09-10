# Mila — character production status

Status: Higgsfield visual reference completed; no game-usable 3D asset produced yet.

Reference image: https://d8j0ntlcm91z4.cloudfront.net/user_3J8vm2kdHIUprEXh4LizNKYtQ6v/hf_20260910_165650_7f86d41d-c78d-4570-9969-b246f90afa78.png

Confirmed final balance: 7.88 credits; actual reference cost 0.12 credits. No subscription or purchase initiated.

## Character specification

Original fictional adult woman, 29, 1.70 m tall; natural proportions. Dark brown ponytail, hazel eyes, light olive skin; mustard olive weatherproof jacket, charcoal sweatshirt, navy trousers, grey walking shoes, dark courier backpack. Contemporary everyday clothing with no branding.

## Higgsfield provenance

Soul 2.0 reference job: 7f86d41d-c78d-4570-9969-b246f90afa78.
Image model: soul_2 (returned backend model text2image_soul_v2).
Settings: 3:4, 1.5k, count 1, existing credits.
Preflight: 1 credit displayed (0.12 exact).
Seedream 4.5 submission was rejected: Requires basic plan or higher.

Exact reference prompt:

Photorealistic full-length character reference of an original fictional adult woman named Mila, age 29, a local walking courier in contemporary Moscow. Natural anatomically realistic proportions, 1.70 metres tall, average practical build, understated individual face, hazel eyes, slightly uneven brows, light olive skin with real pores, dark brown hair tied in a low ponytail. Worn mustard olive weatherproof hip-length jacket zipped over charcoal sweatshirt, straight dark navy work trousers, practical grey walking trainers, compact dark canvas courier backpack with padded straps. No brands. Standing relaxed with both hands clearly visible, feet fully in frame, neutral expression with a hint of warmth. Simple light grey studio background, soft broad daylight, accurate fabric texture, documentary realism, 85mm perspective. Single person, no text, no collage, no glamour retouching, no exaggerated body proportions, no weapon, no uniform. This image is visual development for a rigged game character.

## 3D blockers

Higgsfield lists Meshy image_to_3d with texturing, humanoid rigging and animation. However this connection exposes neither generate_3d nor estimate_3d_cost. The image endpoint explicitly rejects this model and directs the caller to generate_3d. No 3D generation was submitted.

Private 3D Jutsu project: https://higgsfield.ai/3d-jutsu/2d790fa6-ff76-4c27-9909-feaf3ae50c96 . Empty revision 0; no committed GLB. Catalog searches for woman and human returned zero assets.

Local game-dev CLI and Blender executable were not found on PATH; no Blender application was found in /Applications. No GLB, rig, animation, license clearance or game validation is claimed.

## Integration contract for the eventual asset

Target: Three.js GLTFLoader, Y-up, metres, 1.70 m standing height. Feet at local y=0; root at origin. Mila currently stands at x=37, y=.13, z=100 in public/game.js. Keep placeMeshes.guide pointing to the loaded root; preserve the Mila label and interaction position. Add an AnimationMixer and update it with dt in frame(). Required clips: Idle and Walk, looping, in-place; optional Talk gesture clip. Crossfade actions rather than replacing the root. Validate skinned meshes, joint weights, finite bounds, textures and foot contact in both clips before integration. The original game has not been modified.
