import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { decks } from './slidesData.js';
import { Toolbar, Slide, StudentNotesSlide, SyncCanvas } from './components.jsx';
import './styles.css';

const flat = decks.flatMap(d =>
  d.slides.map(s => ({ ...s, deckShort: d.short, deckId: d.id }))
);

function readQuery() {
  if (typeof window === 'undefined') return { deck: 'all', print: false, notes: false, student: false, sync: null, view: false };
  const sp = new URLSearchParams(window.location.search);

  // Auto-detect sync URL only when served over HTTP from the combined server.
  // Exclude: file:// (portable HTML), Vite dev server (:5173).
  const isFileProtocol = location.protocol === 'file:';
  const isViteDev = location.port === '5173';
  const autoSync = (isFileProtocol || isViteDev) ? null : location.origin;

  return {
    deck: sp.get('deck') || 'all',
    print: sp.get('print') === '1',
    notes: sp.get('notes') === '1',
    student: sp.get('student') === '1',
    sync: sp.get('sync') || autoSync,
    view: sp.get('view') === '1',
  };
}

// Connects to the sync relay. Returns send() and subscribe(fn).
function useSync(serverUrl) {
  const wsRef = useRef(null);
  const listenersRef = useRef([]);

  useEffect(() => {
    if (!serverUrl) return;
    // Convert http(s):// → ws(s):// so callers can pass location.origin directly.
    const wsUrl = serverUrl.replace(/^http(s?):\/\//, (_, s) => `ws${s}://`);
    let ws;
    const connect = () => {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = e => {
        try {
          const msg = JSON.parse(e.data);
          listenersRef.current.forEach(fn => fn(msg));
        } catch {}
      };
      ws.onclose = () => setTimeout(connect, 2000); // auto-reconnect
    };
    connect();
    return () => { ws?.close(); wsRef.current = null; };
  }, [serverUrl]);

  const send = useCallback(msg => {
    const ws = wsRef.current;
    if (ws?.readyState === 1) ws.send(JSON.stringify(msg));
  }, []);

  const subscribe = useCallback(fn => {
    listenersRef.current = [...listenersRef.current, fn];
    return () => { listenersRef.current = listenersRef.current.filter(f => f !== fn); };
  }, []);

  return { send, subscribe };
}

function PrintAll({ deckId, showNotes }) {
  const slides = deckId === 'all' ? flat : flat.filter(s => s.deckId === deckId);
  return (
    <div className="print-stack">
      {slides.map((s, i) => (
        <div className="stage print-stage" key={i}>
          <Slide
            slide={s}
            draw={false}
            color="#000"
            clearTick={0}
            showNotes={showNotes}
          />
        </div>
      ))}
    </div>
  );
}

function useSlideScale(toolbarRef) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const calc = () => {
      const tbH = toolbarRef.current ? toolbarRef.current.offsetHeight : 44;
      setScale(Math.min(window.innerWidth / 1280, (window.innerHeight - tbH) / 720));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);
  return scale;
}

// Read-only viewer that mirrors the presenter over WebSocket.
function ViewerApp({ syncUrl }) {
  const [deckId, setDeckId] = useState('day1');
  const [idx, setIdx] = useState(0);
  const [clearTick, setClearTick] = useState(0);
  const { subscribe } = useSync(syncUrl);

  const slides = useMemo(
    () => flat.filter(s => s.deckId === deckId),
    [deckId]
  );
  const current = slides[Math.min(idx, slides.length - 1)];

  useEffect(() => {
    return subscribe(msg => {
      if (msg.type === 'nav') { setDeckId(msg.deckId); setIdx(msg.idx); }
      if (msg.type === 'clear') setClearTick(t => t + 1);
    });
  }, [subscribe]);

  // Scale to fill full viewport (no toolbar in viewer).
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const calc = () => setScale(Math.min(window.innerWidth / 1280, window.innerHeight / 720));
    calc();
    addEventListener('resize', calc);
    return () => removeEventListener('resize', calc);
  }, []);

  return (
    <div className="app" style={{ background: '#000' }}>
      <div className="stage-area">
        <div style={{ width: 1280 * scale, height: 720 * scale, position: 'relative', flexShrink: 0 }}>
          <div className="stage" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <Slide slide={current} draw={false} color="#000" clearTick={0} showNotes={false} />
            <SyncCanvas subscribe={subscribe} clearTick={clearTick} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PrintStudentNotes({ deckId }) {
  const slides = deckId === 'all' ? flat : flat.filter(s => s.deckId === deckId);
  return (
    <div className="student-notes-stack">
      {slides.map((s, i) => (
        <div className="student-notes-stage" key={i}>
          <StudentNotesSlide slide={s} />
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const q = useMemo(readQuery, []);

  // Viewer mode — render the read-only mirror, nothing else.
  if (q.view && q.sync) return <ViewerApp syncUrl={q.sync} />;

  const { send: syncSend, subscribe: syncSubscribe } = useSync(q.sync);

  const [deckId, setDeckId] = useState(q.deck);
  const [idx, setIdx] = useState(0);
  const [draw, setDraw] = useState(false);
  const [color, setColor] = useState('#111827');
  const [clearTick, setClearTick] = useState(0);
  const [showNotes, setShowNotes] = useState(q.notes);
  const toolbarRef = useRef(null);
  const scale = useSlideScale(toolbarRef);

  const slides = useMemo(
    () => (deckId === 'all' ? flat : flat.filter(s => s.deckId === deckId)),
    [deckId]
  );
  const current = slides[Math.min(idx, slides.length - 1)];

  // Navigation helpers that also broadcast to the viewer.
  const goNext = useCallback(() => {
    setIdx(i => {
      const next = Math.min(i + 1, slides.length - 1);
      syncSend({ type: 'nav', deckId, idx: next });
      return next;
    });
  }, [slides.length, deckId, syncSend]);

  const goPrev = useCallback(() => {
    setIdx(i => {
      const prev = Math.max(i - 1, 0);
      syncSend({ type: 'nav', deckId, idx: prev });
      return prev;
    });
  }, [deckId, syncSend]);

  const changeDeck = useCallback(id => {
    setDeckId(id);
    setIdx(0);
    syncSend({ type: 'nav', deckId: id, idx: 0 });
  }, [syncSend]);

  const doClear = useCallback(() => {
    setClearTick(x => x + 1);
    syncSend({ type: 'clear' });
  }, [syncSend]);

  useEffect(() => {
    if (q.print) return;
    const onKey = e => {
      const k = e.key.toLowerCase();
      if (e.key === 'ArrowRight' || e.key === ' ') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (k === 'd') setDraw(v => !v);
      else if (k === 'c') doClear();
      else if (k === 'n') setShowNotes(v => !v);
      else if (k === 'f') document.documentElement.requestFullscreen?.();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [goNext, goPrev, doClear, q.print]);

  if (q.print && q.student) return <PrintStudentNotes deckId={deckId} />;
  if (q.print) return <PrintAll deckId={deckId} showNotes={showNotes} />;

  return (
    <div className="app">
      <Toolbar
        ref={toolbarRef}
        decks={decks}
        deckId={deckId}
        setDeckId={changeDeck}
        idx={idx}
        total={slides.length}
        next={goNext}
        prev={goPrev}
        draw={draw}
        toggleDraw={() => setDraw(v => !v)}
        clear={doClear}
        notes={showNotes}
        toggleNotes={() => setShowNotes(v => !v)}
        color={color}
        setColor={setColor}
      />
      <div className="stage-area">
        <div style={{ width: 1280 * scale, height: 720 * scale, position: 'relative', flexShrink: 0 }}>
          <div className="stage" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <Slide
              slide={current}
              draw={draw}
              color={color}
              clearTick={clearTick}
              showNotes={showNotes}
              onNext={goNext}
              onPrev={goPrev}
              onEvent={q.sync ? syncSend : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
