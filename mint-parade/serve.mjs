import { createServer } from 'node:http'
import { stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, extname, sep } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT || 4174)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
}
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, 'http://localhost').pathname,
    )
    if (pathname === '/__game_health') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      res.end(JSON.stringify({ game: 'mint-parade', root }))
      return
    }
    const relative =
      pathname.replace(/^\/mint-parade(?=\/|$)/, '').replace(/^\/+/, '') ||
      'index.html'
    const path = resolve(
      root,
      relative.endsWith('/') ? relative + 'index.html' : relative,
    )
    if (!path.startsWith(root + sep) || !types[extname(path)]) {
      res.writeHead(404)
      res.end('Not found')
      return
    }
    const info = await stat(path)
    if (!info.isFile()) throw new Error('Not a file')
    const headers = {
      'Content-Type': types[extname(path)],
      'Cache-Control': 'no-cache',
      'Accept-Ranges': 'bytes',
    }
    let start = 0,
      end = info.size - 1,
      status = 200
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range)
      if (range && (range[1] || range[2])) {
        start = range[1]
          ? Number(range[1])
          : Math.max(0, info.size - Number(range[2]))
        end = range[1] && range[2] ? Number(range[2]) : info.size - 1
        end = Math.min(end, info.size - 1)
      }
      if (
        !range ||
        !(range[1] || range[2]) ||
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        start > end ||
        start >= info.size
      ) {
        res.writeHead(416, {
          ...headers,
          'Content-Range': `bytes */${info.size}`,
        })
        res.end()
        return
      }
      status = 206
      headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`
    }
    headers['Content-Length'] = info.size ? end - start + 1 : 0
    res.writeHead(status, headers)
    if (req.method === 'HEAD' || !info.size) res.end()
    else {
      const stream = createReadStream(path, { start, end })
      stream.on('error', () => res.destroy())
      res.on('close', () => stream.destroy())
      stream.pipe(res)
    }
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
}).listen(port, '127.0.0.1', () =>
  console.log(`Mint Parfait Parade: http://localhost:${port}/mint-parade/`),
)
