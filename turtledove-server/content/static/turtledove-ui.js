const interestGroupsStorageKey = 'interestGroups'
const activePartnersKey = 'activeAdPartners'
const fetchedAdsStorageKeyPrefix = 'fetchedAds|'
const winnersRegisterKey = 'winnerAds'
const logsKey = 'logs'
const logStateKey = 'logState'

/* eslint-env browser */

/* eslint no-unused-vars: 0 */

/**
 * Lists all partners that have/hod some ad stored in this browser.
 */
function listActivePartners () {
  return JSON.parse(window.localStorage.getItem(activePartnersKey)) || []
}

/**
 * Lists all ads that won an on-device auction.
 */
function listWinners () {
  return JSON.parse(window.localStorage.getItem(winnersRegisterKey))?.reverse() || []
}

/**
 * Lists all retrieved ads saved in localStorage.
 */
function listAds () {
  const ads = []
  for (const adPartner of listActivePartners()) {
    const partnerAdsKey = fetchedAdsStorageKeyPrefix + adPartner
    const partnerAdsMap = JSON.parse(window.localStorage.getItem(partnerAdsKey)) || {}
    for (const [groupId, ad] of Object.entries(partnerAdsMap)) {
      ads.push({
        groupId: groupId,
        adPartner: adPartner,
        fetchedAd: ad
      })
    }
  }
  return ads
}

/**
 * Restarts turtledove console
 */
function restartConsole () {
  window.localStorage.setItem(logStateKey, '{}')
}
/**
 * Removes turtledove log
 */
function removeLogs () {
  window.localStorage.setItem(logsKey, '[]')
}

/**
 * Removes registry of all previously shown ads.
 */
function removeWinnersHistory () {
  window.localStorage.setItem(winnersRegisterKey, '[]')
}

/**
 * Removes all previously fetched ads from local storage
 */
function removeFetchedAds () {
  for (const adPartner of listActivePartners()) {
    window.localStorage.setItem(fetchedAdsStorageKeyPrefix + adPartner, '{}')
  }
  window.localStorage.setItem(interestGroupsStorageKey, '{}')
  window.localStorage.setItem(activePartnersKey, '[]')
}

/**
 * Removes one previously fetched ad from local storage
 */
function removeAd (id) {
  for (const adPartner of listActivePartners()) {
    const adPartnerKey = fetchedAdsStorageKeyPrefix + adPartner
    const ads = JSON.parse(window.localStorage.getItem(adPartnerKey)) || {}
    if (id in ads) {
      delete ads[id]
      window.localStorage.setItem(adPartnerKey, JSON.stringify(ads))
    }
  }
}
