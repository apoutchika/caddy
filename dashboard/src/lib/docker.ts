import http from 'node:http'

const SOCKET = '/var/run/docker.sock'

export function dockerGet<T>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath: SOCKET, path, method: 'GET' },
      res => {
        let raw = ''
        res.on('data', (chunk: Buffer) => { raw += chunk.toString() })
        res.on('end', () => {
          try { resolve(JSON.parse(raw) as T) }
          catch { reject(new Error('Invalid Docker response')) }
        })
      },
    )
    req.on('error', reject)
    req.end()
  })
}

export function dockerStream(
  path: string,
  onData: (line: string) => void,
  onClose: () => void,
): () => void {
  const req = http.request(
    { socketPath: SOCKET, path, method: 'GET' },
    res => {
      res.on('data', (chunk: Buffer) => {
        for (const line of chunk.toString().split('\n')) {
          if (line.trim()) onData(line)
        }
      })
      res.on('end', onClose)
      res.on('error', onClose)
    },
  )
  req.on('error', onClose)
  req.end()

  return () => req.destroy()
}
