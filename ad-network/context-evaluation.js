const { AdParams } = require('./ad-params')
const { ContextAd } = require('../turtledove-server/content/static/js/ad-partner-classes')
const { addresses } = require('../config')

class ContextSignals {
  constructor (topic, deniedTerms, igOwnerBonus) {
    this.topic = topic
    this.deniedTerms = deniedTerms
    this.igOwnerBonus = igOwnerBonus
  }
}

class EvaluatedContextAd {
  constructor (contextAd, bidValue) {
    this.contextAd = contextAd
    this.bidValue = bidValue
  }
}

/**
 * Returns context signals that will be fed to bidding function during the on-device auction. Returned signals are completely free-form JSON.
 * @param {ContextBidRequest} contextBidRequest
 * @returns {ContextSignals}
 */
function extractContextSignals (contextBidRequest) {
  const igOwnerBonus = {}
  if (contextBidRequest?.topic === 'animals') {
    igOwnerBonus[new URL(addresses.animalsAdvertiser).host] = 1
  }
  return new ContextSignals(contextBidRequest?.topic, contextBidRequest?.adPolicy?.deniedTerms, igOwnerBonus)
}

/**
 * Returns context ad based on received context and previously extracted ContextSignals
 * @param {ContextBidRequest} contextBidRequest
 * @param {ContextSignals} contextSignals
 * @returns {Promise<EvaluatedContextAd>}
 */
async function getContextAd (contextBidRequest, contextSignals) {
  const id = contextSignals.topic + '-' + contextBidRequest.placement?.side
  const ctxAdParams = new AdParams('context_' + contextSignals.topic, `https://picsum.photos/seed/${id}/280/180`, null)
  const isOnRight = contextBidRequest.placement?.side === 'right'
  const isOnTransportSite = addresses.planesPublisher.includes(contextBidRequest?.site)
  const bidValue = isOnRight ? (isOnTransportSite ? 2 : 0.15) : 0.05
  return new EvaluatedContextAd(new ContextAd(id, await ctxAdParams.generateAdHtml(), addresses.adPartner), bidValue)
}

module.exports = { getContextAd, extractContextSignals }
