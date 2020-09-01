export class StoreRequest {
  constructor (type, interestGroup, membershipTimeout, loggingEnabled) {
    this.type = type
    this.interestGroup = interestGroup
    this.membershipTimeout = membershipTimeout
    this.loggingEnabled = loggingEnabled
  }
}

export class RenderingRequest {
  constructor (contextualBidRequests, loggingEnabled) {
    this.contextualBidRequests = contextualBidRequests
    this.loggingEnabled = loggingEnabled
  }
}
