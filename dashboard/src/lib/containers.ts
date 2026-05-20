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
  if (labels.caddy?.trim()) urls.push(normalizeUrl(labels.caddy))
  let i = 0
  while (`caddy_${i}` in labels) {
    if (labels[`caddy_${i}`]?.trim()) urls.push(normalizeUrl(labels[`caddy_${i}`]))
    i++
  }
  return urls
}

function hasCaddyLabels(labels: Record<string, string>): boolean {
  if (labels.caddy?.trim()) return true
  return Object.keys(labels).some(k => /^caddy_\d+$/.test(k) && labels[k]?.trim())
}

function isSelf(urls: string[], selfHost: string): boolean {
  if (!selfHost) return false
  return urls.some(url => {
    try { return new URL(url).hostname === selfHost } catch { return url === selfHost }
  })
}

export async function getContainers(selfHost: string): Promise<ContainerInfo[]> {
  const containers = await dockerGet<DockerContainer[]>('/containers/json?all=1')
  return containers
    .filter((c: DockerContainer) => c.Labels && hasCaddyLabels(c.Labels))
    .map((c: DockerContainer): ContainerInfo => ({
      id: c.Id,
      service: c.Labels['com.docker.compose.service'] ?? c.Names[0]?.replace('/', '') ?? c.Id,
      project: c.Labels['com.docker.compose.project'] ?? 'standalone',
      urls: extractUrls(c.Labels),
      status: c.State === 'running' ? 'running' : 'stopped',
    }))
    .filter((c: ContainerInfo) => !isSelf(c.urls, selfHost))
}
