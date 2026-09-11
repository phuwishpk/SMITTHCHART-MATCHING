/**
 * Turn the TeX the course prints into something a Thai speech engine can read out.
 *
 * The course's equations are the point of several sections, so leaving them out of the narration
 * leaves holes exactly where the explanation is. This is deliberately not a general TeX parser: it
 * handles the constructs this course actually uses (the survey is in the commit that added it) and
 * anything unknown is dropped rather than spelled out, because a listener would rather miss a
 * symbol than hear "backslash".
 */

/** Read the braced group that starts at `i` (which must point at '{'); returns [content, nextIndex]. */
const group = (s, i) => {
  if (s[i] !== '{') {
    // a single token can follow ^ _ \sqrt without braces: x^2, Z_L, \sqrt2
    const m = /^\\[a-zA-Z]+|^./.exec(s.slice(i));
    return [m ? m[0] : '', i + (m ? m[0].length : 1)];
  }
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '{') depth += 1;
    else if (s[j] === '}') {
      depth -= 1;
      if (depth === 0) return [s.slice(i + 1, j), j + 1];
    }
  }
  return [s.slice(i + 1), s.length];
};

/** Names that are read as a unit rather than letter-by-letter. */
const SUB = {
  0: 'ศูนย์', L: 'แอล', in: 'อิน', t: 'ที', A: 'เอ', C: 'ซี', s: 'เอส',
  max: 'แม็กซ์', min: 'มิน', refl: 'สะท้อน', inc: 'ตกกระทบ', load: 'โหลด',
  total: 'รวม', matched: 'แมตช์', add: 'เพิ่ม', stub: 'สตับ', meas: 'ที่วัดได้',
  series: 'อนุกรม', shunt: 'ขนาน', short: 'ปลายลัด', p: 'พี',
};

const B = '(?![a-zA-Z])';           // a command name ends here, so \\le never eats \\left
const cmd = (name, to) => [new RegExp('\\\\' + name + B, 'g'), to];
const SYMBOL = [
  // the spacing commands and the delimiters go first, before any shorter name can match them
  [/\\qquad|\\quad|\\,|\\;|\\!|\\ /g, ' , '],
  cmd('left', ' '), cmd('right', ' '), cmd('displaystyle', ' '), cmd('limits', ' '),
  cmd('Gamma', ' แกมมา '), cmd('gamma', ' แกมมา '),
  cmd('lambda', ' แลมบ์ดา '), cmd('Omega', ' โอห์ม '), cmd('omega', ' โอเมกา '),
  cmd('beta', ' เบตา '), cmd('alpha', ' แอลฟา '), cmd('pi', ' พาย '), cmd('mu', ' ไมโคร'),
  cmd('infty', ' อนันต์ '),
  cmd('tan', ' แทน'), cmd('cot', ' คอท'), cmd('sin', ' ไซน์'), cmd('cos', ' คอส'),
  cmd('angle', ' มุม '),
  cmd('propto', ' แปรผันตาม '),
  cmd('Rightarrow', ' จะได้ '), cmd('rightarrow', ' จะได้ '), cmd('to', ' จะได้ '),
  cmd('approx', ' ประมาณ '),
  cmd('neq', ' ไม่เท่ากับ '), cmd('ne', ' ไม่เท่ากับ '),
  cmd('leq', ' น้อยกว่าหรือเท่ากับ '), cmd('le', ' น้อยกว่าหรือเท่ากับ '),
  cmd('geq', ' มากกว่าหรือเท่ากับ '), cmd('ge', ' มากกว่าหรือเท่ากับ '),
  cmd('pm', ' บวกลบ '),
  cmd('times', ' คูณ '), cmd('cdot', ' คูณ '),
  cmd('div', ' หารด้วย '),
];

/** Units, so "12.24 pF" is read as a unit and not as two letters. */
const UNIT = [
  [/\bpF\b/g, 'พิโคฟารัด'], [/\bnF\b/g, 'นาโนฟารัด'], [/\bnH\b/g, 'นาโนเฮนรี'],
  [/ไมโครH\b/g, 'ไมโครเฮนรี'], [/ไมโครF\b/g, 'ไมโครฟารัด'],
  [/\bdB\b/g, 'เดซิเบล'], [/\bMHz\b/g, 'เมกะเฮิรตซ์'], [/\bGHz\b/g, 'กิกะเฮิรตซ์'],
  [/\bkHz\b/g, 'กิโลเฮิรตซ์'], [/\bHz\b/g, 'เฮิรตซ์'], [/\bft\b/g, 'ฟุต'],
  [/\bVSWR\b/g, 'วีเอสดับเบิลยูอาร์'], [/\bSWR\b/g, 'เอสดับเบิลยูอาร์'],
  [/\bVF\b/g, 'วีเอฟ'],
];

/** Bare letters that stand for a quantity. Applied last, only where a letter stands alone. */
const LETTER = {
  Z: 'ซี', Y: 'วาย', R: 'อาร์', X: 'เอ็กซ์', G: 'จี', B: 'บี', L: 'แอล', C: 'ซี',
  z: 'ซีตัวเล็ก', y: 'วายตัวเล็ก', r: 'อาร์ตัวเล็ก', x: 'เอ็กซ์ตัวเล็ก', g: 'จีตัวเล็ก', b: 'บีตัวเล็ก',
  f: 'เอฟ', d: 'ดี', l: 'แอล', a: 'เอ', e: 'อี', P: 'พี', E: 'อี', S: 'เอส', j: 'เจ', v: 'วี',
};

/** Expand \frac, \sqrt, \text, superscripts, subscripts and |…| from the inside out. */
const expand = (s) => {
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s.startsWith('\\frac', i)) {
      const [num, a] = group(s, i + 5);
      const [den, b] = group(s, a);
      out += ` ${expand(num)} ส่วน ${expand(den)} `;
      i = b;
    } else if (s.startsWith('\\sqrt', i)) {
      const [arg, a] = group(s, i + 5);
      out += ` รากที่สองของ ${expand(arg)} `;
      i = a;
    } else if (s.startsWith('\\text', i) || s.startsWith('\\mathrm', i)) {
      const skip = s.startsWith('\\text', i) ? 5 : 7;
      const [arg, a] = group(s, i + skip);
      out += ` ${arg} `;
      i = a;
    } else if (s.startsWith('\\xrightarrow', i)) {
      const [arg, a] = group(s, i + 12);
      out += ` เมื่อ ${arg} จะได้ `;
      i = a;
    } else if (s.startsWith('\\log', i)) {
      let j = i + 4;
      let base = '';
      if (s[j] === '_') { const [g2, a] = group(s, j + 1); base = g2; j = a; }
      out += base ? ` ล็อกฐาน${base} ` : ' ล็อก ';
      i = j;
    } else if (s[i] === '^') {
      const [arg, a] = group(s, i + 1);
      if (arg === '\\circ') out += ' องศา';
      else if (arg === '2') out += ' กำลังสอง';
      else if (arg === '-') out += ' ลบ';
      else out += ` ยกกำลัง ${expand(arg)} `;
      i = a;
    } else if (s[i] === '_') {
      const [arg, a] = group(s, i + 1);
      const key = arg.replace(/[{}]/g, '');
      const parts = key.split(',').map((k) => k.trim());
      if (parts.length > 1 && parts.every((k) => SUB[k])) out += parts.map((k) => SUB[k]).join('ของ');
      else out += SUB[key] ? SUB[key] : ` ตัวห้อย ${expand(arg)} `;
      i = a;
    } else if (s[i] === '|') {
      const end = s.indexOf('|', i + 1);
      if (end > i) { out += ` ขนาดของ ${expand(s.slice(i + 1, end))} `; i = end + 1; }
      else { i += 1; }
    } else {
      out += s[i];
      i += 1;
    }
  }
  return out;
};

export const texToThai = (tex) => {
  let t = expand(tex);
  for (const [re, to] of SYMBOL) t = t.replace(re, to);
  for (const [re, to] of UNIT) t = t.replace(re, to);
  t = t
    .replace(/\\[a-zA-Z]+/g, ' ')            // anything left over is dropped, never spelled out
    .replace(/[{}$]/g, ' ')
    .replace(/\[|\]/g, ' ')
    .replace(/\(\s*\)/g, ' ')
    .replace(/\s*=\s*/g, ' เท่ากับ ')
    .replace(/(\d)\s*-\s*(?=[\d.])/g, '$1 ถึง ')  // 3.5-4.0 is a range, not a subtraction
    .replace(/\s*\+\s*/g, ' บวก ')
    .replace(/(?<![A-Za-z])\s*-\s*(?![A-Za-z])/g, ' ลบ ')
    .replace(/\s*<\s*/g, ' น้อยกว่า ')
    .replace(/\s*>\s*/g, ' มากกว่า ');
  // a single Latin letter standing alone is a quantity name, not a word
  t = t.replace(/(?<![A-Za-z])([A-Za-z])(?![A-Za-z])/g, (m, ch) => LETTER[ch] ?? ch);
  return t
    .replace(/\s*,\s*,\s*/g, ' , ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*[,]\s*|\s*,\s*$/g, '')
    .trim();
};
