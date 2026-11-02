export type Call = {
  id: string
  tool: string
  what: string
  agentId?: string
  startedAt: number
  endedAt?: number
  state: 'run' | 'ok' | 'err' | 'deny'
}
export type Agent = { id: string; type: string; description: string; status: string }

declare module 'claude-code' {
  interface PluginState {
    'dev-hud': { calls: Shaped<Call[]>; agents: Shaped<Agent[]>; tick: number }
  }
}
