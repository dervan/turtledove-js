import { generateAdNetworkAppAsync, InterestGroupAd, ContextualBidResponse } from 'turtledove-js-api'
import express from 'express'

import fs from 'fs'
import path from 'path'

import { computeInterestGroupSignals, interestGroupToAdParams } from './interest-group-evaluation.js'
import { extractContextSignals, getContextualAd } from './context-evaluation.js'
import { ports, addresses } from '../config.js'

const __dirname = path.resolve('./ad-network')

/**
 * For given InterestGroup returns list of prepared InterestGroupAds, in the format described by TURTLEDOVE.
 * @param {string} interestGroupKey
 * @returns {Promise<InterestGroupAd[]>}
 */
async function fetchAds (interestGroupKey) {
  console.log(`Fetch ads for: ${interestGroupKey}`)
  const adParams = interestGroupToAdParams(interestGroupKey)
  const igSignals = computeInterestGroupSignals(interestGroupKey)
  const bidFunctionUrl = addresses.adPartner + '/static/bidding-function.js'
  return [new InterestGroupAd(interestGroupKey, await adParams.generateAdHtml(), igSignals, bidFunctionUrl, addresses.adPartner)]
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

const app = generateAdNetworkAppAsync(fetchAds, fetchContextualBid)
app.use('/static', express.static(`${__dirname}/content/static`))
app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html')
  res.send(fs.readFileSync(`${__dirname}/content/index.html`))
})
app.listen(ports.adPartnerPort,
  () => console.log(`Ad network listening at http://localhost:${ports.adPartnerPort}`))
