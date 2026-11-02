#!/usr/bin/env node
// Exavitech Dev HUD status line for Claude Code (https://exavitech.com) - MIT License
// Line 1: model │ context │ 5h limit │ weekly limit │ cost
// Line 2: user@host ip │ folder │ git │ lines changed │ effort │ cache
// Reads the status-line JSON on stdin, prints one line. No dependencies.
const fs = require('fs');

const C = { c: '\x1b[36m', g: '\x1b[32m', y: '\x1b[33m', r: '\x1b[31m', d: '\x1b[2m', x: '\x1b[0m' };
const color = (p) => (p >= 90 ? C.r : p >= 70 ? C.y : C.g);
const SEP = ` ${C.d}│${C.x} `;

// Accepts epoch seconds, epoch ms, or an ISO string. Returns ms timestamp or null.
function toMs(t) {
  if (t == null || t === '') return null;
  if (typeof t === 'number') return t < 1e12 ? t * 1000 : t;
  const n = Number(t);
  if (!Number.isNaN(n)) return toMs(n);
  const d = Date.parse(t);
  return Number.isNaN(d) ? null : d;
}

function countdown(t) {
  const ms = toMs(t);
  if (ms == null) return '';
  const m = Math.max(0, Math.round((ms - Date.now()) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h${String(m % 60).padStart(2, '0')}m`;
  return `${Math.floor(h / 24)}d${h % 24}h`;
}

const pct = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
const fmt = (p) => `${Math.round(p)}%`;

function bar(p, cells = 8) {
  const n = Math.min(cells, Math.max(0, Math.round((p / 100) * cells)));
  return '▓'.repeat(n) + '░'.repeat(cells - n);
}

function limitSeg(label, w) {
  if (!w) return null;
  const p = pct(w.used_percentage ?? w.percentUsed ?? w.utilization);
  if (p == null) return null;
  const cd = countdown(w.resets_at ?? w.resetsAt);
  return `${label} ${color(p)}${fmt(p)}${C.x}${cd ? ` ${C.d}⟳${cd}${C.x}` : ''}`;
}

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let j = {};
  try { j = JSON.parse(raw || '{}'); } catch { /* fall through with {} */ }
  // Set STATUSLINE_DEBUG=1 to keep the last input for debugging field names.
  if (process.env.STATUSLINE_DEBUG) { try { fs.writeFileSync(__dirname + '/statusline-last.json', raw); } catch {} }

  const parts = [];
  parts.push(j.model?.display_name || j.model?.id || 'Claude');

  const cw = j.context_window || {};
  let cp = pct(cw.used_percentage);
  if (cp == null && pct(cw.remaining_percentage) != null) cp = 100 - cw.remaining_percentage;
  if (cp != null) parts.push(`ctx ${color(cp)}${bar(cp)} ${fmt(cp)}${C.x}`);

  const rl = j.rate_limits || {};
  const list = Array.isArray(rl) ? rl : null; // tolerate [{kind, percentUsed, resetsAt}]
  const win = (k) => (list ? list.find((w) => w.kind === k) : rl[k]);
  const s5 = limitSeg('5h', win('five_hour'));
  const s7 = limitSeg('wk', win('seven_day'));
  if (s5) parts.push(s5);
  if (s7) parts.push(s7);

  const cost = j.cost?.total_cost_usd;
  if (typeof cost === 'number') parts.push(`${C.d}$${cost.toFixed(2)}${C.x}`);

  // ── Line 2: where am I? user@host ip │ folder │ git │ session edits
  const os = require('os');
  const env = [];
  const host = os.hostname();
  const ip = Object.values(os.networkInterfaces()).flat()
    .find((i) => i && i.family === 'IPv4' && !i.internal)?.address || '';
  const isProd = /(^|[-_.])(prod|production|live)([-_.]|$)/i.test(host);
  const user = os.userInfo().username;
  env.push(`${isProd ? C.r : C.c}${user}@${host}${C.x}${ip ? ` ${C.d}${ip}${C.x}` : ''}`);

  const dir = j.workspace?.current_dir || j.cwd || process.cwd();
  const proj = j.workspace?.project_dir;
  const home = os.homedir();
  const short = (p) => (p && p.startsWith(home) ? '~' + p.slice(home.length) : p);
  env.push(`📁 ${short(dir)}${proj && proj !== dir ? ` ${C.d}(proj ${short(proj)})${C.x}` : ''}`);

  try {
    const { execFileSync } = require('child_process');
    const git = (...a) => execFileSync('git', ['-C', dir, ...a], { timeout: 300, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    let branch; try { branch = git('symbolic-ref', '--short', 'HEAD'); } catch { branch = git('rev-parse', '--short', 'HEAD'); }
    const dirty = git('status', '--porcelain').split('\n').filter(Boolean).length;
    env.push(`⎇ ${branch}${dirty ? ` ${C.y}±${dirty}${C.x}` : ` ${C.g}✓${C.x}`}`);
  } catch { /* not a git repo */ }

  const add = j.cost?.total_lines_added, del = j.cost?.total_lines_removed;
  if (add || del) env.push(`${C.g}+${add || 0}${C.x}/${C.r}-${del || 0}${C.x}`);
  if (j.effort?.level) env.push(`${C.d}effort ${j.effort.level}${C.x}`);
  const hit = j.prompt_cache?.hit_ratio;
  if (typeof hit === 'number') env.push(`${C.d}cache ${Math.round(hit * 100)}%${C.x}`);

  process.stdout.write(parts.join(SEP) + '\n' + env.join(SEP));
});
