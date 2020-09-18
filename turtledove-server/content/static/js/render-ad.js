import { Logger, shuffle, testLocalStorageAvailability } from './common.js'
import { fetchedAdsStorageKeyPrefix, fetchedProductsStorageKeyPrefix, interestGroupsStorageKey, winnersRegisterKey } from './storage-keys.js'
import { Ad } from 'https://unpkg.com/turtledove-js-api@1.1.0/classes.js'

const contextualBidTimeout = 500

class Bid {
  constructor (ad, contextSignals, interestGroupSignals, bidValue) {
    this.ad = ad
    this.contextSignals = contextSignals
    this.interestGroupSignals = interestGroupSignals
    this.value = bidValue
  }
}

const NO_AD = new Ad('no-ad', '<html><body><h1>NO AD</h1><p>TURTLEDOVE cannot select any ad for you.</p></body></html>', 'none', 'none')
const EMPTY_BID = new Bid(NO_AD, {}, {}, 0)

/* eslint-env browser */

/**
 * Adds a iframe with ad to this document body
 * @param {Ad} ad - an ad to be rendered in created in iframe
 * @param {Product[]} [products] - if provided ad is product-level it should contain list of products for ad.
 */
function renderAd (ad, products) {
  const iframe = document.createElement('iframe')
  iframe.srcdoc = ad.iframeContent
  iframe.height = 250
  iframe.width = 300
  iframe.scrolling = 'no'

  const about = document.createElement('div')
  about.className = 'tooltip'
  about.style.position = 'fixed'
  about.style.right = 0
  about.style.top = 0
  about.style.borderLeft = about.style.borderBottom = '1px solid black'
  about.style.width = '1em'
  about.style.height = '1em'
  about.style.textAlign = 'center'
  let description
  switch (ad.type) {
    case 'contextual':
      description = '<p>This ad was chosen based on the context of the article you are currently in.</p>'
      break
    case 'interest-group':
      description = `<p>This is an ${ad.type} ad. It was fetched for the group ${ad?.interestGroupSignals.name} from the site <a href="${ad?.interestGroupSignals?.owner}" target="_top">${ad?.interestGroupSignals?.owner}</a>.</p>
      <b>Don't you like this ad?</b> Click <a href='/ad-remove?adPartner=${encodeURIComponent(ad.adPartner)}&id=${encodeURIComponent(ad.id)}'>here</a> to delete.`
      break
    case 'none':
      description = '<p>An error during ad choosing occured.</p>'
      break
    default:
      description = '<p>Unknown kind of ad!</p>'
  }
  about.innerHTML = '<b>?</b><span class="tooltiptext"><h4>Why I see this ad?</h4>' + description + '</span>'
  document.body.appendChild(iframe)
  document.body.appendChild(about)
  if (products !== null) {
    iframe.onload = () => {
      iframe.contentWindow.postMessage({ productsCount: products.length, products: products.map(p => p?.iframeContent) }, '*')
    }
  }
}

/**
 * Loads from localStorage products associated with given interest group.
 * @param {string} groupName - full name of interest group
 * @param {string} productsOwner - name of source for products associated with this interest group.
 *
 * @returns {Product[]} shuffled array of products
 */
function readProductsForInterestGroup (groupName, productsOwner, adPartner) {
  const products = []
  const interestGroups = JSON.parse(window.localStorage.getItem(interestGroupsStorageKey)) || {}
  const interestGroup = interestGroups[groupName]
  const productIds = interestGroup.products || []
  const partnerProducts = JSON.parse(window.localStorage.getItem(fetchedProductsStorageKeyPrefix + adPartner)) || {}
  const ownerProducts = partnerProducts[productsOwner]
  for (const productId of productIds) {
    const product = ownerProducts[productId]
    if (product !== undefined) {
      products.push(product)
    } else {
      // If product was removed by user or just error during downloadnig occured it is possible that there is no such product.
      const availableProducts = Object.values(ownerProducts)
      products.push(availableProducts[Math.floor(Math.random() * availableProducts.length)])
    }
  }
  return shuffle(products)
}

/**
 * Sends a request to partner for contextual bid and context signals used for further evaluation of interest-group-based
 *
 * @param {Object} contextData - data that would be passed to ad partner
 * @param {string} partner - address of partner to send request to
 * @param {number} timeout - maximal time in ms to wait for response
 * @param {Logger} logger
 *
 * @returns {Promise<ContextualBidResponse>}
 *
 */
function doContextualBid (contextData, partner, timeout, logger) {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeout)
  return fetch(`${partner}/fetch-contextual-bid`, {
    signal: controller.signal,
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contextData)
  })
    .then((r) => r.json())
    .then((contextResponse) => {
      logger.log(`Received context response from ${partner}: ${JSON.stringify(contextResponse.contextSignals)}`)
      return contextResponse
    }).catch(reason => logger.log(`Request to ${partner} failed: ${reason}`))
}

/**
 * Returns few human-friendly words that helps identify an ad.
 */
function getAdDescription (ad) {
  switch (ad.type) {
    case 'interest-group':
      return `${ad.adPartner}'s interest-group ad with id ${ad.id}`
    case 'contextual':
      return `${ad.adPartner}'s contextual ad`
    default:
      return 'Unknown type of ad: ' + ad.type
  }
}

/**
 * For given bids and context signals evaluate the winning bid from this set.
 *
 * @param {ContextualBidResponse} [contextBidResponse] - optional contextual bid.
 * @param {[string, InterestGroupAd][]} fetchedAds - list of entries from interest-group-based ads db (list of pairs, where first element is a group name
 * and a second one is an InterestGroupAd)
 * @param {Logger} logger
 *
 * @returns {Bid} - the best ad from given partner
 */

function selectBest (contextBidResponse, fetchedAds, logger) {
  const contextSignals = contextBidResponse?.contextSignals || {}
  let bestBid = EMPTY_BID

  if (contextBidResponse?.contextualAd !== null) {
    bestBid = new Bid(contextBidResponse.contextualAd, {}, {}, contextBidResponse.contextualBidValue)
    const adDescription = getAdDescription(contextBidResponse.contextualAd)
    logger.log(`Consider ${adDescription}. Value: ${bestBid.value}$`)
  }
  for (const ad of fetchedAds) {
    /* eslint no-new-func: 0 */
    const biddingFunction = new Function('ctxSig', 'igSig', 'let _bidFunc=' + ad.bidFunction + '; return _bidFunc(ctxSig, igSig);')
    const bidValue = biddingFunction(contextSignals, ad.interestGroupSignals)
    const adDescription = getAdDescription(ad)
    logger.log(`Consider ${adDescription}. Value: ${bidValue}$`)
    if (bidValue > bestBid.value) {
      bestBid = new Bid(ad, contextSignals, ad.interestGroupSignals, bidValue)
    }
  }
  return bestBid
}

/**
 * Performs internal auction between partner's contextual ad and its locally fetched ads.
 * @param {string} partner - the name of a partner
 * @param {Object} request - custom object constructed on publisher's website
 * @param {boolean} productLevelEnabled - states if PLTD ads should be considered
 * @param {Logger} logger
 * @returns {Promise<Bid>}
 */
function partnerInternalAuction (partner, request, productLevelEnabled, logger) {
  const partnerAdsMap = JSON.parse(window.localStorage.getItem(fetchedAdsStorageKeyPrefix + partner))
  const fetchedAds = Object.values(partnerAdsMap || {})

  const validAds = productLevelEnabled !== true ? fetchedAds.filter(ad => ad.productsCount === undefined) : fetchedAds
  return doContextualBid(request, partner, contextualBidTimeout, logger) // evaluate context only
    .then(ctx => selectBest(ctx, validAds, logger), // evaluate stored ads
      rejectReason => selectBest(null, validAds, logger)) // if context evaluation failed, try without it
}

/**
 * Function that performs an auction between all partners. Every result is a Bid, the best proposition from a given partner.
 *
 * @param {Bid[]} bidResults - list of Bids, at most one bid from every partner.
 * @returns {Bid} the best Bid from all provided
 */
function performAuction (bidResults) {
  let highestValue = 0
  let winner = null
  // Single bid for every ad network
  for (const bid of bidResults) {
    if (bid.value > highestValue) {
      highestValue = bid.value
      winner = bid
    }
  }
  return winner
}

/**
 * For a given request performs an auction between all partners mentioned in request.
 * @param {Map<string, Object>} request - a map where the key is a partner name and the value is a contextual bid request for this partner.
 * @param {Logger} logger
 * @param {string} site
 * @returns {Promise<Bid>}
 */
async function performOnDeviceAuction (request, productLevelEnabled, logger, site) {
  const internalAuctions = Object.entries(request)
    .map(([partner, bidRequest]) => partnerInternalAuction(partner, bidRequest, productLevelEnabled, logger))
  if (internalAuctions.length === 0) {
    return Promise.resolve(EMPTY_BID)
  }
  return await Promise.allSettled(internalAuctions)
    .then(bidResults => bidResults.filter(r => r.status === 'fulfilled').map(r => r.value))
    .then(performAuction)
    .catch(reason => {
      logger.log('Bidding failed because of: ' + reason)
      return EMPTY_BID
    })
}

/**
 * Saves winner in localStorage to allow browsing history of on-device auctions
 * @param winningBid
 * @param publisherSite
 */
function saveWinner (winningBid, products, publisherSite) {
  const winners = JSON.parse(window.localStorage.getItem(winnersRegisterKey)) || []
  winners.push({
    bidValue: winningBid.value,
    iframeContent: winningBid.ad.iframeContent,
    interestGroupSignals: winningBid.ad.interestGroupSignals,
    contextSignals: winningBid.ad.type === 'contextual' ? '' : winningBid.contextSignals,
    site: publisherSite,
    productsPayload: products !== null ? { productsCount: products.length, products: products.map(p => p?.iframeContent) } : null,
    time: new Date().toISOString()
  })
  window.localStorage.setItem(winnersRegisterKey, JSON.stringify(winners))
}

window.onmessage = async function (messageEvent) {
  const renderingRequest = messageEvent.data
  const site = messageEvent.origin
  const logger = new Logger(site, true)

  const bidRequests = renderingRequest.contextualBidRequests // This is a map from ad-network to custom ad-network bid request object!

  logger.log('Perform an auction for the placement: ' + JSON.stringify(Object.values(bidRequests)[0]?.placement))
  const winningBid = await performOnDeviceAuction(bidRequests, renderingRequest.productLevelEnabled, logger, messageEvent.origin)
  if (winningBid != null) {
    const ad = winningBid.ad
    const adDescription = getAdDescription(ad)
    logger.log(`Winner: ${adDescription}.`)
    let products
    if (ad?.productsCount !== undefined) {
      products = readProductsForInterestGroup(ad.groupName, ad.productsOwner, ad.adPartner)
    } else {
      products = null
    }
    saveWinner(winningBid, products, site)
    renderAd(ad, products)
  }
  logger.save()
}

testLocalStorageAvailability()
