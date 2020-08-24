export class AdPolicy {
  constructor (deniedTerms) {
    this.deniedTerms = deniedTerms
  }
}

export class Placement {
  constructor (side) {
    this.side = side
  }
}

export class ContextBidRequest {
  constructor (topic, placement, adPolicy) {
    this.site = window.location.host
    this.topic = topic
    this.placement = placement
    this.adPolicy = adPolicy
  }
}
