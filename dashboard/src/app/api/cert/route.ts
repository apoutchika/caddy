import { readFile, access } from 'fs/promises'

export const runtime = 'nodejs'

const CERT_PATH = '/caddy-data/caddy/pki/authorities/local/root.crt'

export async function GET() {
  try {
    await access(CERT_PATH)
    const cert = await readFile(CERT_PATH)
    return new Response(cert, {
      headers: {
        'Content-Type': 'application/x-x509-ca-cert',
        'Content-Disposition': 'attachment; filename="caddy-local-ca.crt"',
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Certificat pas encore généré' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function HEAD() {
  try {
    await access(CERT_PATH)
    return new Response(null, { status: 200 })
  } catch {
    return new Response(null, { status: 404 })
  }
}
