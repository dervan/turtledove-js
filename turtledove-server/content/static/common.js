export const activePartnersKey = 'activeAdPartners'
export const interestGroupsStorageKey = 'interestGroups'
export const fetchedAdsStorageKeyPrefix = 'fetchedAds|'
const winnersRegisterKey = 'winnerAds'

const logsKey = 'logs'

/**
 * A class that sends logs to the source of message that triggered some action. Used to send logs from inside a
 */
export class Logger {
  constructor (messageEvent, loggingEnabled) {
    this.logs = []
    this.sent = false
    this.messageSource = messageEvent.source
    this.messageOrigin = messageEvent.origin
    this.loggingEnabled = loggingEnabled
  }

  send () {
    this.messageSource.postMessage({ logs: this.logs }, this.messageOrigin)
    const savedLogs = JSON.parse(window.localStorage.getItem(logsKey)) || []
    window.localStorage.setItem(logsKey, JSON.stringify(savedLogs.concat(this.logs)))
    this.logs = []
    this.sent = true
  }

  log (text) {
    if (!this.loggingEnabled) {
      return
    }
    this.logs.push({ ts: new Date().toISOString(), site: this.messageOrigin, val: text })
    console.log(text)
    if (this.sent) { // Send also delayed logs
      this.send()
    }
  }
}

/**
 * Checks and alerts if it detects that we cannot use localStorage.
 */
export function testLocalStorageAvailability () {
  const testStorageKey = 'tdTestKey'
  try {
    window.localStorage.setItem(testStorageKey, testStorageKey)
    window.localStorage.removeItem(testStorageKey)
  } catch (e) {
    console.error('Browser\'s localStorage has to be enabled, but is not accessible!')
    window.alert('Browser\'s localStorage has to be enabled, but is not accessible!')
  }
}

/**
 * Saves winner in localStorage to allow browsing history of on-device auctions
 * @param winningBid
 * @param publisherSite
 */
export function saveWinner (winningBid, publisherSite) {
  const winners = JSON.parse(window.localStorage.getItem(winnersRegisterKey)) || []
  winners.push({
    bidValue: winningBid.value,
    iframeContent: winningBid.ad.iframeContent,
    interestGroupSignals: winningBid.ad.interestGroupSignals,
    contextSignals: winningBid.ad.type === 'context' ? '' : winningBid.contextSignals,
    site: publisherSite,
    time: new Date().toISOString()
  })
  window.localStorage.setItem(winnersRegisterKey, JSON.stringify(winners))
}
