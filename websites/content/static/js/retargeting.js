export function saveViewedProduct (productName) {
  const viewedKey = 'viewedOffers'
  const sizeLimit = 8
  let viewedOffers = JSON.parse(window.localStorage.getItem(viewedKey)) || []
  viewedOffers.unshift(productName)
  if (viewedOffers.length > sizeLimit) {
    viewedOffers = viewedOffers.slice(0, sizeLimit)
  }
  window.localStorage.setItem(viewedKey, JSON.stringify(viewedOffers))
  return viewedOffers
}
