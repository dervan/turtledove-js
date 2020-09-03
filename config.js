export const ports = {
  turtledovePort: 8008,
  adPartnerPort: 8007,
  animalsPublisherPort: 8000,
  planesPublisherPort: 8001,
  animalsAdvertiserPort: 8002,
  transportAdvertiserPort: 8003,
  sportEquipmentAdvertiserPort: 8004
}

const addressesVariants = {
  web: {
    turtledoveHost: 'https://turtledove.pl',
    adPartner: 'https://ad-network.pl',
    animalsPublisher: 'https://aboutanimals.pl',
    planesPublisher: 'https://aboutplanes.pl',
    animalsAdvertiser: 'https://catordog.pl',
    transportAdvertiser: 'https://trainorplane.pl',
    sportEquipmentAdvertiser: 'https://sportequipment.pl'
  },
  local: {
    turtledoveHost: 'http://localhost:' + ports.turtledovePort,
    adPartner: 'http://localhost:' + ports.adPartnerPort,
    animalsPublisher: 'http://localhost:' + ports.animalsPublisherPort,
    planesPublisher: 'http://localhost:' + ports.planesPublisherPort,
    animalsAdvertiser: 'http://localhost:' + ports.animalsAdvertiserPort,
    transportAdvertiser: 'http://localhost:' + ports.transportAdvertiserPort,
    sportEquipmentAdvertiser: 'http://localhost:' + ports.sportEquipmentAdvertiserPort
  }
}
export const addresses = process.argv[2] === 'prod' ? addressesVariants.web : addressesVariants.local
