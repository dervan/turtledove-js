import { generateAdNetworkAppAsync, InterestGroupAd, ProductLevelInterestGroupAd, ContextualBidResponse } from 'turtledove-js-api'
import { ProductPrototype } from './ad-params.js'
import express from 'express'

import fs from 'fs'
import path from 'path'

import { computeInterestGroupSignals, selectAds } from './interest-group-evaluation.js'
import { extractContextSignals, getContextualAd } from './context-evaluation.js'
import { ports, addresses } from '../config.js'

const __dirname = path.resolve('./ad-network')

function convertToAd (interestGroupKey, bidFunctionUrl) {
  return async adPrototype => {
    const html = await adPrototype.generateAdHtml()
    const signals = computeInterestGroupSignals(adPrototype)
    if (adPrototype.productsCount !== undefined) {
      const productsOwner = interestGroupKey.split('_')[0]
      return new ProductLevelInterestGroupAd(adPrototype.id, interestGroupKey, html, signals, bidFunctionUrl, productsOwner, adPrototype.productsCount, addresses.adPartner)
    } else {
      return new InterestGroupAd(adPrototype.id, interestGroupKey, html, signals, bidFunctionUrl, addresses.adPartner)
    }
  }
}

/**
 * For given InterestGroup returns list of prepared InterestGroupAds, in the format described by TURTLEDOVE.
 * @param {string} interestGroupKey
 * @returns {Promise<InterestGroupAd[]>}
 */
async function fetchAds (interestGroupKey) {
  console.log(`Fetch ads for: ${interestGroupKey}`)
  const adsParams = selectAds(interestGroupKey)
  const bidFunctionUrl = addresses.adPartner + '/static/bidding-function.js'
  return await Promise.all(adsParams.map(convertToAd(interestGroupKey, bidFunctionUrl)))
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

async function fetchProducts (owner, product) {
  console.log(`Fetch product ${product} for: ${owner}`)
  const productPrototype = new ProductPrototype(owner, product)
  return {
    owner: owner,
    product: product,
    iframeContent: await productPrototype.generateHtml()
  }
}

const app = generateAdNetworkAppAsync(fetchAds, fetchContextualBid, fetchProducts)
app.use('/static', express.static(`${__dirname}/content/static`))
app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html')
  res.send(fs.readFileSync(`${__dirname}/content/index.html`))
})
app.listen(ports.adPartnerPort,
  () => console.log(`Ad network listening at http://localhost:${ports.adPartnerPort}`))
