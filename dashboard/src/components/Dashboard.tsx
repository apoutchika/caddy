'use client'

import { useEffect, useState, useCallback } from 'react'
import type { ContainerInfo, ProjectGroup } from '@/types'

function groupByProject(containers: ContainerInfo[]): ProjectGroup[] {
  const map = new Map<string, ContainerInfo[]>()
  for (const c of containers) {
    map.set(c.project, [...(map.get(c.project) ?? []), c])
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([project, containers]) => ({ project, containers }))
}

function StatusIndicator({ status }: { status: ContainerInfo['status'] }) {
  if (status === 'running') {
    return (
      <span className="relative flex h-2 w-2 shrink-0" aria-label="actif">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
      </span>
    )
  }
  // Carré au lieu de cercle : double encodage forme + couleur pour les daltoniens
  return <span className="inline-flex h-2 w-2 rounded-sm bg-zinc-600 shrink-0" aria-label="arrêté" />
}

function ServiceLabel({ container }: { container: ContainerInfo }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <StatusIndicator status={container.status} />
      <span className="text-xs text-zinc-500 truncate">{container.service}</span>
    </div>
  )
}

function LinkPill({ url, disabled }: { url: string; disabled: boolean }) {
  return (
    <a
      href={disabled ? undefined : url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={disabled ? e => e.preventDefault() : undefined}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all duration-150 border ${
        disabled
          ? 'cursor-not-allowed text-zinc-600 bg-zinc-800/30 border-zinc-800'
          : 'text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white border-zinc-700 hover:border-zinc-500 cursor-pointer'
      }`}
    >
      <span className="truncate">{url}</span>
      {!disabled && (
        <svg className="w-3 h-3 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )}
    </a>
  )
}

function ServiceRow({ container }: { container: ContainerInfo }) {
  const disabled = container.status !== 'running'
  const singleUrl = container.urls.length === 1

  // 1 lien : toujours une seule ligne, cliquable si actif
  if (singleUrl) {
    const inner = (
      <>
        <ServiceLabel container={container} />
        <div className="flex items-center gap-1.5 shrink-0 min-w-0">
          <span className={`font-mono text-xs truncate transition-colors ${disabled ? 'text-zinc-600' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
            {container.urls[0]}
          </span>
          {!disabled && (
            <svg className="w-3 h-3 shrink-0 text-zinc-600 group-hover:text-zinc-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          )}
        </div>
      </>
    )

    if (!disabled) {
      return (
        <a href={container.urls[0]} target="_blank" rel="noopener noreferrer"
          className="group flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/40 transition-all duration-150"
        >
          {inner}
        </a>
      )
    }

    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-zinc-900 opacity-50">
        {inner}
      </div>
    )
  }

  // Plusieurs liens : layout avec pills
  return (
    <div className={`flex flex-col gap-2 px-4 py-2.5 rounded-lg border transition-all duration-150 ${
      disabled ? 'border-zinc-900 opacity-50' : 'border-zinc-800'
    }`}>
      <ServiceLabel container={container} />
      <div className="flex flex-wrap gap-1.5 pl-4">
        {container.urls.map(url => (
          <LinkPill key={url} url={url} disabled={disabled} />
        ))}
      </div>
    </div>
  )
}

function ProjectCard({ group }: { group: ProjectGroup }) {
  const runningCount = group.containers.filter(c => c.status === 'running').length

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-sm font-semibold text-zinc-200">{group.project}</span>
        </div>
        <span className="text-xs text-zinc-500">
          {runningCount}/{group.containers.length} actif{runningCount > 1 ? 's' : ''}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        {group.containers.map(c => (
          <ServiceRow key={c.id} container={c} />
        ))}
      </div>
    </div>
  )
}

function CertBanner({ onDownload }: { onDownload: () => void }) {
  const [certExists, setCertExists] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/cert', { method: 'HEAD' })
      .then(r => setCertExists(r.ok))
      .catch(() => setCertExists(false))
  }, [])

  if (certExists === null) return null

  if (!certExists) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-amber-800/50 bg-amber-950/30 text-amber-300">
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div>
          <p className="text-sm font-medium">Certificat CA pas encore généré</p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            Lance un premier service HTTPS via Caddy pour générer le certificat local.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-5 py-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-950 border border-sky-800">
          <svg className="w-4.5 h-4.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 10c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.249-8.25-3.286z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200">Certificat CA Caddy</p>
          <p className="text-xs text-zinc-500">Importe ce certificat dans ton navigateur pour activer le HTTPS local</p>
        </div>
      </div>
      <button
        onClick={onDownload}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-sm font-medium text-zinc-200 transition-all duration-150"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Télécharger le CA
      </button>
    </div>
  )
}

export function Dashboard() {
  const [groups, setGroups] = useState<ProjectGroup[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchContainers = useCallback(async () => {
    try {
      const res = await fetch('/api/containers')
      if (!res.ok) throw new Error('fetch failed')
      const data = (await res.json()) as ContainerInfo[]
      setGroups(groupByProject(data))
      setError(null)
    } catch {
      setError('Impossible de contacter Docker')
    } finally {
      setLoading(false)
    }
  }, [])

  const downloadCert = useCallback(() => {
    const a = document.createElement('a')
    a.href = '/api/cert'
    a.download = 'caddy-local-ca.crt'
    a.click()
  }, [])

  useEffect(() => {
    fetchContainers()
  }, [fetchContainers])

  useEffect(() => {
    const es = new EventSource('/api/events')
    es.onmessage = (e: MessageEvent<string>) => {
      // Docker fires `start`/`create` before the API reflects the new state.
      // A short delay lets the daemon settle before we fetch.
      const needsDelay = e.data === 'start' || e.data === 'create'
      if (needsDelay) {
        setTimeout(fetchContainers, 500)
      } else {
        fetchContainers()
      }
    }
    return () => es.close()
  }, [fetchContainers])

  const totalRunning = groups.reduce(
    (acc, g) => acc + g.containers.filter(c => c.status === 'running').length,
    0,
  )
  const totalContainers = groups.reduce((acc, g) => acc + g.containers.length, 0)

  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-950 border border-sky-800">
              <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-zinc-100">Caddy Dashboard</h1>
          </div>
          <p className="text-sm text-zinc-500 ml-11">
            {loading ? 'Chargement…' : `${totalRunning} service${totalRunning > 1 ? 's' : ''} actif${totalRunning > 1 ? 's' : ''} sur ${totalContainers}`}
          </p>
        </div>

        {/* Cert banner */}
        <div className="mb-6">
          <CertBanner onDownload={downloadCert} />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg border border-red-800/50 bg-red-950/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Projects */}
        {!loading && groups.length === 0 && !error && (
          <div className="text-center py-16 text-zinc-600">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm">Aucun service avec un label <code className="font-mono text-zinc-500">caddy</code> trouvé</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
          {groups.map(group => (
            <ProjectCard key={group.project} group={group} />
          ))}
        </div>
      </div>
    </div>
  )
}
