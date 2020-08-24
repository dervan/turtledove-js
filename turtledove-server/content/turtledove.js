import { enableLog } from './turtledove-console.js'
import { RenderingRequest, StoreRequest } from './static/iframe-api.js'

/**
 *  This file contains a simulated API of TURTLEDOVE (https://github.com/WICG/turtledove).
 *  In the future exported functions should be provided by the browser.
 *
 *  In this simulation all data (interest group membership, fetched ads etc) are stored in window.localStorage of
 *  domain <%= it.turtledoveHost %>. This is the cause of an iframe-based construction of the whole simulation.
 */

const tdDemoAddress = '<%= it.turtledoveHost %>'
const storeIframeId = 'td-demo-store'
let storeInitialized = false
let logsEnabled = false
let logsReady = false

/**
 * Adds and initializes an iframe that later is used to save TD data to localStorage.
 */
function addStoreIframe () {
  const iframe = document.createElement('iframe')
  iframe.id = storeIframeId
  iframe.style.display = 'none'
  iframe.src = tdDemoAddress + '/tdstore'
  iframe.onload = () => {
    storeInitialized = true
  }
  document.body.appendChild(iframe)
}

/**
 * Remove interest group from TURTLEDOVE internal store. It also removes ads for this group.
 *
 * @param {InterestGroup} group
 */
function leaveAdInterestGroup (group) {
  document.getElementById(storeIframeId).contentWindow.postMessage(new StoreRequest('remove', group, null, logsEnabled), tdDemoAddress)
}

/**
 * Adds interest group to TURTLEDOVE internal store. Allows to fetch an ad for this group.
 *
 * @param {InterestGroup} group
 * @param {number} membershipTimeout
 */
function joinAdInterestGroup (group, membershipTimeout) {
  document.getElementById(storeIframeId).contentWindow.postMessage(new StoreRequest('store', group, membershipTimeout, logsEnabled), tdDemoAddress)
}

/**
 * Sends a request to render a TURTLEDOVE ad in an iframe with a given ID. Note, that this iframe have to be initialized
 * earlier during an initializeTurtledove call.
 * @param {string} iframeId
 * @param {Map<string, Object>} contextBidRequests - a map that for every entry (ad partner address) contains
 * context bid request for it (custom object, as specified by ad partner)
 */
function renderAds (iframeId, contextBidRequests) {
  const renderingRequest = new RenderingRequest(contextBidRequests, logsEnabled)
  const turtledoveBidSrc = tdDemoAddress + '/tdbid'
  const ad = document.getElementById(iframeId)
  if (ad === null) {
    console.error(`There is no iframe with id ${iframeId}!`)
    return
  }
  if (ad.contentWindow !== null && ad.src === turtledoveBidSrc) {
    ad.contentWindow.postMessage(renderingRequest, tdDemoAddress)
  } else {
    ad.onload = () => ad.contentWindow.postMessage(renderingRequest, tdDemoAddress)
    ad.src = turtledoveBidSrc
  }
}

/**
 * Initializes a demo of TURTLEDOVE. Allows to call currently unavailable methods
 * of Navigator that in the future will be a part of browser API.
 *
 * @param options - dict that allows to configure TURTLEDOVE simulation. Currently it accepts only one key:
 *                * logs: boolean - if set to true adds an turtledove icon and a log that shows last TURTLEDOVE demo actions
 */
export function initTurtledove (options) {
  if (options.logs) {
    logsReady = false
    logsEnabled = true
    enableLog(() => { logsReady = true })
  } else {
    logsReady = true
  }
  addStoreIframe()

  // "retry" wrapper retries a function if given condition is not true - here it means "retry if iframes are not loaded"
  window.navigator.renderAds = retry(renderAds, () => logsReady, 20, 100)
  window.navigator.joinAdInterestGroup = retry(joinAdInterestGroup, () => (storeInitialized && logsReady), 20, 100)
  window.navigator.leaveAdInterestGroup = retry(leaveAdInterestGroup, () => (storeInitialized && logsReady), 20, 100)
}

/**
 * Helper utility to retry a function in a given interval. If the condition is not met, wait interval before next try.
 * If it is currently met, then just evaluate a fun with parameters given to function returned by retry
 * (e.g. retry(console.log, () => true, 1, 10)("foo", "bar") will result in call console.log("foo", "bar"))
 *
 * @param {function} fun - function to be executed
 * @param {function(): boolean} condition
 * @param {number} times - how many times should retry before failing
 * @param {number} interval - number of milliseconds to wait before next check
 * @returns {function(...[*]=)} a function that does exactly what `fun` does, but waits until condition is met.
 * Or fails after (times * interval) ms.
 */
function retry (fun, condition, times, interval) {
  return function () {
    if (!condition() && times > 0) {
      setTimeout(() => retry(fun, condition, times - 1, interval)(...arguments), interval)
      return
    }
    if (times <= 0) {
      console.error('Cannot execute conditional action!')
      return
    }
    fun(...arguments)
  }
}

/**
 * The class describing an interest group.
 */
export class InterestGroup {
  constructor (owner, name, readers) {
    this.owner = owner // site to which this group refers to,
    this.name = name // identifier of this group
    this.readers = readers // ad networks that will be asked to provide an ad for this group
  }
}
