import type { VercelRequest, VercelResponse } from '@vercel/node'
import { formidable } from 'formidable'
import { readFileSync } from 'fs'
import { tmpdir } from 'os'

export const config = {
  api: { bodyParser: false },
}

const APPSCRIPT_URL = (process.env.APPSCRIPT_WEBAPP_URL || '').trim();
const APPSCRIPT_SECRET = (process.env.APPSCRIPT_SECRET || '').trim();

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
        'Server Error Please Contact Support',
    })
    return
  }

  try {
    const { fields, files } = await parseForm(req)
    const action = fields.action ?? ''

    if (action === 'uploadImage') {
      const orderId = (fields.orderId ?? '').replace(/^#/, '').replace(/\s/g, '')
      const imageIndex = Number(fields.imageIndex ?? '')
      const imageFile = files.image
      if (!orderId || !Number.isInteger(imageIndex) || imageIndex < 1 || imageIndex > 5 || !imageFile?.path) {
        res.status(400).json({ error: 'uploadImage requires orderId, imageIndex (1-5), and image file' })
        return
      }

      const imgPayload: Record<string, string | number> = {
        action: 'uploadImage',
        orderId,
        imageIndex,
        base64: fileToBase64(imageFile.path),
        fileName: imageFile.name || `ORDER${orderId}_Image${imageIndex}.jpg`,
      }
      if (APPSCRIPT_SECRET) imgPayload.secret = APPSCRIPT_SECRET

      const imgRes = await fetch(APPSCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(imgPayload),
      })

      const text = await imgRes.text()
      let data: { success?: boolean; error?: string }
      try {
        data = JSON.parse(text)
      } catch {
        data = { error: text || 'Apps Script returned non-JSON' }
      }
      if (!imgRes.ok) {
        res.status(imgRes.status).json(data)
        return
      }
      if (!data.success) {
        res.status(502).json(data)
        return
      }
      res.status(200).json({ success: true })
      return
    }

    const orderNumber = fields.orderNumber ?? ''
    const creatorName = fields.creatorName ?? ''
    const quantityOrdered = fields.quantityOrdered ?? ''
    const submittedUrl = fields.submittedUrl ?? ''
    const orderConfirmationLink = fields.orderConfirmationLink ?? ''
    const message = fields.message ?? ''
    const submittedQrUrl = fields.submittedQr ?? ''
    const confirmationQrUrl = fields.confirmationQr ?? ''

    const orderPayload: Record<string, string> = {
      orderNumber,
      creatorName,
      quantityOrdered,
      submittedUrl,
      orderConfirmationLink,
      message,
      submittedQrUrl,
      confirmationQrUrl,
    }
    if (APPSCRIPT_SECRET) orderPayload.secret = APPSCRIPT_SECRET

    const appRes = await fetch(APPSCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    })

    let text = await appRes.text()
    let data: { success?: boolean; error?: string; duplicate?: boolean }
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
