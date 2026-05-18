export interface ContainerInfo {
  id: string
  service: string
  project: string
  urls: string[]
  status: 'running' | 'stopped'
}

export interface ProjectGroup {
  project: string
  containers: ContainerInfo[]
}
