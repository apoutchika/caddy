import { dockerStream } from '@/lib/docker'
import { getContainers } from '@/lib/containers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RELEVANT = new Set(['start', 'stop', 'die', 'destroy', 'create', 'kill'])

export async function GET(request: Request) {
  const selfHost = request.headers.get('host')?.split(':')[0] ?? ''
  const encoder = new TextEncoder()
  let destroyStream: (() => void) | null = null
  let closed = false
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const body = new ReadableStream({
    start(controller) {
      const send = async () => {
        if (closed) return
        try {
          const containers = await getContainers(selfHost)
          if (!closed) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(containers)}\n\n`))
          }
        } catch {
          // Docker temporarily unavailable — next reconnect will retry
        }
      }

      const connect = () => {
        if (closed) return
        destroyStream = dockerStream(
          '/events?filters=%7B%22type%22%3A%5B%22container%22%5D%7D',
          line => {
            if (closed) return
            try {
              const event = JSON.parse(line) as { Action: string }
              if (!RELEVANT.has(event.Action)) return
              // Debounce: docker compose down fires a burst of events per container.
              // Waiting for quiet before fetching guarantees a consistent snapshot.
              if (debounceTimer) clearTimeout(debounceTimer)
              const delay = event.Action === 'start' || event.Action === 'create' ? 500 : 50
              debounceTimer = setTimeout(send, delay)
            } catch {
              // malformed line
            }
          },
          () => {
            // Docker events stream closed (daemon restart, transient error…).
            // Reconnect silently so the SSE connection stays alive for the client.
            if (closed) return
            send()
            reconnectTimer = setTimeout(connect, 1000)
          },
        )
      }

      connect()
      send()
    },
    cancel() {
      closed = true
      if (debounceTimer) clearTimeout(debounceTimer)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      destroyStream?.()
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
