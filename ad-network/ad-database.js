const { addresses } = require('../config')

function extractHost (url) {
  return new URL(url).host
}

function prepareAdData () {
  const adData = {}
  adData[extractHost(addresses.animalsAdvertiser)] = {
    animals_visitor: {
      img: addresses.animalsAdvertiser + '/static/images/animals.png',
      href: addresses.animalsAdvertiser,
      baseValue: 0.1
    },
    catfood_buyer: {
      img: addresses.animalsAdvertiser + '/static/images/cat.svg',
      href: addresses.animalsAdvertiser + '/catfood',
      baseValue: 2.8
    },
    dogfood_buyer: {
      img: addresses.animalsAdvertiser + '/static/images/dog.svg',
      href: addresses.animalsAdvertiser + '/dogfood',
      baseValue: 2.7
    },
    cats_lover: {
      img: addresses.animalsAdvertiser + '/static/images/cat.svg',
      href: addresses.animalsAdvertiser + '/catfood',
      baseValue: 0.4
    },
    dogs_lover: {
      img: addresses.animalsAdvertiser + '/static/images/dog.svg',
      href: addresses.animalsAdvertiser + '/dogfood',
      baseValue: 0.3
    }
  }
  adData[extractHost(addresses.transportAdvertiser)] = {
    trains_lover:
      {
        img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/PKP.svg/2560px-PKP.svg.png',
        href: 'https://pkp.pl',
        baseValue: 0.5
      },
    planes_lover: {
      img: 'https://upload.wikimedia.org/wikipedia/en/3/3d/LOT_Polish_Airlines.svg',
      href: 'https://lot.com',
      baseValue: 0.6
    }
  }
  adData[extractHost(addresses.sportEquipmentAdvertiser)] = {
    scooters_viewer:
      {
        img: addresses.sportEquipmentAdvertiser + '/static/images/scooters.svg',
        href: addresses.sportEquipmentAdvertiser + '/scooters',
        baseValue: 0.8
      },
    bikes_viewer:
      {
        img: addresses.sportEquipmentAdvertiser + '/static/images/bikes.svg',
        href: addresses.sportEquipmentAdvertiser + '/bikes',
        baseValue: 0.9
      },
    rollers_viewer:
      {
        img: addresses.sportEquipmentAdvertiser + '/static/images/rollers.svg',
        href: addresses.sportEquipmentAdvertiser + '/rollers',
        baseValue: 1.1
      }

  }

  return adData
}

module.exports = prepareAdData()
