import {
  activePartnersKey,
  fetchedAdsStorageKeyPrefix,
  fetchedProductsStorageKeyPrefix,
  winnersRegisterKey
} from './storage-keys.js'

/* eslint-env browser */
/* eslint no-unused-vars: 0 */

/**
 * Lists all partners that have/hod some ad stored in this browser.
 */
function listActivePartners () {
  return JSON.parse(window.localStorage.getItem(activePartnersKey)) || []
}

/**
 * Lists all ads that won an on-device auction.
 */
export function listWinners () {
  return JSON.parse(window.localStorage.getItem(winnersRegisterKey))?.reverse() || []
}

/**
 * Lists all retrieved ads saved in localStorage.
 */
export function listAds () {
  let ads = []
  for (const adPartner of listActivePartners()) {
    const partnerAdsKey = fetchedAdsStorageKeyPrefix + adPartner
    const partnerAdsMap = JSON.parse(window.localStorage.getItem(partnerAdsKey)) || {}
    ads = ads.concat(Object.values(partnerAdsMap))
  }
  return ads
}

/**
 * Lists all retrieved products saved in localStorage.
 */
export function listProducts () {
  const products = []
  for (const adPartner of listActivePartners()) {
    const partnerProductsKey = fetchedProductsStorageKeyPrefix + adPartner
    const partnerProductsMap = JSON.parse(window.localStorage.getItem(partnerProductsKey)) || {}
    for (const ownerProducts of Object.values(partnerProductsMap)) {
      for (const product of Object.values(ownerProducts)) {
        product.adPartner = adPartner
        products.push(product)
      }
    }
  }
  return products
}

/**
 * Removes one previously fetched product from local storage
 */
export function removeProduct (adPartner, owner, productId) {
  const adPartnerKey = fetchedProductsStorageKeyPrefix + adPartner
  const products = JSON.parse(window.localStorage.getItem(adPartnerKey)) || {}
  if (owner in products && productId in products[owner]) {
    delete products[owner][productId]
    window.localStorage.setItem(adPartnerKey, JSON.stringify(products))
  }
}

/**
 * Removes one previously fetched ad from local storage
 */
export function removeAd (adPartner, adId) {
  const adPartnerKey = fetchedAdsStorageKeyPrefix + adPartner
  const ads = JSON.parse(window.localStorage.getItem(adPartnerKey)) || {}
  if (adId in ads) {
    delete ads[adId]
    window.localStorage.setItem(adPartnerKey, JSON.stringify(ads))
  }
}

export function fillAdsTable () {
  const table = document.getElementById('fetched-ads')

  for (const ad of listAds()) {
    const row = table.insertRow()
    const groupId = row.insertCell()
    groupId.innerHTML = `Group ID:<br/>
                 <b>${ad.groupName}</b><br/>
                 Ad partner: <br/>
                 ${ad.adPartner}<br/>`
    const adRemoveButton = document.createElement('button')
    adRemoveButton.textContent = 'Remove'
    adRemoveButton.onclick = () => {
      removeAd(ad.adPartner, ad.id)
      table.deleteRow(row.rowIndex)
    }
    groupId.appendChild(adRemoveButton)
    const iframe = document.createElement('iframe')
    iframe.srcdoc = ad.iframeContent
    iframe.height = '250px'
    iframe.width = '300px'
    iframe.scrolling = 'no'
    const adCell = row.insertCell()
    adCell.appendChild(iframe)
    const bidFunction = row.insertCell()
    const button = document.createElement('button')
    button.textContent = 'Show code'
    button.onclick = () => {
      const content = renderScript(ad.bidFunction)
      const myWindow = window.open('', ad.groupName + ' bid function', 'width=400,height=400,menubar=no,location=no,resizable=no,scrollbars=no,status=no')
      myWindow.document.write(content)
    }
    bidFunction.appendChild(button)
    const igSignals = row.insertCell()
    igSignals.innerHTML = '<pre>' + JSON.stringify(ad.interestGroupSignals, null, 2) + '</pre>'
  }
}

function renderScript (script) {
  return `<html>
  <style>
   body {
    color: #CCC;
    background-color: black;
    }
  </style>
  <script src='https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.11.0/beautify.js'></script>
  <div id="content"></div>
  <script>
  const formatterOptions = {
    indent_size: '4',
    indent_char: ' ',
    max_preserve_newlines: '1',
    preserve_newlines: true,
    keep_array_indentation: false,
    break_chained_methods: false,
    indent_scripts: 'normal',
    brace_style: 'collapse',
    space_before_conditional: true,
    unescape_strings: false,
    jslint_happy: false,
    end_with_newline: false,
    wrap_line_length: '40',
    indent_inner_html: false,
    comma_first: false,
    e4x: false,
    indent_empty_lines: false
  }
  const content = js_beautify(\`${script}\`, formatterOptions)
  document.getElementById('content').innerHTML = '<pre>' + content + '</pre>'
  </script>
  </html>
`
}

export function fillProductsTable () {
  const productsTable = document.getElementById('products-table')
  for (const product of listProducts()) {
    const row = productsTable.insertRow()
    const owner = row.insertCell()
    const adPartner = row.insertCell()
    const id = row.insertCell()
    const iframeContainer = row.insertCell()
    const remove = row.insertCell()
    adPartner.innerText = product.adPartner
    owner.innerText = product.owner
    id.innerText = product.productId
    const iframe = document.createElement('iframe')
    iframe.srcdoc = product.iframeContent
    iframe.height = '200px'
    iframe.width = '150px'
    iframe.scrolling = 'no'
    iframeContainer.appendChild(iframe)
    const adRemoveButton = document.createElement('button')
    adRemoveButton.textContent = 'Remove'
    adRemoveButton.onclick = () => {
      removeProduct(product.adPartner, product.owner, product.productId)
      productsTable.deleteRow(row.rowIndex)
    }
    remove.appendChild(adRemoveButton)
  }
}

export function fillWinnersTable () {
  const winnersTable = document.getElementById('winners-ads')
  for (const winner of listWinners()) {
    const row = winnersTable.insertRow()
    const site = row.insertCell()
    site.innerText = winner.site
    const price = row.insertCell()
    price.innerText = winner.bidValue
    const ad = row.insertCell()
    const iframe = document.createElement('iframe')
    iframe.srcdoc = winner.iframeContent
    iframe.height = '250px'
    iframe.width = '300px'
    iframe.scrolling = 'no'
    ad.appendChild(iframe)
    if (winner.productsPayload !== null) {
      iframe.onload = () => {
        iframe.contentWindow.postMessage(winner.productsPayload, '*')
      }
    }
    const ctxSignals = row.insertCell()
    ctxSignals.innerHTML = winner.contextSignals ? '<pre>' + JSON.stringify(winner.contextSignals, null, 2) + '</pre>' : ''
    const time = row.insertCell()
    time.innerHTML = winner.time
  }
}
