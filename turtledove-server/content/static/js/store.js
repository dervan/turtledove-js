import { activePartnersKey, fetchedAdsStorageKeyPrefix, fetchedProductsStorageKeyPrefix, interestGroupsStorageKey } from './storage-keys.js'

import { getInterestGroupId, Logger, verifyVersion, testLocalStorageAvailability } from './common.js'

/* eslint-env browser */

/**
 * Saves given group in window.localStorage. All interest groups are stored under the same key.
 *
 * @param {InterestGroup} interestGroup
 * @param {number} membershipTimeout
 * @param logger
 */
function storeInterestGroup (interestGroup, membershipTimeout, logger) {
  // Load current interest-groups of user
  const allInterestGroups = JSON.parse(window.localStorage.getItem(interestGroupsStorageKey)) || {}
  const groupId = getInterestGroupId(interestGroup)
  if (interestGroup.name in allInterestGroups) {
    logger.log('Already known group: ' + groupId)
  } else {
    logger.log('New interest group: ' + groupId)
  }
  if (interestGroup.timeout === undefined && membershipTimeout !== null) {
    interestGroup.timeout = new Date(Date.now() + membershipTimeout)
  }
  allInterestGroups[groupId] = interestGroup
  window.localStorage.setItem(interestGroupsStorageKey, JSON.stringify(allInterestGroups))
}

/**
 * Saves given group in window.localStorage. All interest groups are stored under the same key.
 *
 * @param {InterestGroup} interestGroup
 * @param logger
 */
function removeInterestGroup (interestGroup, logger) {
  // Load current user-groups of user
  const allInterestGroups = JSON.parse(window.localStorage.getItem(interestGroupsStorageKey)) || {}
  // Get its current groups of requested owner
  const ownerGroups = allInterestGroups[interestGroup.owner] || {}
  if (interestGroup.name in ownerGroups) {
    logger.log('Removing known group: ' + getInterestGroupId(interestGroup))
    ownerGroups[interestGroup.name] = interestGroup
    delete allInterestGroups[interestGroup.owner]
    // warning: not thread safe, check local storage for that case
    window.localStorage.setItem(interestGroupsStorageKey, JSON.stringify(allInterestGroups))
  } else {
    logger.log('Trying to leave unknown group: ' + getInterestGroupId(interestGroup))
  }
}

/**
 * Updates a list of all ad partners that have some active ads.
 *
 * @param {string[]} addedReaders - list of readers that should be added
 */
function updateActivePartners (addedReaders) {
  const activePartners = JSON.parse(window.localStorage.getItem(activePartnersKey)) || []
  const newPartners = addedReaders.filter((partner) => activePartners.indexOf(partner) === -1)
  const partnersToRemove = []
  for (const partner of activePartners) {
    const partnerAds = window.localStorage.getItem(fetchedAdsStorageKeyPrefix + partner)
    if (partnerAds === {}) {
      partnersToRemove.push(partner)
    }
  }
  if (newPartners.length > 0 || partnersToRemove.length > 0) {
    const newPartnersList = activePartners.concat(newPartners).filter(p => (partnersToRemove.indexOf(p) === -1 || addedReaders.indexOf(p) !== -1))
    window.localStorage.setItem(activePartnersKey, JSON.stringify(newPartnersList))
  }
}

/**
 * Removes ads fetched for given interest group.
 *
 * @param {InterestGroup} interestGroup
 * @param logger
 */
function removeAds (interestGroup, logger) {
  const activePartners = JSON.parse(window.localStorage.getItem(activePartnersKey)) || []
  const interestGroupId = getInterestGroupId(interestGroup)
  for (const partner of activePartners) {
    const partnerKey = fetchedAdsStorageKeyPrefix + partner
    const localAds = JSON.parse(window.localStorage.getItem(partnerKey)) || {}
    if (!(interestGroupId in localAds)) {
      continue
    }
    delete localAds[interestGroupId]
    logger.log(`Removed ad for group ${interestGroupId}.`)
    window.localStorage.setItem(partnerKey, JSON.stringify(localAds))
  }
}

/**
 * Returns an function that will download bidding function source code from a specified address
 * and put it inside an Ad for every ad on a list.
 *
 * @param {string} interestGroupId
 * @param {string} readerAdsKey
 * @param {Logger} logger
 */
function enrichAdsWithBiddingFunctions (logger) {
  return interestBasedAds => Promise.allSettled(
    interestBasedAds.map(ad => fetch(ad.bidFunctionSrc)
      .then(async (scriptResponse) => {
        if (!scriptResponse.ok) {
          logger.log(`Request for bid function of ad ${ad.id} returned ${scriptResponse.status}`)
          return null
        }
        ad.bidFunction = await scriptResponse.text()
        return ad
      }).catch(() => logger.log(`Cannot download bid function for ${ad.id}`))))
}

function randomId (length) {
  const s = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const n = s.length
  const values = []
  for (let i = 0; i < length; i++) {
    values.push(s[Math.floor(Math.random() * n)])
  }
  return values.join()
}

/**
 * Returns a function that will save list of ads into localStorage.
 * Currently it is overwriting old ads for the same interest group!
 *
 * @param {string} interestGroupId
 * @param {string} readerAdsKey
 * @param {Logger} logger
 */
function saveAds (interestGroupId, reader, logger) {
  return adFetchResults => {
    const readerAdsKey = fetchedAdsStorageKeyPrefix + reader
    const readerAds = JSON.parse(window.localStorage.getItem(readerAdsKey)) || {}
    let igAds = readerAds[interestGroupId] || {}
    if (igAds.id !== undefined) { // Legacy stored ad
      const oldAd = igAds
      igAds = {}
      igAds[oldAd.id] = oldAd
    }
    const newAds = adFetchResults
      .filter(adResult => adResult !== null && adResult.status === 'fulfilled' && adResult.bidFunctionSrc !== null)
      .map(adResult => adResult.value)
    for (const ad of newAds) {
      igAds[ad.id] = ad
    }
    readerAds[interestGroupId] = igAds
    logger.log(`Fetched new ads for group ${interestGroupId}.`)
    window.localStorage.setItem(readerAdsKey, JSON.stringify(readerAds))
  }
}

/**
 * Performs a call to fetch-ads. Due to demo simplicity, it is performed always after adding to a user group
 * (on the contrary to standard TURTLEDOVE, where this call will be asynchronous)
 *
 * @param {InterestGroup} interestGroup
 * @param {Logger} logger
 */
function fetchNewAds (interestGroup, logger) {
  const timeout = 1000
  const interestGroupId = getInterestGroupId(interestGroup)

  for (let i = 0; i < interestGroup.readers.length; i++) {
    const reader = interestGroup.readers[i]
    const controller = new AbortController()
    fetch(`${reader}/fetch-ads?interest_group=${encodeURIComponent(interestGroupId)}`, { signal: controller.signal })
      .then(r => r.json())
      .then(enrichAdsWithBiddingFunctions(logger))
      .then(saveAds(interestGroupId, reader, logger))
      .catch(reason => logger.log(`Request to ${reader} for ${interestGroupId} failed: ${reason}`))
    setTimeout(() => controller.abort(), timeout)
  }
}

function saveProduct (owner, productName, reader, logger) {
  return (product) => {
    const readerProdKey = fetchedProductsStorageKeyPrefix + reader
    const readerProducts = JSON.parse(window.localStorage.getItem(readerProdKey)) || {}
    const ownerProducts = readerProducts[owner] || {}
    ownerProducts[productName] = product
    readerProducts[owner] = ownerProducts
    window.localStorage.setItem(readerProdKey, JSON.stringify(readerProducts))
    logger.log(`Saved new product ${productName} from ${owner} (through partner ${reader})`)
  }
}

/**
 * Performs a call to fetch-ads. Due to demo simplicity, it is performed always after adding to a user group
 * (on the contrary to standard TURTLEDOVE, where this call will be asynchronous)
 *
 * @param {InterestGroup} interestGroup
 * @param {Logger} logger
 */
function fetchNewProducts (interestGroup, logger) {
  const timeout = 5000
  console.log('Fetch new products.')

  for (let i = 0; i < interestGroup.readers.length; i++) {
    const reader = interestGroup.readers[i]
    const controller = new AbortController()
    interestGroup.products.map(product =>
      fetch(`${reader}/fetch-products?owner=${encodeURIComponent(interestGroup.owner)}&product=${encodeURIComponent(product)}`, { signal: controller.signal })
        .then(r => r.json())
        .then(saveProduct(interestGroup.owner, product, reader, logger))
        .catch(reason => logger.log(`Request to ${reader} for ${product} failed: ${reason}`)))
    setTimeout(() => controller.abort(), timeout)
  }
}

window.onmessage = function (messageEvent) {
  const storeRequest = messageEvent.data
  const interestGroup = storeRequest.interestGroup
  const productLevelEnabled = storeRequest.productLevelEnabled

  const logger = new Logger(messageEvent.origin, storeRequest.loggingEnabled)

  if (storeRequest.type === 'store') {
    storeInterestGroup(interestGroup, storeRequest.membershipTimeout, logger)
    fetchNewAds(interestGroup, logger)
    if (productLevelEnabled) {
      fetchNewProducts(interestGroup, logger)
    }
    updateActivePartners(interestGroup.readers)
  } else if (storeRequest.type === 'remove') {
    removeInterestGroup(interestGroup, logger)
    removeAds(interestGroup, logger)
    updateActivePartners([])
  }
  logger.save()
}
verifyVersion()
testLocalStorageAvailability()
