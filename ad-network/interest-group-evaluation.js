import { adsDb } from './ad-database.js'

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
export function computeInterestGroupSignals (adPrototype) {
  const owner = adPrototype.adTarget.split('_')[0]
  const name = adPrototype.adTarget.substring(owner.length + 1)
  return new InterestGroupSignals(owner, name, adPrototype.baseValue)
}

/**
 * If an ad for this interest group is specified in the database, return data necessary to ad rendering.
 * @param {string} interestGroupId
 * @returns {AdPrototype[]}
 */
export function selectAds (interestGroupId) {
  return adsDb.filter(adPrototype => adPrototype.adTarget === interestGroupId)
}
