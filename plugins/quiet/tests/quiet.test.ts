import type { On } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'

const STOCK = 'STOCK-DRAWING'
const VIEWPORT = { columns: 40, rows: 24 } as const
const sessionStart = { cwd: '/work', surface: 'terminal' as const, isInteractive: true }
const quietCommand = {
  command: 'quiet',
  args: '',
  origin: { kind: 'composer' as const },
  presentation: { layout: 'main' as const, isFullscreen: false, columns: 80 },
}

function world(on: On) {
  mock.store(on)
  const journal = { commands: [] as string[], toasts: [] as string[] }
  on('command.register', async (_$, e) => {
    journal.commands.push(e.name)
    return { value: { command: e.name } }
  })
  on('ui.toast', async (_$, e) => {
    journal.toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.invalidate', async () => ({ value: undefined }))
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  // The stock drawing carries the props it was handed, so a test can read a rewrite.
  on('ui.render', async (_$, e) => ({ type: 'Text', props: {}, children: [STOCK, JSON.stringify(e.props)] }))
  return journal
}

const toolUse = (id = 'tool-1', isRunning = false) => ({
  surface: 'terminal' as const,
  component: 'ToolUse' as const,
  requestId: id,
  viewport: VIEWPORT,
  props: { tool_use_id: id, tool: 'Bash', input: { command: 'ls' }, isRunning, isErrored: false, isInterrupted: false },
})
const toolResult = () => ({
  surface: 'terminal' as const,
  component: 'ToolResult' as const,
  requestId: 'tool-1-result',
  viewport: VIEWPORT,
  props: { tool_use_id: 'tool-1', tool: 'Bash', output: { stdout: 'x', stderr: '' }, isErrored: false },
})
const toolGroup = (ids: string[] = [], isActive = false) => ({
  surface: 'terminal' as const,
  component: 'ToolGroup' as const,
  requestId: 'group-1',
  viewport: VIEWPORT,
  props: {
    calls: ids.map(id => ({ tool_use_id: id, tool: 'Read', input: {}, isRunning: isActive, isErrored: false, isInterrupted: false })),
    isActive,
    isExpanded: false,
  },
})

const assistantMessage = () => ({
  surface: 'terminal' as const,
  component: 'AssistantMessage' as const,
  requestId: 'assistant-1',
  viewport: VIEWPORT,
  props: { text: 'hello', isFirstOfReply: true },
})
const taskNotification = (isExpanded = false) => ({
  surface: 'terminal' as const,
  component: 'UserMessage' as const,
  requestId: 'note-1',
  viewport: VIEWPORT,
  props: { text: 'Agent "x" finished', origin: { kind: 'task-notification' as const }, isExpanded, task: { status: 'completed' } },
})
const prompt = () => ({
  surface: 'terminal' as const,
  component: 'UserMessage' as const,
  requestId: 'prompt-1',
  viewport: VIEWPORT,
  props: { text: 'hi', origin: { kind: 'composer' as const }, isExpanded: false },
})
const sessionMode = () => ({
  surface: 'terminal' as const,
  component: 'SessionMode' as const,
  requestId: 'session-mode',
  viewport: VIEWPORT,
  props: { modes: ['focus'] },
})

const text = (tree: unknown) => JSON.stringify(tree)
const isHidden = (tree: unknown) => text(tree).includes('"display":"none"')
const isStock = (tree: unknown) => text(tree).includes(STOCK)

describe('quiet', () => {
  test('registers /quiet and leaves every row alone while off', async ($, on) => {
    const journal = world(on)
    await $.session.start(sessionStart)
    expect(journal.commands).toEqual(['quiet'])
    for (const input of [toolUse(), toolResult(), toolGroup(), assistantMessage()]) {
      expect(isStock(await $.ui.render(input))).toBe(true)
    }
    expect(text(await $.ui.render(sessionMode()))).not.toContain('quiet')
  })

  test('hides every tool row, keeps messages and adds the quiet mode label once on', async ($, on) => {
    const journal = world(on)
    await $.session.start(sessionStart)
    await $.command.run(quietCommand)

    for (const input of [toolUse(), toolResult(), toolGroup()]) {
      expect(isHidden(await $.ui.render(input))).toBe(true)
    }
    expect(isStock(await $.ui.render(assistantMessage()))).toBe(true)
    expect(text(await $.ui.render(sessionMode()))).toContain('[\\"focus\\",\\"quiet\\"]')
    expect(journal.toasts).toHaveLength(1)
  })

  test('restores the rows when toggled off and keeps the choice across sessions', async ($, on) => {
    world(on)
    await $.session.start(sessionStart)
    await $.command.run(quietCommand)
    await $.command.run(quietCommand)
    expect(isStock(await $.ui.render(toolUse()))).toBe(true)

    await $.command.run(quietCommand)
    await $.session.start(sessionStart)
    expect(isHidden(await $.ui.render(toolUse()))).toBe(true)
  })

  test('hides running rows too', async ($, on) => {
    world(on)
    await $.session.start(sessionStart)
    await $.command.run(quietCommand)
    expect(isHidden(await $.ui.render(toolUse('tool-1', true)))).toBe(true)
    expect(isHidden(await $.ui.render(toolGroup(['tool-1'], true)))).toBe(true)
  })

  test('hides task notification rows outside ctrl+o and keeps prompts', async ($, on) => {
    world(on)
    await $.session.start(sessionStart)
    expect(isStock(await $.ui.render(taskNotification()))).toBe(true)
    await $.command.run(quietCommand)
    expect(isHidden(await $.ui.render(taskNotification()))).toBe(true)
    expect(isStock(await $.ui.render(taskNotification(true)))).toBe(true)
    expect(isStock(await $.ui.render(prompt()))).toBe(true)
  })
})
