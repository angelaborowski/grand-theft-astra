# Grand Theft Astra interface artwork

The built-in image generator produced these images from the user-approved Moscow mockups.
The concept characters do not change the game characters or mission rules.

| Source | Runtime use |
| --- | --- |
| `menu-arrival.png` | Fixed title background |
| `loading-gum.png` | First loading image |
| `loading-winter.png` | Second loading image |
| `loading-metro.png` | Third loading image |
| `grand-theft-astra.png` | Shared title logo |

Keep source PNGs here. Runtime WebP files live in `public/assets/interface/`.
The logo has a black background. `GameBrand` uses screen blending to remove that background visually.
Code supplies Moscow, labels, controls, and loading status.

Encode backgrounds with `cwebp -quiet -q 84 -m 6 source/interface/menu-arrival.png -o public/assets/interface/menu-arrival.webp`.
Encode the logo with `cwebp -quiet -lossless -m 6 source/interface/grand-theft-astra.png -o public/assets/interface/grand-theft-astra.webp`.

[Exact prompts](prompts.md) preserve the generation instructions.
[Approved compositions](../../docs/visual-development/grand-theft-astra-menus.md) preserve the visual references.
