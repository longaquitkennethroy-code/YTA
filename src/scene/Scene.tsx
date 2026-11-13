import React from 'react';
import {useThree} from '@react-three/fiber';
import {PerspectiveCamera, Vector3} from 'three';
import {useCurrentFrame} from 'remotion';
import {globals} from '../toon/materials';
import {P} from '../toon/palette';
import {Room} from './Room';
import {Stickman} from './Stickman';
import {cameraAt, civilianPose, officerPose} from './acting';

// Key light: high and from the front-right of the room.
const LIGHT_POS = new Vector3(4.5, 8.5, 5.5);
const LIGHT_TARGET = new Vector3(0, 0, -1);

export const Scene: React.FC = () => {
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

	globals.uLightDirW.value.copy(LIGHT_POS).sub(LIGHT_TARGET).normalize();

	return (
		<>
			<color attach="background" args={[P.fog]} />
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
			<Room />
			<Stickman variant="officer" pose={officerPose(frame)} trail={[officerPose(frame - 1), officerPose(frame - 2)]} />
			<Stickman variant="civilian" pose={civilianPose(frame)} trail={[civilianPose(frame - 1), civilianPose(frame - 2)]} />
		</>
	);
};
