import { activePartnersKey, fetchedAdsStorageKeyPrefix, interestGroupsStorageKey } from './storage-keys.js'

import { getInterestGroupId, Logger, testLocalStorageAvailability } from './common.js'

/* eslint-env browser */

/**
 * Saves given group in window.localStorage. All interest groups are stored under the same key.
 *
 * @param {InterestGroup} interestGroup
 * @param {number} membershipTimeout
 * @param logger
 */
function storeInterestGroup (interestGroup, membershipTimeout, logger) {
  // Load current user-groups of user
  const allInterestGroups = JSON.parse(window.localStorage.getItem(interestGroupsStorageKey)) || {}
  // Get its current groups of requested owner
  const ownerGroups = allInterestGroups[interestGroup.owner] || {}
  if (interestGroup.name in ownerGroups) {
    logger.log('Already known group: ' + getInterestGroupId(interestGroup))
  } else {
    logger.log('New interest group: ' + getInterestGroupId(interestGroup))
  }
  ownerGroups[interestGroup.name] = interestGroup
  // warning: not thread safe, check local storage for that case
  allInterestGroups[interestGroup.owner] = ownerGroups
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
  const adKey = getInterestGroupId(interestGroup)
  for (const partner of activePartners) {
    const partnerKey = fetchedAdsStorageKeyPrefix + partner
    const localAds = JSON.parse(window.localStorage.getItem(partnerKey)) || {}
    if (!(adKey in localAds)) {
      continue
    }
    delete localAds[adKey]
    logger.log(`Removed ad for group ${adKey}.`)
    window.localStorage.setItem(partnerKey, JSON.stringify(localAds))
  }
}

/**
 * Performs a call to fetch-ads. Due to demo simplicity, it is performed always after adding to a user group
 * (on the contrary to standard TURTLEDOVE, where this call will be asynchronous)
 *
 * @param {InterestGroup} interestGroup
 * @param logger
 */
function fetchNewAds (interestGroup, logger) {
  const timeout = 1000
  const adKey = getInterestGroupId(interestGroup)

  for (let i = 0; i < interestGroup.readers.length; i++) {
    const reader = interestGroup.readers[i]
    const readerAdsKey = fetchedAdsStorageKeyPrefix + reader
    const controller = new AbortController()
    fetch(`${reader}/fetch-ads?interest_group=${encodeURIComponent(adKey)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then(interestBasedAdResponse => {
        return fetch(interestBasedAdResponse.bidFunctionSrc)
          .then(async (scriptResponse) => {
            interestBasedAdResponse.bidFunction = await scriptResponse.text()
            return interestBasedAdResponse
          })
      }).then(interestBasedAd => {
        const localAds = JSON.parse(window.localStorage.getItem(readerAdsKey)) || {}
        localAds[adKey] = interestBasedAd
        logger.log(`Fetched new ad for group ${adKey}.`)
        window.localStorage.setItem(readerAdsKey, JSON.stringify(localAds))
      }).catch(reason => logger.log(`Request to ${reader} for ${adKey} failed: ${reason}`))
    setTimeout(() => controller.abort(), timeout)
  }
}

window.onmessage = function (messageEvent) {
  const storeRequest = messageEvent.data
  const interestGroup = storeRequest.interestGroup

  const logger = new Logger(messageEvent.origin, storeRequest.loggingEnabled)

  if (storeRequest.type === 'store') {
    storeInterestGroup(interestGroup, storeRequest.membershipTimeout, logger)
    fetchNewAds(interestGroup, logger)
    updateActivePartners(interestGroup.readers)
  } else if (storeRequest.type === 'remove') {
    removeInterestGroup(interestGroup, logger)
    removeAds(interestGroup, logger)
    updateActivePartners([])
  }
  logger.save()
}
testLocalStorageAvailability()
