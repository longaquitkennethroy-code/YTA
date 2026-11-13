# Toon stickman short (Remotion + Three.js)

A 1080x1920, 30 fps YouTube Shorts scene: real 3D stick figures shaded so they
read as 2D drawings.

```
npm install
npm run studio     # preview and scrub
npm run render     # out/short.mp4
```

There are two versions of the same scene:

- `StickmanShort`: characters are 3D shapes shaded flat.
- `StickmanShort2D`: characters are flat 2D cut-outs standing in the 3D room (`src/scene/Stickman2D.tsx`). Render it with `npx remotion render src/index.ts StickmanShort2D out/short-2d.mp4`.

- `StagingStudy`: a 58-second camera study (`src/study/direction.ts`). It rebuilds a reference video's staging, camera moves and lens angles shot by shot, using this project's own characters and rooms as stand-ins. Render it with `npx remotion render src/index.ts StagingStudy out/staging-study.mp4`.

On a Linux machine without a GPU, render with `REMOTION_GL=swangle npm run render`.

## How the look works

| What you see | Where | How |
| --- | --- | --- |
| Bodies lit like paper cut-outs | `src/toon/materials.ts` (`toon`) | The lighting normal is blended toward the camera (`flat`, 0.8 for characters). A 2D gradient then runs across that camera-facing plane along the light's on-screen direction (`grad`). The geometry is still 3D, so turning a character shows its back and the light changes with its position. |
| Deep gradients, cel shadow, rim highlight | same shader | Four-stop ramp per material: `deep`, `shade`, `base`, `light`. |
| Line art with changing weight | `outline` in the same file | Inverted hull whose width is driven by the light: heavy on the shadow side, thin on the lit side, with a slow wobble. Ink colour warms where lit and fades with distance. |
| Faces | `faceInk` in the head shader | Eyes, brows, mouth and glasses are drawn as ink on the head sphere, so they slide round with the head. Expressions are uniforms (`Face` in `Stickman.tsx`). |
| Colours | `src/toon/palette.ts` | Authored in OKLCH. Shadows shift cool and keep chroma, highlights shift warm. Blue lead, warm complement accents, teal as the bridge. |
| Head, body, arms, legs move separately | `src/scene/Stickman.tsx` | Head and torso are independent transforms; limbs are two-bone IK drawn as curved tubes. |

## Editing the video

- `src/scene/timeline.ts`: shot lengths and caption words (placeholder dialogue, no audio yet).
- `src/scene/acting.ts`: character poses per frame and the camera for each shot.
- `src/scene/Room.tsx`: the set.
- `src/scene/Scene.tsx`: light direction and shadow settings.
