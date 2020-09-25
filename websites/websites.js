import express from 'express'
import eta from 'eta'
import path from 'path'
import { ports, addresses } from '../config.js'

const __dirname = path.resolve('./websites/')
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
  () => console.log(`Animals advertiser app listening at http://localhost:${ports.animalsAdvertiserPort}`))

const sportEquipment = express()
sportEquipment.get('/', async (req, res) => res.send(await getRenderedHtml('sportequipment.html.ejs', addresses)))
for (const product of ['scooters', 'bikes', 'rollerblades']) {
  sportEquipment.get('/' + product, async (req, res) => res.send(await getRenderedHtml('sportequipment-product.html.ejs', {
    ...addresses,
    product: product
  })))
}
sportEquipment.use('/static', statics)
sportEquipment.listen(ports.sportEquipmentAdvertiserPort,
  () => console.log(`Sports advertiser app listening at http://localhost:${ports.sportEquipmentAdvertiserPort}`))

const clothesStore = express()
const colors = ['blue', 'red', 'green', 'purple']
const products = ['jackets', 'scarfs', 'caps']

clothesStore.get('/', async (req, res) => res.send(await getRenderedHtml('clothes.html.ejs', {
  ...addresses,
  products: products
})))
for (const product of products) {
  clothesStore.get('/' + product, async (req, res) => res.send(await getRenderedHtml('clothes-category.html.ejs', {
    ...addresses,
    product: product,
    colors: colors
  })))
  for (const color of colors) {
    clothesStore.get('/' + color + '-' + product, async (req, res) => res.send(await getRenderedHtml('clothes-product.html.ejs', {
      ...addresses,
      color: color,
      product: product
    })))
  }
}
clothesStore.use('/static', statics)
clothesStore.listen(ports.clothesAdvertiserPort,
  () => console.log(`Clothes advertiser app listening at http://localhost:${ports.clothesAdvertiserPort}`))
