import React from 'react';
import { View, useColorScheme } from 'react-native';
import { WebView } from 'react-native-webview';
import { KATEX_CSS, KATEX_JS, KATEX_AUTO_RENDER } from './katex-assets';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MathTextProps {
  content: string;
  color?: string;
  fontSize?: number;
  containerStyle?: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// protectMathBlocks / restoreMathBlocks
//
// FIX #1 (root cause of \frac{\$partial^2$ u}):
// Before ANY pre-processing regex runs, snapshot every existing $...$ and
// $$...$$ span into a placeholder.  This makes every subsequent regex
// incapable of touching math that is already correctly delimited.
// ─────────────────────────────────────────────────────────────────────────────

function protectMathBlocks(text: string): { safe: string; map: Map<string, string> } {
  const map = new Map<string, string>();
  let n = 0;

  // $$...$$ must be extracted before $...$ to avoid partial matches
  let safe = text.replace(/\$\$[\s\S]*?\$\$/g, (m) => {
    const k = `\x00MATHD${n++}\x00`;
    map.set(k, m);
    return k;
  });

  // $...$ — single-line only (don't swallow paragraph breaks)
  safe = safe.replace(/\$[^$\n]+?\$/g, (m) => {
    const k = `\x00MATHS${n++}\x00`;
    map.set(k, m);
    return k;
  });

  return { safe, map };
}

function restoreMathBlocks(text: string, map: Map<string, string>): string {
  let result = text;
  map.forEach((value, key) => {
    // Use split/join to handle multiple occurrences safely
    result = result.split(key).join(value);
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// \begin{...}\end{...} environment protection
// Prevents multi-line environments from being split by the paragraph splitter
// ─────────────────────────────────────────────────────────────────────────────

const ENV_PLACEHOLDER_MAP: Record<string, string> = {};
let envCount = 0;

function extractEnvironments(text: string): string {
  envCount = 0;
  Object.keys(ENV_PLACEHOLDER_MAP).forEach(k => delete ENV_PLACEHOLDER_MAP[k]);
  return text.replace(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g, (env) => {
    const placeholder = `__ENV_${envCount}__`;
    ENV_PLACEHOLDER_MAP[placeholder] = env;
    envCount++;
    return placeholder;
  });
}

function restoreEnvironments(text: string): string {
  let result = text;
  Object.entries(ENV_PLACEHOLDER_MAP).forEach(([placeholder, env]) => {
    result = result.replace(placeholder, `$$${env}$$`);
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// escapeHtmlOutsideMath
// Escapes & < > only in prose regions; passes math spans through unchanged.
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtmlOutsideMath(text: string): string {
  let result = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;

  while (i < text.length) {
    if (!inSingle && !inDouble && text[i] === '$' && text[i + 1] === '$') {
      inDouble = true; result += '$$'; i += 2; continue;
    }
    if (inDouble && text[i] === '$' && text[i + 1] === '$') {
      inDouble = false; result += '$$'; i += 2; continue;
    }
    if (!inSingle && !inDouble && text[i] === '$') {
      inSingle = true; result += '$'; i++; continue;
    }
    if (inSingle && text[i] === '$') {
      inSingle = false; result += '$'; i++; continue;
    }
    if (inSingle || inDouble) { result += text[i++]; continue; }

    if (text[i] === '&') { result += '&amp;'; i++; continue; }
    if (text[i] === '<') { result += '&lt;'; i++; continue; }
    if (text[i] === '>') { result += '&gt;'; i++; continue; }
    result += text[i++];
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// LATEX_CMDS — commands wrapBareLaTeX can auto-wrap
// ─────────────────────────────────────────────────────────────────────────────

const LATEX_CMDS = [
  'frac', 'text', 'sqrt', 'sum', 'prod', 'int', 'lim', 'log', 'ln',
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'times', 'cdot', 'div',
  'pm', 'mp', 'leq', 'geq', 'neq', 'approx', 'equiv', 'infty',
  'partial', 'nabla', 'alpha', 'beta', 'gamma', 'delta', 'epsilon',
  'theta', 'lambda', 'mu', 'sigma', 'omega', 'pi', 'phi', 'psi',
  'Delta', 'Gamma', 'Omega', 'Sigma', 'mathrm', 'mathbf',
  'operatorname', 'left', 'right', 'displaystyle', 'overline',
  'underline', 'hat', 'bar', 'vec', 'dot', 'ddot', 'tilde',
  'binom', 'choose', 'mod', 'pmod',
] as const;

const LATEX_CMD_PATTERN = new RegExp(
  '^\\\\(' + LATEX_CMDS.join('|') + ')(?=[^a-zA-Z]|$)'
);

// ─────────────────────────────────────────────────────────────────────────────
// wrapBareLaTeX
//
// Wraps undelimited LaTeX so KaTeX can render it.
//
// FIX SUMMARY vs. previous version:
//   #1  protectMathBlocks() runs BEFORE every pre-processing regex, so
//       patterns like partial^2 inside an existing $...$ are never touched.
//   #2  Greedy consumption is now conservative: after consuming a command
//       and its brace groups / sub+superscripts, we only continue past a
//       space if the very next token is a single-letter variable or another
//       backslash command — never a prose word.
//   #3  A pre-processing pass wraps bare subscript/superscript expressions
//       like u_{xx}, T_n, x_1 that have no leading backslash.
// ─────────────────────────────────────────────────────────────────────────────

function wrapBareLaTeX(text: string): string {
  // ── Phase 1: Protect all existing math so no regex below can touch it ──────
  const { safe: protected_, map: mathMap } = protectMathBlocks(text);
  let processed = protected_;

  // ── Phase 2: Pre-processing transforms (safe — math is now placeholders) ──

  // 2a. Bare superscripts:  2^5 → $2^{5}$,  x^2 → $x^{2}$
  //     Skip chemistry-style uppercase+digit (e.g. CO2 matched elsewhere)
  processed = processed.replace(
    /(?<![\\$\w])([a-z][a-zA-Z0-9]*|[0-9]+)\^([a-zA-Z0-9]+)(?![{$])/g,
    (_, base, exp) => `$${base}^{${exp}}$`
  );

  // 2b. Bare subscript expressions:  u_{xx}, T_{ij}, x_n, u_x
  //     Matches 1-3 letter variable + _ + (braced or single-char) subscript
  //     outside existing math blocks.
  processed = processed.replace(
    /\b([a-zA-Z]{1,3})_(\{[^}]+\}|[a-zA-Z0-9])/g,
    (_, v, sub) => `$${v}_{${sub.startsWith('{') ? sub.slice(1, -1) : sub}}$`
  );

  // 2c. Simple numeric fractions:  1/2 → $\frac{1}{2}$
  //     Guarded against step/section/page/figure labels.
  processed = processed.replace(
    /(?<!(?:step|section|part|page|chapter|figure|table|ref)\s)(?<![/$])\b(\d{1,2})\/(\d{1,2})([a-zA-Z]?)\b(?!\$)/gi,
    (_, n, d, suffix) => `$\\frac{${n}}{${d}}${suffix}$`
  );

  // ── Phase 3: Restore protected blocks before the command scan ──────────────
  processed = restoreMathBlocks(processed, mathMap);

  // ── Phase 4: Scan for bare \commands and wrap them ────────────────────────
  // Protect again so the scan loop doesn't re-enter already-wrapped content.
  const { safe: scanText, map: scanMap } = protectMathBlocks(processed);

  let result = '';
  let i = 0;

  while (i < scanText.length) {
    // ── Double $$ ──
    if (scanText[i] === '$' && scanText[i + 1] === '$') {
      // Already protected into placeholder — shouldn't normally appear here,
      // but pass through safely if it does.
      result += '$$'; i += 2; continue;
    }
    // ── Single $ ──
    if (scanText[i] === '$') {
      result += '$'; i++; continue;
    }
    // ── Placeholder characters (\x00) — pass through intact ──
    if (scanText[i] === '\x00') {
      let end = scanText.indexOf('\x00', i + 1);
      if (end === -1) end = scanText.length - 1;
      result += scanText.substring(i, end + 1);
      i = end + 1;
      continue;
    }

    // ── Bare \command detection ──────────────────────────────────────────────
    if (scanText[i] === '\\') {
      const remaining = scanText.substring(i);
      const cmdMatch  = remaining.match(LATEX_CMD_PATTERN);

      if (cmdMatch) {
        let exprEnd = i + cmdMatch[0].length;

        // Consume all brace groups {…}
        while (exprEnd < scanText.length && scanText[exprEnd] === '{') {
          let depth = 0;
          for (let j = exprEnd; j < scanText.length; j++) {
            if (scanText[j] === '{') depth++;
            else if (scanText[j] === '}') {
              depth--;
              if (depth === 0) { exprEnd = j + 1; break; }
            }
          }
        }

        // Consume trailing _subscript and ^superscript groups
        while (exprEnd < scanText.length && (scanText[exprEnd] === '_' || scanText[exprEnd] === '^')) {
          exprEnd++;
          if (exprEnd < scanText.length && scanText[exprEnd] === '{') {
            let depth = 0;
            for (let k = exprEnd; k < scanText.length; k++) {
              if (scanText[k] === '{') depth++;
              else if (scanText[k] === '}') {
                depth--;
                if (depth === 0) { exprEnd = k + 1; break; }
              }
            }
          } else if (exprEnd < scanText.length && scanText[exprEnd] !== ' ') {
            exprEnd++;
          }
        }

        // FIX #2: Conservative greedy continuation.
        // Only keep consuming past a space if what follows is:
        //   (a) a single-letter variable  (e.g. \sin x)
        //   (b) another backslash command (e.g. \sin x + \cos x)
        //   (c) a math operator char      (+, -, =, *, /)
        // Stop immediately at ANY prose word (2+ consecutive letters).
        while (exprEnd < scanText.length) {
          const ch   = scanText[exprEnd];
          const next = scanText[exprEnd + 1] ?? '';

          if (ch === ' ') {
            const afterSpace = scanText[exprEnd + 1] ?? '';
            const charAfterNext = scanText[exprEnd + 2] ?? '';

            const isSingleLetterVar =
              /[a-zA-Z]/.test(afterSpace) &&
              /[^a-zA-Z]/.test(charAfterNext || ' '); // next is isolated letter

            const isBackslashCmd  = afterSpace === '\\';
            const isMathOperator  = /[+\-=*/]/.test(afterSpace);

            if (isSingleLetterVar || isBackslashCmd || isMathOperator) {
              exprEnd++; // consume the space
              continue;
            }
            // It's a prose word or something else — stop here
            break;
          }

          // Non-space: consume only math-safe characters (operators, digits, letters)
          // Stop at anything that clearly isn't math (comma, quote, colon, etc.)
          if (/[a-zA-Z0-9+\-=*/]/.test(ch)) {
            exprEnd++;
            continue;
          }

          break;
        }

        result += '$' + scanText.substring(i, exprEnd) + '$';
        i = exprEnd;
        continue;
      }
    }

    result += scanText[i];
    i++;
  }

  // ── Phase 5: Restore the scan-phase placeholders ──────────────────────────
  return restoreMathBlocks(result, scanMap);
}

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeMathContent
// Cleans up malformed delimiter counts and fixes unbraced sub/superscripts
// INSIDE math blocks.
// ─────────────────────────────────────────────────────────────────────────────

function sanitizeMathContent(input: string): string {
  if (!input) return '';

  let s = extractEnvironments(input);

  // Normalize escaped braces \{ \} → { }
  s = s.replace(/\\\{|\\\}/g, (m) => (m[1] === '{' ? '{' : '}'));

  // Ensure even number of single-dollar delimiters
  const singleDollarCount = (s.match(/(^|[^$])\$(?!\$)/g) || []).length;
  if (singleDollarCount % 2 === 1) {
    const lastIdx = s.lastIndexOf('$');
    if (lastIdx !== -1) {
      s = s.substring(0, lastIdx) + '\\$' + s.substring(lastIdx + 1);
    }
  }

  // Strip stray $ characters inside already-delimited math blocks
  {
    let out = '';
    let idx = 0;
    let inSingle = false;
    let inDouble = false;
    while (idx < s.length) {
      if (!inSingle && !inDouble && s[idx] === '$' && s[idx + 1] === '$') { inDouble = true; out += '$$'; idx += 2; continue; }
      if (inDouble && s[idx] === '$' && s[idx + 1] === '$')              { inDouble = false; out += '$$'; idx += 2; continue; }
      if (!inSingle && !inDouble && s[idx] === '$')                      { inSingle = true; out += '$'; idx++; continue; }
      if (inSingle && s[idx] === '$')                                    { inSingle = false; out += '$'; idx++; continue; }
      if ((inSingle || inDouble) && s[idx] === '$')                      { idx++; continue; } // drop stray $
      out += s[idx++];
    }
    s = out;
  }

  // Strip dollar signs inside LaTeX command groups: \cmd{$x$} → \cmd{x}
  try {
    s = s.replace(/\\([a-zA-Z]+)\{([^}]*)\}/g, (_m, cmd, inner) => `\\${cmd}{${inner.replace(/\$/g, '')}}`);
  } catch { /* ignore */ }

  // Brace unbraced integral/sum limits: \int_0^1 → \int_{0}^{1}
  try {
    s = s.replace(/\\(int|sum|prod|lim)\s*_\s*([^\s\\{}()[\]_^]+)/g, (_m, cmd, sub) => `\\${cmd}_{${sub}}`);
    s = s.replace(/\\(int|sum|prod|lim)\s*\^\s*([^\s\\{}()[\]_^]+)/g, (_m, cmd, sup) => `\\${cmd}^{${sup}}`);
  } catch { /* ignore */ }

  // Brace bare single-char superscripts/subscripts: x^2 → x^{2}
  try {
    s = s.replace(/(^|[^\\\w])([A-Za-z0-9)\]}])\^([A-Za-z0-9])/g, '$1$2^{$3}');
    s = s.replace(/(^|[^\\\w])([A-Za-z0-9)\]}])_([A-Za-z0-9])/g,  '$1$2_{$3}');
  } catch { /* ignore */ }

  // Balance unmatched \left … \right pairs
  try {
    const leftCount  = (s.match(/\\left/g)  || []).length;
    const rightCount = (s.match(/\\right/g) || []).length;
    if (leftCount > rightCount) s += ' \\right.'.repeat(leftCount - rightCount);
  } catch { /* ignore */ }

  // Balance unmatched braces
  try {
    const open  = (s.match(/\{/g) || []).length;
    const close = (s.match(/\}/g) || []).length;
    if (open > close) s += '}'.repeat(open - close);
  } catch { /* ignore */ }

  // Escape bare % outside math
  try {
    let out = '';
    let idx = 0;
    let inSingle = false;
    let inDouble = false;
    while (idx < s.length) {
      if (!inSingle && !inDouble && s[idx] === '$' && s[idx + 1] === '$') { inDouble = true; out += '$$'; idx += 2; continue; }
      if (inDouble && s[idx] === '$' && s[idx + 1] === '$')              { inDouble = false; out += '$$'; idx += 2; continue; }
      if (!inSingle && !inDouble && s[idx] === '$')                      { inSingle = true; out += '$'; idx++; continue; }
      if (inSingle && s[idx] === '$')                                    { inSingle = false; out += '$'; idx++; continue; }
      if (!inSingle && !inDouble && s[idx] === '%')                      { out += '\\%'; idx++; continue; }
      out += s[idx++];
    }
    s = out;
  } catch { /* ignore */ }

  s = restoreEnvironments(s);
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// buildScript — browser-side JS (plain string to avoid template literal issues)
// ─────────────────────────────────────────────────────────────────────────────

function buildScript(encodedContent: string): string {
  return [
    'var rawContent = decodeURIComponent("' + encodedContent + '");',
    '',
    'function formatContent(text) {',
    '  if (!text) return "";',
    '  var clean = text.replace(/\\r\\n/g, "\\n").replace(/\\r/g, "\\n");',
    '  // Force newline between a prose label and a display math block on the same line',
    '  clean = clean.replace(/^(.+?):\\s*(\\$\\$.+?\\$\\$)/gm, "$1:\\n$2");',
    '  var blocks = clean.split(/\\n\\n+/);',
    '  var out = "";',
    '  for (var b = 0; b < blocks.length; b++) {',
    '    var block = blocks[b].trim();',
    '    if (!block) continue;',
    '    var lines = block.split(/\\n/);',
    '    for (var i = 0; i < lines.length; i++) {',
    '      var line = lines[i].trim();',
    '      if (!line) continue;',
    '      var hMatch = line.match(/^(#{1,6})\\s+(.*)/);',
    '      if (hMatch) {',
    '        var level = hMatch[1].length;',
    '        var hSize = level === 1 ? "1.4em" : level === 2 ? "1.3em" : "1.2em";',
    '        out += "<div style=\\"font-weight:800;font-size:" + hSize + ";margin:0.8em 0 0.4em 0;\\">"',
    '             + formatInline(hMatch[2]) + "</div>";',
    '        continue;',
    '      }',
    '      var numMatch    = line.match(/^(\\d+)[.):]\\s+(.*)/);',
    '      var letterMatch = line.match(/^([a-zA-Z])[.):]\\s+(.*)/);',
    '      var bulletMatch = line.match(/^[\\-\\*\\u2022]\\s+(.*)/);',
    '      var displayMathMatch = line.match(/^\\$\\$(.+)\\$\\$/);',
    '      if (numMatch) {',
    '        out += \'<div class="list-item"><div class="list-index">\' + numMatch[1]',
    '             + \'</div><div class="list-content">\' + formatInline(numMatch[2]) + \'</div></div>\';',
    '      } else if (letterMatch && line.length < 200) {',
    '        out += \'<div class="list-item"><div class="list-index">\' + letterMatch[1]',
    '             + \'</div><div class="list-content">\' + formatInline(letterMatch[2]) + \'</div></div>\';',
    '      } else if (bulletMatch && !displayMathMatch) {',
    '        out += \'<div class="list-item"><div class="bullet-dot">\\u2022</div><div class="list-content">\' + formatInline(bulletMatch[1]) + \'</div></div>\';',
    '      } else if (displayMathMatch || (line.startsWith("$$") && line.endsWith("$$"))) {',
    '        out += \'<div style="margin:0.8em 0;">\' + line + \'</div>\';',
    '      } else {',
    '        out += \'<div class="para">\' + formatInline(line) + \'</div>\';',
    '      }',
    '    }',
    '  }',
    '  return out;',
    '}',
    '',
    'function formatInline(t) {',
    '  if (!t) return "";',
    '  t = t.replace(/\\*\\*(.+?)\\*\\*/g, "<strong>$1</strong>");',
    '  t = t.replace(/\\*([^*]+?)\\*/g, "<em>$1</em>");',
    '  return t;',
    '}',
    '',
    'document.getElementById("math-container").innerHTML = formatContent(rawContent);',
    '',
    'var lastH = 0;',
    'function sendHeight() {',
    '  var c = document.getElementById("math-container");',
    '  if (!c) return;',
    '  var h = c.offsetHeight;',
    '  if (Math.abs(h - lastH) > 1 && h > 0) {',
    '    lastH = h;',
    '    window.ReactNativeWebView.postMessage(JSON.stringify({ height: h }));',
    '  }',
    '}',
    '',
    'sendHeight();',
    '',
    'document.addEventListener("DOMContentLoaded", function () {',
    '  if (window.renderMathInElement) {',
    '    renderMathInElement(document.getElementById("math-container"), {',
    '      delimiters: [',
    '        { left: "$$", right: "$$", display: true },',
    '        { left: "\\\\[", right: "\\\\]", display: true },',
    '        { left: "$", right: "$", display: false },',
    '        { left: "\\\\(", right: "\\\\)", display: false }',
    '      ],',
    '      throwOnError: false',
    '    });',
    '    setTimeout(sendHeight, 150);',
    '    setTimeout(sendHeight, 600);',
    '  }',
    '});',
    '',
    'var obs = new MutationObserver(sendHeight);',
    'obs.observe(document.getElementById("math-container"), {',
    '  childList: true, subtree: true, characterData: true',
    '});',
    'window.addEventListener("load", function () { setTimeout(sendHeight, 300); });',
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// buildHtml
// ─────────────────────────────────────────────────────────────────────────────

function buildHtml(params: {
  encodedContent: string;
  color: string;
  fontSize: number;
  strongColor: string;
}): string {
  const { encodedContent, color, fontSize, strongColor } = params;

  const sanitizedColor      = /^#[0-9a-fA-F]{6}$/.test(color)       ? color       : '#121212';
  const sanitizedFontSize   = Number.isFinite(fontSize) && fontSize > 0 ? Math.round(fontSize) : 16;
  const sanitizedStrongColor = /^#[0-9a-fA-F]{6}$/.test(strongColor) ? strongColor : '#FFFFFF';

  return (
    '<!DOCTYPE html>' +
    '<html><head>' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />' +
    '<style>' + KATEX_CSS + '</style>' +
    '<script>' + KATEX_JS + '</script>' +
    '<script>' + KATEX_AUTO_RENDER + '</script>' +
    '<style>' +
    'html,body{margin:0;padding:0;background-color:transparent;}' +
    'body{' +
    '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
    '  color:' + sanitizedColor + ';' +
    '  font-size:' + sanitizedFontSize + 'px;' +
    '  word-wrap:break-word;overflow:hidden;line-height:1.75;' +
    '}' +
    '#math-container{padding:4px 0;}' +
    '.para{margin:0 0 0.9em 0;}' +
    '.para:last-child{margin-bottom:0;}' +
    '.list-item{display:flex;align-items:flex-start;margin:0.6em 0;}' +
    '.list-index{' +
    '  flex-shrink:0;width:22px;height:22px;border-radius:11px;' +
    '  background-color:rgba(0,122,255,0.1);color:#007AFF;' +
    '  font-size:11px;font-weight:800;' +
    '  display:flex;align-items:center;justify-content:center;' +
    '  margin-right:10px;margin-top:2px;' +
    '}' +
    '.bullet-dot{flex-shrink:0;width:22px;text-align:center;font-weight:900;color:' + sanitizedColor + ';opacity:0.5;margin-right:10px;}' +
    '.list-content{flex:1;line-height:1.7;}' +
    '.katex{font-size:1.05em;}' +
    '.katex-display{text-align:left!important;margin:0.8em 0;padding-left:0;}' +
    '.katex-display>.katex{text-align:left!important;display:inline-block;}' +
    'strong,b{font-weight:700;color:' + sanitizedStrongColor + ';}' +
    'em,i{font-style:italic;}' +
    '</style></head><body>' +
    '<div id="math-container"></div>' +
    '<script>' + buildScript(encodedContent) + '</script>' +
    '</body></html>'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MathText component
// ─────────────────────────────────────────────────────────────────────────────

const DARK_COLORS = new Set(['#121212', '#0f172a', '#334155']);

export function MathText({
  content = '',
  color,
  fontSize = 16,
  containerStyle,
}: MathTextProps) {
  const [height, setHeight] = React.useState(24);
  const scheme = useColorScheme();

  // Resolve color: prefer explicit prop, otherwise follow system theme
  const resolvedColor = React.useMemo(() => {
    if (color && /^#[0-9a-fA-F]{6}$/.test(color)) return color;
    return scheme === 'dark' ? '#FFFFFF' : '#121212';
  }, [color, scheme]);

  // Processing pipeline: escape HTML → sanitize math → wrap bare LaTeX
  const processedContent = React.useMemo(
    () => wrapBareLaTeX(sanitizeMathContent(escapeHtmlOutsideMath(content))),
    [content]
  );

  const encodedContent = React.useMemo(
    () => encodeURIComponent(processedContent),
    [processedContent]
  );

  // Determine if resolved color is dark (compute luminance)
  const isHexDark = (hex: string) => {
    const c = hex.replace('#', '');
    const r = parseInt(c.substr(0, 2), 16) / 255;
    const g = parseInt(c.substr(2, 2), 16) / 255;
    const b = parseInt(c.substr(4, 2), 16) / 255;
    // relative luminance
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum < 0.5;
  };

  const strongColor = isHexDark(resolvedColor) ? '#FFFFFF' : '#000000';

  const html = React.useMemo(
    () => buildHtml({ encodedContent, color: resolvedColor, fontSize, strongColor }),
    [encodedContent, resolvedColor, fontSize, strongColor]
  );

  const handleMessage = React.useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (typeof data.height === 'number') setHeight(Math.ceil(data.height) + 8);
      } catch { /* ignore */ }
    },
    []
  );

  return (
    <View style={[{ height: Math.max(height, 24), width: '100%' }, containerStyle]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={{ backgroundColor: 'transparent' }}
        scrollEnabled={false}
        javaScriptEnabled={true}
        onMessage={handleMessage}
      />
    </View>
  );
}