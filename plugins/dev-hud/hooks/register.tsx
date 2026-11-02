// Exavitech Dev HUD for Claude Code (https://exavitech.com) - MIT License
import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Agent, Call } from '../types'

const PANE = 'dev-hud'
const TITLE = 'Dev HUD'
const KEEP = 100

const calls = atom({ plugin: 'dev-hud', key: 'calls' } as const, [], { shape: 'calls-1' })
const agents = atom({ plugin: 'dev-hud', key: 'agents' } as const, [], { shape: 'agents-1' })
const tick = atom({ plugin: 'dev-hud', key: 'tick' } as const, 0)

// One short line saying what a tool call is about.
function describe(e: Record<string, unknown>): string {
  const s = (k: string) => (typeof e[k] === 'string' ? (e[k] as string) : '')
  const file = s('file_path') || s('notebook_path') || s('path')
  const raw =
    s('command') || s('description') || s('pattern') || s('url') || s('query') ||
    s('skill') || (file ? file.replace(/^\/root\//, '~/') : '') || s('prompt')
  return raw.replace(/\s+/g, ' ').trim()
}

function age(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m${String(s % 60).padStart(2, '0')}s` : `${Math.floor(m / 60)}h${m % 60}m`
}

const ICON: Record<Call['state'], string> = { run: '▶', ok: '✓', err: '✗', deny: '⊘' }
const COLOR: Record<Call['state'], string> = { run: 'yellow', ok: 'green', err: 'red', deny: 'magenta' }

// Limit windows already warned about, so each crossing toasts once.
const warned = new Set<string>()

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'hud', description: 'Open the Dev HUD pane (tool calls, subagents)' })
    void $.ui.open({ id: PANE, title: TITLE })

    // Once a second: refresh subagents and elapsed times while anything runs.
    $.clock.every(1000, () => {
      void (async () => {
        const list = await $.agent.list()
        const mine: Agent[] = list.map(a => ({
          id: a.id, type: a.type, description: a.description, status: a.status,
        }))
        const before = await read($, agents)
        const running = (await read($, calls)).some(c => c.state === 'run')
        if (JSON.stringify(before) !== JSON.stringify(mine)) await update($, agents, () => mine)
        if (running || mine.some(a => a.status === 'running')) await update($, tick, n => n + 1)
      })()
    })
    return next(e)
  })

  on('command.run', { command: 'hud' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Dev HUD opened.' }
  })

  on('tool.call', async ($, e, next) => {
    const call: Call = {
      id: e.tool_use_id,
      tool: e.tool,
      what: describe(e as unknown as Record<string, unknown>),
      agentId: e.agentId,
      startedAt: Date.now(),
      state: 'run',
    }
    await update($, calls, list => [...list, call].slice(-KEEP))
    const ran = await next(e)
    const state: Call['state'] = ran.deny !== undefined ? 'deny' : ran.isError ? 'err' : 'ok'
    await update($, calls, list =>
      list.map(c => (c.id === call.id ? { ...c, state, endedAt: Date.now() } : c)),
    )
    return ran
  }).catch(($, e, next) => next(e)) // never let the HUD block a tool

  // Toast once when the 5-hour or weekly window passes 90%.
  on('session.measure', ($, e, next) => {
    for (const w of e.rateLimits) {
      const key = `${w.kind}@${w.resetsAt ?? ''}`
      if (w.percentUsed >= 90 && !warned.has(key)) {
        warned.add(key)
        const name = w.kind === 'five_hour' ? '5-hour' : w.kind === 'seven_day' ? 'weekly' : w.kind
        $.ui.toast(`${name} limit at ${Math.round(w.percentUsed)}%`)
      }
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    await read($, tick)
    const list = await read($, calls)
    const subs = (await read($, agents)).filter(a => a.status === 'running' || a.status === 'pending' || a.status === 'waiting')
    const now = Date.now()
    const rows = Math.max(3, (e.viewport?.rows ?? 24) - 6 - subs.length)
    const running = list.filter(c => c.state === 'run')
    const done = list.filter(c => c.state !== 'run').slice(-Math.max(1, rows - running.length)).reverse()
    const errs = list.filter(c => c.state === 'err').length
    const agentName = (id?: string) => (id ? subs.find(a => a.id === id)?.type ?? 'agent' : '')

    const line = (c: Call) => (
      <Text wrap="truncate-end">
        <Text color={COLOR[c.state]}>{ICON[c.state]} </Text>
        <Text bold>{c.tool}</Text>
        {c.agentId ? <Text color="cyan"> [{agentName(c.agentId)}]</Text> : null}
        <Text dimColor> {age((c.endedAt ?? now) - c.startedAt)} </Text>
        <Text>{c.what}</Text>
      </Text>
    )

    return (
      <Box flexDirection="column">
        <Text bold>Subagents {subs.length ? `(${subs.length})` : ''}</Text>
        {subs.length === 0 && <Text dimColor>  none running</Text>}
        {subs.map(a => (
          <Text wrap="truncate-end">
            <Text color="cyan">  ● {a.type}</Text>
            <Text dimColor> {a.status} </Text>
            <Text>{a.description}</Text>
          </Text>
        ))}
        <Text> </Text>
        <Text bold>
          Tool calls <Text dimColor>{list.length} total{errs ? ` · ` : ''}</Text>
          {errs ? <Text color="red">{errs} failed</Text> : null}
        </Text>
        {list.length === 0 && <Text dimColor>  none yet</Text>}
        {running.map(line)}
        {done.map(line)}
      </Box>
    )
  })
}
