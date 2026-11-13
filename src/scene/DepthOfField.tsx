import React, {useEffect, useMemo} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {
	DepthTexture,
	HalfFloatType,
	Mesh,
	OrthographicCamera,
	PerspectiveCamera,
	PlaneGeometry,
	Scene,
	ShaderMaterial,
	Vector3,
	WebGLRenderTarget,
} from 'three';

const fragment = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform float uNear;
uniform float uFar;
uniform float uFocus;
uniform float uMaxBlur;
uniform float uAspect;
uniform float uStrength;
varying vec2 vUv;

// distance in front of the camera, in metres
float viewZ(vec2 uv) {
	float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
	return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
}
// Blur size, 0..1. Like a real lens it grows fast in front of the focus
// distance and levels off behind it; a small band around focus stays sharp.
float coc(float z) {
	// the sharp band always reaches half a metre in front of the focus point,
	// so a close-up keeps the whole head sharp
	float band = max(0.09, 0.5 / (uFocus * max(uFocus - 0.5, 0.2)));
	return clamp((abs(1.0 / uFocus - 1.0 / z) - band) * 3.4 * uStrength, 0.0, 1.0);
}

void main() {
	float zc = viewZ(vUv);
	float cc = coc(zc);
	vec3 acc = texture2D(tColor, vUv).rgb;
	float total = 1.0;
	for (int i = 0; i < 40; i++) {
		float fi = float(i) + 0.5;
		float r = sqrt(fi / 40.0);
		float th = fi * 2.39996323;
		vec2 uv = vUv + vec2(cos(th) / uAspect, sin(th)) * r * uMaxBlur;
		float zs = viewZ(uv);
		float cs = coc(zs);
		// things behind a sharp subject must not smear over it
		if (zs > zc) cs = min(cs, cc);
		// a neighbour only counts if its own blur is wide enough to reach here
		float w = smoothstep(r - 0.1, r + 0.02, cs);
		acc += texture2D(tColor, uv).rgb * w;
		total += w;
	}
	gl_FragColor = vec4(acc / total, 1.0);
	#include <colorspace_fragment>
}
`;

type V3 = [number, number, number];

/**
 * Depth of field. The scene is drawn into an off-screen buffer with its
 * depth, then blurred by how far each pixel is from the focus point.
 */
export const DepthOfField: React.FC<{focus: V3; strength?: number; maxBlur?: number}> = ({focus, strength = 1, maxBlur = 0.0095}) => {
	const gl = useThree((s) => s.gl);
	const scene = useThree((s) => s.scene);
	const camera = useThree((s) => s.camera) as PerspectiveCamera;
	const size = useThree((s) => s.size);

	const post = useMemo(() => {
		// Drawn at twice the size and averaged back down: that is the
		// anti-aliasing (a multisampled buffer cannot hand us its depth reliably).
		const w = Math.round(size.width * gl.getPixelRatio()) * 2;
		const h = Math.round(size.height * gl.getPixelRatio()) * 2;
		const target = new WebGLRenderTarget(w, h, {type: HalfFloatType, depthTexture: new DepthTexture(w, h)});
		const material = new ShaderMaterial({
			depthTest: false,
			depthWrite: false,
			uniforms: {
				tColor: {value: target.texture},
				tDepth: {value: target.depthTexture},
				uNear: {value: 0.1},
				uFar: {value: 60},
				uFocus: {value: 3},
				uMaxBlur: {value: maxBlur},
				uAspect: {value: w / h},
				uStrength: {value: strength},
			},
			vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
			fragmentShader: fragment,
		});
		const quad = new Scene();
		quad.add(new Mesh(new PlaneGeometry(2, 2), material));
		return {target, material, quad, cam: new OrthographicCamera(-1, 1, 1, -1, 0, 1)};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [gl, size, maxBlur]);
	useEffect(
		() => () => {
			post.target.dispose();
			post.material.dispose();
		},
		[post],
	);

	const u = post.material.uniforms;
	u.uFocus.value = Math.max(0.2, -new Vector3(...focus).applyMatrix4(camera.matrixWorldInverse).z);
	u.uStrength.value = strength;
	u.uNear.value = camera.near;
	u.uFar.value = camera.far;

	// Taking a render priority hands the frame to us instead of the default render.
	useFrame(() => {
		gl.setRenderTarget(post.target);
		gl.render(scene, camera);
		gl.setRenderTarget(null);
		gl.render(post.quad, post.cam);
	}, 1);

	return null;
};
