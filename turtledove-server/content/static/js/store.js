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
  if (groupId in allInterestGroups) {
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
  const groupId = getInterestGroupId(interestGroup)
  if (groupId in allInterestGroups) {
    logger.log('Leaving known group: ' + getInterestGroupId(interestGroup))
    delete allInterestGroups[groupId]
    // warning: not thread safe, check local storage for that case
    window.localStorage.setItem(interestGroupsStorageKey, JSON.stringify(allInterestGroups))
  } else {
    logger.log('Trying to leave not found group: ' + getInterestGroupId(interestGroup))
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

/**
 * Returns a function that will save list of ads into localStorage.
 * Currently it is overwriting old ads for the same interest group!
 *
 * @param {string} reader
 * @param {Logger} logger
 */
function saveAds (reader, logger) {
  return adFetchResults => {
    const readerAdsKey = fetchedAdsStorageKeyPrefix + reader
    const readerAds = JSON.parse(window.localStorage.getItem(readerAdsKey)) || {}
    const newAds = adFetchResults
      .filter(adResult => adResult !== null && adResult.status === 'fulfilled' && adResult.bidFunctionSrc !== null)
      .map(adResult => adResult.value)
    for (const ad of newAds) {
      if (ad.id in readerAds) {
        logger.log(`Refreshed ad ${ad.id} from ${ad.adPartner}.`)
      } else {
        logger.log(`Fetched new ad ${ad.id} from ${ad.adPartner}.`)
      }
      readerAds[ad.id] = ad
    }
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

  for (const reader of interestGroup.readers) {
    const controller = new AbortController()
    fetch(`${reader}/fetch-ads?interest_group=${encodeURIComponent(interestGroupId)}`, { signal: controller.signal })
      .then(r => r.json())
      .then(enrichAdsWithBiddingFunctions(logger))
      .then(saveAds(reader, logger))
      .catch(reason => logger.log(`Request to ${reader} for ${interestGroupId} failed: ${reason}`))
    setTimeout(() => controller.abort(), timeout)
  }
}

/**
 * Returns a function that will save fetched product to localStorage.
 *
 * @param {string} owner
 * @param {string} productId
 * @param {string} reader
 * @param {Logger} logger
 */
function saveProduct (owner, reader, logger) {
  return (product) => {
    const productId = product.productId
    const readerProdKey = fetchedProductsStorageKeyPrefix + reader
    const readerProducts = JSON.parse(window.localStorage.getItem(readerProdKey)) || {}
    const ownerProducts = readerProducts[owner] || {}
    if (owner in readerProducts && productId in ownerProducts) {
      logger.log(`Refreshed existing product ${productId} from ${owner} requested by a partner ${reader}`)
    } else {
      logger.log(`Saved new product ${productId} from ${owner} requested by a partner ${reader}`)
    }
    ownerProducts[productId] = product
    readerProducts[owner] = ownerProducts
    window.localStorage.setItem(readerProdKey, JSON.stringify(readerProducts))
  }
}

/**
 * Performs a call to fetch-products. Due to demo simplicity, it is performed always after adding to a user group
 * (on the contrary to standard TURTLEDOVE, where this call will be asynchronous)
 *
 * Currently, every product is identified by a pair (owner, productId) and is stored separately for every interest group reader.
 * This allows the reader to process an offer before it gets served. But it's just a simple design decision and should be discussed later.
 *
 * @param {InterestGroup} interestGroup
 * @param {Logger} logger
 */
function fetchNewProducts (interestGroup, logger) {
  const timeout = 5000
  if (interestGroup.products === undefined) {
    return
  }
  for (const reader of interestGroup.readers) {
    const controller = new AbortController()
    interestGroup.products.map(productId =>
      fetch(`${reader}/fetch-product?owner=${encodeURIComponent(interestGroup.owner)}&product=${encodeURIComponent(productId)}`, { signal: controller.signal })
        .then(r => r.json())
        .then(saveProduct(interestGroup.owner, reader, logger))
        .catch(reason => logger.log(`Request to ${reader} for ${productId} failed: ${reason}`)))
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
