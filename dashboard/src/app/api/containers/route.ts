import { NextResponse } from 'next/server'
import { getContainers } from '@/lib/containers'

export async function GET(request: Request) {
  const selfHost = request.headers.get('host')?.split(':')[0] ?? ''
  try {
    const containers = await getContainers(selfHost)
    return NextResponse.json(containers)
  } catch {
    return NextResponse.json({ error: 'Impossible de contacter Docker' }, { status: 500 })
  }
}
