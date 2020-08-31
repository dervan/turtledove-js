/**
 * This file contains a classes that are solely used by ad partner to generate Ads, that can be served within
 * our demo TURTLEDOVE environment.
 */

class Ad {
  constructor (id, iframeContent, type, adPartner) {
    this.id = id // Id of this ad. Should be unique globally.
    this.iframeContent = iframeContent // Proper content of ad.
    this.type = type // Type of an ad. Now can be either "context" or "interest-group"
    this.adPartner = adPartner // Partner that generated this ad.
  }
}

class InterestGroupAd extends Ad {
  constructor (id, iframeContent, interestGroupSignals, bidFunctionSrc, adPartner) {
    super(id, iframeContent, 'interest-group', adPartner)
    this.interestGroupSignals = interestGroupSignals // Interest-group-related object that further will be propagated to bid function.
    this.bidFunctionSrc = bidFunctionSrc // Address to a function that consumes context signals with interestGroupSignals and returns bidValue.
  }
}

class ContextAd extends Ad {
  constructor (id, iframeContent, adPartner) {
    super(id, iframeContent, 'context', adPartner)
  }
}

class ContextBidResponse {
  constructor (contextSignals, contextAd, contextBidValue) {
    this.contextSignals = contextSignals // Custom JSON that later will be an argument for biddingFunction of interest-group-based ads.
    this.contextAd = contextAd // Optional ad based only on received context information.
    this.contextBidValue = contextBidValue // Fixed value of included context ad
  }
}

module.exports = { ContextAd, InterestGroupAd, ContextBidResponse }
