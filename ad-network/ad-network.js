import { generateAdNetworkAppAsync, InterestGroupAd, ProductLevelInterestGroupAd, ContextualBidResponse, Product } from 'turtledove-js-api'
import { ProductPrototype } from './ad-prototypes.js'
import express from 'express'

import fs from 'fs'
import path from 'path'

import { computeInterestGroupSignals, selectAds } from './interest-group-evaluation.js'
import { extractContextSignals, getContextualAd } from './context-evaluation.js'
import { ports, addresses } from '../config.js'

const __dirname = path.resolve('./ad-network')

/**
 * Returns a function that will take one of AdPrototypes and convert it to final Ad that will be sent to browser.
 */
function convertToAd (interestGroupId, bidFunctionUrl) {
  return async adPrototype => {
    const html = await adPrototype.generateAdHtml()
    const signals = computeInterestGroupSignals(adPrototype)
    if (adPrototype.productsCount !== undefined) {
      const productsOwner = interestGroupId.split('_')[0]
      return new ProductLevelInterestGroupAd(adPrototype.id, interestGroupId, html, signals, bidFunctionUrl, productsOwner, adPrototype.productsCount, addresses.adPartner)
    } else {
      return new InterestGroupAd(adPrototype.id, interestGroupId, html, signals, bidFunctionUrl, addresses.adPartner)
    }
  }
}

/**
 * For given InterestGroup returns list of prepared InterestGroupAds, in the format described by TURTLEDOVE.
 * @param {string} interestGroupId
 * @returns {Promise<InterestGroupAd[]>}
 */
async function fetchAds (interestGroupId) {
  console.log(`Fetch ads for: ${interestGroupId}`)
  const adsParams = selectAds(interestGroupId)
  const bidFunctionUrl = addresses.adPartner + '/static/bidding-function.js'
  return await Promise.all(adsParams.map(convertToAd(interestGroupId, bidFunctionUrl)))
}

/**
 * Receives some information about the context (in the format settled between publisher and ad-network). Basing on this,
 * ad-network is returning contextSignals (later fed to bidding function from InterestGroupAd) and purely contextual ad.
 * @param {ContextualBidRequest} contextualBidRequest
 * @returns {Promise<ContextualBidResponse>}
 */
async function fetchContextualBid (contextualBidRequest) {
  console.log(`Fetch contextual bid for: ${JSON.stringify(contextualBidRequest)}`)
  const contextSignals = extractContextSignals(contextualBidRequest)
  const evaluatedContextualAd = await getContextualAd(contextualBidRequest, contextSignals)
  return new ContextualBidResponse(contextSignals, evaluatedContextualAd?.contextualAd, evaluatedContextualAd?.bidValue)
}

/**
 * Returns a single product that can be used on product-level ads.
 */
async function fetchProducts (owner, productId) {
  console.log(`Fetch product ${productId} for: ${owner}`)
  const productPrototype = new ProductPrototype(owner, productId)
  return new Product(owner, productId, await productPrototype.generateHtml())
}

const app = generateAdNetworkAppAsync(fetchAds, fetchContextualBid, fetchProducts)
app.use('/static', express.static(`${__dirname}/content/static`))
app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html')
  res.send(fs.readFileSync(`${__dirname}/content/index.html`))
})
app.listen(ports.adPartnerPort,
  () => console.log(`Ad network listening at http://localhost:${ports.adPartnerPort}`))
