// ---------------------------------------------------------------
// Circuit model: an ordered ladder network seen from the RF source.
//   Source ── [el1] ── [el2] ── ... ── (return)
// Series elements sit on the top rail; shunt elements hang from a
// node down to ground. The last series element returns to ground.
// ---------------------------------------------------------------

export type ElementType =
  | 'resistor'
  | 'inductor'
  | 'capacitor'
  | 'tline'
  | 'qwt'
  | 'stub_short'
  | 'stub_open'
  | 'load';

export type Orientation = 'series' | 'shunt';

export interface CircuitElement {
  id: string;
  type: ElementType;
  orient: Orientation;
  params: Record<string, number>;
}

export interface Circuit {
  /** frequency in Hz */
  f: number;
  /** system / reference impedance in ohms */
  Z0: number;
  elements: CircuitElement[];
}

export interface ParamSpec {
  key: string;
  label: string;
  labelTh: string;
  unit: string;
  /** multiplier from displayed unit to SI (e.g. nH -> 1e-9) */
  scale: number;
  min: number;
  max: number;
  step: number;
  log?: boolean;
  /** shown in property panel as read-only helper */
  hint?: string;
}

export interface ElementSpec {
  type: ElementType;
  name: string;
  nameTh: string;
  symbol: string;
  color: string;
  allowed: Orientation[];
  defaultOrient: Orientation;
  params: ParamSpec[];
  defaults: Record<string, number>;
  description: string;
}

export const ELEMENT_SPECS: Record<ElementType, ElementSpec> = {
  resistor: {
    type: 'resistor',
    name: 'Resistor',
    nameTh: 'ตัวต้านทาน',
    symbol: 'R',
    color: '#d97706',
    allowed: ['series', 'shunt'],
    defaultOrient: 'series',
    params: [
      { key: 'R', label: 'Resistance', labelTh: 'ความต้านทาน', unit: 'Ω', scale: 1, min: 0, max: 500, step: 0.5 },
    ],
    defaults: { R: 50 },
    description: 'ให้ค่าความต้านทาน R (ส่วนจริงของอิมพีแดนซ์) ไม่ขึ้นกับความถี่',
  },
  inductor: {
    type: 'inductor',
    name: 'Inductor',
    nameTh: 'ตัวเหนี่ยวนำ',
    symbol: 'L',
    color: '#2563eb',
    allowed: ['series', 'shunt'],
    defaultOrient: 'series',
    params: [
      { key: 'L', label: 'Inductance', labelTh: 'ความเหนี่ยวนำ', unit: 'nH', scale: 1e-9, min: 0.1, max: 1000, step: 0.1, log: true },
    ],
    defaults: { L: 39.8 },
    description: 'ให้รีแอกแตนซ์บวก X_L = 2πfL (inductive) จุดจะอยู่ครึ่งบนของ Smith Chart',
  },
  capacitor: {
    type: 'capacitor',
    name: 'Capacitor',
    nameTh: 'ตัวเก็บประจุ',
    symbol: 'C',
    color: '#059669',
    allowed: ['series', 'shunt'],
    defaultOrient: 'series',
    params: [
      { key: 'C', label: 'Capacitance', labelTh: 'ความจุ', unit: 'pF', scale: 1e-12, min: 0.1, max: 1000, step: 0.1, log: true },
    ],
    defaults: { C: 31.8 },
    description: 'ให้รีแอกแตนซ์ลบ X_C = −1/(2πfC) (capacitive) จุดจะอยู่ครึ่งล่างของ Smith Chart',
  },
  tline: {
    type: 'tline',
    name: 'Transmission Line',
    nameTh: 'สายส่ง',
    symbol: 'TL',
    color: '#7c3aed',
    allowed: ['series'],
    defaultOrient: 'series',
    params: [
      { key: 'Z0', label: 'Char. impedance Z₀', labelTh: 'อิมพีแดนซ์คุณลักษณะ Z₀', unit: 'Ω', scale: 1, min: 10, max: 300, step: 1 },
      { key: 'len', label: 'Length', labelTh: 'ความยาว', unit: 'λ', scale: 1, min: 0, max: 0.5, step: 0.001 },
      { key: 'vf', label: 'Velocity factor', labelTh: 'ตัวประกอบความเร็ว', unit: '', scale: 1, min: 0.3, max: 1, step: 0.01 },
      { key: 'lossDb', label: 'Loss', labelTh: 'การสูญเสีย', unit: 'dB', scale: 1, min: 0, max: 6, step: 0.1 },
    ],
    defaults: { Z0: 50, len: 0.1, vf: 0.66, lossDb: 0 },
    description: 'สายส่งความยาว l หมุนจุดบน Smith Chart ตามวงกลม SWR คงที่ ไปทาง generator เป็นมุม 2βl',
  },
  qwt: {
    type: 'qwt',
    name: 'λ/4 Transformer',
    nameTh: 'หม้อแปลงหนึ่งในสี่คลื่น',
    symbol: 'λ/4',
    color: '#9333ea',
    allowed: ['series'],
    defaultOrient: 'series',
    params: [
      { key: 'Zt', label: 'Transformer Z_t', labelTh: 'อิมพีแดนซ์สายหม้อแปลง Z_t', unit: 'Ω', scale: 1, min: 10, max: 300, step: 0.1 },
    ],
    defaults: { Zt: 70.71 },
    description: 'สายส่งยาว λ/4 ที่มี Z_t = √(Z₀·R_L) ทำ impedance inversion: Z_in = Z_t²/Z_L',
  },
  stub_short: {
    type: 'stub_short',
    name: 'Short Stub',
    nameTh: 'สตับปลายลัดวงจร',
    symbol: 'S',
    color: '#dc2626',
    allowed: ['shunt'],
    defaultOrient: 'shunt',
    params: [
      { key: 'Z0', label: 'Stub Z₀', labelTh: 'Z₀ ของสตับ', unit: 'Ω', scale: 1, min: 10, max: 300, step: 1 },
      { key: 'len', label: 'Stub length', labelTh: 'ความยาวสตับ', unit: 'λ', scale: 1, min: 0, max: 0.5, step: 0.001 },
    ],
    defaults: { Z0: 50, len: 0.125 },
    description: 'สตับขนานปลายลัดวงจร ให้ susceptance b = −cot(βl) ใช้หักล้างส่วน reactive ของโหลด',
  },
  stub_open: {
    type: 'stub_open',
    name: 'Open Stub',
    nameTh: 'สตับปลายเปิด',
    symbol: 'O',
    color: '#ea580c',
    allowed: ['shunt'],
    defaultOrient: 'shunt',
    params: [
      { key: 'Z0', label: 'Stub Z₀', labelTh: 'Z₀ ของสตับ', unit: 'Ω', scale: 1, min: 10, max: 300, step: 1 },
      { key: 'len', label: 'Stub length', labelTh: 'ความยาวสตับ', unit: 'λ', scale: 1, min: 0, max: 0.5, step: 0.001 },
    ],
    defaults: { Z0: 50, len: 0.125 },
    description: 'สตับขนานปลายเปิด ให้ susceptance b = tan(βl) สั้นกว่าสตับลัดวงจร λ/4 สำหรับค่า b เดียวกัน',
  },
  load: {
    type: 'load',
    name: 'Load Z_L',
    nameTh: 'โหลด / สายอากาศ',
    symbol: 'Z_L',
    color: '#0f766e',
    allowed: ['series'],
    defaultOrient: 'series',
    params: [
      { key: 'R', label: 'R_L', labelTh: 'ส่วนจริง R_L', unit: 'Ω', scale: 1, min: 0, max: 500, step: 0.5 },
      { key: 'X', label: 'X_L', labelTh: 'ส่วนจินตภาพ X_L', unit: 'Ω', scale: 1, min: -500, max: 500, step: 0.5 },
    ],
    defaults: { R: 100, X: -50 },
    description: 'โหลดที่กำหนดค่าอิมพีแดนซ์โดยตรง (เช่น สายอากาศ) Z_L = R_L + jX_L',
  },
};

export const PALETTE_ORDER: ElementType[] = [
  'resistor',
  'inductor',
  'capacitor',
  'tline',
  'qwt',
  'load',
  'stub_short',
  'stub_open',
];

let idCounter = 1;
export const newId = (): string => `e${Date.now().toString(36)}${(idCounter++).toString(36)}`;

export const makeElement = (type: ElementType, orient?: Orientation, params?: Record<string, number>): CircuitElement => {
  const spec = ELEMENT_SPECS[type];
  const o = orient && spec.allowed.includes(orient) ? orient : spec.defaultOrient;
  return { id: newId(), type, orient: o, params: { ...spec.defaults, ...(params ?? {}) } };
};

export const emptyCircuit = (): Circuit => ({ f: 100e6, Z0: 50, elements: [] });

export const cloneCircuit = (c: Circuit): Circuit => ({
  f: c.f,
  Z0: c.Z0,
  elements: c.elements.map((e) => ({ ...e, params: { ...e.params } })),
});

/** Convenience builder used by lessons/examples. */
export const buildCircuit = (
  f: number,
  Z0: number,
  parts: Array<[ElementType, Orientation | undefined, Record<string, number>?]>,
): Circuit => ({
  f,
  Z0,
  elements: parts.map(([t, o, p]) => makeElement(t, o, p)),
});

export const isShuntOnly = (t: ElementType) => ELEMENT_SPECS[t].allowed.length === 1 && ELEMENT_SPECS[t].allowed[0] === 'shunt';
export const isSeriesOnly = (t: ElementType) => ELEMENT_SPECS[t].allowed.length === 1 && ELEMENT_SPECS[t].allowed[0] === 'series';
export const isLine = (t: ElementType) => t === 'tline' || t === 'qwt';
export const isStub = (t: ElementType) => t === 'stub_short' || t === 'stub_open';

/** Physical wavelength on a line with velocity factor vf. */
export const wavelength = (f: number, vf = 1): number => (299792458 * vf) / f;
