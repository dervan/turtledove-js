export class StoreRequest {
  constructor (type, interestGroup, membershipTimeout, loggingEnabled, productLevelEnabled) {
    this.type = type
    this.interestGroup = interestGroup
    this.membershipTimeout = membershipTimeout
    this.loggingEnabled = loggingEnabled
    this.productLevelEnabled = productLevelEnabled
  }
}

export class RenderingRequest {
  constructor (contextualBidRequests, loggingEnabled, productLevelEnabled) {
    this.contextualBidRequests = contextualBidRequests
    this.loggingEnabled = loggingEnabled
    this.productLevelEnabled = productLevelEnabled
  }
}
