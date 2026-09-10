# Hostel furnishings and museum detail

`public/world-polish.js` is the editable procedural source for the furniture, museum facade and repeated GUM extension. `export.mjs` exports the furniture and museum geometry to GLB, and `furnishings-and-museum.blend` contains that export imported into Blender in metres.

Furniture includes floorboards, bed/headboard/pillows/blanket, bedside table and lamp, desk/chair, rug, skirting and wall panels. The hostel is fictional. The desk/chair collision is included in both server and client movement checks. The bed uses its existing conservative collision area.

GUM's existing 60m detail module is repeated to cover the mapped facade span, clipping the ends. This increases detail coverage but does not reconstruct each real bay or entrance. Museum windows and trim are a procedural approximation on the square-facing elevation. The other landmark meshes retain their previous architectural approximations. No survey accuracy or full-world photorealism is claimed.

Run `node source/blender/interior/export.mjs` from the repository root to regenerate the furniture/museum GLB. The Blender file is an editable snapshot of that geometry; source edits should be made in the module and re-exported.
