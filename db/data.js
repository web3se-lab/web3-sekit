const tree = require('treeify')
const { Contract, Token, Vulnerability } = require('./DB')
const $ = require('../src/utils')

async function TokenHasContract(key, tokenAttr, contractAttr) {
    const options = {
        attributes: tokenAttr,
        include: [{ model: Contract, attributes: contractAttr }]
    }

    options.where = { Id: parseInt(key) }
    Token.hasOne(Contract, { sourceKey: 'ContractId', foreignKey: 'Id' })
    return await Token.findOne(options)
}
async function VulnerabilityHasContract(key, tokenAttr, contractAttr) {
    const options = {
        attributes: tokenAttr,
        include: [{ model: Contract, attributes: contractAttr }]
    }

    options.where = { Id: parseInt(key) }
    Vulnerability.hasOne(Contract, { sourceKey: 'ContractId', foreignKey: 'Id' })
    return await Vulnerability.findOne(options)
}

async function getSourceCodeRisk(key) {
    const res = await TokenHasContract(
        key,
        ['Id', 'Risk'],
        ['SourceCode', 'CompilerVersion', 'ContractAddress', 'Embedding']
    )
    if (!res) return null

    const sourceCode = res.contract.SourceCode
    const embedding = JSON.parse(res.contract.Embedding)
    const type = res.contract.CompilerVersion.includes('vyper') ? 'vyper' : 'solidity'
    const codeTree = $.getCodeMap($.clearCode($.multiContracts(sourceCode), type), type)

    if (process.argv[2] === 'code-risk') {
        console.log('Id', res.Id)
        console.log('Address', res.contract.ContractAddress)
        console.log(tree.asTree(codeTree, false, true))
        console.log('Risk', res.Risk)
    }

    return { sourceCode, codeTree, address: res.contract.ContractAddress, type, embedding }
}

async function getSourceCodeScam(key) {
    const res = await TokenHasContract(
        key,
        ['Id', 'Scams'],
        ['SourceCode', 'CompilerVersion', 'ContractAddress', 'Embedding']
    )
    if (!res) return null

    const risk = JSON.parse(res.Scams)
    const embedding = JSON.parse(res.contract.Embedding)
    const sourceCode = res.contract.SourceCode
    const type = res.contract.CompilerVersion.includes('vyper') ? 'vyper' : 'solidity'
    const codeTree = $.getCodeMap($.clearCode($.multiContracts(sourceCode), type), type)
    const address = res.contract.ContractAddress

    if (process.argv[2] === 'code-scam') {
        console.log('Id', res.Id)
        console.log('Address', address)
        console.log(tree.asTree(codeTree, false, true))
        console.log('Scams', risk)
    }

    return { sourceCode, codeTree, risk, type, address, embedding }
}
async function getSourceCodeVulnerability(key) {
    const res = await VulnerabilityHasContract(key, ['Id', 'Vulnerability'], ['SourceCode', 'Embedding'])
    if (!res) return null

    const vulnerability = JSON.parse(res.Vulnerability)
    const embedding = JSON.parse(res.contract.Embedding)
    const sourceCode = res.contract.SourceCode
    const codeTree = $.getCodeMap($.clearCode(sourceCode), 'solidity')

    if (process.argv[2] === 'code-vul') {
        console.log('Id', res.Id)
        console.log(tree.asTree(codeTree, false, true))
        console.log('Vulnerability', vulnerability)
    }

    return { sourceCode, codeTree, vulnerability, embedding }
}

async function countRisk() {
    const unknown = await Token.count({ where: { Risk: 0 } })
    const low = await Token.count({ where: { Risk: 1 } })
    const medium = await Token.count({ where: { Risk: 2 } })
    const high = await Token.count({ where: { Risk: 3 } })
    const known = low + medium + high
    console.log({ unknown, low, medium, high, known })
}

async function countScamTypes(start, max) {
    start = parseInt(start) || 1
    max = parseInt(max) || (await Token.max('Id'))
    const scam = {}
    let count = 0
    for (let i = start; i <= max; i++) {
        const res = await Token.findByPk(i, { attributes: ['Id', 'Scams'] })
        if (!res || !res.Scams) continue
        count++
        console.log('Id', res.Id)
        const data = JSON.parse(res.Scams)
        for (const item of data) {
            if (!scam[item.type]) scam[item.type] = 0
            scam[item.type]++
        }
    }
    console.log('Count', count)
    console.log(scam)
}

if (process.argv[1].includes('db/data')) {
    if (process.argv[2] === 'code-risk') getSourceCodeRisk(process.argv[3])
    if (process.argv[2] === 'code-scam') getSourceCodeScam(process.argv[3])
    if (process.argv[2] === 'code-vul') getSourceCodeVulnerability(process.argv[3])
    if (process.argv[2] === 'count-risk') countRisk()
    if (process.argv[2] === 'count-scam') countScamTypes(process.argv[3], process.argv[4])
}

module.exports = {
    getSourceCodeRisk,
    getSourceCodeScam,
    getSourceCodeVulnerability
}
