import type { VercelRequest, VercelResponse } from '@vercel/node'
import { formidable } from 'formidable'
import { readFileSync } from 'fs'
import { tmpdir } from 'os'

export const config = {
  api: { bodyParser: false },
}

const APPSCRIPT_URL = (
  process.env.APPSCRIPT_WEBAPP_URL ||
  process.env.APPSCRIPT_URL ||
  ''
).trim();
const APPSCRIPT_SECRET = process.env.APPSCRIPT_SECRET;

interface ParsedFile {
  path: string
  name: string
  type: string
}

async function parseForm(req: VercelRequest): Promise<{
  fields: Record<string, string>
  files: Record<string, ParsedFile>
}> {
  const form = formidable({
    uploadDir: tmpdir(),
    keepExtensions: true,
    maxFileSize: 100 * 1024 * 1024,
  })
  const [fields, files] = await form.parse(req as unknown as Parameters<typeof form.parse>[0])
  const flatFields: Record<string, string> = {}
  for (const [k, v] of Object.entries(fields as Record<string, string | string[]>)) {
    flatFields[k] = Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
  }
  const flatFiles: Record<string, ParsedFile> = {}
  for (const [k, v] of Object.entries(files as Record<string, { filepath?: string; originalFilename?: string; newFilename?: string; mimetype?: string } | { filepath?: string; originalFilename?: string; newFilename?: string; mimetype?: string }[]>)) {
    const f = Array.isArray(v) ? v[0] : v
    if (f?.filepath) {
      flatFiles[k] = {
        path: f.filepath,
        name: f.originalFilename || f.newFilename || '',
        type: f.mimetype || '',
      }
    }
  }
  return { fields: flatFields, files: flatFiles }
}

function fileToBase64(path: string): string {
  const buf = readFileSync(path)
  return buf.toString('base64')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  if (!APPSCRIPT_URL) {
    res.status(500).json({
      error:
        'Server misconfigured: set APPSCRIPT_WEBAPP_URL in Vercel (Settings → Environment Variables), then redeploy.',
    })
    return
  }

  try {
    const { fields, files } = await parseForm(req)

    const orderNumber = fields.orderNumber ?? ''
    const creatorName = fields.creatorName ?? ''
    const quantityOrdered = fields.quantityOrdered ?? ''
    const submittedUrl = fields.submittedUrl ?? ''
    const orderConfirmationLink = fields.orderConfirmationLink ?? ''
    const message = fields.message ?? ''
    const submittedQrUrl = fields.submittedQr ?? ''
    const confirmationQrUrl = fields.confirmationQr ?? ''

    const payload: Record<string, string> = {
      orderNumber,
      creatorName,
      quantityOrdered,
      submittedUrl,
      orderConfirmationLink,
      message,
      submittedQrUrl,
      confirmationQrUrl,
    }
    if (APPSCRIPT_SECRET) payload.secret = APPSCRIPT_SECRET

    for (let i = 1; i <= 5; i++) {
      const key = `image${i}`
      const f = files[key]
      if (f?.path) {
        payload[`image${i}Base64`] = fileToBase64(f.path)
        payload[`image${i}Name`] = f.name
      }
    }

    const appRes = await fetch(APPSCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const text = await appRes.text()
    let data: { success?: boolean; error?: string }
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text || 'Apps Script returned non-JSON' }
    }

    if (!appRes.ok) {
      res.status(appRes.status).json(data)
      return
    }
    if (!data.success) {
      res.status(502).json(data)
      return
    }
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('orders API error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
