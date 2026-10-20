// quiet: hides tool call rows, running ones included, so the transcript shows only the conversation.
// Only the drawing changes; the stored transcript and the model's context stay as they were.
import type { EngineInterface, Register, RenderInput } from 'claude-code'

const COMMAND = 'quiet'
const STORE_KEY = 'enabled'

// Module variables start over on every load, so the stored choice is read lazily.
let quiet: boolean | undefined

async function isQuiet($: EngineInterface): Promise<boolean> {
  if (quiet === undefined) {
    quiet = await $.store.get(STORE_KEY).then(
      value => value === true,
      () => false,
    )
  }
  return quiet
}

function hiddenRow($: EngineInterface, e: RenderInput) {
  const { Box } = $.ui.resolve(e)
  return Box({ display: 'none' })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    quiet = undefined
    await isQuiet($)
    await $.command.register({
      name: COMMAND,
      description: 'Toggle hiding tool call rows so only the conversation shows',
      // Only a drawing flag changes, so it can run while a turn streams.
      immediate: true,
    })
    return next(e)
  })

  on('command.run', { command: COMMAND }, async $ => {
    const next = !(await isQuiet($))
    try {
      await $.store.set(STORE_KEY, next)
    } catch (error) {
      $.ui.toast(`Quiet unchanged: ${error instanceof Error ? error.message : String(error)}`)
      return {}
    }
    quiet = next
    $.ui.invalidate('ui.render')
    $.ui.toast(next ? 'Quiet on: tool rows hidden' : 'Quiet off: tool rows shown')
    return {}
  })

  // The footer's mode labels say Quiet is on, beside the engine's own (`focus`, ...).
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) =>
    (await isQuiet($)) ? next({ ...e, props: { ...e.props, modes: [...e.props.modes, COMMAND] } }) : next(e),
  )
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) =>
    (await isQuiet($)) ? hiddenRow($, e) : next(e),
  )
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) =>
    (await isQuiet($)) ? hiddenRow($, e) : next(e),
  )
  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) =>
    (await isQuiet($)) ? hiddenRow($, e) : next(e),
  )
  // A background task's `finished` row is the tail of a tool call; ctrl+o still shows it.
  on('ui.render', { component: 'UserMessage', props: { origin: { kind: 'task-notification' } } }, async ($, e, next) =>
    (await isQuiet($)) && !e.props.isExpanded ? hiddenRow($, e) : next(e),
  )
  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) =>
    (await isQuiet($)) ? hiddenRow($, e) : next(e),
  )
}
