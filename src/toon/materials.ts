import {
	BackSide,
	Color,
	DoubleSide,
	FrontSide,
	Matrix3,
	ShaderMaterial,
	UniformsLib,
	UniformsUtils,
	Vector2,
	Vector3,
	Vector4,
} from 'three';
import {P, Ramp} from './palette';

/**
 * Uniforms shared by every material in the scene (same object references),
 * so the light and atmosphere can be animated from one place.
 */
export const globals = {
	uLightDirW: {value: new Vector3(0.5, 0.7, 0.5).normalize()},
	uFogColor: {value: P.fog.clone()},
	uFogNear: {value: 4},
	uFogFar: {value: 16},
	uKeyTint: {value: P.keyTint.clone()},
	uAmbTint: {value: P.ambTint.clone()},
	uLine: {value: P.line.clone()},
	uLineLit: {value: P.lineLit.clone()},
	/** Window light falling on the floor: xz centre, xz half size. */
	uSunRect: {value: new Vector4(0.7, 2.3, 1.0, 1.5)},
	uSunColor: {value: P.sun.clone()},
};

const PATTERNS = {none: 0, wood: 1, checker: 2, wallpaper: 3, uniform: 4, face: 5, carpet: 6} as const;
export type Pattern = keyof typeof PATTERNS;

export type ToonOptions = {
	ramp: Ramp;
	/** 0 = shade with the real 3D normal, 1 = shade as a paper cut-out that faces the camera. */
	flat?: number;
	/** Strength of the 2D gradient that runs across the camera-facing plane, along the light. */
	grad?: number;
	/** Where the cel terminator sits (0..1) and how soft it is. */
	band?: number;
	soft?: number;
	/** Strength of the gradient into the deepest colour. */
	deep?: number;
	/** Rim highlight on the light side. */
	rim?: number;
	rimWidth?: number;
	/** Extra darkening toward the bottom of the object (object-space y range). */
	ground?: number;
	yRange?: [number, number];
	/** Object-space centre and radius the planar gradient is measured from. */
	pivot?: [number, number, number];
	radius?: number;
	pattern?: Pattern;
	alt?: Ramp;
	patScale?: number;
	fog?: number;
	doubleSide?: boolean;
	/** How strongly the window light patch shows on this surface (floors). */
	sun?: number;
};

const toonVertex = /* glsl */ `
#include <common>
#include <shadowmap_pars_vertex>

uniform vec3 uPivot;
uniform float uRadius;

varying vec3 vViewPos;
varying vec3 vNormalV;
varying vec3 vObjPos;
varying vec3 vWorldPos;
varying vec2 vPlane;

void main() {
	#include <beginnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>

	vViewPos = mvPosition.xyz;
	vNormalV = normalize(transformedNormal);
	vObjPos = position;
	vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;

	// Where this vertex sits on the object's camera-facing plane, in units of
	// the object's radius. This is the "paper cut-out" coordinate system: it is
	// 2D, but it is anchored to the object's real 3D position.
	vec3 pivotV = (modelViewMatrix * vec4(uPivot, 1.0)).xyz;
	vPlane = (mvPosition.xyz - pivotV).xy / uRadius;
}
`;

const toonFragment = /* glsl */ `
#include <common>
#include <packing>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

uniform vec3 uBase;
uniform vec3 uShade;
uniform vec3 uDeep;
uniform vec3 uLight;
uniform vec3 uAltBase;
uniform vec3 uAltShade;
uniform vec3 uAltDeep;
uniform float uFlat;
uniform float uGrad;
uniform float uBand;
uniform float uSoft;
uniform float uDeepAmt;
uniform float uRim;
uniform float uRimWidth;
uniform float uGround;
uniform vec2 uYRange;
uniform float uPatScale;
uniform float uFogAmt;

uniform vec3 uLightDirW;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uKeyTint;
uniform vec3 uAmbTint;
uniform vec3 uLine;
uniform vec3 uLineLit;

// face
uniform vec4 uEyes;   // blinkL, blinkR, lid, glasses
uniform vec2 uLook;
uniform vec4 uBrow;   // heightL, angleL, heightR, angleR
uniform vec4 uMouth;  // width, open, curve, offsetY
uniform mat3 uFaceRot;
uniform float uFaceFade;
uniform vec4 uSunRect;
uniform vec3 uSunColor;
uniform float uSun;

varying vec3 vViewPos;
varying vec3 vNormalV;
varying vec3 vObjPos;
varying vec3 vWorldPos;
varying vec2 vPlane;

float hash1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float sdSegment(vec2 p, vec2 a, vec2 b) {
	vec2 pa = p - a, ba = b - a;
	float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
	return length(pa - ba * h);
}
float sdRoundBox(vec2 p, vec2 b, float r) {
	vec2 q = abs(p) - b;
	return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
// anti-aliased fill of a signed distance
float fill(float d) {
	float aa = max(fwidth(d), 1e-5);
	return 1.0 - smoothstep(-aa, aa, d);
}

#if PATTERN == 5
// Face drawn directly on the head sphere. The sphere is unwrapped around the
// +Z (face) axis with an azimuthal projection, so the features are 2D ink but
// they live on the 3D head: turn the head and they slide round with it.
float faceInk(vec3 p) {
	// uFaceRot swings the face part-way toward the camera, the way a 2D
	// animator keeps a face readable when the head is turned.
	p = uFaceRot * normalize(p);
	float th = acos(clamp(p.z, -1.0, 1.0));
	if (th > 2.2) return 0.0;
	vec2 uv = th * normalize(p.xy + vec2(1e-6));
	float sx = step(0.0, uv.x); // 1 on the character's left (+x)
	vec2 q = vec2(abs(uv.x), uv.y);
	float glasses = uEyes.w;

	float blink = mix(uEyes.y, uEyes.x, sx);
	vec2 ec = vec2(0.33, 0.1);
	vec2 look = uLook * mix(0.07, 0.045, glasses);
	vec2 eq = q - ec - vec2(look.x * (sx * 2.0 - 1.0), look.y);
	vec2 er = mix(vec2(0.085, 0.135), vec2(0.05, 0.065), glasses);
	er.y *= mix(1.0, 0.12, blink);
	float dEye = (length(eq / er) - 1.0) * min(er.x, er.y);
	// heavy upper lid: slice the top off the oval
	float lidY = er.y * (1.0 - 1.9 * uEyes.z);
	dEye = max(dEye, eq.y - lidY);
	float d = dEye;

	vec2 bw = mix(uBrow.zw, uBrow.xy, sx);
	vec2 bc = vec2(0.34, 0.345 + bw.x);
	vec2 bd = vec2(cos(bw.y), sin(bw.y)) * 0.125;
	vec2 bq = q - bc;
	bq.y += bq.x * bq.x * 1.2; // slight arch
	d = min(d, sdSegment(bq, -bd, bd) - 0.027);

	vec2 m = uv - vec2(0.0, -0.4 + uMouth.w);
	m.y -= uMouth.z * m.x * m.x * 6.0;
	d = min(d, sdRoundBox(m, vec2(uMouth.x, uMouth.y), 0.03));

	if (glasses > 0.5) {
		vec2 gq = q - ec;
		d = min(d, abs(length(gq) - 0.2) - 0.02);
		d = min(d, sdSegment(q, vec2(0.0, 0.15), vec2(0.135, 0.13)) - 0.018);
		d = min(d, sdSegment(q, vec2(0.53, 0.13), vec2(1.45, 0.2)) - 0.018);
	}
	return fill(d) * uFaceFade;
}
#endif

void main() {
	vec3 L = normalize((viewMatrix * vec4(uLightDirW, 0.0)).xyz);
	vec3 V = normalize(-vViewPos);
	vec3 Nr = normalize(vNormalV);
	if (!gl_FrontFacing) Nr = -Nr;

	// ---- pattern: pick between two ramps, and optional ink lines -----------
	float alt = 0.0;
	float ink = 0.0;
	float inkDark = 0.0;
	#if PATTERN == 1
		// wood planks
		float pw = 0.3 * uPatScale;
		float zr = vWorldPos.z / pw;
		float row = floor(zr);
		float fz = fract(zr);
		float pl = 1.7 * uPatScale;
		float xr = (vWorldPos.x + hash1(row) * 7.0) / pl;
		float fx = fract(xr);
		alt = hash2(vec2(row, floor(xr)));
		alt = alt * alt;
		float seam = min(min(fz, 1.0 - fz) * pw, min(fx, 1.0 - fx) * pl);
		ink = fill(seam - 0.009) * 0.75;
	#elif PATTERN == 2
		vec2 t = floor(vWorldPos.xz / uPatScale);
		alt = mod(t.x + t.y, 2.0);
	#elif PATTERN == 3
		// wallpaper: staggered little sprig motif
		vec2 wp = vec2(vWorldPos.x + vWorldPos.z, vWorldPos.y) / uPatScale;
		float rowW = floor(wp.y);
		wp.x += mod(rowW, 2.0) * 0.5;
		vec2 c = fract(wp) - 0.5;
		float dm = sdSegment(c, vec2(0.0, -0.13), vec2(0.0, 0.02)) - 0.018;
		dm = min(dm, sdSegment(vec2(abs(c.x), c.y), vec2(0.0, 0.02), vec2(0.075, 0.12)) - 0.018);
		alt = fill(dm);
		float st = abs(fract((vWorldPos.x + vWorldPos.z) / uPatScale * 2.0) - 0.5) * uPatScale * 0.5;
		alt = max(alt, fill(st - 0.004) * 0.45);
	#elif PATTERN == 4
		// shirt front: placket and two chest pockets, wrapped round the torso
		float ang = atan(vObjPos.x, vObjPos.z);
		vec2 bq = vec2(ang * 0.18, vObjPos.y);
		float dl = max(abs(bq.x) - 0.004, max(0.22 - bq.y, bq.y - 0.74));
		vec2 pq = vec2(abs(bq.x) - 0.088, bq.y - 0.5);
		dl = min(dl, abs(sdRoundBox(pq, vec2(0.04, 0.036), 0.012)) - 0.0045);
		dl = min(dl, max(abs(pq.y - 0.022) - 0.004, abs(pq.x) - 0.05));
		ink = fill(dl) * 0.85;
	#elif PATTERN == 6
		// carpet: soft clumpy pile
		vec2 cp = vWorldPos.xz * 9.0;
		vec2 ci = floor(cp), cf = fract(cp);
		cf = cf * cf * (3.0 - 2.0 * cf);
		float n = mix(mix(hash2(ci), hash2(ci + vec2(1, 0)), cf.x), mix(hash2(ci + vec2(0, 1)), hash2(ci + vec2(1, 1)), cf.x), cf.y);
		alt = smoothstep(0.35, 0.75, n) * 0.6;
	#endif

	vec3 cBase = mix(uBase, uAltBase, alt);
	vec3 cShade = mix(uShade, uAltShade, alt);
	vec3 cDeep = mix(uDeep, uAltDeep, alt);

	// ---- lighting ----------------------------------------------------------
	// The shading normal is mostly a plane that faces the camera, so a round
	// body is lit like a flat drawing; what is left of the true normal gives
	// the terminator a little curvature.
	vec3 N = normalize(mix(Nr, V, uFlat));
	float ndl = dot(N, L);
	// 2D gradient across that plane, pointing along the light as seen on screen
	float planar = dot(vPlane, L.xy);
	float lit = ndl * 0.5 + 0.5 + planar * uGrad;

	float h = smoothstep(uYRange.x, uYRange.y, vObjPos.y);
	lit -= (1.0 - h) * (1.0 - h) * uGround;

	float shadow = getShadowMask();
	float band = smoothstep(uBand - uSoft, uBand + uSoft, lit);
	float key = band * shadow;

	vec3 col = mix(cShade, cBase, key);
	// deep, saturated falloff on the side away from the light
	float deepT = 1.0 - smoothstep(uBand - 0.5, uBand - 0.02, lit - (1.0 - shadow) * 0.12);
	col = mix(col, cDeep, deepT * uDeepAmt);

	// crisp rim highlight hugging the lit edge
	float fres = 1.0 - max(dot(Nr, V), 0.0);
	float side = dot(normalize(Nr.xy + vec2(1e-5)), normalize(L.xy + vec2(1e-5)));
	float rimT = 1.0 - uRimWidth;
	float rim = smoothstep(rimT, rimT + 0.035, fres * smoothstep(0.1, 0.85, side));
	rim *= smoothstep(-0.3, 0.2, L.z + 0.25) * shadow;
	col = mix(col, uLight, rim * uRim);

	// warm window light on the floor, split into panes, skewed by the sun
	if (uSun > 0.0) {
		vec2 sp = vWorldPos.xz - uSunRect.xy;
		sp.x += sp.y * 0.35;
		vec2 sq = abs(sp) - uSunRect.zw;
		float inside = 1.0 - smoothstep(-0.12, 0.0, max(sq.x, sq.y));
		vec2 pane = abs(fract(sp / (uSunRect.zw * vec2(1.0, 0.6667)) * 0.5 + 0.5) - 0.5);
		float bars = smoothstep(0.02, 0.07, min(pane.x * uSunRect.z, pane.y * uSunRect.w));
		col = mix(col, col * 0.55 + uSunColor * 0.6, inside * bars * shadow * uSun);
	}

	col = mix(col, mix(cDeep, uLine, 0.35), ink);

	#if PATTERN == 5
		float f = faceInk(vObjPos);
		col = mix(col, mix(uLine, uLineLit, key * 0.35), f);
	#endif

	// warm key / cool ambient
	col *= mix(uAmbTint, uKeyTint, key);

	// atmosphere
	float fogT = smoothstep(uFogNear, uFogFar, -vViewPos.z);
	col = mix(col, uFogColor, fogT * uFogAmt);

	gl_FragColor = vec4(col, 1.0);
	#include <colorspace_fragment>
}
`;

export const toon = (o: ToonOptions): ShaderMaterial => {
	const alt = o.alt ?? o.ramp;
	return new ShaderMaterial({
		lights: true,
		side: o.doubleSide ? DoubleSide : FrontSide,
		defines: {PATTERN: PATTERNS[o.pattern ?? 'none']},
		uniforms: {
			...UniformsUtils.clone(UniformsLib.lights),
			...globals,
			uBase: {value: o.ramp.base},
			uShade: {value: o.ramp.shade},
			uDeep: {value: o.ramp.deep},
			uLight: {value: o.ramp.light},
			uAltBase: {value: alt.base},
			uAltShade: {value: alt.shade},
			uAltDeep: {value: alt.deep},
			uFlat: {value: o.flat ?? 0.2},
			uGrad: {value: o.grad ?? 0.12},
			uBand: {value: o.band ?? 0.5},
			uSoft: {value: o.soft ?? 0.03},
			uDeepAmt: {value: o.deep ?? 0.6},
			uRim: {value: o.rim ?? 0},
			uRimWidth: {value: o.rimWidth ?? 0.3},
			uGround: {value: o.ground ?? 0},
			uYRange: {value: new Vector2(...(o.yRange ?? [0, 1]))},
			uPivot: {value: new Vector3(...(o.pivot ?? [0, 0, 0]))},
			uRadius: {value: o.radius ?? 1},
			uPatScale: {value: o.patScale ?? 1},
			uFogAmt: {value: o.fog ?? 0.35},
			uEyes: {value: new Vector4(0, 0, 0, 0)},
			uLook: {value: new Vector2(0, 0)},
			uBrow: {value: new Vector4(0, 0, 0, 0)},
			uMouth: {value: new Vector4(0.1, 0, 0, 0)},
			uFaceRot: {value: new Matrix3()},
			uFaceFade: {value: 1},
			uSun: {value: o.sun ?? 0},
		},
		vertexShader: toonVertex,
		fragmentShader: toonFragment,
	});
};

const outlineVertex = /* glsl */ `
uniform vec3 uLightDirW;
uniform float uWidth;
uniform float uThin;
uniform float uThick;
uniform float uBox;
uniform float uSeed;

varying float vLit;
varying float vDepth;

void main() {
	vec3 Lv = normalize((viewMatrix * vec4(uLightDirW, 0.0)).xyz);
	vec4 mv = modelViewMatrix * vec4(position, 1.0);

	// Inverted hull. Smooth shapes push out along their normal; boxes push
	// their corners out diagonally so the hull stays closed at hard edges.
	vec3 off = uBox > 0.5
		? mat3(modelViewMatrix) * sign(position)
		: normalize(normalMatrix * normal);
	float s = dot(normalize(off), Lv);
	vLit = smoothstep(-0.5, 0.75, s);

	// The pen presses harder on the shadow side and lifts on the lit side,
	// with a slow wobble so no stroke has a constant weight.
	float w = uWidth * mix(uThick, uThin, vLit);
	w *= 1.0 + 0.16 * sin(dot(position, vec3(9.1, 6.3, 7.7)) + uSeed);
	// keep distant lines readable instead of letting them vanish
	float dist = max(-mv.z, 0.3);
	w *= pow(dist / 3.0, 0.5);

	mv.xyz += off * w;
	vDepth = -mv.z;
	gl_Position = projectionMatrix * mv;
}
`;

const outlineFragment = /* glsl */ `
uniform vec3 uLine;
uniform vec3 uLineLit;
uniform vec3 uColor;
uniform float uTint;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFogAmt;

varying float vLit;
varying float vDepth;

void main() {
	// ink picks up a little of the local colour and warms where light hits it
	vec3 col = mix(uLine, uLineLit, vLit * 0.7);
	col = mix(col, uColor, uTint * (0.35 + 0.65 * vLit));
	float fogT = smoothstep(uFogNear, uFogFar, vDepth);
	col = mix(col, uFogColor, fogT * uFogAmt);
	gl_FragColor = vec4(col, 1.0);
	#include <colorspace_fragment>
}
`;

export type OutlineOptions = {
	width?: number;
	thin?: number;
	thick?: number;
	box?: boolean;
	seed?: number;
	/** Blend the ink toward this colour (coloured line art for soft props). */
	color?: Color;
	tint?: number;
	fog?: number;
};

export const outline = (o: OutlineOptions = {}): ShaderMaterial =>
	new ShaderMaterial({
		side: BackSide,
		uniforms: {
			...globals,
			uWidth: {value: o.width ?? 0.014},
			uThin: {value: o.thin ?? 0.55},
			uThick: {value: o.thick ?? 1.5},
			uBox: {value: o.box ? 1 : 0},
			uSeed: {value: o.seed ?? 0},
			uColor: {value: o.color ?? new Color(0, 0, 0)},
			uTint: {value: o.color ? (o.tint ?? 0.3) : 0},
			uFogAmt: {value: o.fog ?? 0.55},
		},
		vertexShader: outlineVertex,
		fragmentShader: outlineFragment,
	});
