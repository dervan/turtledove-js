import { enableLog } from './turtledove-console.js'
import { RenderingRequest, StoreRequest } from './static/js/iframe-api.js'

/**
 *  This file contains a simulated API of TURTLEDOVE (https://github.com/WICG/turtledove).
 *  In the future exported functions should be provided by the browser.
 *
 *  In this simulation all data (interest group membership, fetched ads etc) are stored in window.localStorage of
 *  domain <%= it.turtledoveHost %>. This is the cause of an iframe-based construction of the whole simulation.
 */
const tdDemoAddress = '<%= it.turtledoveHost %>'
const storeIframeId = 'td-demo-store'
const storeQueue = []
let storeLoaded = false
let logsEnabled = false
const productLevelEnabled = false

/**
 * Adds and initializes an iframe that later is used to save TD data to localStorage.
 */
function addStoreIframe () {
  const iframe = document.createElement('iframe')
  iframe.id = storeIframeId
  iframe.style.display = 'none'
  iframe.src = tdDemoAddress + '/store'
  iframe.onload = () => {
    storeLoaded = true
    handleStoreQueue()
  }
  document.body.appendChild(iframe)
}

function handleStoreQueue () {
  if (!storeLoaded) {
    return
  }
  const iframeContent = document.getElementById(storeIframeId).contentWindow
  while (storeQueue.length > 0) {
    iframeContent.postMessage(storeQueue.shift(), tdDemoAddress)
  }
}

/**
 * Remove interest group from TURTLEDOVE internal store. It also removes ads for this group.
 *
 * @param {InterestGroup} group
 */
function leaveAdInterestGroup (group) {
  storeQueue.push(new StoreRequest('remove', group, null, logsEnabled))
  handleStoreQueue()
}

/**
 * Adds interest group to TURTLEDOVE internal store. Allows to fetch an ad for this group.
 *
 * @param {InterestGroup} group
 * @param {number} membershipTimeout
 */
function joinAdInterestGroup (group, membershipTimeout) {
  storeQueue.push(new StoreRequest('store', group, membershipTimeout, logsEnabled))
  handleStoreQueue()
}

/**
 * Sends a request to render a TURTLEDOVE ad in an iframe with a given ID. Note, that this iframe have to be initialized
 * earlier during an initializeTurtledove call.
 * @param {string} iframeId
 * @param {Map<string, Object>} contextualBidRequests - a map that for every entry (ad partner address) contains
 * contextual bid request for it (custom object, as specified by ad partner)
 */
function renderAds (iframeId, contextualBidRequests) {
  const renderingRequest = new RenderingRequest(contextualBidRequests, logsEnabled, productLevelEnabled)
  const turtledoveRenderAdSrc = tdDemoAddress + '/render-ad'
  const ad = document.getElementById(iframeId)
  if (ad === null) {
    console.error(`There is no iframe with id ${iframeId}!`)
    return
  }
  if (ad.contentWindow !== null && ad.src === turtledoveRenderAdSrc) {
    ad.contentWindow.postMessage(renderingRequest, tdDemoAddress)
  } else {
    ad.onload = () => ad.contentWindow.postMessage(renderingRequest, tdDemoAddress)
    ad.src = turtledoveRenderAdSrc
  }
}

/**
 * Initializes a demo of TURTLEDOVE. Allows to call currently unavailable methods
 * of Navigator that in the future will be a part of browser API.
 *
 * @param options - dict that allows to configure TURTLEDOVE simulation. Currently it accepts two keys:
 *                * logs: boolean - if set to true adds an turtledove icon and a log that shows last TURTLEDOVE demo actions
 *                * productLevel: boolean - if set to true enables Product-Level extension of TURTLEDOVE demo.
 */
export function initTurtledove (options) {
  if (options.logs) {
    logsEnabled = true
    enableLog()
  }
  addStoreIframe()

  window.navigator.renderAds = renderAds
  window.navigator.joinAdInterestGroup = joinAdInterestGroup
  window.navigator.leaveAdInterestGroup = leaveAdInterestGroup
}

/**
 * The class describing an interest group.
 */
export class InterestGroup {
  constructor (owner, name, readers, products) {
    this.owner = owner // site to which this group refers to,
    this.name = name // identifier of this group
    this.readers = readers // ad networks that will be asked to provide an ad for this group
    this.products = products // products associated with this InterestGroup in this browser. Used only in product-level TURTLEDOVE.
  }

  setTimeout (membershipTimeoutMs) {
    this.timeout = new Date(Date.now() + membershipTimeoutMs)
  }

  static fromJson (jsonString) {

  }
}
