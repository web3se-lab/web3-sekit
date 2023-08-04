const { Token } = require('./DB')
const T = Token
async function count() {
    const res = await T.count()
    if (process.argv[2] == 'count') console.log(res)
    return res
}
async function maxId() {
    const res = await T.max('id')
    if (process.argv[2] == 'max') console.log(res)
    return res
}
async function findOneByAddress(address, attributes) {
    const options = { where: { ContractAddress: address } }
    if (attributes) options.attributes = attributes
    const res = await T.findOne(options)
    if (process.argv[2] == 'get') console.log(res.dataValues)
    return res
}
async function findOneByPk(id, attributes) {
    const options = {}
    if (attributes) options.attributes = attributes
    const res = await T.findByPk(id, options)
    if (process.argv[2] == 'get') console.log(res.dataValues)
    return res
}

async function upsert(data) {
    const row = await T.upsert(data)
    console.log('Upsert Token', row[0].ContractAddress)
    return row
}

if (process.argv[1].includes('getToken')) {
    if (process.argv[2] == 'get') {
        if (process.argv[3].substring(0, 2) == '0x') findOneByAddress(process.argv[3])
        else findOneByPk(parseInt(process.argv[3]))
    }
    if (process.argv[2] == 'count') count()
    if (process.argv[2] == 'max') maxId()
}

module.exports = { findOneByPk, findOneByAddress, count, maxId, upsert }
