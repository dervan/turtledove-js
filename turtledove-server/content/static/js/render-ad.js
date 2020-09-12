import { Logger, saveWinner, testLocalStorageAvailability } from './common.js'
import { fetchedAdsStorageKeyPrefix } from './storage-keys.js'
import { Ad } from 'https://unpkg.com/turtledove-js-api@1.0.0/classes.js'

const contextualBidTimeout = 500

class NoAd extends Ad {
  constructor () {
    super('no-ad', '<html><body><h1>NO AD</h1><p>TURTLEDOVE cannot select any ad for you.</p></body></html>', 'none', 'none')
  }
}

/* eslint-env browser */

/**
 * Adds a iframe with ad to this document body
 * @param {Ad} ad - an ad to be rendered in created in iframe
 */
function renderAd (ad) {
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
      <b>Don't you like this ad?</b> Click <a href='/ad-remove?adPartner=${encodeURIComponent(ad.adPartner)}&groupName=${encodeURIComponent(ad.groupName)}&id=${encodeURIComponent(ad.id)}'>here</a> to delete.`
      break
    case 'none':
      description = '<p>An error during ad choosing occured.</p>'
      break
    default:
      description = '<p>Unknown kind of ad!</p>'
  }
  about.innerHTML = '<b>?</b><span class="tooltiptext">' +
    '<h4>Why I see this ad?</h4>' + description + '</span>'
  document.body.appendChild(iframe)
  document.body.appendChild(about)
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

class PartnerAdProposition {
  constructor (partnerName, ad, value, description, contextSignals) {
    this.partnerName = partnerName
    this.ad = ad
    this.value = value
    this.description = description
    this.contextSignals = contextSignals
  }
}

/**
 * For given bids and context signals evaluate the winning bid from this set.
 *
 * @param {string} partnerName
 * @param {ContextualAd} [contextualAd] - optional contextual bid.
 * @param {number} [contextualBidValue] - value of contextualAd if it's present
 * @param {Object} [contextSignals] - some object used by fetched ads to evaluate bid value
 * @param {[string, InterestGroupAd][]} fetchedAds - list of entries from interest-group-based ads db (list of pairs, where first element is a group name
 * and a second one is an InterestGroupAd)
 * @param {Logger} logger
 *
 * @returns {PartnerAdProposition} - the best ad from given partner
 */

function selectBest (partnerName, contextualAd, contextualBidValue, contextSignals, fetchedAds, logger) {
  let best = new PartnerAdProposition(partnerName, contextualAd, contextualBidValue || 0,
    contextualAd === null ? 'none' : `${partnerName}'s contextual ad`, contextSignals)
  if (contextualAd !== null) {
    logger.log(`Consider ${best.description}. Value: ${contextualBidValue}$`)
  }
  for (const ad of fetchedAds) {
    const description = `${partnerName}'s ad for ${ad.groupName} group`
    /* eslint no-new-func: 0 */
    const biddingFunction = new Function('ctxSig', 'igSig', 'let _bidFunc=' + ad.bidFunction + '; return _bidFunc(ctxSig, igSig);')
    const bidValue = biddingFunction(contextSignals, ad.interestGroupSignals)
    logger.log(`Consider  ${description}. Value: ${bidValue}$`)
    if (bidValue > best.value) {
      best = new PartnerAdProposition(partnerName, ad, bidValue, description, contextSignals)
    }
  }
  return best
}

/**
 * Performs internal auction between partner's contextual ad and its locally fetched ads.
 * @param {string} partner - the name of a partner
 * @param {Object} request - custom object constructed on publisher's website
 * @param {Logger} logger
 * @returns {Promise<PartnerAdProposition>}
 */
function partnerInternalAuction (partner, request, logger) {
  const partnerAdsMap = JSON.parse(window.localStorage.getItem(fetchedAdsStorageKeyPrefix + partner))
  const fetchedAds = Object.entries(partnerAdsMap || {}).flatMap(([groupName, ads]) => Object.keys(ads).map(k => ads[k]))
  return doContextualBid(request, partner, contextualBidTimeout, logger) // evaluate context only
    .then(ctx => selectBest(partner, ctx.contextualAd, ctx.contextualBidValue, ctx.contextSignals, fetchedAds, logger), // evaluate stored ads
      rejectReason => selectBest(partner, null, null, null, fetchedAds, logger)) // if context evaluation failed, try without it
}

/**
 * Function that performs an auction between all partners. Every BidResult is a PartnerAdProposition, the best proposition from a given partner.
 *
 * @param {PartnerAdProposition[]} bidResults - list of PartnerAdPropositions, at most one proposition from every partner.
 * @returns {PartnerAdProposition} the best PartnerAdProposition from all provided
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
 * @returns {Promise<Ad>}
 */
async function performOnDeviceAuction (request, logger, site) {
  const internalAuctions = Object.entries(request).map(([partner, bidRequest]) => partnerInternalAuction(partner, bidRequest, logger))
  if (internalAuctions.length === 0) {
    return Promise.resolve(new NoAd())
  }
  return await Promise.allSettled(internalAuctions)
    .then((bidResults) => {
      const successfulBids = bidResults
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
      const winningBid = performAuction(successfulBids)
      if (winningBid != null) {
        logger.log(`Winner: ${winningBid.description}.`)
        saveWinner(winningBid, site)
        return winningBid.ad
      }
      return Promise.reject(new Error('Cannot select winner'))
    })
    .catch(reason => {
      logger.log('Bidding failed because of: ' + reason)
      return new NoAd()
    })
    .finally(() => logger.save())
}

window.onmessage = async function (messageEvent) {
  const renderingRequest = messageEvent.data
  const logger = new Logger(messageEvent.origin, true)

  const bidRequests = renderingRequest.contextualBidRequests // This is a map from ad-network to custom ad-network bid request object!
  logger.log('Perform an auction for the placement: ' + JSON.stringify(Object.values(bidRequests)[0]?.placement))
  renderAd(await performOnDeviceAuction(bidRequests, logger, messageEvent.origin))
}
testLocalStorageAvailability()
