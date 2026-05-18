import { dockerStream } from '@/lib/docker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RELEVANT = new Set(['start', 'stop', 'die', 'destroy', 'create', 'kill'])

export async function GET() {
  const encoder = new TextEncoder()
  let destroy: (() => void) | null = null

  let closed = false

  const body = new ReadableStream({
    start(controller) {
      destroy = dockerStream(
        '/events?filters=%7B%22type%22%3A%5B%22container%22%5D%7D',
        line => {
          if (closed) return
          try {
            const event = JSON.parse(line) as { Action: string }
            if (RELEVANT.has(event.Action)) {
              controller.enqueue(encoder.encode(`data: ${event.Action}\n\n`))
            }
          } catch {
            // ligne mal formée
          }
        },
        () => { if (!closed) controller.close() },
      )
    },
    cancel() {
      closed = true
      destroy?.()
    },
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
