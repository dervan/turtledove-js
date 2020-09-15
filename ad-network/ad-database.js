import { addresses } from '../config.js'
import { SimpleAdPrototype, ProductLevelAdPrototype } from './ad-params.js'

function extractHost (url) {
  return new URL(url).host
}

function generateAd (address, groupName, img, href, baseValue) {
  const fullName = extractHost(address) + '_' + groupName
  if (href.length === 0 || href[0] === '/') {
    href = address + href
  }
  if (img[0] === '/') {
    img = address + img
  }
  return new SimpleAdPrototype(fullName, img, href, baseValue)
}

function generateProductLevelAd (address, groupName, productsCount, baseValue) {
  const fullName = extractHost(address) + '_' + groupName
  return new ProductLevelAdPrototype(fullName, productsCount, baseValue)
}

export const adsDb = [
  generateAd(addresses.animalsAdvertiser, 'animals_visitor', '/static/images/animals.png', '', 0.1),
  generateAd(addresses.animalsAdvertiser, 'cats_lover', '/static/images/cat.svg', '/catfood', 0.4),
  generateAd(addresses.animalsAdvertiser, 'catfood_buyer', '/static/images/cat.svg', '/catfood', 2.8),
  generateAd(addresses.animalsAdvertiser, 'dogs_lover', '/static/images/dog.svg', '/dogfood', 0.3),
  generateAd(addresses.animalsAdvertiser, 'dogfood_buyer', '/static/images/dog.svg', '/dogfood', 2.7),
  generateAd(addresses.transportAdvertiser, 'trains_lover', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/PKP.svg/2560px-PKP.svg.png', 'https://pkp.pl', 0.5),
  generateAd(addresses.transportAdvertiser, 'planes_lover', 'https://upload.wikimedia.org/wikipedia/en/3/3d/LOT_Polish_Airlines.svg', 'https://lot.com', 0.6),
  generateAd(addresses.sportEquipmentAdvertiser, 'scooters_viewer', '/static/images/scooters.svg', '/scooters', 0.8),
  generateAd(addresses.sportEquipmentAdvertiser, 'bikes_viewer', '/static/images/bikes.svg', '/bikes', 0.9),
  generateAd(addresses.sportEquipmentAdvertiser, 'rollerblades_viewer', '/static/images/rollerblades.svg', '/rollerblades', 1.1),
  generateProductLevelAd(addresses.clothesAdvertiser, 'visitor', 3, 2)
]
