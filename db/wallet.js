const { Wallet } = require('./DB')
const T = Wallet

async function count() {
    return await T.count()
}

async function maxId() {
    return await T.max('Id')
}

async function getByAddress(address, network) {
    const options = { where: { Address: address, Network: network } }
    return await T.findOne(options)
}

async function upsert(data) {
    const row = await T.upsert(data)
    console.log('Upsert Contract', row[0].Id)
    return row
}

module.exports = {
    count,
    maxId,
    getByAddress,
    upsert
}
