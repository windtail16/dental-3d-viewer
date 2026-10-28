// 샘플 모델 생성: 치과 임플란트 픽스처(나사산) + 육각 어버트먼트 (단위 mm, Binary STL)
import { writeFileSync } from 'node:fs';

const tris = [];
const push = (a, b, c) => tris.push([a, b, c]);

// 회전체 메시 생성: radius(theta, z) 함수를 받아 측면을 만든다
function lathe({ z0, z1, segZ, segT, radius, capBottom = true, capTop = true }) {
  const grid = [];
  for (let i = 0; i <= segZ; i++) {
    const z = z0 + ((z1 - z0) * i) / segZ;
    const row = [];
    for (let j = 0; j < segT; j++) {
      const t = (j / segT) * Math.PI * 2;
      const r = radius(t, z);
      row.push([r * Math.cos(t), r * Math.sin(t), z]);
    }
    grid.push(row);
  }
  for (let i = 0; i < segZ; i++) {
    for (let j = 0; j < segT; j++) {
      const a = grid[i][j], b = grid[i][(j + 1) % segT], c = grid[i + 1][(j + 1) % segT], d = grid[i + 1][j];
      push(a, b, c); push(a, c, d);
    }
  }
  if (capBottom) {
    const cz = [0, 0, z0];
    for (let j = 0; j < segT; j++) push(cz, grid[0][(j + 1) % segT], grid[0][j]);
  }
  if (capTop) {
    const cz = [0, 0, z1];
    for (let j = 0; j < segT; j++) push(cz, grid[segZ][j], grid[segZ][(j + 1) % segT]);
  }
}

// 1) 픽스처: 길이 10mm, 직경 4.0mm, 끝으로 갈수록 테이퍼, 피치 0.8mm 나사산
const L = 10, R = 2.0, pitch = 0.8, depth = 0.35;
lathe({
  z0: 0, z1: L, segZ: 320, segT: 120,
  radius: (t, z) => {
    const taper = z < 3 ? 0.65 + 0.35 * (z / 3) : 1;               // 하단 테이퍼
    const apex = z < 0.6 ? Math.sqrt(Math.max(z / 0.6, 0.05)) : 1;   // 끝단 라운드
    const collar = z > L - 1.2;                                      // 상단 칼라(나사산 없음)
    const phase = ((z / pitch - t / (Math.PI * 2)) % 1 + 1) % 1;
    const thread = collar ? 0 : depth * (phase < 0.5 ? phase * 2 : (1 - phase) * 2); // 삼각 나사산
    return (R - depth + thread) * taper * apex + (collar ? depth * 0.6 : 0);
  },
});

// 2) 어버트먼트: 육각 연결부 + 테이퍼 기둥, 높이 5mm
const hexR = 1.35;
lathe({
  z0: L, z1: L + 1.0, segZ: 4, segT: 120, capBottom: false, capTop: false,
  radius: (t) => { const s = Math.PI / 3; const a = ((t % s) + s) % s - s / 2; return (hexR * Math.cos(Math.PI / 6)) / Math.cos(a); },
});
lathe({
  z0: L + 1.0, z1: L + 6.0, segZ: 40, segT: 120,
  radius: (t, z) => { const k = (z - (L + 1.0)) / 5; return 1.9 - 0.6 * k - (k > 0.92 ? (k - 0.92) * 4 : 0); },
});

// Binary STL 기록
const buf = Buffer.alloc(84 + tris.length * 50);
buf.write('DIO-style implant sample (generated)', 0, 'ascii');
buf.writeUInt32LE(tris.length, 80);
let o = 84;
for (const [a, b, c] of tris) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const l = Math.hypot(...n) || 1; n = n.map((x) => x / l);
  for (const p of [n, a, b, c]) for (const x of p) { buf.writeFloatLE(x, o); o += 4; }
  buf.writeUInt16LE(0, o); o += 2;
}
writeFileSync(new URL('../public/sample-implant.stl', import.meta.url), buf);
console.log(`triangles: ${tris.length}, bytes: ${buf.length}`);
