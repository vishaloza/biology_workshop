import React from 'react';

const PALETTE = ['#1f77b4', '#d97706', '#16864a', '#6f42c1', '#d6336c', '#20c997', '#ffc107', '#3f88c5'];
const INK = '#14213d';
const MUTED = '#5d687b';
const LINE = '#c8d0dc';

const W = 520;
const H = 320;

function Frame({ title, children, padTop = 30 }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="visual-svg" preserveAspectRatio="xMidYMid meet">
      {title && (
        <text x={W / 2} y={20} textAnchor="middle" fontSize={14} fontWeight={800} fill={INK}>
          {title}
        </text>
      )}
      <g transform={`translate(0,${padTop})`}>{children}</g>
    </svg>
  );
}

function Axes({ x0 = 50, y0 = H - 70, xLen = 430, yLen = 220, xLabel, yLabel, xTicks = [], yTicks = [] }) {
  return (
    <g>
      <line x1={x0} y1={y0} x2={x0 + xLen} y2={y0} stroke={INK} strokeWidth={1.5} />
      <line x1={x0} y1={y0} x2={x0} y2={y0 - yLen} stroke={INK} strokeWidth={1.5} />
      {xLabel && (
        <text x={x0 + xLen / 2} y={y0 + 32} textAnchor="middle" fontSize={12} fontWeight={700} fill={INK}>
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text x={x0 - 30} y={y0 - yLen / 2} textAnchor="middle" fontSize={12} fontWeight={700} fill={INK}
          transform={`rotate(-90 ${x0 - 30} ${y0 - yLen / 2})`}>
          {yLabel}
        </text>
      )}
      {xTicks.map((t, i) => (
        <g key={i}>
          <line x1={x0 + t.at * xLen} y1={y0} x2={x0 + t.at * xLen} y2={y0 + 5} stroke={INK} />
          <text x={x0 + t.at * xLen} y={y0 + 18} textAnchor="middle" fontSize={10} fill={MUTED}>{t.label}</text>
        </g>
      ))}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={x0} y1={y0 - t.at * yLen} x2={x0 - 5} y2={y0 - t.at * yLen} stroke={INK} />
          <text x={x0 - 8} y={y0 - t.at * yLen + 4} textAnchor="end" fontSize={10} fill={MUTED}>{t.label}</text>
        </g>
      ))}
    </g>
  );
}

function Matrix({ data = {} }) {
  const rows = data.rows ?? 8;
  const cols = data.cols ?? 12;
  const rowLabels = data.rowLabels;
  const colLabels = data.colLabels;
  const highlight = data.highlight; // {row?, col?}
  const cells = data.cells; // optional [[value]]
  const title = data.title ?? 'Rows = observations · Columns = variables';

  const cell = 22;
  const labelW = rowLabels ? 70 : 12;
  const labelH = colLabels ? 36 : 12;
  const gx = (W - (cols * cell + labelW + 20)) / 2;
  const gy = labelH + 10;

  return (
    <Frame title={title}>
      <g transform={`translate(${gx},${gy})`}>
        {colLabels && colLabels.map((l, c) => (
          <text key={c} x={labelW + c * cell + cell / 2} y={-8} textAnchor="middle" fontSize={9} fill={MUTED}
            transform={`rotate(-35 ${labelW + c * cell + cell / 2} -8)`}>
            {l}
          </text>
        ))}
        {Array.from({ length: rows }).map((_, r) => (
          <g key={r}>
            {rowLabels && (
              <text x={labelW - 6} y={r * cell + cell / 2 + 3} textAnchor="end" fontSize={10} fill={INK} fontWeight={600}>
                {rowLabels[r]}
              </text>
            )}
            {Array.from({ length: cols }).map((_, c) => {
              const v = cells ? cells[r]?.[c] ?? 0 : ((r * 13 + c * 7) % 11) / 11;
              const isHi = highlight && (highlight.row === r || highlight.col === c);
              return (
                <rect
                  key={c}
                  x={labelW + c * cell}
                  y={r * cell}
                  width={cell - 2}
                  height={cell - 2}
                  rx={3}
                  fill={isHi ? PALETTE[1] : PALETTE[0]}
                  opacity={0.25 + 0.65 * v}
                />
              );
            })}
          </g>
        ))}
      </g>
    </Frame>
  );
}

function Vectors2D({ data = {} }) {
  const points = data.points ?? [
    { x: 0.2, y: 0.3, label: 'cell A', color: PALETTE[0] },
    { x: 0.5, y: 0.7, label: 'cell B', color: PALETTE[1] },
    { x: 0.7, y: 0.4, label: 'cell C', color: PALETTE[2] },
  ];
  const xLabel = data.xLabel ?? 'Gene 1';
  const yLabel = data.yLabel ?? 'Gene 2';
  const showArrows = data.showArrows ?? true;
  const title = data.title ?? 'Each cell is a point in gene space';
  const x0 = 60, y0 = H - 70, xLen = 410, yLen = 210;
  return (
    <Frame title={title}>
      <Axes x0={x0} y0={y0} xLen={xLen} yLen={yLen} xLabel={xLabel} yLabel={yLabel} />
      {points.map((p, i) => {
        const px = x0 + p.x * xLen;
        const py = y0 - p.y * yLen;
        return (
          <g key={i}>
            {showArrows && (
              <line x1={x0} y1={y0} x2={px} y2={py} stroke={p.color || PALETTE[i]} strokeWidth={1.3} opacity={0.55} markerEnd="url(#arrow)" />
            )}
            <circle cx={px} cy={py} r={7} fill={p.color || PALETTE[i]} />
            {p.label && (
              <text x={px + 10} y={py - 6} fontSize={11} fontWeight={700} fill={INK}>{p.label}</text>
            )}
          </g>
        );
      })}
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={MUTED} />
        </marker>
      </defs>
    </Frame>
  );
}

function Vectors3D({ data = {} }) {
  const points = data.points ?? [
    { x: 0.2, y: 0.3, z: 0.1, label: 'A', color: PALETTE[0] },
    { x: 0.6, y: 0.5, z: 0.4, label: 'B', color: PALETTE[1] },
    { x: 0.4, y: 0.7, z: 0.6, label: 'C', color: PALETTE[2] },
  ];
  const title = data.title ?? 'Three genes, three axes';
  const labels = data.axisLabels ?? ['Gene 1', 'Gene 2', 'Gene 3'];
  const ox = 130, oy = H - 90, scale = 200;
  const project = (x, y, z) => ({
    px: ox + x * scale + 0.5 * z * scale * 0.8,
    py: oy - y * scale - 0.4 * z * scale * 0.8,
  });
  const o = project(0, 0, 0);
  const ax = project(1, 0, 0);
  const ay = project(0, 1, 0);
  const az = project(0, 0, 1);
  return (
    <Frame title={title}>
      <line x1={o.px} y1={o.py} x2={ax.px} y2={ax.py} stroke={INK} strokeWidth={1.4} />
      <line x1={o.px} y1={o.py} x2={ay.px} y2={ay.py} stroke={INK} strokeWidth={1.4} />
      <line x1={o.px} y1={o.py} x2={az.px} y2={az.py} stroke={INK} strokeWidth={1.4} strokeDasharray="3 3" />
      <text x={ax.px + 6} y={ax.py + 4} fontSize={11} fontWeight={700} fill={INK}>{labels[0]}</text>
      <text x={ay.px - 6} y={ay.py - 4} fontSize={11} fontWeight={700} fill={INK} textAnchor="end">{labels[1]}</text>
      <text x={az.px + 6} y={az.py - 2} fontSize={11} fontWeight={700} fill={INK}>{labels[2]}</text>
      {points.map((p, i) => {
        const { px, py } = project(p.x, p.y, p.z);
        return (
          <g key={i}>
            <circle cx={px} cy={py} r={7} fill={p.color || PALETTE[i]} />
            {p.label && <text x={px + 10} y={py + 4} fontSize={11} fontWeight={700} fill={INK}>{p.label}</text>}
          </g>
        );
      })}
    </Frame>
  );
}

function normalPdf(x, mu, sigma) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}
function lognormalPdf(x, mu, sigma) {
  if (x <= 0) return 0;
  const z = (Math.log(x) - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (x * sigma * Math.sqrt(2 * Math.PI));
}
function poissonPmf(k, lambda) {
  let logp = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logp -= Math.log(i);
  return Math.exp(logp);
}
function binomialPmf(k, n, p) {
  let logc = 0;
  for (let i = 1; i <= k; i++) logc += Math.log((n - i + 1) / i);
  return Math.exp(logc + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

function Distribution({ data = {} }) {
  const kind = data.kind ?? 'normal';
  const params = data.params ?? {};
  const xLabel = data.xLabel ?? 'value';
  const yLabel = data.yLabel ?? 'density';
  const title = data.title ?? defaultDistTitle(kind, params);
  const shaded = data.shaded; // {from, to, label}
  const annotations = data.annotations ?? [];
  const x0 = 60, y0 = H - 70, xLen = 410, yLen = 210;

  let xs = [], ys = [], discrete = false;
  if (kind === 'normal') {
    const mu = params.mu ?? 0, sigma = params.sigma ?? 1;
    const lo = mu - 4 * sigma, hi = mu + 4 * sigma;
    for (let i = 0; i <= 80; i++) {
      const x = lo + (i / 80) * (hi - lo);
      xs.push(x); ys.push(normalPdf(x, mu, sigma));
    }
  } else if (kind === 'lognormal') {
    const mu = params.mu ?? 0, sigma = params.sigma ?? 0.7;
    const hi = Math.exp(mu + 4 * sigma);
    for (let i = 1; i <= 80; i++) {
      const x = (i / 80) * hi;
      xs.push(x); ys.push(lognormalPdf(x, mu, sigma));
    }
  } else if (kind === 'poisson') {
    discrete = true;
    const lambda = params.lambda ?? 4;
    const kmax = Math.max(15, Math.ceil(lambda * 3));
    for (let k = 0; k <= kmax; k++) { xs.push(k); ys.push(poissonPmf(k, lambda)); }
  } else if (kind === 'binomial') {
    discrete = true;
    const n = params.n ?? 20, p = params.p ?? 0.3;
    for (let k = 0; k <= n; k++) { xs.push(k); ys.push(binomialPmf(k, n, p)); }
  }

  const xMin = xs[0], xMax = xs[xs.length - 1];
  const yMax = Math.max(...ys);
  const sx = x => x0 + ((x - xMin) / (xMax - xMin)) * xLen;
  const sy = y => y0 - (y / yMax) * yLen;

  return (
    <Frame title={title}>
      <Axes
        x0={x0} y0={y0} xLen={xLen} yLen={yLen}
        xLabel={xLabel} yLabel={yLabel}
        xTicks={[0, 0.5, 1].map(at => ({ at, label: (xMin + at * (xMax - xMin)).toFixed(discrete ? 0 : 1) }))}
      />
      {!discrete && shaded && (() => {
        const from = Math.max(xMin, shaded.from), to = Math.min(xMax, shaded.to);
        const pts = xs.filter(x => x >= from && x <= to);
        if (pts.length === 0) return null;
        const path = [`M ${sx(pts[0])} ${y0}`,
          ...pts.map((x, i) => `L ${sx(x)} ${sy(ys[xs.indexOf(x)])}`),
          `L ${sx(pts[pts.length - 1])} ${y0} Z`].join(' ');
        return <path d={path} fill={PALETTE[1]} opacity={0.35} />;
      })()}
      {!discrete && (
        <path d={xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${sx(x)} ${sy(ys[i])}`).join(' ')}
          fill="none" stroke={PALETTE[0]} strokeWidth={2.2} />
      )}
      {discrete && xs.map((k, i) => (
        <rect key={i} x={sx(k) - 6} y={sy(ys[i])} width={12} height={y0 - sy(ys[i])}
          fill={shaded && k >= shaded.from && k <= shaded.to ? PALETTE[1] : PALETTE[0]} opacity={0.85} />
      ))}
      {annotations.map((a, i) => (
        <g key={i}>
          <line x1={sx(a.x)} y1={sy(0)} x2={sx(a.x)} y2={sy(yMax * 0.95)} stroke={MUTED} strokeDasharray="4 3" />
          <text x={sx(a.x)} y={sy(yMax * 0.95) - 4} fontSize={10} fontWeight={700} fill={INK} textAnchor="middle">{a.label}</text>
        </g>
      ))}
    </Frame>
  );
}

function defaultDistTitle(kind, p) {
  if (kind === 'normal') return `Normal (μ = ${p.mu ?? 0}, σ = ${p.sigma ?? 1})`;
  if (kind === 'lognormal') return `Log-normal (μ = ${p.mu ?? 0}, σ = ${p.sigma ?? 0.7})`;
  if (kind === 'poisson') return `Poisson (λ = ${p.lambda ?? 4})`;
  if (kind === 'binomial') return `Binomial (n = ${p.n ?? 20}, p = ${p.p ?? 0.3})`;
  return 'Distribution';
}

function ScatterPCA({ data = {} }) {
  const groups = data.groups ?? [
    { name: 'untreated', color: PALETTE[0] },
    { name: 'anti-PD-1', color: PALETTE[1] },
  ];
  const points = data.points ?? generateDefaultClusters(groups.length);
  const pc1Var = data.pc1Var ?? 0.34;
  const pc2Var = data.pc2Var ?? 0.12;
  const title = data.title ?? 'PCA: PC1 vs PC2';
  const x0 = 60, y0 = H - 70, xLen = 410, yLen = 210;
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const sx = x => x0 + ((x - xMin) / (xMax - xMin || 1)) * xLen;
  const sy = y => y0 - ((y - yMin) / (yMax - yMin || 1)) * yLen;

  return (
    <Frame title={title}>
      <Axes
        x0={x0} y0={y0} xLen={xLen} yLen={yLen}
        xLabel={`PC1 (${Math.round(pc1Var * 100)}% var)`}
        yLabel={`PC2 (${Math.round(pc2Var * 100)}% var)`}
      />
      {points.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4.5} fill={groups[p.group]?.color || PALETTE[p.group]} opacity={0.78} />
      ))}
      <g transform={`translate(${x0 + xLen - 130},${y0 - yLen + 10})`}>
        {groups.map((g, i) => (
          <g key={i} transform={`translate(0,${i * 16})`}>
            <circle cx={6} cy={6} r={5} fill={g.color} />
            <text x={16} y={10} fontSize={11} fontWeight={700} fill={INK}>{g.name}</text>
          </g>
        ))}
      </g>
    </Frame>
  );
}

function generateDefaultClusters(nGroups, perGroup = 18) {
  const out = [];
  for (let g = 0; g < nGroups; g++) {
    const cx = -1 + 2 * (g + 0.5) / nGroups;
    const cy = (g % 2 === 0 ? 0.3 : -0.3);
    for (let i = 0; i < perGroup; i++) {
      out.push({
        x: cx + (Math.sin(i * 17 + g * 5) * 0.4),
        y: cy + (Math.cos(i * 13 + g * 7) * 0.4),
        group: g,
      });
    }
  }
  return out;
}

function UmapClusters({ data = {} }) {
  const clusters = data.clusters ?? [
    { cx: 0.25, cy: 0.65, r: 0.13, label: 'CD8 T', color: PALETTE[0] },
    { cx: 0.6, cy: 0.7, r: 0.10, label: 'CD4 T', color: PALETTE[3] },
    { cx: 0.55, cy: 0.3, r: 0.15, label: 'macrophage', color: PALETTE[1] },
    { cx: 0.8, cy: 0.4, r: 0.09, label: 'tumour', color: PALETTE[4] },
    { cx: 0.2, cy: 0.25, r: 0.10, label: 'B cell', color: PALETTE[2] },
  ];
  const title = data.title ?? 'UMAP of tumour-infiltrating cells';
  const x0 = 50, y0 = H - 40, xLen = 430, yLen = 240;
  return (
    <Frame title={title}>
      <line x1={x0} y1={y0} x2={x0 + 70} y2={y0} stroke={INK} strokeWidth={1.5} />
      <line x1={x0} y1={y0} x2={x0} y2={y0 - 70} stroke={INK} strokeWidth={1.5} />
      <text x={x0 + 78} y={y0 + 4} fontSize={10} fill={MUTED}>UMAP1</text>
      <text x={x0 - 6} y={y0 - 78} fontSize={10} fill={MUTED} textAnchor="end">UMAP2</text>
      {clusters.map((c, i) => {
        const cx = x0 + c.cx * xLen;
        const cy = y0 - c.cy * yLen;
        const r = (c.r ?? 0.1) * Math.min(xLen, yLen);
        const dots = Array.from({ length: 25 }).map((_, j) => {
          const angle = j * 0.42;
          const dist = (Math.sin(j * 17 + i * 5) + 1) / 2 * r;
          return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist };
        });
        return (
          <g key={i}>
            {dots.map((d, j) => (
              <circle key={j} cx={cx + d.dx} cy={cy + d.dy} r={2.4} fill={c.color} opacity={0.75} />
            ))}
            <text x={cx} y={cy - r - 6} textAnchor="middle" fontSize={11} fontWeight={800} fill={INK}>{c.label}</text>
          </g>
        );
      })}
    </Frame>
  );
}

function RegressionLine({ data = {} }) {
  const slope = data.slope ?? -0.6;
  const intercept = data.intercept ?? 1.2;
  const noise = data.noise ?? 0.15;
  const n = data.n ?? 20;
  const points = data.points ?? Array.from({ length: n }).map((_, i) => {
    const x = i / (n - 1);
    const y = intercept + slope * x + (Math.sin(i * 19) * noise);
    return { x, y };
  });
  const rSquared = data.rSquared ?? 0.71;
  const xLabel = data.xLabel ?? 'dose (mg/kg)';
  const yLabel = data.yLabel ?? 'tumour volume (rel)';
  const title = data.title ?? 'Linear fit: tumour ~ dose';
  const x0 = 60, y0 = H - 70, xLen = 410, yLen = 210;
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys, intercept + slope * xMin, intercept + slope * xMax);
  const yMax = Math.max(...ys, intercept + slope * xMin, intercept + slope * xMax);
  const sx = x => x0 + ((x - xMin) / (xMax - xMin)) * xLen;
  const sy = y => y0 - ((y - yMin) / (yMax - yMin)) * yLen;
  return (
    <Frame title={title}>
      <Axes x0={x0} y0={y0} xLen={xLen} yLen={yLen} xLabel={xLabel} yLabel={yLabel} />
      <line
        x1={sx(xMin)} y1={sy(intercept + slope * xMin)}
        x2={sx(xMax)} y2={sy(intercept + slope * xMax)}
        stroke={PALETTE[1]} strokeWidth={2.2}
      />
      {points.map((p, i) => {
        const fy = intercept + slope * p.x;
        return (
          <g key={i}>
            <line x1={sx(p.x)} y1={sy(p.y)} x2={sx(p.x)} y2={sy(fy)} stroke={MUTED} strokeWidth={1} strokeDasharray="2 2" opacity={0.7} />
            <circle cx={sx(p.x)} cy={sy(p.y)} r={4} fill={PALETTE[0]} opacity={0.85} />
          </g>
        );
      })}
      <text x={x0 + xLen - 8} y={y0 - yLen + 14} textAnchor="end" fontSize={12} fontWeight={800} fill={INK}>
        R² = {rSquared.toFixed(2)}
      </text>
    </Frame>
  );
}

function NeuralNet({ data = {} }) {
  const layers = data.layers ?? [4, 5, 5, 3];
  const labels = data.labels ?? ['inputs', 'hidden', 'hidden', 'outputs'];
  const title = data.title ?? 'A neural network is stacked regressions';
  const padX = 60, padY = 50;
  const colW = (W - 2 * padX) / (layers.length - 1);
  const rH = H - 2 * padY - 30;
  const positions = layers.map((n, li) => {
    const x = padX + li * colW;
    return Array.from({ length: n }).map((_, i) => ({
      x, y: padY + (n === 1 ? rH / 2 : (i * rH) / (n - 1)),
    }));
  });
  return (
    <Frame title={title}>
      {positions.slice(0, -1).flatMap((layer, li) =>
        layer.flatMap((from, i) =>
          positions[li + 1].map((to, j) => (
            <line key={`${li}-${i}-${j}`}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={INK} strokeWidth={0.45} opacity={0.35} />
          ))
        )
      )}
      {positions.map((layer, li) => (
        <g key={li}>
          {layer.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={9} fill={PALETTE[li % PALETTE.length]} opacity={0.9} stroke="#fff" strokeWidth={1.5} />
          ))}
          {labels[li] && (
            <text x={layer[0].x} y={padY + rH + 22} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK}>
              {labels[li]}
            </text>
          )}
        </g>
      ))}
    </Frame>
  );
}

// HTML versions of Table and Flow — text wraps naturally instead of overflowing
// the way SVG <text> does. Used for any kind where labels are prose-length.

function HtmlTable({ data = {} }) {
  const headers = data.headers ?? ['mouse', 'treatment', 'tumour (mm³)'];
  const rows = data.rows ?? [
    ['M01', 'control', 412],
    ['M02', 'control', 388],
    ['M03', 'anti-PD-1', 201],
    ['M04', 'anti-PD-1', 174],
  ];
  const highlight = data.highlight; // {row?, col?}
  const title = data.title;
  return (
    <div className="visual-wrap visual-html visual-table">
      {title && <div className="visual-html-title">{title}</div>}
      <div className="visual-html-scroll">
        <table>
          <thead>
            <tr>{headers.map((h, c) => <th key={c}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className={highlight?.row === r ? 'hi' : ''}>
                {row.map((v, c) => (
                  <td key={c} className={highlight?.col === c ? 'hi' : ''}>{String(v)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HtmlFlow({ data = {} }) {
  const stages = data.stages ?? ['Biology', 'Measure', 'Compare', 'Model', 'Test'];
  const title = data.title;
  return (
    <div className="visual-wrap visual-html visual-flow">
      {title && <div className="visual-html-title">{title}</div>}
      <div className="visual-flow-row">
        {stages.map((s, i) => (
          <React.Fragment key={i}>
            <div className="visual-flow-stage" style={{ borderColor: PALETTE[i % PALETTE.length], background: PALETTE[i % PALETTE.length] + '22' }}>
              <span>{s}</span>
            </div>
            {i < stages.length - 1 && <div className="visual-flow-arrow">→</div>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

const REGISTRY = {
  matrix: Matrix,
  vectors2d: Vectors2D,
  vectors3d: Vectors3D,
  distribution: Distribution,
  scatter_pca: ScatterPCA,
  umap_clusters: UmapClusters,
  regression_line: RegressionLine,
  neural_net: NeuralNet,
};

// Visuals where labels are prose-length get HTML rendering (text wraps);
// data-heavy plots stay as SVG.
const HTML_REGISTRY = {
  table: HtmlTable,
  flow: HtmlFlow,
};

export function Visual({ kind, data, caption }) {
  if (HTML_REGISTRY[kind]) {
    const Html = HTML_REGISTRY[kind];
    return (
      <>
        <Html data={data} />
        {caption && <div className="visual-caption">{caption}</div>}
      </>
    );
  }
  const Component = REGISTRY[kind] || HtmlFlow;
  return (
    <div className="visual-wrap">
      <Component data={data} />
      {caption && <div className="visual-caption">{caption}</div>}
    </div>
  );
}
