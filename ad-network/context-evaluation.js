import { ContextualAd } from 'turtledove-js-api'
import { SimpleAdPrototype } from './ad-params.js'
import { addresses } from '../config.js'

class ContextSignals {
  constructor (topic, deniedTerms, igOwnerBonus) {
    this.topic = topic
    this.deniedTerms = deniedTerms
    this.igOwnerBonus = igOwnerBonus
  }
}

class EvaluatedContextualAd {
  constructor (contextualAd, bidValue) {
    this.contextualAd = contextualAd
    this.bidValue = bidValue
  }
}

/**
 * Returns context signals that will be fed to bidding function during the on-device auction. Returned signals are completely free-form JSON.
 * @param {ContextualBidRequest} contextualBidRequest
 * @returns {ContextSignals}
 */
export function extractContextSignals (contextualBidRequest) {
  const igOwnerBonus = {}
  if (contextualBidRequest?.topic === 'animals') {
    igOwnerBonus[new URL(addresses.animalsAdvertiser).host] = 1
  }
  return new ContextSignals(contextualBidRequest?.topic, contextualBidRequest?.adPolicy?.deniedTerms, igOwnerBonus)
}

/**
 * Returns contextual ad based on received ContextualBidRequest and previously extracted ContextSignals
 * @param {ContextualBidRequest} contextualBidRequest
 * @param {ContextSignals} contextSignals
 * @returns {Promise<EvaluatedContextualAd>}
 */
export async function getContextualAd (contextualBidRequest, contextSignals) {
  const id = contextSignals.topic + '-' + contextualBidRequest.placement?.side
  const isOnRight = contextualBidRequest.placement?.side === 'right'
  const isOnTransportSite = addresses.planesPublisher.includes(contextualBidRequest?.site)
  const bidValue = isOnRight ? (isOnTransportSite ? 2 : 0.15) : 0.05
  const ctxAdParams = new SimpleAdPrototype('context_' + contextSignals.topic, `https://picsum.photos/seed/${id}/280/180`, '', bidValue)
  return new EvaluatedContextualAd(new ContextualAd(id, await ctxAdParams.generateAdHtml(), addresses.adPartner), bidValue)
}
