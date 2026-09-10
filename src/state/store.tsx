import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { Circuit, ElementType, Orientation, makeElement, emptyCircuit, ELEMENT_SPECS, cloneCircuit } from '../engine/circuit';
import { EXAMPLES, findLesson } from '../engine/lessons';
import { solveCircuit, SolveResult, solveSweep, SweepPoint } from '../engine/solver';
import { explainCircuit, ExplainStep } from '../engine/explain';

export interface Probe {
  elementId: string;
  /** distance from the line's load end, in λ */
  d: number;
}

export type PanelId = 'palette' | 'inspector' | 'canvas' | 'chart' | 'explain';

export interface State {
  circuit: Circuit;
  maximized: PanelId | null;
  selectedId: string | null; // element id or 'source'
  mode: 'guided' | 'free';
  lessonId: string | null;
  lessonDone: number;
  showZ: boolean;
  showY: boolean;
  showSwr: boolean;
  showPath: boolean;
  showScale: boolean;
  showFine: boolean;
  showRadial: boolean;
  showSweep: boolean;
  /** main view: the lab or the Antenna Impedance Matching course */
  view: 'lab' | 'course';
  courseChapter: string;
  /** section to scroll to when the course opens (cleared after scrolling) */
  courseSection: string | null;
  /** id of the ready-made example currently loaded (null once the circuit is built by hand) */
  exampleId: string | null;
  /** design-goal SWR circle (null = off) */
  swrTarget: number | null;
  probe: Probe | null;
  explainStep: number;
  explainAll: boolean;
  modal: 'none' | 'lessons' | 'examples' | 'solution' | 'problems' | 'glossary';
  /** learner-typed numeric answers, keyed `${lessonId}:${answerKey}` */
  answers: Record<string, string>;
  answersChecked: boolean;
  showSolution: boolean;
  lastSolutionStep: string | null;
  /** index into the Smith-chart solution walkthrough (null = off) */
  solutionStep: number | null;
  dragging: ElementType | 'move' | null;
}

export type Action =
  | { type: 'set_circuit'; circuit: Circuit; select?: string | null }
  | { type: 'add'; elType: ElementType; index: number; orient?: Orientation }
  | { type: 'remove'; id: string }
  | { type: 'move'; id: string; index: number }
  | { type: 'param'; id: string; key: string; value: number }
  | { type: 'orient'; id: string; orient: Orientation }
  | { type: 'freq'; f: number }
  | { type: 'z0'; Z0: number }
  | { type: 'select'; id: string | null }
  | { type: 'mode'; mode: 'guided' | 'free' }
  | { type: 'lesson'; id: string | null }
  | { type: 'lesson_done'; n: number }
  | { type: 'lesson_solution' }
  | { type: 'show_solution'; value: boolean }
  | { type: 'solution_step'; circuit: Circuit; what: string }
  | { type: 'solution_walk'; i: number | null }
  | { type: 'answer'; key: string; value: string }
  | { type: 'answers_checked'; value: boolean }
  | { type: 'example'; id: string }
  | { type: 'toggle'; key: 'showZ' | 'showY' | 'showSwr' | 'showPath' | 'showScale' | 'showFine' | 'showRadial' | 'showSweep'; value?: boolean }
  | { type: 'swr_target'; value: number | null }
  | { type: 'view'; view: 'lab' | 'course' }
  | { type: 'course_chapter'; id: string }
  | { type: 'course_section'; chapter: string; section: string }
  | { type: 'course_section_seen' }
  | { type: 'antenna_table'; id: string; table: { f: number; R: number; X: number }[] }
  | { type: 'probe'; probe: Probe | null }
  | { type: 'explain_step'; i: number }
  | { type: 'explain_all'; value: boolean }
  | { type: 'modal'; modal: State['modal'] }
  | { type: 'dragging'; value: State['dragging'] }
  | { type: 'maximize'; panel: PanelId | null }
  | { type: 'reset' };

const STORAGE_KEY = 'rf-smith-lab-v1';

const defaultState = (): State => ({
  circuit: emptyCircuit(),
  maximized: null,
  selectedId: null,
  mode: 'guided',
  lessonId: null,
  lessonDone: 0,
  showZ: true,
  showY: false,
  showSwr: true,
  showPath: true,
  showScale: true,
  showFine: true,
  showRadial: false,
  showSweep: true,
  view: 'lab',
  courseChapter: 'intro',
  courseSection: null,
  exampleId: null,
  swrTarget: null,
  probe: null,
  explainStep: 0,
  explainAll: false,
  modal: 'none',
  showSolution: false,
  lastSolutionStep: null,
  solutionStep: null,
  answers: {},
  answersChecked: false,
  dragging: null,
});

/** Deep links: ?example=ex7  ?lesson=l10  &step=5  &all=1  &y=1 */
const applyQuery = (s: State): State => {
  try {
    const q = new URLSearchParams(window.location.search);
    let out = s;
    const ex = q.get('example');
    const ls = q.get('lesson');
    const exq = q.get('example');
    if (exq) out = { ...out, exampleId: exq };
    const pr = q.get('problem');
    if (ex && EXAMPLES.some((e) => e.id === ex)) out = reducer(out, { type: 'example', id: ex });
    else if (ls && findLesson(ls)) out = reducer(out, { type: 'lesson', id: ls });
    else if (pr && findLesson(pr)) out = reducer(out, { type: 'lesson', id: pr });
    const step = q.get('step');
    if (step) out = { ...out, explainStep: Math.max(0, parseInt(step, 10) - 1 || 0) };
    if (q.get('all') === '1') out = { ...out, explainAll: true };
    if (q.get('y') === '1') out = { ...out, showY: true };
    if (q.get('solution') === '1') out = { ...out, showSolution: true };
    if (q.get('solution') === 'modal') out = { ...out, showSolution: true, modal: 'solution' };
    if (['problems', 'lessons', 'examples', 'glossary'].includes(q.get('modal') ?? '')) out = { ...out, modal: q.get('modal') as State['modal'] };
    if (q.get('view') === 'course') out = { ...out, view: 'course' };
    const ch = q.get('ch');
    if (ch) out = { ...out, courseChapter: ch, view: 'course' };
    const sec = q.get('sec');
    if (sec) out = { ...out, courseSection: sec, view: 'course' };
    const st = q.get('swr');
    if (st !== null) out = { ...out, swrTarget: parseFloat(st) || null };
    const ss = q.get('sstep');
    if (ss !== null) out = { ...out, showSolution: true, solutionStep: Math.max(0, parseInt(ss, 10) - 1 || 0) };
    if (q.get('mode') === 'free' || q.get('mode') === 'guided') out = { ...out, mode: q.get('mode') as 'free' | 'guided' };
    const mx = q.get('max');
    if (mx && ['palette', 'inspector', 'canvas', 'chart', 'explain'].includes(mx)) out = { ...out, maximized: mx as PanelId };
    const sel = q.get('sel');
    if (sel !== null) {
      const el = out.circuit.elements[parseInt(sel, 10)];
      if (el) {
        out = { ...out, selectedId: el.id };
        const pd = q.get('probe');
        if (pd !== null && el.type === 'tline') out = { ...out, probe: { elementId: el.id, d: parseFloat(pd) || 0 } };
      } else if (sel === 'source') out = { ...out, selectedId: 'source' };
    }
    return out;
  } catch {
    return s;
  }
};

const loadState = (): State => applyQuery(loadStored());

const loadStored = (): State => {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // first visit: start with the flagship example (Series RL 25 + j25)
      const ex = EXAMPLES.find((e) => e.id === 'ex2');
      return { ...base, circuit: ex ? ex.circuit() : base.circuit, mode: 'free' };
    }
    const saved = JSON.parse(raw) as Partial<State>;
    const circuit = saved.circuit && Array.isArray(saved.circuit.elements) ? saved.circuit : base.circuit;
    return {
      ...base,
      ...saved,
      circuit,
      modal: 'none',
      dragging: null,
      probe: null,
      maximized: null,
      view: 'lab',
      showSolution: false,
      lastSolutionStep: null,
      solutionStep: null,
    };
  } catch {
    return base;
  }
};

const clampIndex = (i: number, n: number) => Math.max(0, Math.min(n, i));

export const reducer = (s: State, a: Action): State => {
  switch (a.type) {
    case 'set_circuit':
      return { ...s, exampleId: null, circuit: a.circuit, selectedId: a.select === undefined ? s.selectedId : a.select, probe: null };
    case 'add': {
      const spec = ELEMENT_SPECS[a.elType];
      const el = makeElement(a.elType, a.orient ?? spec.defaultOrient);
      // lines default to the system Z0
      if (a.elType === 'tline' || a.elType === 'stub_short' || a.elType === 'stub_open') el.params.Z0 = s.circuit.Z0;
      const elements = [...s.circuit.elements];
      elements.splice(clampIndex(a.index, elements.length), 0, el);
      return { ...s, circuit: { ...s.circuit, elements }, selectedId: el.id, dragging: null };
    }
    case 'remove': {
      const elements = s.circuit.elements.filter((e) => e.id !== a.id);
      return {
        ...s,
        circuit: { ...s.circuit, elements },
        selectedId: s.selectedId === a.id ? null : s.selectedId,
        probe: s.probe?.elementId === a.id ? null : s.probe,
      };
    }
    case 'move': {
      const elements = [...s.circuit.elements];
      const from = elements.findIndex((e) => e.id === a.id);
      if (from < 0) return s;
      const [el] = elements.splice(from, 1);
      let to = a.index;
      if (to > from) to -= 1;
      elements.splice(clampIndex(to, elements.length), 0, el);
      return { ...s, circuit: { ...s.circuit, elements }, dragging: null };
    }
    case 'param': {
      const elements = s.circuit.elements.map((e) => (e.id === a.id ? { ...e, params: { ...e.params, [a.key]: a.value } } : e));
      return { ...s, circuit: { ...s.circuit, elements } };
    }
    case 'orient': {
      const elements = s.circuit.elements.map((e) =>
        e.id === a.id && ELEMENT_SPECS[e.type].allowed.includes(a.orient) ? { ...e, orient: a.orient } : e,
      );
      return { ...s, circuit: { ...s.circuit, elements } };
    }
    case 'freq':
      return { ...s, circuit: { ...s.circuit, f: Math.max(1e3, a.f) } };
    case 'z0':
      return { ...s, circuit: { ...s.circuit, Z0: Math.max(1, a.Z0) } };
    case 'select':
      return { ...s, selectedId: a.id };
    case 'mode':
      return { ...s, mode: a.mode, lessonId: a.mode === 'free' ? null : s.lessonId };
    case 'lesson': {
      if (!a.id) return { ...s, lessonId: null, lessonDone: 0 };
      const lesson = findLesson(a.id);
      if (!lesson) return s;
      return {
        ...s,
        view: 'lab',
        exampleId: null,
        mode: 'guided',
        lessonId: lesson.id,
        lessonDone: 0,
        circuit: lesson.start(),
        selectedId: null,
        probe: null,
        modal: 'none',
        explainStep: 0,
        explainAll: false,
        showSolution: false,
        lastSolutionStep: null,
        solutionStep: null,
        answersChecked: false,
        showY: lesson.level >= 7 && lesson.level !== 8 && lesson.level !== 9,
      };
    }
    case 'lesson_done':
      return s.lessonDone === a.n ? s : { ...s, lessonDone: a.n };
    case 'lesson_solution': {
      const lesson = findLesson(s.lessonId);
      if (!lesson || !lesson.solution) return s;
      return { ...s, circuit: lesson.solution(), selectedId: null, probe: null, lastSolutionStep: 'ใช้ค่าเฉลยทั้งหมดแล้ว', view: 'lab' };
    }
    case 'show_solution':
      return { ...s, showSolution: a.value, solutionStep: a.value ? s.solutionStep : null };
    case 'answer':
      return { ...s, answers: { ...s.answers, [a.key]: a.value }, answersChecked: false };
    case 'answers_checked':
      return { ...s, answersChecked: a.value };
    case 'solution_walk':
      return { ...s, solutionStep: a.i, showSolution: a.i === null ? s.showSolution : true, view: a.i === null ? s.view : 'lab' };
    case 'solution_step':
      return { ...s, circuit: a.circuit, lastSolutionStep: a.what, selectedId: null, probe: null, view: 'lab' };
    case 'example': {
      const ex = EXAMPLES.find((e) => e.id === a.id);
      if (!ex) return s;
      return { ...s, circuit: ex.circuit(), selectedId: null, probe: null, modal: 'none', explainStep: 0, lessonId: null, exampleId: ex.id, mode: 'free', view: 'lab' };
    }
    case 'toggle':
      return { ...s, [a.key]: a.value === undefined ? !s[a.key] : a.value };
    case 'probe':
      return { ...s, probe: a.probe };
    case 'explain_step':
      return { ...s, explainStep: Math.max(0, a.i) };
    case 'explain_all':
      return { ...s, explainAll: a.value };
    case 'modal':
      return { ...s, modal: a.modal };
    case 'dragging':
      return { ...s, dragging: a.value };
    case 'maximize':
      return { ...s, maximized: a.panel };
    case 'swr_target':
      return { ...s, swrTarget: a.value };
    case 'view':
      return { ...s, view: a.view, modal: 'none' };
    case 'course_chapter':
      return { ...s, courseChapter: a.id, courseSection: null, view: 'course' };
    case 'course_section':
      return { ...s, courseChapter: a.chapter, courseSection: a.section, view: 'course', modal: 'none', maximized: null };
    case 'course_section_seen':
      return s.courseSection === null ? s : { ...s, courseSection: null };
    case 'antenna_table': {
      const elements = s.circuit.elements.map((e) => (e.id === a.id ? { ...e, table: a.table.map((pt) => ({ ...pt })) } : e));
      return { ...s, circuit: { ...s.circuit, elements } };
    }
    case 'reset':
      return { ...defaultState(), mode: s.mode, maximized: s.maximized, courseChapter: s.courseChapter, circuit: cloneCircuit(emptyCircuit()) };
    default:
      return s;
  }
};

interface Derived {
  result: SolveResult;
  steps: ExplainStep[];
  /** frequency sweep over antenna-table frequencies (empty when the circuit has no antenna table) */
  sweep: SweepPoint[];
}

const StateCtx = createContext<State | null>(null);
const DispatchCtx = createContext<React.Dispatch<Action> | null>(null);
const DerivedCtx = createContext<Derived | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const derived = useMemo<Derived>(() => {
    const result = solveCircuit(state.circuit);
    const steps = explainCircuit(result);
    const sweep = solveSweep(state.circuit);
    return { result, steps, sweep };
  }, [state.circuit]);

  useEffect(() => {
    try {
      const { circuit, mode, lessonId, lessonDone, showZ, showY, showSwr, showPath, showScale, showFine, showRadial, showSweep, swrTarget, selectedId, answers, courseChapter } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ circuit, mode, lessonId, lessonDone, showZ, showY, showSwr, showPath, showScale, showFine, showRadial, showSweep, swrTarget, selectedId, answers, courseChapter }));
    } catch {
      /* ignore */
    }
  }, [state]);

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>
        <DerivedCtx.Provider value={derived}>{children}</DerivedCtx.Provider>
      </DispatchCtx.Provider>
    </StateCtx.Provider>
  );
};

export const useAppState = (): State => {
  const v = useContext(StateCtx);
  if (!v) throw new Error('StoreProvider missing');
  return v;
};
export const useDispatch = (): React.Dispatch<Action> => {
  const v = useContext(DispatchCtx);
  if (!v) throw new Error('StoreProvider missing');
  return v;
};
export const useDerived = (): Derived => {
  const v = useContext(DerivedCtx);
  if (!v) throw new Error('StoreProvider missing');
  return v;
};
