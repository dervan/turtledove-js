const express = require('express')
const fs = require('fs')
const cors = require('cors')
const eta = require('eta')
const path = require('path')
const { ports, addresses } = require('../config')

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
app.get('/tdstore', jsEmbeddedIntoHtml('./static/turtledove-store.js'))
app.get('/tdbid', jsEmbeddedIntoHtml('./static/turtledove-bid.js'))
app.get('/turtledove.js', serveTemplatedJs('/content/turtledove.js'))
app.get('/turtledove-console.js', serveTemplatedJs('/content/turtledove-console.js'))
app.get('/tdremove', serveHtml('/content/tdremove.html'))
app.get('/log', serveHtml('/content/log.html'))
app.get('/', serveHtml('/content/user-interface.html'))

app.listen(ports.turtledovePort,
  () => console.log(`TD demo server listening at http://localhost:${ports.turtledovePort}`))
