# Validation — 10 September 2026

## Automated checks

`npm test`: 7 tests passed.

- Real HTTP session creation and two concurrent WebSocket clients see the same world.
- Remote reward claims and out-of-range movement are rejected.
- Save survives an actual server process shutdown/restart using SQLite; identity, quest and position restore.
- Two simultaneous buyers cannot both acquire the single shared book stall; only one balance is debited.
- Null WebSocket messages do not crash the server.
- Direct-delivery reward is paid once; repeat collection/delivery and repeat property interaction do not duplicate money.
- Insufficient funds and invalid/out-of-bounds/blocked positions are rejected.
- Passive income is bounded to eight offline hours and cannot be reclaimed for the same interval.
- Niko's alternate delivery branch removes the parcel, pays the lower reward and records reputation/memory.
- Room rental grants a key, debits money, allows server-authorized interior entry and return.
- Helping the garden pays once; subsequent dialogue remembers the interaction.

## Browser playtest

Used a separate server/data directory on port 4174, preserving the user's initial world on 4173.

Visually inspected the entry screen, rendered Red Square scene, mission HUD and accessible interior. Performed the following through visible controls:

1. Joined as Playtest with ₽25.
2. Used Walk to marker and Talk to Mila to accept the mission.
3. Walked to and collected the parcel; inventory displayed Sealed book parcel.
4. Walked to Lev and delivered it; balance became ₽105, reputation became 2, parcel was removed.
5. Walked to Irina and rented a bed; balance became ₽85 and Guesthouse key appeared.
6. Reloaded the browser and rejoined; money, reputation and key remained saved.
7. Spoke to Irina again; she greeted the saved player by name and remembered the prior interaction. Entered the room, saw the bed/interior, then used the return interaction.
8. Walked to the book stall and purchased it for ₽50; verified ownership and passive-income status.

Mouse-look, keyboard movement handlers and assisted movement share the same bounded movement loop; full mouse-lock behavior depends on browser support and was not claimed as universally validated. The alternate delivery branch was tested at the server/game-rule level, not repeated in the browser. No mobile usability, public internet deployment, production authentication, live AI conversation or frame-rate benchmark is claimed.

## GUM detail pass — 10 September 2026

- Re-ran all seven gameplay tests: passed.
- Reimported the new GLB in Blender 4.5: six meshes, 155,460 triangles, UVs present and finite vertex coordinates. Two embedded 1024px images present. See source/blender/gum-detail/validation.json.
- Inspected street, front facade and stone-detail views in the actual browser renderer. No browser error logs were reported during this check.
- Joined an isolated local QA world, walked to Mila and started the delivery mission with the upgraded renderer.
- Observed roughly 34–38 FPS in the preview with another game tab open at 1280×720. This is a spot check, not a cross-device performance guarantee. Contact shadows and multisampling add GPU cost.
- Three offline Cycles previews are separate from browser evidence; their lighting differs. No Unreal rendering or survey-accuracy validation was performed.

## GUM materials and secondary detail — second pass

- Verified eight Poly Haven downloads against the MD5 values returned by its asset API; recorded SHA-256 hashes and CC0 provenance locally.
- GLB reimport check passed: 7 meshes, 162,980 triangles, finite coordinates and UV layers. Embedded texture sizes: one 1024px and two 2048px maps. Imported material retains its normal-map node. Reproduce with `blender --background --python-exit-code 1 --python source/blender/gum-detail/validate.py`.
- Inspected street, stone-detail and new paving camera views in the browser. No rendering errors reported by browser logs. Corrected downpipes to the pilaster positions following visual review.
- JavaScript syntax check passed. Gameplay/server logic is unchanged; the prior seven-test result applies to that unchanged logic.
- Generic material scans improve surface variation but are not evidence of the site's actual stone species, paving pattern or weathering. No new survey-accuracy claim.

## Expanded world detail

- Blender GLB reimport passed: 15 meshes, 11,976 triangles, finite coordinates and preserved UVs. Validation script and result are under source/blender/world-detail.
- JavaScript syntax check passed. Browser wall and bookstall views were visually inspected; browser logs reported no errors during those checks.
- New brick texture downloads verified against API MD5 values; SHA-256 hashes recorded.
- Existing gameplay rules are unchanged. This pass replaces scenery and material assignments, not world simulation.
