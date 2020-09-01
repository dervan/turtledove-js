import interact from 'https://cdn.jsdelivr.net/npm/@interactjs/interactjs/index.js'

const consoleIconId = 'td-console-icon'
const resizeOverlayId = 'td-console-overlay'
const consoleIframeId = 'td-console'
const tdDemoAddress = '<%= it.turtledoveHost %>'

const consoleCss = '#td-console {\n' +
  '    font-family: monospace;\n' +
  '    position: fixed;\n' +
  '    bottom: 0;\n' +
  '    left: 0;\n' +
  '    background-color: rgba(0, 0.1, 0.2, 0.6);\n' +
  '    border-radius: 2px;\n' +
  '    padding: 7px;\n' +
  '    padding-bottom: 1px;\n' +
  '    border: none;\n' +
  '    touch-action: none;\n' +
  '    width: 100%;\n' +
  '    height: 20%;\n' +
  '    overflow-x: hidden;\n' +
  '    overflow-y: auto;\n' +
  '    box-sizing: border-box;\n' +
  '}\n' +
  '#td-console-icon {\n' +
  '    border: 1px groove black;\n' +
  '    position: fixed;\n' +
  '    top: 0;\n' +
  '    right: 0;\n' +
  '    height: 35px;\n' +
  '    width:auto;\n' +
  '    margin: 0;\n' +
  '    transition: border 2s ease;\n' +
  '    transition: background 2s ease;\n' +
  '}\n' +
  '#td-console-overlay {\n' +
  '    position: fixed;\n' +
  '    bottom: 0;\n' +
  '    left: 0;\n' +
  '}'

function createOverlay () {
  const overlay = document.createElement('div')
  overlay.id = resizeOverlayId
  document.body.appendChild(overlay)
  return overlay
}

function updateOverlay (x, y, event) {
  const overlay = document.getElementById(resizeOverlayId) || createOverlay()
  overlay.setAttribute('data-x', x)
  overlay.setAttribute('data-y', y)
  overlay.style.width = event.rect.width + 'px'
  overlay.style.height = event.rect.height + 'px'
  overlay.style.webkitTransform = overlay.style.transform = 'translate(' + x + 'px, 0px)'
}

function checkSelection () {
  if (window.getSelection) {
    const sel = window.getSelection()
    if (sel.rangeCount) {
      sel.removeAllRanges()
    }
  } else if (document.selection) {
    if (document.selection.createRange().text > '') {
      document.selection.empty()
    }
  }
}

interact('#' + consoleIframeId)
  .resizable({
    // resize from all edges and corners
    edges: { left: true, right: true, bottom: false, top: true },

    listeners: {
      start (event) {
        const target = event.target
        const x = (parseFloat(target.getAttribute('data-x')) || 0)
        const y = (parseFloat(target.getAttribute('data-y')) || 0)

        updateOverlay(x, y, event)
      },
      move (event) {
        const target = event.target
        let x = (parseFloat(target.getAttribute('data-x')) || 0)
        let y = (parseFloat(target.getAttribute('data-y')) || 0)

        // update the element's style
        target.style.width = event.rect.width + 'px'
        target.style.height = event.rect.height + 'px'

        // translate when resizing from top or left edges
        x += event.deltaRect.left
        y += event.deltaRect.top

        target.style.webkitTransform = target.style.transform =
          'translate(' + x + 'px, 0px)'

        target.setAttribute('data-x', x)
        target.setAttribute('data-y', y)

        updateOverlay(x, y, event)
        checkSelection()
      },
      end (event) {
        const target = event.target
        const update = {
          x: target.getAttribute('data-x') || '0',
          y: target.getAttribute('data-y') || '0',
          width: target.style.width,
          height: target.style.height,
          transform: target.style.transform
        }
        const contentWindow = event.target.contentWindow
        if (contentWindow !== null) {
          contentWindow.postMessage({
            type: 'store',
            value: update
          }, '<%= it.turtledoveHost %>')
        }

        const overlay = document.getElementById(resizeOverlayId)
        if (overlay !== null) {
          overlay.parentNode.removeChild(overlay)
        }
      }
    },
    modifiers: [
      // keep the edges inside the parent
      interact.modifiers.restrictEdges({
        outer: 'parent'
      }),

      // minimum size
      interact.modifiers.restrictSize({
        min: { width: 100, height: 50 }
      })
    ],

    inertia: true
  })

function toggleLogConsole () {
  const foundLog = document.getElementById(consoleIframeId)
  if (foundLog) {
    if (foundLog.style?.visibility === 'visible') {
      foundLog.style.visibility = 'hidden'
      if (foundLog?.contentWindow !== null) {
        foundLog.contentWindow.postMessage({ type: 'hide' }, tdDemoAddress)
      }
    } else {
      foundLog.style.visibility = 'visible'
      if (foundLog?.contentWindow !== null) {
        foundLog.contentWindow.postMessage({ type: 'show' }, tdDemoAddress)
      }
    }
  }
}

function enableLog () {
  const consoleStyle = document.createElement('style')
  consoleStyle.setAttribute('type', 'text/css')
  consoleStyle.appendChild(document.createTextNode(consoleCss))
  document.head.appendChild(consoleStyle)

  const icon = document.createElement('img')
  icon.src = tdDemoAddress + '/static/images/turtledove-question-mark.png'
  icon.id = consoleIconId
  setInterval(() => {
    if (document.getElementById(consoleIframeId)?.style?.visibility !== 'visible') { icon.style.backgroundColor = 'rgba(255,94,25,0.6)' }
  }, 4000)
  setTimeout(() => setInterval(() => { icon.style.backgroundColor = 'rgba(0,0,0,0)' }, 4000), 2000)
  icon.onclick = toggleLogConsole

  const iframe = document.createElement('iframe')
  iframe.src = tdDemoAddress + '/console'
  iframe.id = consoleIframeId
  iframe.style.visibility = 'hidden'
  iframe.onload = () => {
    iframe.contentWindow.postMessage({ type: 'load' }, tdDemoAddress)
  }

  document.body.appendChild(iframe)
  document.body.appendChild(icon)

  // if receive response from log iframe update its position and size
  window.addEventListener('message', (event) => {
    if (event.origin === tdDemoAddress) {
      const initData = event.data
      if (initData) {
        iframe.setAttribute('data-x', initData.x || 0)
        iframe.setAttribute('data-y', initData.y || 0)
        if (initData.width) {
          iframe.style.width = initData.width
        }
        if (initData.height) {
          iframe.style.height = initData.height
        }
        if (initData.transform) {
          iframe.style.transform = initData.transform
        }
      }
      if (initData?.hidden === false) {
        iframe.style.visibility = 'visible'
      }
      window.removeEventListener('message', this)
    }
  })
}

export { enableLog }
