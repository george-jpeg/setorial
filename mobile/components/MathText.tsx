import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, useColorScheme } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Public Props
// ─────────────────────────────────────────────────────────────────────────────

export interface MathTextProps {
  content: string;
  color?: string;
  fontSize?: number;
  containerStyle?: any;
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: '400' | '500' | '600' | '700' | '800';
}

// ─────────────────────────────────────────────────────────────────────────────
// LaTeX Symbol & Unicode Maps
// ─────────────────────────────────────────────────────────────────────────────

const LATEX_SYMBOLS: Record<string, string> = {
  // Lowercase Greek
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', varpi: 'ϖ',
  rho: 'ρ', varrho: 'ϱ', sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ',
  phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  // Uppercase Greek
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
  Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  // Binary operators & relations
  times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', ast: '∗', star: '⋆',
  circ: '°', bullet: '•', oplus: '⊕', otimes: '⊗',
  leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠',
  approx: '≈', equiv: '≡', cong: '≅', sim: '∼', simeq: '≃', propto: '∝',
  ll: '≪', gg: '≫', mid: '∣', parallel: '∥', perp: '⊥',
  // Arrows
  rightarrow: '→', to: '→', gets: '←', leftarrow: '←',
  leftrightarrow: '↔', Rightarrow: '⇒', Leftarrow: '⇐',
  Leftrightarrow: '⟺', iff: '⟺', implies: '⟹', impliedby: '⟸',
  mapsto: '↦', uparrow: '↑', downarrow: '↓',
  // Set & logic
  in: '∈', notin: '∉', ni: '∋', subset: '⊂', supset: '⊃',
  subseteq: '⊆', supseteq: '⊇', cup: '∪', cap: '∩',
  setminus: '∖', emptyset: '∅', varnothing: '∅',
  forall: '∀', exists: '∃', nexists: '∄', neg: '¬', lnot: '¬',
  land: '∧', wedge: '∧', lor: '∨', vee: '∨',
  therefore: '∴', because: '∵',
  // Calculus & misc
  infty: '∞', partial: '∂', nabla: '∇', aleph: 'ℵ', hbar: 'ℏ', ell: 'ℓ',
  wp: '℘', Re: 'ℜ', Im: 'ℑ', angle: '∠', measuredangle: '∡',
  triangle: '△', square: '□', diamond: '◇',
  prime: '′', degree: '°', degrees: '°',
  dots: '…', ldots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱',
  sum: '∑', prod: '∏', coprod: '∐', int: '∫', iint: '∬', iiint: '∭', oint: '∮',
  // Functions (upright names)
  sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot', sec: 'sec', csc: 'csc',
  arcsin: 'arcsin', arccos: 'arccos', arctan: 'arctan',
  sinh: 'sinh', cosh: 'cosh', tanh: 'tanh',
  log: 'log', ln: 'ln', lg: 'lg', exp: 'exp',
  lim: 'lim', sup: 'sup', inf: 'inf', max: 'max', min: 'min',
  det: 'det', dim: 'dim', ker: 'ker', gcd: 'gcd', lcm: 'lcm',
  mod: ' mod ', pmod: ' mod ',
  // Spacing
  quad: '  ', qquad: '    ',
};

const BLACKBOARD_MAP: Record<string, string> = {
  R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ', P: 'ℙ', F: '𝔽', E: '𝔼',
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ', 'a': 'ᵃ', 'b': 'ᵇ',
  'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ',
  'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'o': 'ᵒ', 'p': 'ᵖ',
  'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'z': 'ᶻ',
  'T': 'ᵀ',
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '−': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ',
  'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ',
  's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ',
};

// Commands that only change sizing/layout in LaTeX and should never print literally
const SIZING_Scale: Record<string, number> = {
  Huge: 1.32,
  huge: 1.24,
  LARGE: 1.18,
  Large: 1.14,
  large: 1.08,
  normalsize: 1.0,
  small: 0.92,
  footnotesize: 0.86,
  scriptsize: 0.8,
  tiny: 0.75,
};

const IGNORED_CMDS = new Set([
  'displaystyle', 'textstyle', 'scriptstyle', 'scriptscriptstyle',
  'limits', 'nolimits', 'allowbreak', 'noindent', 'centering',
  'left', 'right', 'big', 'Big', 'bigg', 'Bigg',
  'bigl', 'bigr', 'Bigl', 'Bigr', 'biggl', 'biggr', 'Biggl', 'Biggr',
  'middle', '!', ',', ';', ':',
]);

function canConvertToUnicodeSuper(str: string): boolean {
  if (!str || str.length > 6) return false;
  for (let i = 0; i < str.length; i++) {
    if (!SUPERSCRIPT_MAP[str[i]]) return false;
  }
  return true;
}

function toUnicodeSuper(str: string): string {
  return str.split('').map((c) => SUPERSCRIPT_MAP[c] || c).join('');
}

function canConvertToUnicodeSub(str: string): boolean {
  if (!str || str.length > 6) return false;
  for (let i = 0; i < str.length; i++) {
    if (!SUBSCRIPT_MAP[str[i]]) return false;
  }
  return true;
}

function toUnicodeSub(str: string): string {
  return str.split('').map((c) => SUBSCRIPT_MAP[c] || c).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Plain-Text Math & Markdown Stripper (for single-line previews)
// ─────────────────────────────────────────────────────────────────────────────

export function formatMathPlainText(input: string): string {
  if (!input) return '';
  let s = input;
  // Strip markdown headings & formatting markers
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  s = s.replace(/\*\*(.+?)\*\*/g, '$1');
  s = s.replace(/\*(.+?)\*/g, '$1');
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_, m) => mathToInlineString(m));
  s = s.replace(/\$([^$\n]+?)\$/g, (_, m) => mathToInlineString(m));
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => mathToInlineString(m));
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => mathToInlineString(m));
  return mathToInlineString(s).replace(/\s+/g, ' ').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Brace Group Reader
// ─────────────────────────────────────────────────────────────────────────────

function readBraced(str: string, startIdx: number): { content: string; nextIdx: number } | null {
  let i = startIdx;
  while (i < str.length && str[i] === ' ') i++;
  if (i >= str.length || str[i] !== '{') return null;
  let depth = 0;
  const contentStart = i + 1;
  for (; i < str.length; i++) {
    if (str[i] === '\\') {
      i++; // skip escaped char
      continue;
    }
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        return { content: str.slice(contentStart, i), nextIdx: i + 1 };
      }
    }
  }
  // Unclosed brace (e.g. while streaming): take remainder
  return { content: str.slice(contentStart), nextIdx: str.length };
}

function readBracketed(str: string, startIdx: number): { content: string; nextIdx: number } | null {
  let i = startIdx;
  while (i < str.length && str[i] === ' ') i++;
  if (i >= str.length || str[i] !== '[') return null;
  let depth = 0;
  const contentStart = i + 1;
  for (; i < str.length; i++) {
    if (str[i] === '[') depth++;
    else if (str[i] === ']') {
      depth--;
      if (depth === 0) {
        return { content: str.slice(contentStart, i), nextIdx: i + 1 };
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LaTeX Math AST Parser
// ─────────────────────────────────────────────────────────────────────────────

type MathNode =
  | { type: 'text'; value: string; bold?: boolean; italic?: boolean }
  | { type: 'frac'; num: MathNode[]; den: MathNode[] }
  | { type: 'binom'; top: MathNode[]; bottom: MathNode[] }
  | { type: 'sqrt'; index?: MathNode[]; radicand: MathNode[] }
  | { type: 'sup'; base: MathNode[]; exp: MathNode[] }
  | { type: 'sub'; base: MathNode[]; sub: MathNode[] }
  | { type: 'subsup'; base: MathNode[]; sub: MathNode[]; sup: MathNode[] }
  | { type: 'overline'; inner: MathNode[] }
  | { type: 'underline'; inner: MathNode[] }
  | { type: 'boxed'; inner: MathNode[] }
  | { type: 'matrix'; rows: MathNode[][][]; bracket: 'p' | 'b' | 'B' | 'v' | 'V' | 'cases' | 'align' };

function extractLeadingScale(latex: string): { cleaned: string; scale: number } {
  let s = latex.trim();
  let scale = 1.0;

  // Check for leading sizing commands like \Large, \large, \huge, \displaystyle
  const match = s.match(/^\\(Huge|huge|LARGE|Large|large|normalsize|small|footnotesize|scriptsize|tiny)\b\s*/);
  if (match) {
    scale = SIZING_Scale[match[1]] || 1.0;
    s = s.slice(match[0].length);
  }
  return { cleaned: s, scale };
}

/**
 * Converts simple LaTeX string into a clean Unicode string when no complex 2D layout
 * (like multi-token stacked fractions or matrices) is required.
 */
function mathToInlineString(latex: string): string {
  if (!latex) return '';
  let s = latex.trim();

  // Strip sizing & layout commands
  s = s.replace(/\\(Huge|huge|LARGE|Large|large|normalsize|small|footnotesize|scriptsize|tiny|displaystyle|textstyle|scriptstyle|limits|nolimits|left|right|big|Big|bigg|Bigg|bigl|bigr|Bigl|Bigr)\b\s*/g, '');

  // Spacing commands
  s = s.replace(/\\(,|;|:|!|\s)/g, ' ');
  s = s.replace(/\\(quad|qquad)\b/g, '  ');

  // Escaped braces / percent / dollar
  s = s.replace(/\\\{/g, '{').replace(/\\\}/g, '}').replace(/\\%/g, '%').replace(/\\\$/g, '$');

  // Blackboard bold \mathbb{R}
  s = s.replace(/\\mathbb\{([A-Z])\}/g, (_, ch) => BLACKBOARD_MAP[ch] || ch);

  // Text / font wrappers
  s = s.replace(/\\(text|textrm|textit|textbf|mathrm|mathbf|mathit|mathcal|operatorname)\{([^{}]*)\}/g, '$2');

  // Accents
  s = s.replace(/\\hat\{([^{}])\}/g, '$1̂');
  s = s.replace(/\\bar\{([^{}])\}/g, '$1̄');
  s = s.replace(/\\vec\{([^{}])\}/g, '$1⃗');
  s = s.replace(/\\tilde\{([^{}])\}/g, '$1̃');

  // Replace \sqrt{...} for inline plain text
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^{}]*)\}/g, (_, idx, rad) => {
    const cleanIdx = mathToInlineString(idx);
    const cleanRad = mathToInlineString(rad);
    const supIdx = canConvertToUnicodeSuper(cleanIdx) ? toUnicodeSuper(cleanIdx) : `(${cleanIdx})`;
    return `${supIdx}√(${cleanRad})`;
  });
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, (_, rad) => {
    const cleanRad = mathToInlineString(rad);
    return cleanRad.length <= 2 ? `√${cleanRad}` : `√(${cleanRad})`;
  });

  // Replace \frac{a}{b} for inline plain text
  s = s.replace(/\\(d|t|c)?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, _t, num, den) => {
    const n = mathToInlineString(num).trim();
    const d = mathToInlineString(den).trim();
    if (n === '1' && d === '2') return '½';
    if (n === '1' && d === '3') return '⅓';
    if (n === '2' && d === '3') return '⅔';
    if (n === '1' && d === '4') return '¼';
    if (n === '3' && d === '4') return '¾';
    const nWrap = n.length > 2 && /[+\-−]/.test(n) ? `(${n})` : n;
    const dWrap = d.length > 2 && /[+\-−*/]/.test(d) ? `(${d})` : d;
    return `${nWrap}/${dWrap}`;
  });

  // Known symbols (\alpha, \times, \leq, etc.)
  s = s.replace(/\\([a-zA-Z]+)\b/g, (full, cmd) => {
    if (LATEX_SYMBOLS[cmd] !== undefined) return LATEX_SYMBOLS[cmd];
    if (IGNORED_CMDS.has(cmd) || SIZING_Scale[cmd] !== undefined) return '';
    return cmd;
  });

  // Braced superscripts: ^{...}
  s = s.replace(/\^\{([^{}]*)\}/g, (_, exp) => {
    const cleanExp = mathToInlineString(exp).trim();
    if (canConvertToUnicodeSuper(cleanExp)) return toUnicodeSuper(cleanExp);
    return `^(${cleanExp})`;
  });

  // Single-char superscripts: ^2, ^n
  s = s.replace(/\^([0-9a-zA-Z+\-])/g, (_, exp) => {
    if (SUPERSCRIPT_MAP[exp]) return SUPERSCRIPT_MAP[exp];
    return `^${exp}`;
  });

  // Braced subscripts: _{...}
  s = s.replace(/_\{([^{}]*)\}/g, (_, sub) => {
    const cleanSub = mathToInlineString(sub).trim();
    if (canConvertToUnicodeSub(cleanSub)) return toUnicodeSub(cleanSub);
    return `_(${cleanSub})`;
  });

  // Single-char subscripts: _1, _n
  s = s.replace(/_([0-9a-zA-Z+\-])/g, (_, sub) => {
    if (SUBSCRIPT_MAP[sub]) return SUBSCRIPT_MAP[sub];
    return `_${sub}`;
  });

  // Clean remaining stray braces & normalize minus sign in math
  s = s.replace(/[{}]/g, '');
  s = s.replace(/\s*-\s*/g, (m) => (m.includes(' ') ? ' − ' : '−'));

  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Full structural LaTeX parser producing a tree of MathNodes for 2D rendering
 * (stacked fractions, vinculum square roots, matrices, raised exponents, etc.)
 */
function parseMathNodes(latex: string): MathNode[] {
  const nodes: MathNode[] = [];
  let i = 0;
  const s = latex.trim();

  let buffer = '';
  const flushBuffer = () => {
    if (buffer) {
      // Normalize binary minus spacing in math buffer
      const formatted = buffer
        .replace(/([0-9a-zA-Z)\]}¹²³⁴⁵⁶⁷⁸⁹⁰])\s*-\s*(?=[0-9a-zA-Z(\[{])/g, '$1 − ')
        .replace(/^-\s*/g, '−');
      nodes.push({ type: 'text', value: formatted });
      buffer = '';
    }
  };

  const popLastBase = (): MathNode[] => {
    if (buffer.length > 0) {
      // Pop last character or parenthesized group from buffer as the base for ^ or _
      const lastChar = buffer[buffer.length - 1];
      buffer = buffer.slice(0, -1);
      flushBuffer();
      return [{ type: 'text', value: lastChar }];
    }
    if (nodes.length > 0) {
      const last = nodes.pop()!;
      return [last];
    }
    return [];
  };

  while (i < s.length) {
    const ch = s[i];

    // Skip stray $ inside already-delimited math
    if (ch === '$') {
      i++;
      continue;
    }

    // Backslash commands
    if (ch === '\\') {
      // Line break \\ inside math
      if (s[i + 1] === '\\') {
        buffer += '\n';
        i += 2;
        continue;
      }

      // Escaped literal characters: \{, \}, \%, \$, \&, \_
      if (i + 1 < s.length && /[{}$%&_#]/.test(s[i + 1])) {
        buffer += s[i + 1];
        i += 2;
        continue;
      }

      // Spacing commands \, \; \: \! \<space>
      if (i + 1 < s.length && /[,;:! ]/.test(s[i + 1])) {
        if (s[i + 1] !== '!') buffer += ' ';
        i += 2;
        continue;
      }

      // Read command name
      const cmdMatch = s.slice(i + 1).match(/^[a-zA-Z]+/);
      if (!cmdMatch) {
        i++;
        continue;
      }
      const cmd = cmdMatch[0];
      let nextIdx = i + 1 + cmd.length;

      // Consume optional single space after command if not followed by { or [
      if (SIZING_Scale[cmd] !== undefined || IGNORED_CMDS.has(cmd)) {
        while (nextIdx < s.length && s[nextIdx] === ' ') nextIdx++;
        // If \left or \right followed by delimiter like \( \) \{ \} \| .
        if (cmd === 'left' || cmd === 'right') {
          if (s[nextIdx] === '.') {
            nextIdx++;
          } else if (s[nextIdx] === '\\' && (s[nextIdx + 1] === '{' || s[nextIdx + 1] === '}' || s[nextIdx + 1] === '|')) {
            buffer += s[nextIdx + 1] === '|' ? '‖' : s[nextIdx + 1];
            nextIdx += 2;
          }
        }
        i = nextIdx;
        continue;
      }

      // Environments: \begin{...} ... \end{...}
      if (cmd === 'begin') {
        const envGroup = readBraced(s, nextIdx);
        if (envGroup) {
          const envName = envGroup.content.trim();
          const endTag = `\\end{${envName}}`;
          const endPos = s.indexOf(endTag, envGroup.nextIdx);
          const body = endPos !== -1
            ? s.slice(envGroup.nextIdx, endPos)
            : s.slice(envGroup.nextIdx);
          i = endPos !== -1 ? endPos + endTag.length : s.length;

          flushBuffer();
          const rawRows = body.split(/\\\\/).map((r) => r.trim()).filter(Boolean);
          const parsedRows = rawRows.map((rowStr) =>
            rowStr.split('&').map((cell) => parseMathNodes(cell.trim()))
          );
          let bracket: 'p' | 'b' | 'B' | 'v' | 'V' | 'cases' | 'align' = 'align';
          if (envName === 'pmatrix') bracket = 'p';
          else if (envName === 'bmatrix') bracket = 'b';
          else if (envName === 'Bmatrix') bracket = 'B';
          else if (envName === 'vmatrix') bracket = 'v';
          else if (envName === 'Vmatrix') bracket = 'V';
          else if (envName === 'cases') bracket = 'cases';
          nodes.push({ type: 'matrix', rows: parsedRows, bracket });
          continue;
        }
      }

      // Fractions: \frac{num}{den}, \dfrac, \tfrac, \cfrac
      if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac' || cmd === 'cfrac') {
        const numGroup = readBraced(s, nextIdx);
        if (numGroup) {
          const denGroup = readBraced(s, numGroup.nextIdx);
          if (denGroup) {
            flushBuffer();
            nodes.push({
              type: 'frac',
              num: parseMathNodes(numGroup.content),
              den: parseMathNodes(denGroup.content),
            });
            i = denGroup.nextIdx;
            continue;
          }
        }
      }

      // Binomial: \binom{n}{k}
      if (cmd === 'binom') {
        const topGroup = readBraced(s, nextIdx);
        if (topGroup) {
          const botGroup = readBraced(s, topGroup.nextIdx);
          if (botGroup) {
            flushBuffer();
            nodes.push({
              type: 'binom',
              top: parseMathNodes(topGroup.content),
              bottom: parseMathNodes(botGroup.content),
            });
            i = botGroup.nextIdx;
            continue;
          }
        }
      }

      // Square root: \sqrt[n]{x} or \sqrt{x}
      if (cmd === 'sqrt') {
        const optIdx = readBracketed(s, nextIdx);
        const radStart = optIdx ? optIdx.nextIdx : nextIdx;
        const radGroup = readBraced(s, radStart);
        if (radGroup) {
          flushBuffer();
          nodes.push({
            type: 'sqrt',
            index: optIdx ? parseMathNodes(optIdx.content) : undefined,
            radicand: parseMathNodes(radGroup.content),
          });
          i = radGroup.nextIdx;
          continue;
        }
      }

      // Overline / Underline / Boxed
      if (cmd === 'overline' || cmd === 'underline' || cmd === 'boxed') {
        const grp = readBraced(s, nextIdx);
        if (grp) {
          flushBuffer();
          nodes.push({
            type: cmd,
            inner: parseMathNodes(grp.content),
          });
          i = grp.nextIdx;
          continue;
        }
      }

      // Accents: \hat{x}, \bar{x}, \vec{x}, \tilde{x}, \dot{x}
      if (cmd === 'hat' || cmd === 'bar' || cmd === 'vec' || cmd === 'tilde' || cmd === 'dot') {
        const grp = readBraced(s, nextIdx);
        if (grp) {
          const innerTxt = mathToInlineString(grp.content);
          const combining =
            cmd === 'hat' ? '\u0302' :
            cmd === 'bar' ? '\u0304' :
            cmd === 'vec' ? '\u20D7' :
            cmd === 'tilde' ? '\u0303' : '\u0307';
          buffer += innerTxt + combining;
          i = grp.nextIdx;
          continue;
        }
      }

      // Blackboard bold: \mathbb{R}
      if (cmd === 'mathbb') {
        const grp = readBraced(s, nextIdx);
        if (grp) {
          const chKey = grp.content.trim();
          buffer += BLACKBOARD_MAP[chKey] || chKey;
          i = grp.nextIdx;
          continue;
        }
      }

      // Text / Styling commands: \text{...}, \mathbf{...}, \mathrm{...}, etc.
      if (
        cmd === 'text' || cmd === 'textrm' || cmd === 'mathrm' || cmd === 'operatorname' ||
        cmd === 'mathbf' || cmd === 'textbf' || cmd === 'mathit' || cmd === 'textit' || cmd === 'mathcal'
      ) {
        const grp = readBraced(s, nextIdx);
        if (grp) {
          flushBuffer();
          nodes.push({
            type: 'text',
            value: mathToInlineString(grp.content),
            bold: cmd === 'mathbf' || cmd === 'textbf',
            italic: cmd === 'mathit' || cmd === 'textit',
          });
          i = grp.nextIdx;
          continue;
        }
      }

      // Symbol lookup (\alpha, \times, \leq, \sum, \int, etc.)
      if (LATEX_SYMBOLS[cmd] !== undefined) {
        const sym = LATEX_SYMBOLS[cmd];
        // Add space around binary operators/relations if needed
        const isRelOrBin = /^(times|cdot|div|pm|mp|leq|le|geq|ge|neq|ne|approx|equiv|cong|sim|simeq|propto|rightarrow|to|leftarrow|leftrightarrow|Rightarrow|Leftarrow|Leftrightarrow|iff|implies|in|notin|subset|supset|subseteq|supseteq|cup|cap)$/.test(cmd);
        if (isRelOrBin) {
          if (buffer.length > 0 && !buffer.endsWith(' ')) buffer += ' ';
          buffer += sym + ' ';
        } else {
          buffer += sym;
          if (nextIdx < s.length && s[nextIdx] === ' ' && /[a-zA-Z0-9]/.test(s[nextIdx + 1] || '')) {
            buffer += ' ';
            nextIdx++;
          }
        }
        i = nextIdx;
        continue;
      }

      // Unknown command: strip backslash, keep text
      buffer += cmd;
      i = nextIdx;
      continue;
    }

    // Superscript ^ or Subscript _
    if (ch === '^' || ch === '_') {
      const isSup = ch === '^';
      let nextIdx = i + 1;
      while (nextIdx < s.length && s[nextIdx] === ' ') nextIdx++;

      let scriptContent = '';
      if (nextIdx < s.length && s[nextIdx] === '{') {
        const grp = readBraced(s, nextIdx);
        if (grp) {
          scriptContent = grp.content;
          nextIdx = grp.nextIdx;
        }
      } else if (nextIdx < s.length && s[nextIdx] === '\\') {
        const m = s.slice(nextIdx + 1).match(/^[a-zA-Z]+/);
        if (m) {
          scriptContent = '\\' + m[0];
          nextIdx += 1 + m[0].length;
        } else {
          scriptContent = s[nextIdx];
          nextIdx++;
        }
      } else if (nextIdx < s.length) {
        scriptContent = s[nextIdx];
        nextIdx++;
      }

      const inlineScript = mathToInlineString(scriptContent);
      // Fast path: if simple superscript/subscript, append Unicode directly to buffer!
      if (isSup && canConvertToUnicodeSuper(inlineScript)) {
        buffer += toUnicodeSuper(inlineScript);
        i = nextIdx;
        continue;
      }
      if (!isSup && canConvertToUnicodeSub(inlineScript)) {
        buffer += toUnicodeSub(inlineScript);
        i = nextIdx;
        continue;
      }

      // Structural superscript/subscript node
      const base = popLastBase();
      const parsedScript = parseMathNodes(scriptContent);
      if (isSup) {
        nodes.push({ type: 'sup', base, exp: parsedScript });
      } else {
        nodes.push({ type: 'sub', base, sub: parsedScript });
      }
      i = nextIdx;
      continue;
    }

    // Stray braces { ... } used for grouping
    if (ch === '{') {
      const grp = readBraced(s, i);
      if (grp) {
        flushBuffer();
        nodes.push(...parseMathNodes(grp.content));
        i = grp.nextIdx;
        continue;
      }
    }

    buffer += ch;
    i++;
  }

  flushBuffer();
  return nodes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Native Math Node Renderer
// ─────────────────────────────────────────────────────────────────────────────

function has2DMathNodes(nodes: MathNode[]): boolean {
  for (const n of nodes) {
    if (
      n.type === 'frac' ||
      n.type === 'binom' ||
      n.type === 'sqrt' ||
      n.type === 'matrix' ||
      n.type === 'boxed' ||
      n.type === 'overline' ||
      n.type === 'underline' ||
      n.type === 'sup' ||
      n.type === 'sub' ||
      n.type === 'subsup'
    ) {
      return true;
    }
  }
  return false;
}

function RenderMathNodeList({
  nodes,
  color,
  fontSize,
  bold,
  italic,
}: {
  nodes: MathNode[];
  color: string;
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <View style={s.mathRow}>
      {nodes.map((node, idx) => (
        <RenderSingleMathNode
          key={idx}
          node={node}
          color={color}
          fontSize={fontSize}
          bold={bold}
          italic={italic}
        />
      ))}
    </View>
  );
}

function RenderSingleMathNode({
  node,
  color,
  fontSize,
  bold,
  italic,
}: {
  node: MathNode;
  color: string;
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
}) {
  const fontWeight = (node.type === 'text' && node.bold) || bold ? '700' : '500';
  const fontStyle = (node.type === 'text' && node.italic) || italic ? 'italic' : 'normal';

  switch (node.type) {
    case 'text':
      return (
        <Text
          style={{
            color,
            fontSize,
            fontWeight,
            fontStyle,
            lineHeight: Math.round(fontSize * 1.4),
          }}
        >
          {node.value}
        </Text>
      );

    case 'frac': {
      const subFontSize = Math.max(Math.round(fontSize * 0.85), 11);
      return (
        <View style={s.fracContainer}>
          <View style={s.fracCell}>
            <RenderMathNodeList nodes={node.num} color={color} fontSize={subFontSize} bold={bold} />
          </View>
          <View style={[s.fracBar, { backgroundColor: color }]} />
          <View style={s.fracCell}>
            <RenderMathNodeList nodes={node.den} color={color} fontSize={subFontSize} bold={bold} />
          </View>
        </View>
      );
    }

    case 'binom': {
      const subFontSize = Math.max(Math.round(fontSize * 0.82), 11);
      return (
        <View style={s.mathRow}>
          <Text style={{ color, fontSize: Math.round(fontSize * 1.35), fontWeight: '300' }}>(</Text>
          <View style={s.fracContainer}>
            <View style={s.fracCell}>
              <RenderMathNodeList nodes={node.top} color={color} fontSize={subFontSize} bold={bold} />
            </View>
            <View style={s.fracCell}>
              <RenderMathNodeList nodes={node.bottom} color={color} fontSize={subFontSize} bold={bold} />
            </View>
          </View>
          <Text style={{ color, fontSize: Math.round(fontSize * 1.35), fontWeight: '300' }}>)</Text>
        </View>
      );
    }

    case 'sqrt': {
      const idxSize = Math.max(Math.round(fontSize * 0.65), 10);
      return (
        <View style={s.sqrtContainer}>
          {node.index && (
            <View style={{ marginBottom: Math.round(fontSize * 0.45), marginRight: -2 }}>
              <RenderMathNodeList nodes={node.index} color={color} fontSize={idxSize} bold={bold} />
            </View>
          )}
          <Text
            style={{
              color,
              fontSize: Math.round(fontSize * 1.12),
              fontWeight: '600',
              marginRight: 0.5,
            }}
          >
            √
          </Text>
          <View
            style={[
              s.sqrtRadicand,
              { borderTopColor: color },
            ]}
          >
            <RenderMathNodeList nodes={node.radicand} color={color} fontSize={fontSize} bold={bold} />
          </View>
        </View>
      );
    }

    case 'sup': {
      const expSize = Math.max(Math.round(fontSize * 0.72), 10);
      return (
        <View style={s.scriptContainer}>
          {node.base.length > 0 && (
            <RenderMathNodeList nodes={node.base} color={color} fontSize={fontSize} bold={bold} />
          )}
          <View style={{ transform: [{ translateY: -Math.round(fontSize * 0.32) }], marginLeft: 1 }}>
            <RenderMathNodeList nodes={node.exp} color={color} fontSize={expSize} bold={bold} />
          </View>
        </View>
      );
    }

    case 'sub': {
      const subSize = Math.max(Math.round(fontSize * 0.72), 10);
      return (
        <View style={s.scriptContainer}>
          {node.base.length > 0 && (
            <RenderMathNodeList nodes={node.base} color={color} fontSize={fontSize} bold={bold} />
          )}
          <View style={{ transform: [{ translateY: Math.round(fontSize * 0.22) }], marginLeft: 1 }}>
            <RenderMathNodeList nodes={node.sub} color={color} fontSize={subSize} bold={bold} />
          </View>
        </View>
      );
    }

    case 'subsup': {
      const scriptSize = Math.max(Math.round(fontSize * 0.7), 10);
      return (
        <View style={s.scriptContainer}>
          {node.base.length > 0 && (
            <RenderMathNodeList nodes={node.base} color={color} fontSize={fontSize} bold={bold} />
          )}
          <View style={{ flexDirection: 'column', justifyContent: 'center', marginLeft: 1 }}>
            <RenderMathNodeList nodes={node.sup} color={color} fontSize={scriptSize} bold={bold} />
            <RenderMathNodeList nodes={node.sub} color={color} fontSize={scriptSize} bold={bold} />
          </View>
        </View>
      );
    }

    case 'overline':
      return (
        <View style={{ borderTopWidth: 1.5, borderTopColor: color, paddingTop: 1 }}>
          <RenderMathNodeList nodes={node.inner} color={color} fontSize={fontSize} bold={bold} />
        </View>
      );

    case 'underline':
      return (
        <View style={{ borderBottomWidth: 1.5, borderBottomColor: color, paddingBottom: 1 }}>
          <RenderMathNodeList nodes={node.inner} color={color} fontSize={fontSize} bold={bold} />
        </View>
      );

    case 'boxed':
      return (
        <View
          style={{
            borderWidth: 1.5,
            borderColor: '#007AFF',
            backgroundColor: 'rgba(0,122,255,0.06)',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
            marginHorizontal: 2,
          }}
        >
          <RenderMathNodeList nodes={node.inner} color={color} fontSize={fontSize} bold={bold} />
        </View>
      );

    case 'matrix': {
      const leftDelim =
        node.bracket === 'p' ? '(' :
        node.bracket === 'b' ? '[' :
        node.bracket === 'B' || node.bracket === 'cases' ? '{' :
        node.bracket === 'v' ? '|' :
        node.bracket === 'V' ? '‖' : '';
      const rightDelim =
        node.bracket === 'p' ? ')' :
        node.bracket === 'b' ? ']' :
        node.bracket === 'B' ? '}' :
        node.bracket === 'v' ? '|' :
        node.bracket === 'V' ? '‖' : '';

      return (
        <View style={[s.mathRow, { marginVertical: 4 }]}>
          {leftDelim ? (
            <Text style={{ color, fontSize: Math.round(fontSize * 1.4), fontWeight: '300', marginRight: 4 }}>
              {leftDelim}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'column', gap: 4 }}>
            {node.rows.map((row, rIdx) => (
              <View key={rIdx} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {row.map((cell, cIdx) => (
                  <View key={cIdx} style={{ alignItems: cIdx === 0 ? 'flex-start' : 'center' }}>
                    <RenderMathNodeList nodes={cell} color={color} fontSize={fontSize} bold={bold} />
                  </View>
                ))}
              </View>
            ))}
          </View>
          {rightDelim ? (
            <Text style={{ color, fontSize: Math.round(fontSize * 1.4), fontWeight: '300', marginLeft: 4 }}>
              {rightDelim}
            </Text>
          ) : null}
        </View>
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Markdown + Math Tokenizer
// ─────────────────────────────────────────────────────────────────────────────

type InlineSpan =
  | { kind: 'text'; text: string; bold?: boolean; italic?: boolean; strike?: boolean }
  | { kind: 'code'; text: string }
  | { kind: 'math'; latex: string; bold?: boolean; italic?: boolean };

/**
 * Normalize streaming text so unclosed bold/math delimiters at the very end of
 * an active stream render cleanly without flashing raw `**` or `$$` to the user.
 */
function normalizeStreamingMarkdown(raw: string): string {
  if (!raw) return '';
  let text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Convert \( ... \) to $ ... $ and \[ ... \] to $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

  // If streaming ends with an unclosed \[ or \(
  if (/\\\[(?![\s\S]*\\\])[\s\S]*$/.test(text)) {
    text = text.replace(/\\\[((?:(?!\\\])[\s\S])*)$/, '$$$$$1$$$$');
  }
  if (/\\\((?![\s\S]*\\\))[^\n]*$/.test(text)) {
    text = text.replace(/\\\(((?:(?!\\\))[^\n])*)$/, '$$$1$$');
  }

  // Balance unclosed $$ at the end of streaming text
  const doubleDollarMatches = text.match(/\$\$/g);
  if (doubleDollarMatches && doubleDollarMatches.length % 2 === 1) {
    text += '$$';
  }

  // Ensure display math $$...$$ that starts after text on the same line breaks onto its own block
  text = text.replace(/([^\n])\s*(\$\$[\s\S]+?\$\$)/g, '$1\n$2');
  text = text.replace(/(\$\$[\s\S]+?\$\$)\s*([^\n])/g, '$1\n$2');

  return text;
}

/**
 * Parses inline markdown (`**bold**`, `*italic*`, `` `code` ``, `~~strike~~`) and
 * inline math (`$...$`), including math nested inside `**...**`!
 */
function parseInlineSpans(line: string, inheritedBold = false, inheritedItalic = false): InlineSpan[] {
  if (!line) return [];
  const spans: InlineSpan[] = [];

  // Auto-wrap bare LaTeX commands (e.g. \sqrt{x}, \frac{1}{2}) if not already inside $...$
  const prepared = wrapBareInlineLaTeX(line);

  const tokenRegex =
    /(`[^`]+`)|(\*\*\*[\s\S]+?\*\*\*)|(\*\*[\s\S]+?\*\*)|(\*[^*\n]+?\*)|(~~[\s\S]+?~~)|(\$[^$\n]+?\$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(prepared)) !== null) {
    if (match.index > lastIndex) {
      spans.push({
        kind: 'text',
        text: prepared.slice(lastIndex, match.index),
        bold: inheritedBold,
        italic: inheritedItalic,
      });
    }

    const full = match[0];
    if (match[1]) {
      // `code`
      spans.push({ kind: 'code', text: full.slice(1, -1) });
    } else if (match[2]) {
      // ***bold italic***
      spans.push(...parseInlineSpans(full.slice(3, -3), true, true));
    } else if (match[3]) {
      // **bold** (may contain $math$ inside!)
      spans.push(...parseInlineSpans(full.slice(2, -2), true, inheritedItalic));
    } else if (match[4]) {
      // *italic* (may contain $math$ inside!)
      spans.push(...parseInlineSpans(full.slice(1, -1), inheritedBold, true));
    } else if (match[5]) {
      // ~~strike~~
      spans.push({
        kind: 'text',
        text: full.slice(2, -2),
        bold: inheritedBold,
        italic: inheritedItalic,
        strike: true,
      });
    } else if (match[6]) {
      // $math$
      spans.push({
        kind: 'math',
        latex: full.slice(1, -1),
        bold: inheritedBold,
        italic: inheritedItalic,
      });
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < prepared.length) {
    let tail = prepared.slice(lastIndex);
    // Clean up unclosed trailing streaming markers (e.g. trailing `**` or `$`)
    if (tail.startsWith('**') && tail.length > 2) {
      spans.push(...parseInlineSpans(tail.slice(2), true, inheritedItalic));
    } else if (tail.startsWith('$') && tail.length > 1) {
      spans.push({
        kind: 'math',
        latex: tail.slice(1),
        bold: inheritedBold,
        italic: inheritedItalic,
      });
    } else {
      // Strip lone trailing * or $ at the very end of a stream chunk
      tail = tail.replace(/(\*{1,2}|\$)$/, '');
      if (tail) {
        spans.push({
          kind: 'text',
          text: tail,
          bold: inheritedBold,
          italic: inheritedItalic,
        });
      }
    }
  }

  return spans;
}

function wrapBareInlineLaTeX(text: string): string {
  // Protect existing $...$ and `...` spans first
  const placeholders: string[] = [];
  let safe = text.replace(/(`[^`]+`|\$[^$\n]+\$)/g, (m) => {
    const id = `\x00P${placeholders.length}\x00`;
    placeholders.push(m);
    return id;
  });

  // Wrap bare \sqrt{...} or \frac{...}{...} outside $...$
  safe = safe.replace(
    /\\(frac|dfrac|tfrac)\{[^{}]*\}\{[^{}]*\}|\\sqrt(?:\[[^\]]*\])?\{[^{}]*\}/g,
    (m) => `$${m}$`
  );

  // Restore placeholders
  return safe.replace(/\x00P(\d+)\x00/g, (_, idx) => placeholders[Number(idx)] || '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Block-Level Markdown + Math Parser
// ─────────────────────────────────────────────────────────────────────────────

type BlockNode =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'displayMath'; latex: string }
  | { type: 'bulletList'; items: string[] }
  | { type: 'orderedList'; items: { index: string; text: string }[] }
  | { type: 'blockquote'; text: string }
  | { type: 'codeBlock'; language: string; code: string }
  | { type: 'hr' }
  | { type: 'table'; headers: string[]; rows: string[][] };

function parseBlocks(rawContent: string): BlockNode[] {
  const normalized = normalizeStreamingMarkdown(rawContent);
  if (!normalized.trim()) return [];

  const lines = normalized.split('\n');
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // 1. Empty line
    if (!line) {
      i++;
      continue;
    }

    // 2. Fenced Code Block ```lang ... ```
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      blocks.push({ type: 'codeBlock', language, code: codeLines.join('\n') });
      continue;
    }

    // 3. Display Math Block $$ ... $$ (single-line or multi-line)
    if (line.startsWith('$$')) {
      if (line.endsWith('$$') && line.length > 4) {
        blocks.push({ type: 'displayMath', latex: line.slice(2, -2).trim() });
        i++;
        continue;
      }
      // Multi-line $$ ... $$
      const mathLines: string[] = [line.slice(2)];
      i++;
      while (i < lines.length) {
        const cur = lines[i].trim();
        if (cur.endsWith('$$')) {
          mathLines.push(cur.slice(0, -2));
          i++;
          break;
        }
        mathLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'displayMath', latex: mathLines.join('\n').trim() });
      continue;
    }

    // 4. Standalone LaTeX \begin{...} ... \end{...} block
    if (/^\\begin\{(equation|align|aligned|gather|pmatrix|bmatrix|Bmatrix|vmatrix|cases)\*?\}/.test(line)) {
      const envMatch = line.match(/^\\begin\{([^}]+)\}/);
      const envName = envMatch ? envMatch[1] : 'align';
      const endTag = `\\end{${envName}}`;
      const mathLines: string[] = [rawLine];
      if (!line.includes(endTag)) {
        i++;
        while (i < lines.length) {
          mathLines.push(lines[i]);
          if (lines[i].includes(endTag)) {
            i++;
            break;
          }
          i++;
        }
      } else {
        i++;
      }
      blocks.push({ type: 'displayMath', latex: mathLines.join('\n').trim() });
      continue;
    }

    // 5. Horizontal Rule (---, ***, ___)
    if (/^([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line) && !line.includes('$')) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 6. ATX Heading (#, ##, ###, ####, #####, ######)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].replace(/\s+#+\s*$/, '').trim(),
      });
      i++;
      continue;
    }

    // 7. Blockquote (> ...)
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join('\n') });
      continue;
    }

    // 8. Markdown Table (| col1 | col2 |)
    if (line.startsWith('|') && line.endsWith('|') && line.split('|').length >= 3) {
      const parseRow = (r: string) =>
        r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const headers = parseRow(line);
      i++;
      // Skip separator row |---|---| if present
      if (i < lines.length && /^\|?[\s\-:|]+\|[\s\-:|]+$/.test(lines[i].trim())) {
        i++;
      }
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // 9. Bullet List (- item, * item, • item)
    if (/^[-*•]\s+\S/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        const m = cur.match(/^[-*•]\s+(.*)$/);
        if (m) {
          items.push(m[1].trim());
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: 'bulletList', items });
      continue;
    }

    // 10. Ordered List (1. item, 1) item)
    if (/^\d+[.)]\s+\S/.test(line)) {
      const items: { index: string; text: string }[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        const m = cur.match(/^(\d+)[.)]\s+(.*)$/);
        if (m) {
          items.push({ index: m[1], text: m[2].trim() });
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: 'orderedList', items });
      continue;
    }

    // 11. Paragraph (collect consecutive regular lines)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        !cur ||
        cur.startsWith('```') ||
        cur.startsWith('$$') ||
        cur.startsWith('>') ||
        /^#{1,6}\s+/.test(cur) ||
        /^[-*•]\s+\S/.test(cur) ||
        /^\d+[.)]\s+\S/.test(cur) ||
        (/^([-*_])\s*\1\s*\1[\s\-*_]*$/.test(cur) && !cur.includes('$')) ||
        (cur.startsWith('|') && cur.endsWith('|') && cur.split('|').length >= 3)
      ) {
        break;
      }
      paraLines.push(cur);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paraLines.join('\n') });
    } else {
      i++;
    }
  }

  return blocks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Rich Content Renderer
// ─────────────────────────────────────────────────────────────────────────────

function InlineRichText({
  text,
  color,
  fontSize,
  isDark,
  textAlign = 'left',
  baseFontWeight = '400',
}: {
  text: string;
  color: string;
  fontSize: number;
  isDark: boolean;
  textAlign?: 'left' | 'center' | 'right';
  baseFontWeight?: '400' | '500' | '600' | '700' | '800';
}) {
  const spans = useMemo(() => parseInlineSpans(text), [text]);
  const lineHeight = Math.round(fontSize * 1.52);

  // Check if any inline math span requires 2D view rendering (like \frac or \sqrt with vinculum)
  const needsFlexWrap = useMemo(() => {
    for (const sp of spans) {
      if (sp.kind === 'math') {
        const { cleaned } = extractLeadingScale(sp.latex);
        const nodes = parseMathNodes(cleaned);
        if (has2DMathNodes(nodes)) return true;
      }
    }
    return false;
  }, [spans]);

  // Fast & seamless pure-<Text> path when all inline math can be represented in inline typography
  if (!needsFlexWrap) {
    return (
      <Text
        style={{
          color,
          fontSize,
          lineHeight,
          textAlign,
          fontWeight: baseFontWeight,
        }}
      >
        {spans.map((sp, idx) => {
          if (sp.kind === 'code') {
            return (
              <Text
                key={idx}
                style={{
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  fontSize: Math.round(fontSize * 0.9),
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  color: isDark ? '#93C5FD' : '#0066CC',
                  fontWeight: '600',
                }}
              >
                {` ${sp.text} `}
              </Text>
            );
          }

          if (sp.kind === 'math') {
            const { cleaned, scale } = extractLeadingScale(sp.latex);
            const inlineMathStr = mathToInlineString(cleaned);
            return (
              <Text
                key={idx}
                style={{
                  color,
                  fontSize: Math.round(fontSize * scale),
                  fontWeight: sp.bold ? '700' : '600',
                  fontStyle: sp.italic ? 'italic' : 'normal',
                }}
              >
                {inlineMathStr}
              </Text>
            );
          }

          return (
            <Text
              key={idx}
              style={{
                color,
                fontSize,
                fontWeight: sp.bold ? '700' : baseFontWeight,
                fontStyle: sp.italic ? 'italic' : 'normal',
                textDecorationLine: sp.strike ? 'line-through' : 'none',
              }}
            >
              {sp.text}
            </Text>
          );
        })}
      </Text>
    );
  }

  // Hybrid inline flex-wrap row when 2D math nodes (\frac, \sqrt with vinculum, etc.) appear inline
  return (
    <View
      style={[
        s.inlineWrapContainer,
        textAlign === 'center' && { justifyContent: 'center' },
      ]}
    >
      {spans.map((sp, idx) => {
        if (sp.kind === 'code') {
          return (
            <View
              key={idx}
              style={[
                s.inlineCodePill,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' },
              ]}
            >
              <Text
                style={{
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  fontSize: Math.round(fontSize * 0.88),
                  color: isDark ? '#93C5FD' : '#0066CC',
                  fontWeight: '600',
                }}
              >
                {sp.text}
              </Text>
            </View>
          );
        }

        if (sp.kind === 'math') {
          const { cleaned, scale } = extractLeadingScale(sp.latex);
          const nodes = parseMathNodes(cleaned);
          return (
            <View key={idx} style={{ marginHorizontal: 1, justifyContent: 'center' }}>
              <RenderMathNodeList
                nodes={nodes}
                color={color}
                fontSize={Math.round(fontSize * scale)}
                bold={sp.bold}
                italic={sp.italic}
              />
            </View>
          );
        }

        // Split plain text by words so flex-wrap wraps naturally at word boundaries
        const words = sp.text.split(/(\s+)/);
        return words.map((word, wIdx) => {
          if (!word) return null;
          return (
            <Text
              key={`${idx}-${wIdx}`}
              style={{
                color,
                fontSize,
                lineHeight,
                fontWeight: sp.bold ? '700' : baseFontWeight,
                fontStyle: sp.italic ? 'italic' : 'normal',
                textDecorationLine: sp.strike ? 'line-through' : 'none',
              }}
            >
              {word}
            </Text>
          );
        });
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main MathText Component
// ─────────────────────────────────────────────────────────────────────────────

export function MathText({
  content = '',
  color,
  fontSize = 15,
  containerStyle,
  textAlign,
  fontWeight = '400',
}: MathTextProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const C = { text: isDark ? '#F3F4F6' : '#0F172A', textTertiary: isDark ? '#9CA3AF' : '#64748B' };

  // Resolve color safely for light/dark modes
  const resolvedColor = useMemo(() => {
    if (!color) return C.text;
    if (color === 'white' || color === '#FFF' || color === '#fff') return '#FFFFFF';
    if (color === 'black' || color === '#000') return '#0F172A';
    // If default '#121212' was used in dark mode, adapt to dark theme text
    if (color === '#121212' && isDark) return C.text;
    return color;
  }, [color, isDark, C.text]);

  const effectiveAlign: 'left' | 'center' | 'right' =
    textAlign || (containerStyle?.textAlign as any) || 'left';

  const blocks = useMemo(() => parseBlocks(content), [content]);

  if (!content || blocks.length === 0) {
    return null;
  }

  return (
    <View style={[s.root, containerStyle]}>
      {blocks.map((block, bIdx) => {
        const isFirst = bIdx === 0;
        const isLast = bIdx === blocks.length - 1;

        switch (block.type) {
          case 'heading': {
            const scale =
              block.level === 1 ? 1.28 :
              block.level === 2 ? 1.16 :
              block.level === 3 ? 1.08 : 1.02;
            const hFontSize = Math.round(fontSize * scale);
            return (
              <View
                key={bIdx}
                style={{
                  marginTop: isFirst ? 2 : 14,
                  marginBottom: 6,
                }}
              >
                <InlineRichText
                  text={block.text}
                  color={resolvedColor}
                  fontSize={hFontSize}
                  isDark={isDark}
                  textAlign={effectiveAlign}
                  baseFontWeight="700"
                />
              </View>
            );
          }

          case 'displayMath': {
            const { cleaned, scale } = extractLeadingScale(block.latex);
            const nodes = parseMathNodes(cleaned);
            const mathFontSize = Math.round(fontSize * Math.max(scale, 1.08));
            return (
              <View
                key={bIdx}
                style={[
                  s.displayMathCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)',
                    marginTop: isFirst ? 4 : 8,
                    marginBottom: isLast ? 2 : 10,
                  },
                ]}
              >
                <RenderMathNodeList
                  nodes={nodes}
                  color={resolvedColor}
                  fontSize={mathFontSize}
                  bold={false}
                />
              </View>
            );
          }

          case 'bulletList':
            return (
              <View
                key={bIdx}
                style={{
                  marginTop: isFirst ? 2 : 4,
                  marginBottom: isLast ? 0 : 8,
                  gap: 6,
                }}
              >
                {block.items.map((item, idx) => (
                  <View key={idx} style={s.listItemRow}>
                    <View
                      style={[
                        s.bulletDot,
                        {
                          backgroundColor: '#007AFF',
                          marginTop: Math.round(fontSize * 0.55),
                        },
                      ]}
                    />
                    <View style={s.listItemContent}>
                      <InlineRichText
                        text={item}
                        color={resolvedColor}
                        fontSize={fontSize}
                        isDark={isDark}
                        baseFontWeight={fontWeight}
                      />
                    </View>
                  </View>
                ))}
              </View>
            );

          case 'orderedList':
            return (
              <View
                key={bIdx}
                style={{
                  marginTop: isFirst ? 2 : 4,
                  marginBottom: isLast ? 0 : 8,
                  gap: 8,
                }}
              >
                {block.items.map((item, idx) => (
                  <View key={idx} style={s.listItemRow}>
                    <View
                      style={[
                        s.orderedBadge,
                        {
                          backgroundColor: isDark ? 'rgba(0,122,255,0.18)' : '#E5F1FF',
                        },
                      ]}
                    >
                      <Text style={s.orderedBadgeText}>{item.index}</Text>
                    </View>
                    <View style={s.listItemContent}>
                      <InlineRichText
                        text={item.text}
                        color={resolvedColor}
                        fontSize={fontSize}
                        isDark={isDark}
                        baseFontWeight={fontWeight}
                      />
                    </View>
                  </View>
                ))}
              </View>
            );

          case 'blockquote':
            return (
              <View
                key={bIdx}
                style={[
                  s.blockquote,
                  {
                    backgroundColor: isDark ? 'rgba(0,122,255,0.08)' : '#F0F7FF',
                    borderLeftColor: '#007AFF',
                    marginTop: isFirst ? 2 : 6,
                    marginBottom: isLast ? 0 : 8,
                  },
                ]}
              >
                <InlineRichText
                  text={block.text}
                  color={resolvedColor}
                  fontSize={fontSize}
                  isDark={isDark}
                  baseFontWeight={fontWeight}
                />
              </View>
            );

          case 'codeBlock':
            return (
              <View
                key={bIdx}
                style={[
                  s.codeBlock,
                  {
                    backgroundColor: isDark ? '#111318' : '#F1F5F9',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                    marginTop: isFirst ? 2 : 6,
                    marginBottom: isLast ? 0 : 8,
                  },
                ]}
              >
                {block.language ? (
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      color: C.textTertiary,
                      marginBottom: 4,
                    }}
                  >
                    {block.language}
                  </Text>
                ) : null}
                <Text
                  style={{
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    fontSize: Math.round(fontSize * 0.88),
                    lineHeight: Math.round(fontSize * 1.4),
                    color: resolvedColor,
                  }}
                >
                  {block.code}
                </Text>
              </View>
            );

          case 'table':
            return (
              <View
                key={bIdx}
                style={[
                  s.tableContainer,
                  {
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                    marginVertical: 8,
                  },
                ]}
              >
                <View
                  style={[
                    s.tableRow,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC',
                      borderBottomWidth: 1,
                      borderBottomColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                    },
                  ]}
                >
                  {block.headers.map((h, hIdx) => (
                    <View key={hIdx} style={s.tableCell}>
                      <InlineRichText
                        text={h}
                        color={resolvedColor}
                        fontSize={Math.round(fontSize * 0.9)}
                        isDark={isDark}
                        baseFontWeight="700"
                      />
                    </View>
                  ))}
                </View>
                {block.rows.map((r, rIdx) => (
                  <View
                    key={rIdx}
                    style={[
                      s.tableRow,
                      rIdx < block.rows.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                      },
                    ]}
                  >
                    {r.map((cell, cIdx) => (
                      <View key={cIdx} style={s.tableCell}>
                        <InlineRichText
                          text={cell}
                          color={resolvedColor}
                          fontSize={Math.round(fontSize * 0.9)}
                          isDark={isDark}
                        />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            );

          case 'hr':
            return (
              <View
                key={bIdx}
                style={{
                  height: 1,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  marginVertical: 10,
                }}
              />
            );

          case 'paragraph':
          default: {
            const subLines = block.text.split('\n');
            return (
              <View
                key={bIdx}
                style={{
                  marginBottom: isLast ? 0 : 8,
                  gap: 3,
                }}
              >
                {subLines.map((ln, lIdx) => (
                  <InlineRichText
                    key={lIdx}
                    text={ln}
                    color={resolvedColor}
                    fontSize={fontSize}
                    isDark={isDark}
                    textAlign={effectiveAlign}
                    baseFontWeight={fontWeight}
                  />
                ))}
              </View>
            );
          }
        }
      })}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    width: '100%',
  },
  inlineWrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  inlineCodePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  displayMathCard: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mathRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  fracContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
    paddingVertical: 1,
  },
  fracCell: {
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fracBar: {
    height: 1.5,
    width: '100%',
    minWidth: 12,
    marginVertical: 1.5,
    borderRadius: 1,
  },
  sqrtContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 1,
  },
  sqrtRadicand: {
    borderTopWidth: 1.5,
    paddingTop: 1,
    paddingHorizontal: 2,
  },
  scriptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
    marginLeft: 2,
    flexShrink: 0,
  },
  orderedBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
    flexShrink: 0,
  },
  orderedBadgeText: {
    color: '#007AFF',
    fontSize: 11,
    fontWeight: '800',
  },
  listItemContent: {
    flex: 1,
  },
  blockquote: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
    paddingRight: 10,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  codeBlock: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
});