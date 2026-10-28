import { BufferGeometry, Box3, Vector3 } from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ModelInfo } from './types';

const loader = new STLLoader();

/** STL 바이너리/ASCII를 파싱해 원점 중심·Y-up으로 정리한 지오메트리와 정보를 돌려준다 */
export function parseStl(data: ArrayBuffer, name: string): { geometry: BufferGeometry; info: ModelInfo } {
  let geometry = loader.parse(data);
  const triangles = geometry.attributes.position.count / 3;

  // 치과 스캔/CAD 파일은 Z-up인 경우가 많아 Y-up으로 회전
  geometry.rotateX(-Math.PI / 2);

  // 정점 병합 후 법선 재계산 → 부드러운 셰이딩 (대용량은 생략)
  if (triangles < 400_000) {
    geometry.deleteAttribute('normal');
    geometry = mergeVertices(geometry, 1e-4);
    geometry.computeVertexNormals();
  }

  geometry.computeBoundingBox();
  const box = geometry.boundingBox as Box3;
  const center = box.getCenter(new Vector3());
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const size = geometry.boundingBox!.getSize(new Vector3());
  return { geometry, info: { name, triangles, size: { x: size.x, y: size.y, z: size.z } } };
}
