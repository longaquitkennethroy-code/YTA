/** Shared by the character renderers and their accessories. */
export const HEAD_R = 0.34;

// flat ~0.8: the lighting normal is 80% "a sheet of paper facing the camera".
// celSoft: shadows on characters fade in as a gradient instead of a hard edge.
// figure: characters receive the mood's figure light.
export const CHAR = {flat: 0.8, grad: 0.3, band: 0.5, soft: 0.16, deep: 0.85, fog: 0.25, celSoft: 0.2, figure: true};
