const express = require('express')
const eta = require('eta')
const { ports, addresses } = require('../config')

const statics = express.static(`${__dirname}/content/static`)

function getRenderedHtml (filename, environment) {
  return eta.renderFile(`${__dirname}/content/${filename}`, environment)
}

const aboutAnimals = express()
aboutAnimals.get('/', async (req, res) => res.send(await getRenderedHtml('aboutanimals.html.ejs', addresses)))
aboutAnimals.use('/static', statics)
aboutAnimals.listen(ports.animalsPublisherPort,
  () => console.log(`Animals publisher app listening at http://localhost:${ports.animalsPublisherPort}`))

const aboutPlanes = express()
aboutPlanes.get('/', async (req, res) => res.send(await getRenderedHtml('aboutplanes.html.ejs', addresses)))
aboutPlanes.use('/static', statics)
aboutPlanes.listen(ports.planesPublisherPort,
  () => console.log(`Planes publisher app listening at http://localhost:${ports.planesPublisherPort}`))

const trainOrPlane = express()
trainOrPlane.get('/', async (req, res) => res.send(await getRenderedHtml('trainorplane.html.ejs', addresses)))
trainOrPlane.use('/static', statics)
trainOrPlane.listen(ports.transportAdvertiserPort,
  () => console.log(`Transport advertiser app listening at http://localhost:${ports.transportAdvertiserPort}`))

const catOrDog = express()
catOrDog.get('/', async (req, res) => res.send(await getRenderedHtml('catordog.html.ejs', addresses)))
catOrDog.get('/catfood', async (req, res) => res.send(await getRenderedHtml('catordog-product.html.ejs', {
  ...addresses,
  animal: 'cat'
})))
catOrDog.get('/dogfood', async (req, res) => res.send(await getRenderedHtml('catordog-product.html.ejs', {
  ...addresses,
  animal: 'dog'
})))

catOrDog.use('/static', statics)
catOrDog.listen(ports.animalsAdvertiserPort,
  () => console.log(`Advertiser app listening at http://localhost:${ports.animalsAdvertiserPort}`))

const sportEquipment = express()
sportEquipment.get('/', async (req, res) => res.send(await getRenderedHtml('sportequipment.html.ejs', addresses)))
for (const product of ['scooters', 'bikes', 'rollers']) {
  sportEquipment.get('/' + product, async (req, res) => res.send(await getRenderedHtml('sportequipment-product.html.ejs', {
    ...addresses,
    product: product
  })))
}
sportEquipment.use('/static', statics)
sportEquipment.listen(ports.sportEquipmentAdvertiserPort,
  () => console.log(`Advertiser app listening at http://localhost:${ports.sportEquipmentAdvertiserPort}`))
