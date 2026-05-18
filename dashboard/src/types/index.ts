export interface ContainerInfo {
  id: string
  service: string
  project: string
  url: string
  status: 'running' | 'stopped'
}

export interface ProjectGroup {
  project: string
  containers: ContainerInfo[]
}
