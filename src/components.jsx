import React, { useEffect, useRef, forwardRef } from 'react';
import { Visual } from './visuals.jsx';

export const Toolbar = forwardRef(function Toolbar({
  decks, deckId, setDeckId,
  idx, total, next, prev,
  draw, toggleDraw, clear,
  notes, toggleNotes,
  color, setColor,
}, ref) {
  return (
    <div className="toolbar" ref={ref}>
      <select value={deckId} onChange={e => setDeckId(e.target.value)}>
        <option value="all">All decks</option>
        {decks.map(d => (
          <option key={d.id} value={d.id}>{d.title}</option>
        ))}
      </select>
      <button onClick={prev}>Previous</button>
      <button onClick={next}>Next</button>
      <button onClick={toggleDraw} className={draw ? 'on' : ''}>Draw (D)</button>
      <button onClick={clear}>Clear (C)</button>
      <button onClick={toggleNotes} className={notes ? 'on' : ''}>Notes (N)</button>
      <input type="color" value={color} onChange={e => setColor(e.target.value)} />
      <span>{idx + 1} / {total}</span>
    </div>
  );
});

function setupCanvas(canvas) {
  const box = canvas.parentElement.getBoundingClientRect();
  canvas.width = box.width * devicePixelRatio;
  canvas.height = box.height * devicePixelRatio;
  canvas.style.width = box.width + 'px';
  canvas.style.height = box.height + 'px';
  canvas.getContext('2d').setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

// DrawLayer — used by the presenter. Handles local drawing + emits sync events.
function DrawLayer({ on, color, clearTick, onNext, onPrev, onEvent }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);       // pixel coords for local drawing
  const swipeStart = useRef(null); // {x, y} for finger swipe

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => setupCanvas(canvas);
    resize();
    addEventListener('resize', resize);
    return () => removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    // Don't emit clear here — App.jsx sends the sync message when the button is pressed.
  }, [clearTick]);

  // Normalised coords (0–1) for sync, so the viewer can scale to its own canvas.
  const norm = e => {
    const b = canvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height };
  };
  const pt = e => {
    const b = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  };

  return (
    <canvas
      ref={canvasRef}
      className={'drawLayer ' + (on ? 'active' : '')}
      onPointerDown={e => {
        const isPen = e.pointerType === 'pen';
        if (isPen || on) {
          drawing.current = true;
          last.current = pt(e);
          e.currentTarget.setPointerCapture(e.pointerId);
          const lw = isPen ? Math.max(1.5, (e.pressure || 0.5) * 5) : 4;
          const n = norm(e);
          onEvent?.({ type: 'stroke-start', color, lineWidth: lw, x: n.x, y: n.y });
        } else if (e.pointerType === 'touch') {
          swipeStart.current = { x: e.clientX, y: e.clientY };
        }
      }}
      onPointerMove={e => {
        if (!drawing.current) return;
        const p = pt(e);
        const isPen = e.pointerType === 'pen';
        const lw = isPen ? Math.max(1.5, (e.pressure || 0.5) * 5) : 4;
        const ctx = canvasRef.current.getContext('2d');
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(last.current.x, last.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        last.current = p;
        const n = norm(e);
        onEvent?.({ type: 'stroke-point', x: n.x, y: n.y });
      }}
      onPointerUp={e => {
        if (drawing.current) {
          drawing.current = false;
          onEvent?.({ type: 'stroke-end' });
        } else if (swipeStart.current) {
          const dx = e.clientX - swipeStart.current.x;
          const dy = e.clientY - swipeStart.current.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) onNext?.();
            else onPrev?.();
          }
          swipeStart.current = null;
        }
      }}
      onPointerCancel={() => { drawing.current = false; swipeStart.current = null; }}
    />
  );
}

// SyncCanvas — used by the viewer to render strokes sent by the presenter.
export function SyncCanvas({ subscribe, clearTick }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const strokeStyle = useRef('#111827');
  const lineWidth = useRef(4);

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => setupCanvas(canvas);
    resize();
    addEventListener('resize', resize);
    return () => removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
  }, [clearTick]);

  useEffect(() => {
    if (!subscribe) return;
    return subscribe(msg => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      if (msg.type === 'stroke-start') {
        strokeStyle.current = msg.color;
        lineWidth.current = msg.lineWidth * (W / 1280);
        ctx.beginPath();
        ctx.strokeStyle = strokeStyle.current;
        ctx.lineWidth = lineWidth.current;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(msg.x * W, msg.y * H);
        drawing.current = true;
      } else if (msg.type === 'stroke-point' && drawing.current) {
        ctx.lineTo(msg.x * W, msg.y * H);
        ctx.stroke();
        // Keep path open so next point continues the stroke.
        ctx.beginPath();
        ctx.moveTo(msg.x * W, msg.y * H);
      } else if (msg.type === 'stroke-end') {
        drawing.current = false;
      } else if (msg.type === 'clear') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
  }, [subscribe]);

  return <canvas ref={canvasRef} className="drawLayer" style={{ pointerEvents: 'none' }} />;
}

function Box({ kind, label, children, className }) {
  return (
    <div className={`box box-${kind} ${className || ''}`}>
      {label && <h2>{label}</h2>}
      {children}
    </div>
  );
}

function Bullets({ items, ordered }) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className="bullets">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </Tag>
  );
}

function MathBox({ box }) {
  if (!box) return null;
  return (
    <Box kind="math" label="The math, plainly">
      {box.intuition && <p className="math-intuition">{box.intuition}</p>}
      {box.steps && box.steps.length > 0 && (
        <ol className="math-steps">
          {box.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
      {box.symbolic && (
        <pre className="math-symbolic">{box.symbolic}</pre>
      )}
    </Box>
  );
}

function MathNote({ note }) {
  if (!note) return null;
  return (
    <div className="math-note">
      <span className="math-note-label">Notation:</span> {note}
    </div>
  );
}

export function Slide({ slide: s, draw, color, clearTick, showNotes, onNext, onPrev, onEvent }) {
  if (!s) return null;
  const isTitle = s.num === 1 && (s.kind === 'title' || /^Day \d|^Course thesis/i.test(s.title));
  const isActivity = /Activity|Capstone|Exercise/i.test(s.title);

  // Backwards-compat shims for old slide schema.
  const concept = s.concept;
  const learningObjective = s.learning_objective;
  const hook = s.hook;
  const points = s.points;
  const workedSteps = s.worked_example || s.example || [];
  const intuition = s.intuition;
  const pitfall = s.pitfall;
  const exercise = s.exercise;
  const mathNote = s.math_note;
  const mathBox = s.math_box;
  const board = s.board;
  const refs = s.references;
  const takeaway = s.takeaway || (concept ? concept.split('.')[0] + '.' : '');
  const visual = s.visual || { kind: inferVisualKind(s.title) };

  return (
    <section
      className={
        'slide '
        + (isTitle ? 'title ' : '')
        + (isActivity ? 'activity ' : '')
      }
    >
      <div className="header">
        <div className="header-left">
          <div className="kicker">{s.deckShort} · Slide {s.num} of {s.total}</div>
          <h1>{s.title}</h1>
          {s.subtitle && <div className="subtitle">{s.subtitle}</div>}
          {learningObjective && (
            <div className="lo">
              <span className="lo-label">By the end:</span> {learningObjective}
            </div>
          )}
        </div>
        <div className="num">{s.num} / {s.total}</div>
      </div>

      {hook && (
        <div className="hook">
          <span className="hook-label">Why this matters.</span> {hook}
        </div>
      )}

      <div className="main">
        <div className="left">
          {concept && (
            <div className="concept">{concept}</div>
          )}
          {points && points.length > 0 && (
            <Bullets items={points} />
          )}
          <MathNote note={mathNote} />
          <MathBox box={mathBox} />
          {workedSteps.length > 0 && (
            <Box kind="example" label="Applied to our E. coli ± ampicillin experiment">
              <Bullets items={workedSteps} ordered />
            </Box>
          )}
        </div>

        <div className="right">
          <div className="visual">
            <Visual kind={visual.kind} data={visual.data} caption={visual.caption} />
          </div>
          {intuition && (
            <Box kind="intuition" label="Intuition">
              <p>{intuition}</p>
            </Box>
          )}
          {pitfall && (
            <Box kind="pitfall" label="Common pitfall">
              <p>{pitfall}</p>
            </Box>
          )}
        </div>
      </div>

      {exercise && (
        <div className="exercise">
          <span className="exercise-label">Try it now ·</span> {exercise}
        </div>
      )}

      {takeaway && (
        <div className="take">
          <b>Takeaway:</b><span>{takeaway}</span>
        </div>
      )}

      {showNotes && (board || refs) && (
        <div className="notes">
          {board && (
            <div className="notes-section">
              <b>Board / Apple Pencil cue:</b> {board}
            </div>
          )}
          {refs && refs.length > 0 && (
            <div className="notes-section">
              <b>Further reading:</b>
              <ul>{refs.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      <DrawLayer on={draw} color={color} clearTick={clearTick} onNext={onNext} onPrev={onPrev} onEvent={onEvent} />
    </section>
  );
}

export function StudentNotesSlide({ slide: s }) {
  if (!s) return null;

  const concept = s.concept;
  const points = s.points;
  const workedSteps = s.worked_example || s.example || [];
  const intuition = s.intuition;
  const pitfall = s.pitfall;
  const exercise = s.exercise;
  const mathNote = s.math_note;
  const mathBox = s.math_box;
  const refs = s.references;
  const takeaway = s.takeaway || (concept ? concept.split('.')[0] + '.' : '');
  const visual = s.visual || { kind: inferVisualKind(s.title) };

  return (
    <section className="student-slide">
      <div className="student-header">
        <div>
          <div className="student-kicker">{s.deckShort} · Slide {s.num} of {s.total}</div>
          <h1 className="student-title">{s.title}</h1>
          {s.learning_objective && (
            <div className="student-lo">
              <span className="student-lo-label">By the end:</span>{s.learning_objective}
            </div>
          )}
        </div>
        <div className="student-visual-thumb">
          <Visual kind={visual.kind} data={visual.data} caption={null} />
          {visual.caption && <div className="visual-caption">{visual.caption}</div>}
        </div>
      </div>

      {s.hook && (
        <div className="student-hook">
          <span className="hook-label">Why this matters.</span> {s.hook}
        </div>
      )}

      {concept && <div className="student-concept">{concept}</div>}

      {points && points.length > 0 && <Bullets items={points} />}

      {mathNote && (
        <div className="math-note">
          <span className="math-note-label">Notation:</span> {mathNote}
        </div>
      )}

      {mathBox && (
        <div className="box box-math">
          <h2>The math, plainly</h2>
          {mathBox.intuition && <p className="math-intuition">{mathBox.intuition}</p>}
          {mathBox.steps && mathBox.steps.length > 0 && (
            <ol className="math-steps">
              {mathBox.steps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          )}
          {mathBox.symbolic && <pre className="math-symbolic">{mathBox.symbolic}</pre>}
        </div>
      )}

      {workedSteps.length > 0 && (
        <div className="box box-example">
          <h2>Applied to our E. coli ± ampicillin experiment</h2>
          <Bullets items={workedSteps} ordered />
        </div>
      )}

      {(intuition || pitfall) && (
        <div className={intuition && pitfall ? 'student-row' : ''}>
          {intuition && (
            <div className="box box-intuition">
              <h2>Intuition</h2>
              <p>{intuition}</p>
            </div>
          )}
          {pitfall && (
            <div className="box box-pitfall">
              <h2>Common pitfall</h2>
              <p>{pitfall}</p>
            </div>
          )}
        </div>
      )}

      {exercise && (
        <div className="student-exercise">
          <span className="exercise-label">Try it now ·</span> {exercise}
        </div>
      )}

      {takeaway && (
        <div className="take">
          <b>Takeaway:</b><span>{takeaway}</span>
        </div>
      )}

      {refs && refs.length > 0 && (
        <div className="student-refs">
          <b>Further reading: </b>{refs.join(' · ')}
        </div>
      )}
    </section>
  );
}

function inferVisualKind(title = '') {
  const t = title.toLowerCase();
  if (/matrix|table|data table|expression/.test(t)) return 'matrix';
  if (/pca|principal/.test(t)) return 'scatter_pca';
  if (/umap|cluster|t-sne/.test(t)) return 'umap_clusters';
  if (/regress|model fit|linear/.test(t)) return 'regression_line';
  if (/distribution|normal|poisson|noise/.test(t)) return 'distribution';
  if (/neural|deep|transformer|ai|attention/.test(t)) return 'neural_net';
  if (/vector|dimension|distance|similarity|space/.test(t)) return 'vectors2d';
  return 'flow';
}
