import React from 'react';
import {useThree} from '@react-three/fiber';
import {PerspectiveCamera, Vector3} from 'three';
import {useCurrentFrame} from 'remotion';
import {globals} from '../toon/materials';
import {P} from '../toon/palette';
import {Room} from './Room';
import {Stickman} from './Stickman';
import {Stickman2D} from './Stickman2D';
import {cameraAt, civilianPose, focusAt, officerPose} from './acting';
import {DepthOfField} from './DepthOfField';
import {moodAt} from './moods';

const LIGHT_TARGET = new Vector3(0, 0, -1);

export const Scene: React.FC<{flat?: boolean}> = ({flat}) => {
	// flat: characters are 2D cut-outs in the 3D room
	const Actor = flat ? Stickman2D : Stickman;
	const frame = useCurrentFrame();
	const camera = useThree((s) => s.camera) as PerspectiveCamera;

	const shot = cameraAt(frame);
	camera.position.set(...shot.pos);
	camera.fov = shot.fov;
	camera.near = 0.1;
	camera.far = 60;
	camera.lookAt(...shot.target);
	camera.rotateZ(shot.roll);
	camera.updateProjectionMatrix();
	camera.updateMatrixWorld();

	// the mood drives every material through the shared uniforms
	const mood = moodAt(frame);
	const LIGHT_POS = new Vector3(...mood.light);
	globals.uLightDirW.value.copy(LIGHT_POS).sub(LIGHT_TARGET).normalize();
	globals.uKeyTint.value.copy(mood.key);
	globals.uAmbTint.value.copy(mood.amb);
	globals.uFogColor.value.copy(mood.fog);
	globals.uFloorTint.value.copy(mood.floor);
	globals.uSkyTint.value.copy(mood.sky);
	globals.uSunColor.value.copy(mood.sun);
	globals.uSunAmt.value = mood.sunAmt;
	globals.uLampAmt.value = mood.lamp;
	P.glass.base.copy(mood.glass.base);
	P.glass.shade.copy(mood.glass.shade);
	P.glass.deep.copy(mood.glass.deep);

	return (
		<>
			<color attach="background" args={[mood.fog]} />
			<ambientLight intensity={1} />
			<directionalLight
				position={LIGHT_POS}
				intensity={1}
				castShadow
				shadow-mapSize={[4096, 4096]}
				shadow-bias={-0.0006}
				shadow-normalBias={0.03}
				shadow-radius={1.2}
				shadow-camera-left={-8}
				shadow-camera-right={8}
				shadow-camera-top={8}
				shadow-camera-bottom={-8}
				shadow-camera-near={1}
				shadow-camera-far={30}
			>
				<object3D attach="target" position={LIGHT_TARGET} />
			</directionalLight>
			<DepthOfField focus={focusAt(frame)} />
			<Room />
			<Actor variant="officer" pose={officerPose(frame)} trail={[officerPose(frame - 1), officerPose(frame - 2)]} />
			<Actor variant="civilian" pose={civilianPose(frame)} trail={[civilianPose(frame - 1), civilianPose(frame - 2)]} />
		</>
	);
};
