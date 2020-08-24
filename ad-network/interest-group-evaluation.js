const { AdParams } = require('./ad-params')
const adsDb = require('./ad-database')

class InterestGroupSignals {
  constructor (owner, name, baseValue) {
    this.owner = owner
    this.name = name
    this.baseValue = baseValue
  }
}

/**
 * Finds an entry in the ads database for a specified interest group
 * @param {string} interestGroupKey
 * @returns {null|*}
 */
function selectFromDb (interestGroupKey) {
  const owner = interestGroupKey.split('_')[0]
  for (const [entryKey, entryValue] of Object.entries(adsDb[owner])) {
    if (interestGroupKey.endsWith(entryKey)) {
      return entryValue
    }
  }
  return null
}

/**
 * Returns interest group signals - data that are used in the bidding function for a given interest group.
 * @param {string} interestGroupKey
 * @returns {InterestGroupSignals}
 */
function computeInterestGroupSignals (interestGroupKey) {
  const adParamsEntry = selectFromDb(interestGroupKey)
  const owner = interestGroupKey.split('_')[0]
  const name = interestGroupKey.substring(owner.length + 1)
  return new InterestGroupSignals(owner, name, adParamsEntry?.baseValue)
}

/**
 * If an ad for this interest group is specified in the database, return data necessary to ad rendering.
 * @param {string} interestGroupKey
 * @returns {AdParams}
 */
function interestGroupToAdParams (interestGroupKey) {
  const adParamsEntry = selectFromDb(interestGroupKey)
  if (adParamsEntry != null) {
    return new AdParams(interestGroupKey, adParamsEntry.img, adParamsEntry.href)
  }
}

module.exports = { interestGroupToAdParams, computeInterestGroupSignals }
