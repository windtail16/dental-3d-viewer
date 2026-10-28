import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport, Html, Line, OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import { BackSide, DoubleSide, FrontSide, Plane, Vector3, type BufferGeometry } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Measurement, SectionState, ViewPreset } from '../lib/types';

interface ViewerProps {
  geometry: BufferGeometry | null;
  color: string;
  wireframe: boolean;
  section: SectionState;
  measureMode: boolean;
  measurements: Measurement[];
  pendingPoint: Vector3 | null;
  onPick: (point: Vector3) => void;
  view: { preset: ViewPreset; nonce: number };
}

const AXIS_NORMAL = { x: new Vector3(1, 0, 0), y: new Vector3(0, 1, 0), z: new Vector3(0, 0, 1) } as const;

/** 단면 평면: 축 방향 바운딩 박스 범위 안에서 offset(-1~1)에 따라 이동 */
function useSectionPlane(geometry: BufferGeometry | null, section: SectionState) {
  return useMemo(() => {
    if (!geometry?.boundingBox || !section.enabled) return null;
    const half = (geometry.boundingBox.max[section.axis] - geometry.boundingBox.min[section.axis]) / 2;
    const normal = AXIS_NORMAL[section.axis].clone().multiplyScalar(section.flip ? 1 : -1);
    // plane: normal·p + constant = 0, normal 쪽(양수)만 남김
    const pos = section.offset * half;
    return new Plane(normal, section.flip ? -pos : pos);
  }, [geometry, section]);
}

function Model({ geometry, color, wireframe, plane, measureMode, onPick }: {
  geometry: BufferGeometry;
  color: string;
  wireframe: boolean;
  plane: Plane | null;
  measureMode: boolean;
  onPick: (p: Vector3) => void;
}) {
  const planes = plane ? [plane] : [];

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!measureMode) return;
    // 드래그(회전)와 클릭 구분
    if (e.delta > 4) return;
    e.stopPropagation();
    onPick(e.point.clone());
  };

  return (
    <group>
      <mesh geometry={geometry} onClick={handleClick}>
        <meshStandardMaterial
          color={color}
          metalness={0.35}
          roughness={0.38}
          wireframe={wireframe}
          clippingPlanes={planes}
          side={plane ? FrontSide : DoubleSide}
        />
      </mesh>
      {/* 단면 시 내부(뒷면)를 다른 색으로 칠해 잘린 면처럼 보이게 한다 */}
      {plane && !wireframe && (
        <mesh geometry={geometry}>
          <meshBasicMaterial color="#e2574c" side={BackSide} clippingPlanes={planes} />
        </mesh>
      )}
    </group>
  );
}

function MeasureOverlay({ measurements, pendingPoint, radius }: {
  measurements: Measurement[];
  pendingPoint: Vector3 | null;
  radius: number;
}) {
  const dot = radius * 0.012;
  return (
    <group>
      {measurements.map((m) => {
        const mid = m.a.clone().add(m.b).multiplyScalar(0.5);
        return (
          <group key={m.id}>
            <Line points={[m.a, m.b]} color="#2f6fed" lineWidth={2.5} depthTest={false} renderOrder={10} />
            {[m.a, m.b].map((p, i) => (
              <mesh key={i} position={p} renderOrder={11}>
                <sphereGeometry args={[dot, 16, 16]} />
                <meshBasicMaterial color="#2f6fed" depthTest={false} />
              </mesh>
            ))}
            <Html position={mid} center zIndexRange={[20, 0]}>
              <div className="measure-label">
                <span className="measure-index">#{m.id}</span> {m.a.distanceTo(m.b).toFixed(2)} mm
              </div>
            </Html>
          </group>
        );
      })}
      {pendingPoint && (
        <mesh position={pendingPoint} renderOrder={11}>
          <sphereGeometry args={[dot * 1.2, 16, 16]} />
          <meshBasicMaterial color="#f5a524" depthTest={false} />
        </mesh>
      )}
    </group>
  );
}

/** 모델 크기에 맞춰 카메라 위치·시점을 바꾼다 */
function CameraRig({ radius, view, controls }: {
  radius: number;
  view: { preset: ViewPreset; nonce: number };
  controls: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  useEffect(() => {
    const d = radius * 3.3;
    const pos = {
      iso: new Vector3(d * 0.75, d * 0.45, d * 0.75),
      front: new Vector3(0, 0, d),
      top: new Vector3(0, d, 0.0001),
      side: new Vector3(d, 0, 0),
    }[view.preset];
    camera.position.copy(pos);
    camera.near = radius / 100;
    camera.far = radius * 100;
    camera.updateProjectionMatrix();
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [radius, view, camera, controls]);
  return null;
}

export default function Viewer(props: ViewerProps) {
  const { geometry, section, view } = props;
  const plane = useSectionPlane(geometry, section);
  const controls = useRef<OrbitControlsImpl | null>(null);
  const radius = geometry?.boundingSphere?.radius ?? 10;

  return (
    <Canvas
      gl={{ localClippingEnabled: true, antialias: true, preserveDrawingBuffer: true }}
      camera={{ fov: 40, position: [20, 12, 20] }}
      className={props.measureMode ? 'canvas measuring' : 'canvas'}
    >
      <color attach="background" args={['#f4f6f9']} />
      <hemisphereLight args={['#ffffff', '#c9d1dc', 1.1]} />
      <directionalLight position={[radius * 2, radius * 3, radius * 2]} intensity={1.6} />
      <directionalLight position={[-radius * 2, radius, -radius * 1.5]} intensity={0.6} />

      {geometry && (
        <>
          <Model
            geometry={geometry}
            color={props.color}
            wireframe={props.wireframe}
            plane={plane}
            measureMode={props.measureMode}
            onPick={props.onPick}
          />
          <MeasureOverlay measurements={props.measurements} pendingPoint={props.pendingPoint} radius={radius} />
          <gridHelper
            args={[radius * 4, 20, '#c3cad5', '#dde2ea']}
            position={[0, -(geometry.boundingBox!.max.y - geometry.boundingBox!.min.y) / 2 - radius * 0.02, 0]}
          />
        </>
      )}

      <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.12} />
      <CameraRig radius={radius} view={view} controls={controls} />
      <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
        <GizmoViewport axisColors={['#e2574c', '#3fae6a', '#2f6fed']} labelColor="#fff" />
      </GizmoHelper>
    </Canvas>
  );
}
