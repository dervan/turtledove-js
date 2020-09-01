import { logsCountKey, logsKey, testStorageKey, winnersRegisterKey } from './storage-keys.js'

export const logSeparator = '<|>'

class Log {
  constructor (text, site) {
    this.val = text
    this.site = site
    this.ts = new Date().toISOString()
  }
}

/**
 * A class used to save logs both in localStorage and in standard console.
 */
export class Logger {
  constructor (site, loggingEnabled, lazyDump) {
    this.logs = []
    this.saved = lazyDump === false
    this.site = site
    this.loggingEnabled = loggingEnabled
  }

  static dump (newLogs) {
    let savedLogs = window.localStorage.getItem(logsKey)
    if (savedLogs !== null) {
      savedLogs = savedLogs + logSeparator
    } else {
      savedLogs = ''
    }
    const newLogsString = newLogs.map(JSON.stringify).join(logSeparator)
    window.localStorage.setItem(logsKey, savedLogs + newLogsString)

    const currentLogsCount = parseInt(window.localStorage.getItem(logsCountKey)) || 0
    window.localStorage.setItem(logsCountKey, currentLogsCount + newLogs.length)
  }

  save () {
    Logger.dump(this.logs)
    this.logs = []
    this.saved = true
  }

  log (text) {
    if (!this.loggingEnabled) {
      return
    }
    const newLog = new Log(text, this.site)
    console.log(text)
    if (this.saved) { // Save also delayed logs
      Logger.dump([newLog])
    } else {
      this.logs.push(newLog)
    }
  }
}

/**
 * Checks and alerts if it detects that we cannot use localStorage.
 */
export function testLocalStorageAvailability () {
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
    contextSignals: winningBid.ad.type === 'contextual' ? '' : winningBid.contextSignals,
    site: publisherSite,
    time: new Date().toISOString()
  })
  window.localStorage.setItem(winnersRegisterKey, JSON.stringify(winners))
}

/**
 * Get a string that will be an identifier of this InterestGroup.
 * @param {InterestGroup} interestGroup
 */
export function getInterestGroupId (interestGroup) {
  return `${interestGroup.owner}_${interestGroup.name}`
}
