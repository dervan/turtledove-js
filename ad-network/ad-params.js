import eta from 'eta'
import path from 'path'

const __dirname = path.resolve('./ad-network')

function hsvToRgb (h, s, v) {
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  let r, g, b
  switch (i % 6) {
    case 0:
      r = v
      g = t
      b = p
      break
    case 1:
      r = q
      g = v
      b = p
      break
    case 2:
      r = p
      g = v
      b = t
      break
    case 3:
      r = p
      g = q
      b = v
      break
    case 4:
      r = t
      g = p
      b = v
      break
    case 5:
      r = v
      g = p
      b = q
      break
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

function rgbToString (rgb) {
  return 'rgb(' + rgb.r + ', ' + rgb.g + ',' + rgb.b + ')'
}

export class AdParams {
  constructor (adTarget, image, href) {
    this.adTarget = adTarget
    this.image = image
    this.href = href
    const rgb = hsvToRgb(Math.random(), 0.15, 0.95)
    this.background = rgbToString(rgb)
  }

  async generateAdHtml () {
    return await eta.renderFile(`${__dirname}/content/ad.html.ejs`, this)
  }
}
