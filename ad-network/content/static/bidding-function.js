(contextSignals, interestGroupSignals) => {
  if (contextSignals?.deniedTerms?.find((t) => interestGroupSignals?.name.includes(t)) !== undefined) {
    return 0
  }
  const igOwnerBonusMap = contextSignals?.igOwnerBonus

  const baseValue = interestGroupSignals?.baseValue || 0
  const igBonus = igOwnerBonusMap !== undefined ? igOwnerBonusMap[interestGroupSignals?.owner] || 0 : 0
  return baseValue + igBonus
}
