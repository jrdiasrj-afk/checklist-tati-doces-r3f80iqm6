// Gera public/icon-192.png e public/icon-512.png (logo "Tati Check").
// Rodar uma vez: node scripts/gen-icons.mjs
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

// CRC32 manual.
const tabela = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
const crc = (buf) => {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = tabela[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// Desenha um ícone: fundo arredondado rosa (#E0447C), "cupcake" estilizado.
function desenhar(size) {
  const px = new Uint8Array(size * size * 4)
  const r = size * 0.22 // raio do canto arredondado
  const cx = size / 2
  const baseY = size * 0.78
  const topoY = size * 0.3
  const raioCopo = size * 0.26
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      // canto arredondado do app icon
      const dx = Math.max(r - x, x - (size - 1 - r), 0)
      const dy = Math.max(r - y, y - (size - 1 - r), 0)
      const fora = Math.hypot(dx, dy) > r
      if (fora) {
        px[i + 3] = 0
        continue
      }
      // cupcake: copo trapezoidal + cobertura (semicírculo)
      const noCopo =
        y > topoY + size * 0.12 &&
        y < baseY &&
        Math.abs(x - cx) < raioCopo * (1 - (y - topoY - size * 0.12) / (size * 0.5))
      const dCobertura = Math.hypot(x - cx, y - (topoY + size * 0.06))
      const naCobertura = dCobertura < size * 0.24 && y < topoY + size * 0.2
      if (noCopo) {
        ;[px[i], px[i + 1], px[i + 2]] = [0xff, 0xf9, 0xf2] // creme
      } else if (naCobertura) {
        ;[px[i], px[i + 1], px[i + 2]] = [0xff, 0xff, 0xff] // cobertura branca
      } else {
        ;[px[i], px[i + 1], px[i + 2]] = [0xe0, 0x44, 0x7c] // fundo rosa
      }
      px[i + 3] = 255
    }
  }
  return px
}

function png(size) {
  const px = desenhar(size)
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filtro none
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1)
  }
  const chunk = (tipo, dados) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(dados.length)
    const corpo = Buffer.concat([Buffer.from(tipo), dados])
    const crcBuf = Buffer.alloc(4)
    crcBuf.writeUInt32BE(crc(corpo))
    return Buffer.concat([len, corpo, crcBuf])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync('public/icon-192.png', png(192))
writeFileSync('public/icon-512.png', png(512))
console.log('Ícones gerados: public/icon-192.png, public/icon-512.png')
