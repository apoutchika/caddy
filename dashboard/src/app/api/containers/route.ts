import { NextResponse } from 'next/server'
import { dockerGet } from '@/lib/docker'
import type { ContainerInfo } from '@/types'

interface DockerContainer {
  Id: string
  Names: string[]
  State: string
  Labels: Record<string, string>
}

export async function GET() {
  try {
    const containers = await dockerGet<DockerContainer[]>('/containers/json?all=1')

    const result: ContainerInfo[] = containers
      .filter(c => c.Labels?.caddy)
      .map(c => ({
        id: c.Id,
        service: c.Labels['com.docker.compose.service'] ?? c.Names[0]?.replace('/', '') ?? c.Id,
        project: c.Labels['com.docker.compose.project'] ?? 'standalone',
        url: `https://${c.Labels.caddy}`,
        status: c.State === 'running' ? 'running' : 'stopped',
      }))

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Impossible de contacter Docker' }, { status: 500 })
  }
}
