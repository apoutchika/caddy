import { NextResponse } from 'next/server'
import { dockerGet } from '@/lib/docker'
import type { ContainerInfo } from '@/types'

interface DockerContainer {
  Id: string
  Names: string[]
  State: string
  Labels: Record<string, string>
}

function normalizeUrl(value: string): string {
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  return `https://${value}`
}

function extractUrls(labels: Record<string, string>): string[] {
  const urls: string[] = []
  if (labels.caddy) urls.push(normalizeUrl(labels.caddy))
  let i = 0
  while (`caddy_${i}` in labels) {
    urls.push(normalizeUrl(labels[`caddy_${i}`]))
    i++
  }
  return urls
}

function hasCaddyLabels(labels: Record<string, string>): boolean {
  return 'caddy' in labels || Object.keys(labels).some(k => /^caddy_\d+$/.test(k))
}

export async function GET() {
  try {
    const containers = await dockerGet<DockerContainer[]>('/containers/json?all=1')

    const result: ContainerInfo[] = containers
      .filter(c => c.Labels && hasCaddyLabels(c.Labels))
      .map(c => ({
        id: c.Id,
        service: c.Labels['com.docker.compose.service'] ?? c.Names[0]?.replace('/', '') ?? c.Id,
        project: c.Labels['com.docker.compose.project'] ?? 'standalone',
        urls: extractUrls(c.Labels),
        status: c.State === 'running' ? 'running' : 'stopped',
      }))

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Impossible de contacter Docker' }, { status: 500 })
  }
}
