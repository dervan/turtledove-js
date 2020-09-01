const express = require('express')
const cors = require('cors')
const fs = require('fs')
const bodyParser = require('body-parser')

const { ports, addresses } = require('../config')
const { computeInterestGroupSignals, interestGroupToAdParams } = require('./interest-group-evaluation')
const { extractContextSignals, getContextualAd } = require('./context-evaluation')

const { InterestGroupAd, ContextualBidResponse } = require('../turtledove-server/content/static/js/ad-partner-classes')

const app = express()
app.use(cors())
app.use(bodyParser.json())

/**
 * For given InterestGroup returns prepared InterestGroupAd, in the format described by TURTLEDOVE.
 * @param {string} interestGroupKey
 * @returns {Promise<InterestGroupAd>}
 */
async function fetchAds (interestGroupKey) {
  console.log(`Fetch ads for: ${interestGroupKey}`)
  const adParams = interestGroupToAdParams(interestGroupKey)
  const igSignals = computeInterestGroupSignals(interestGroupKey)
  const bidFunctionUrl = addresses.adPartner + '/static/bidding-function.js'
  return new InterestGroupAd(interestGroupKey, await adParams.generateAdHtml(), igSignals, bidFunctionUrl, addresses.adPartner)
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

app.get('/fetch-ads', async (req, res) => {
  res.json(await fetchAds(decodeURIComponent(req.query.interest_group)))
})
app.post('/fetch-context-bid', async (req, res) => res.json(await fetchContextualBid(req.body)))
app.post('/fetch-contextual-bid', async (req, res) => res.json(await fetchContextualBid(req.body)))
app.use('/static', express.static(`${__dirname}/content/static`))
app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html')
  res.send(fs.readFileSync(`${__dirname}/content/index.html`))
})
app.listen(ports.adPartnerPort,
  () => console.log(`Ad network listening at http://localhost:${ports.adPartnerPort}`))
