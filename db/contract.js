const { Contract } = require('./DB')
const $ = require('../src/utils')
const T = Contract

async function count() {
    return await T.count()
}
async function maxId() {
    return await T.max('Id')
}
async function findOneByAddress(address, attributes) {
    const options = { where: { ContractAddress: address } }
    if (attributes) options.attributes = attributes
    return await T.findOne(options)
}
async function findOneByPk(id, attributes) {
    const options = {}
    if (attributes) options.attributes = attributes
    return await T.findByPk(id, options)
}

// check if existed
async function check(address) {
    const res = await T.count({ where: { ContractAddress: address } })
    if (res > 0) return true
    else return false
}

async function insert(data) {
    const row = await T.create(data)
    console.log('Insert Contract', row.Id)
    console.log('Insert Contract', row.ContractAddress)
    return row
}

async function getNetworkById(id) {
    const res = await T.findByPk(id, { attributes: ['Network'] })
    console.log('Network', res.Network)
    return res.Network
}

async function getNetwork(ContractAddress) {
    const res = await T.findOne({
        where: { ContractAddress },
        attributes: ['Network']
    })
    console.log('Network', res.Network)
    return res.Network
}

const codeAttributes = [
    'Id',
    'ContractAddress',
    'SourceCode',
    'ContractName',
    'CompilerVersion',
    'Library',
    'EVMVersion',
    'Proxy',
    'ConstructorArguments',
    'OptimizationUsed',
    'Runs'
]

async function getCodeByAddress(ContractAddress) {
    const res = await T.findOne({
        where: { ContractAddress },
        attributes: codeAttributes
    })
    return res
}

async function getCodeById(id) {
    const res = await T.findByPk(id, {
        attributes: codeAttributes
    })
    return res
}

async function getCodeMapById(id) {
    const res = await T.findByPk(id, {
        attributes: codeAttributes
    })
    if (!res) return res
    const type = res.CompilerVersion.includes('vyper') ? 'vyper' : 'solidity'
    const code = $.getCodeMap($.clearCode($.multiContracts(res.SourceCode), type), type)
    return code
}

async function getCodeMapByAddress(ContractAddress) {
    const res = await T.findOne({
        where: { ContractAddress },
        attributes: codeAttributes
    })
    if (!res) return res
    const type = res.CompilerVersion.includes('vyper') ? 'vyper' : 'solidity'
    const code = $.getCodeMap($.clearCode($.multiContracts(res.SourceCode), type), type)
    return code
}

async function upsert(data) {
    const row = await T.upsert(data)
    console.log('Upsert Contract', row[0].Id)
    return row
}

async function updateByAddress(data) {
    const row = await T.update(data, { where: { ContractAddress: data.ContractAddress } })
    console.log('Update Contract', row[0].ContractAddress)
    return row
}

async function getEmbeddingById(id, pool = 'Embedding') {
    const res = await T.findByPk(id, { attributes: [pool] })
    if (res && res[pool]) return JSON.parse(res[pool])
    else return null
}

async function getEmbeddingByAddress(ContractAddress, pool = 'Embedding') {
    const res = await T.findOne({
        where: { ContractAddress },
        attributes: [pool]
    })
    if (res && res[pool]) return JSON.parse(res[pool])
    else return null
}

if (process.argv[1].includes('db/contract')) {
    if (process.argv[2] == 'count') count().then(r => console.log(r))
    if (process.argv[2] == 'max') maxId().then(r => console.log(r))
    if (process.argv[2] == 'get') {
        if (process.argv[3].substring(0, 2) == '0x')
            findOneByAddress(process.argv[3]).then(r => console.log(r.dataValues))
        else findOneByPk(parseInt(process.argv[3])).then(r => console.log(r.dataValues))
    }
    if (process.argv[2] == 'check') check(process.argv[3]).then(r => console.log(r))
    if (process.argv[2] == 'network') {
        if (process.argv[3].substring(0, 2) == '0x') getNetwork(process.argv[3]).then(r => console.log(r))
        else getNetworkById(process.argv[3]).then(r => console.log(r))
    }
    if (process.argv[2] == 'embed') getEmbeddingById(process.argv[3]).then(r => console.log(r))
}

module.exports = {
    findOneByPk,
    findOneByAddress,
    count,
    maxId,
    check,
    insert,
    upsert,
    updateByAddress,
    getNetworkById,
    getNetwork,
    getCodeByAddress,
    getCodeById,
    getCodeMapById,
    getCodeMapByAddress,
    getEmbeddingById,
    getEmbeddingByAddress
}
