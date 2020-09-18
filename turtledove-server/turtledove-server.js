import express from 'express'
import fs from 'fs'
import cors from 'cors'
import eta from 'eta'
import path from 'path'
import { ports, addresses } from '../config.js'
const __dirname = path.resolve('./turtledove-server/')

function jsEmbeddedIntoHtml (pathToJs) {
  return (req, res) => {
    res.set('Content-Type', 'text/html')
    res.send('<html><head><link href="./static/css/ad-wrapper.css" rel="stylesheet"/>' +
      '<link href="./static/css/tooltip.css" rel="stylesheet"/></head>' +
      `<body><script type="module" src="${pathToJs}"></script></body></html>`)
  }
}

function serveHtml (file) {
  return (req, res) => {
    res.set('Content-Type', 'text/html')
    res.send(fs.readFileSync(path.join(__dirname, file)))
  }
}

function serveTemplatedJs (file) {
  const turtledoveJs = eta.renderFile(path.join(__dirname, file), addresses)
  return async (req, res) => {
    res.set('Content-Type', 'application/javascript')
    return res.send(await turtledoveJs)
  }
}

const app = express()
app.use(cors())
app.use('/static', express.static(path.join(__dirname, 'content/static')))
app.get('/turtledove.js', serveTemplatedJs('/content/turtledove.js'))
app.get('/turtledove-console.js', serveTemplatedJs('/content/turtledove-console.js'))

app.get('/store', jsEmbeddedIntoHtml('./static/js/store.js'))
app.get('/render-ad', jsEmbeddedIntoHtml('./static/js/render-ad.js'))
app.get('/ad-remove', serveHtml('/content/static/ad-remove.html'))
app.get('/product-remove', serveHtml('/content/static/product-remove.html'))
app.get('/console', serveHtml('/content/static/console.html'))
app.get('/', serveHtml('/content/static/user-interface.html'))

app.listen(ports.turtledovePort,
  () => console.log(`TD demo server listening at http://localhost:${ports.turtledovePort}`))
