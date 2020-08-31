import { consoleStateKey, logsCountKey, logsKey } from './storage-keys.js'

const consoleRefreshInterval = 1000
let loadedLogsCount = 0

function insertLogs (logs) {
  const logsTable = document.getElementById(logsKey)
  for (const logEntry of logs) {
    if (!logEntry) {
      continue
    }
    const row = logsTable.insertRow()
    const time = row.insertCell()
    time.className = 'time'
    time.innerText = logEntry.ts
    const site = row.insertCell()
    site.innerText = logEntry.site
    const logText = row.insertCell()
    logText.innerText = logEntry.val
  }
  const tableContainer = logsTable.parentElement.parentElement
  tableContainer.scrollTop = tableContainer.scrollHeight
}

function getRawLogs () {
  return window.localStorage.getItem(logsKey)?.split('<|>') || []
}

function getLogsCount () {
  return parseInt(window.localStorage.getItem(logsCountKey)) || 0
}

function getConsoleState () {
  return JSON.parse(window.localStorage.getItem(consoleStateKey)) || {}
}

function storeConsoleState (state) {
  window.localStorage.setItem(consoleStateKey, JSON.stringify(state))
}

// Try to load logs into console
try {
  insertLogs(getRawLogs().map(JSON.parse))
  loadedLogsCount = getLogsCount()
} catch (err) {
  window.localStorage.removeItem(logsKey)
  window.localStorage.removeItem(logsCountKey)
  loadedLogsCount = 0
  console.log('Error in stored logs format detected. All logs were removed.')
}

// Handle consistent console state between sites
window.onmessage = (messageEvent) => {
  const request = messageEvent.data
  if (request.type === 'load') {
    messageEvent.source.postMessage(getConsoleState(), messageEvent.origin)
  } else if (request.type === 'hide') {
    const state = getConsoleState()
    state.hidden = true
    storeConsoleState(state)
  } else if (request.type === 'show') {
    const state = getConsoleState()
    state.hidden = false
    storeConsoleState(state)
  } else if (request.type === 'store') {
    const state = request.value
    state.hidden = false
    storeConsoleState(state)
  }
}

// Refresh console if new logs were added
setInterval(() => {
  const logsCount = getLogsCount()
  const missingLogsCount = logsCount - loadedLogsCount
  if (missingLogsCount > 0) {
    const newLogs = getRawLogs().slice(loadedLogsCount, logsCount).map(x => {
      try { return JSON.parse(x) } catch (err) { return null }
    })
    insertLogs(newLogs)
  }
  loadedLogsCount = logsCount
}, consoleRefreshInterval)
