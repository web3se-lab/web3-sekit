const solc = require('./solc.json')
const blockchain = require('./blockchain.json')
const pragma = Object.keys(solc.releases)
const keys = Object.keys(blockchain)
const chain = []

for (const item of keys) {
    chain.push({
        name: item,
        type: blockchain[item].type,
        typeName: blockchain[item].typeName
    })
}

module.exports = {
    contractType: ['contract', 'library', 'abstract contract', 'interface'],
    paramType: ['variable', 'function', 'event', 'modifier', 'constructor'],
    list: 'https://binaries.soliditylang.org',
    chain,
    pragma
}
