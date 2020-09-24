import eta from 'eta'
import path from 'path'
import { addresses } from '../config.js'
import { ContextualAd, InterestGroupAd, ProductLevelInterestGroupAd, Product } from 'turtledove-js-api'

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

class InterestGroupSignals {
  constructor (owner, name, baseValue) {
    this.owner = owner
    this.name = name
    this.baseValue = baseValue
  }
}

/**
 * Returns interest group signals - data that are used in the bidding function for a given ad prototype.
 * @param {AdPrototype} interestGroupId
 * @returns {InterestGroupSignals}
 */
function computeInterestGroupSignals (adPrototype) {
  const owner = adPrototype.adTarget.split('_')[0]
  const name = adPrototype.adTarget.substring(owner.length + 1)
  return new InterestGroupSignals(owner, name, adPrototype.baseValue)
}

class AdPrototype {
  constructor (id, adTarget, baseValue, adPath) {
    this.id = id
    this.adTarget = adTarget
    this.adPath = adPath
    this.baseValue = baseValue
    this.adPartner = addresses.adPartner
  }

  async generateAdHtml () {
    return await eta.renderFile(path.join(__dirname, this.adPath), this)
  }

  /**
   * This function is converting prototype to final Ad that will be sent to browser.
   */
  async convertToAd (interestGroupId, bidFunctionUrl) {
    const html = await this.generateAdHtml()
    if (interestGroupId === undefined) {
      return new ContextualAd(this.id, html, addresses.adPartner)
    }
    const signals = computeInterestGroupSignals(this)
    if (this.productsCount === undefined) {
      return new InterestGroupAd(this.id, interestGroupId, html, signals, bidFunctionUrl, addresses.adPartner)
    }
    const productsOwner = interestGroupId.split('_')[0]
    return new ProductLevelInterestGroupAd(this.id, interestGroupId, html, signals, bidFunctionUrl, productsOwner, this.minProductsCount, this.productsCount, addresses.adPartner)
  }
}

export class SimpleAdPrototype extends AdPrototype {
  constructor (adTarget, image, href, baseValue) {
    super(adTarget, adTarget, baseValue, '/content/ad.html.ejs')
    this.image = image
    this.href = href
    const rgb = hsvToRgb(Math.random(), 0.15, 0.95)
    this.background = rgbToString(rgb)
  }
}

export class ProductLevelAdPrototype extends AdPrototype {
  constructor (adTarget, minProductsCount, productsCount, baseValue) {
    super(adTarget + '#PLTD', adTarget, baseValue, '/content/product-level-ad.html.ejs')
    const rgb = hsvToRgb(Math.random(), 0.3, 0.95)
    this.background = rgbToString(rgb)
    this.minProductsCount = minProductsCount
    this.productsCount = productsCount
  }
}

export class ProductPrototype {
  constructor (owner, productId) {
    this.owner = owner
    this.productId = productId
    this.title = productId.replace('-', ' ')
    this.adPartner = addresses.adPartner
  }

  async generateHtml () {
    return await eta.renderFile(path.join(__dirname, '/content/product.html.ejs'), this)
  }

  async convertToProduct () {
    return new Product(this.owner, this.productId, await this.generateHtml())
  }
}
