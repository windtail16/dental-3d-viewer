import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import type { BufferGeometry, Vector3 } from 'three';
import Viewer from './components/Viewer';
import { parseStl } from './lib/loadStl';
import type { Axis, Measurement, ModelInfo, SectionState, ViewPreset } from './lib/types';

const MATERIALS = [
  { label: '티타늄', color: '#b9bec7' },
  { label: '지르코니아', color: '#f1ede4' },
  { label: '레진', color: '#e6c3a0' },
  { label: '스캔 블루', color: '#7fa6d9' },
];

const VIEWS: { key: ViewPreset; label: string }[] = [
  { key: 'iso', label: '기본' },
  { key: 'front', label: '정면' },
  { key: 'top', label: '상면' },
  { key: 'side', label: '측면' },
];

const SAMPLE_URL = `${import.meta.env.BASE_URL}sample-implant.stl`;

export default function App() {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [color, setColor] = useState(MATERIALS[0].color);
  const [wireframe, setWireframe] = useState(false);
  const [section, setSection] = useState<SectionState>({ enabled: false, axis: 'x', offset: 0, flip: false });
  const [view, setView] = useState<{ preset: ViewPreset; nonce: number }>({ preset: 'iso', nonce: 0 });

  const [measureMode, setMeasureMode] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [pendingPoint, setPendingPoint] = useState<Vector3 | null>(null);
  const nextId = useRef(1);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async (getData: () => Promise<ArrayBuffer>, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getData();
      const { geometry: g, info: i } = parseStl(data, name);
      setGeometry((prev) => {
        prev?.dispose();
        return g;
      });
      setInfo(i);
      setMeasurements([]);
      setPendingPoint(null);
      nextId.current = 1;
      setView((v) => ({ preset: 'iso', nonce: v.nonce + 1 }));
    } catch (e) {
      console.error(e);
      setError('STL 파일을 읽지 못했습니다. 바이너리 또는 ASCII STL 파일인지 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSample = useCallback(
    () => load(() => fetch(SAMPLE_URL).then((r) => r.arrayBuffer()), '샘플 · 임플란트 픽스처 + 어버트먼트'),
    [load],
  );

  useEffect(() => {
    loadSample();
  }, [loadSample]);

  const openFile = (file: File | undefined) => {
    if (!file) return;
    if (!/\.stl$/i.test(file.name)) {
      setError('STL 파일(.stl)만 열 수 있습니다.');
      return;
    }
    load(() => file.arrayBuffer(), file.name);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    openFile(e.dataTransfer.files[0]);
  };

  const onPick = useCallback(
    (p: Vector3) => {
      if (!pendingPoint) {
        setPendingPoint(p);
        return;
      }
      setMeasurements((list) => [...list, { id: nextId.current++, a: pendingPoint, b: p }]);
      setPendingPoint(null);
    },
    [pendingPoint],
  );

  // Esc: 측정 중인 점 취소
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingPoint(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const setAxis = (axis: Axis) => setSection((s) => ({ ...s, axis, offset: 0 }));

  return (
    <div className="app" onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
      <aside className="panel">
        <header className="brand">
          <h1>Dental 3D Viewer</h1>
          <p>치과 STL 모델 확인·단면·측정 도구</p>
        </header>

        <section className="card">
          <h2>모델</h2>
          <div className="row">
            <button className="btn primary" onClick={() => fileInput.current?.click()}>STL 열기</button>
            <button className="btn" onClick={loadSample}>샘플 모델</button>
          </div>
          <input ref={fileInput} type="file" accept=".stl" hidden onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ''; }} />
          <p className="hint">파일을 화면에 끌어다 놓아도 됩니다. 파일은 브라우저 안에서만 처리되고 서버로 전송되지 않습니다.</p>
          {info && (
            <dl className="info">
              <dt>파일</dt><dd title={info.name}>{info.name}</dd>
              <dt>삼각형</dt><dd>{info.triangles.toLocaleString()}개</dd>
              <dt>크기</dt>
              <dd>{info.size.x.toFixed(2)} × {info.size.y.toFixed(2)} × {info.size.z.toFixed(2)} mm</dd>
            </dl>
          )}
          {error && <p className="error">{error}</p>}
        </section>

        <section className="card">
          <h2>보기</h2>
          <div className="seg">
            {VIEWS.map((v) => (
              <button key={v.key} className={view.preset === v.key ? 'on' : ''} onClick={() => setView((s) => ({ preset: v.key, nonce: s.nonce + 1 }))}>
                {v.label}
              </button>
            ))}
          </div>
          <div className="swatches">
            {MATERIALS.map((m) => (
              <button key={m.color} className={color === m.color ? 'swatch on' : 'swatch'} onClick={() => setColor(m.color)} title={m.label}>
                <span style={{ background: m.color }} />
                {m.label}
              </button>
            ))}
          </div>
          <label className="toggle">
            <input type="checkbox" checked={wireframe} onChange={(e) => setWireframe(e.target.checked)} />
            와이어프레임
          </label>
        </section>

        <section className="card">
          <h2>단면 보기</h2>
          <label className="toggle">
            <input type="checkbox" checked={section.enabled} onChange={(e) => setSection((s) => ({ ...s, enabled: e.target.checked }))} />
            단면 켜기
          </label>
          <div className={section.enabled ? '' : 'disabled'}>
            <div className="seg">
              {(['x', 'y', 'z'] as Axis[]).map((a) => (
                <button key={a} className={section.axis === a ? 'on' : ''} onClick={() => setAxis(a)} disabled={!section.enabled}>
                  {a.toUpperCase()}축
                </button>
              ))}
            </div>
            <input
              className="range"
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={section.offset}
              disabled={!section.enabled}
              onChange={(e) => setSection((s) => ({ ...s, offset: Number(e.target.value) }))}
              aria-label="단면 위치"
            />
            <label className="toggle">
              <input type="checkbox" checked={section.flip} disabled={!section.enabled} onChange={(e) => setSection((s) => ({ ...s, flip: e.target.checked }))} />
              반대쪽 보기
            </label>
          </div>
        </section>

        <section className="card">
          <h2>거리 측정</h2>
          <button className={measureMode ? 'btn primary' : 'btn'} onClick={() => { setMeasureMode((m) => !m); setPendingPoint(null); }}>
            {measureMode ? '측정 중 · 끄기' : '측정 시작'}
          </button>
          <p className="hint">
            {measureMode ? (pendingPoint ? '두 번째 점을 클릭하세요. (Esc 취소)' : '모델 위의 첫 번째 점을 클릭하세요.') : '모델 표면의 두 점 사이 거리를 mm로 잽니다.'}
          </p>
          {measurements.length > 0 && (
            <>
              <ol className="measures">
                {measurements.map((m) => (
                  <li key={m.id}>
                    <span>#{m.id}</span>
                    <strong>{m.a.distanceTo(m.b).toFixed(2)} mm</strong>
                    <button aria-label={`측정 ${m.id} 삭제`} onClick={() => setMeasurements((l) => l.filter((x) => x.id !== m.id))}>×</button>
                  </li>
                ))}
              </ol>
              <button className="btn ghost" onClick={() => { setMeasurements([]); setPendingPoint(null); }}>측정 모두 지우기</button>
            </>
          )}
        </section>

        <footer className="foot">
          React · TypeScript · Three.js (React Three Fiber)
          <br />
          <a href="https://github.com/windtail16/dental-3d-viewer" target="_blank" rel="noreferrer">GitHub</a>
        </footer>
      </aside>

      <main className="stage">
        <Viewer
          geometry={geometry}
          color={color}
          wireframe={wireframe}
          section={section}
          measureMode={measureMode}
          measurements={measurements}
          pendingPoint={pendingPoint}
          onPick={onPick}
          view={view}
        />
        <div className="help">드래그: 회전 · 휠: 확대 · 우클릭 드래그: 이동</div>
        {loading && <div className="overlay">모델을 불러오는 중…</div>}
        {dragOver && <div className="overlay drop">STL 파일을 놓으세요</div>}
      </main>
    </div>
  );
}
