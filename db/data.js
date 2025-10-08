const tree = require('treeify')
const { Contract, Token, Vulnerability } = require('./DB')
const $ = require('../src/utils')

// input token id
async function TokenHasContract(id, attributes, contractAttr) {
    const options = { attributes, include: [{ model: Contract, attributes: contractAttr }] }
    options.where = { ContractId: parseInt(id) }
    Token.hasOne(Contract, { sourceKey: 'ContractId', foreignKey: 'Id' })
    return await Token.findOne(options)
}

// input vul id
async function VulnerabilityHasContract(id, attributes, contractAttr) {
    const options = { attributes, include: [{ model: Contract, attributes: contractAttr }] }
    options.where = { Id: parseInt(id) }
    Vulnerability.hasOne(Contract, { sourceKey: 'ContractId', foreignKey: 'Id' })
    return await Vulnerability.findOne(options)
}

// get scam intent with source code
async function getSourceCodeScam(key) {
    const res = await TokenHasContract(
        key,
        ['Id', 'Scams'],
        ['SourceCode', 'CompilerVersion', 'ContractAddress', 'Network']
    )
    if (!res) return null

    const risk = JSON.parse(res.Scams)
    const type = res.contract.CompilerVersion.includes('vyper') ? 'vyper' : 'solidity'
    const codeTree = $.getCodeMap($.clearCode($.multiContracts(res.contract.SourceCode), type), type)
    const sourceCode = res.contract.SourceCode
    const address = res.contract.ContractAddress

    if (process.argv[2] === 'code-scam') {
        console.log('Id', res.Id)
        console.log('Address', address)
        console.log('Scams', risk)
    }

    return { id: res.Id, sourceCode, risk, type, address, codeTree, network: res.contract.Network }
}

// get vulnerability with source code
async function getSourceCodeVulnerability(key) {
    const res = await VulnerabilityHasContract(
        key,
        ['Id', 'Vulnerability', 'Dir', 'File', 'Detail', 'Repair'],
        ['Id', 'SourceCode']
    )
    if (!res) return null

    const vulnerability = JSON.parse(res.Vulnerability)
    const sourceCode = res.contract.SourceCode
    const codeTree = $.getCodeMap($.clearCode($.multiContracts(res.contract.SourceCode)))

    if (process.argv[2] === 'code-vul') {
        console.log('Id', res.Id)
        console.log(tree.asTree(codeTree, false, true))
        console.log('Vulnerability', vulnerability)
    }

    return {
        id: res.Id,
        sourceCode,
        codeTree,
        vulnerability,
        dir: res.Dir,
        detail: res.Detail,
        repair: res.Repair
    }
}

// tokens: Num.10000->Id: 10211
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

    // calculate weight
    let all = 0
    for (const i in scam) all += scam[i]
    for (const i in scam) scam[i] = (scam[i] * 100) / all
    console.log(scam)
}

async function countVulTypes(start, max) {
    start = parseInt(start) || 1
    max = parseInt(max) || (await Vulnerability.max('Id'))
    const vul = {}
    let count = 0
    for (let i = start; i <= max; i++) {
        const res = await Vulnerability.findByPk(i, { attributes: ['Id', 'Vulnerability'] })
        if (!res || !res.Vulnerability) continue
        count++
        console.log('Id', res.Id)
        const data = JSON.parse(res.Vulnerability)
        for (const item of Object.keys(data)) {
            if (!vul[item]) vul[item] = 0
            vul[item]++
        }
    }
    console.log('Count', count)
    console.log(vul)
}

if (process.argv[1].includes('db/data')) {
    if (process.argv[2] === 'code-scam') getSourceCodeScam(process.argv[3])
    if (process.argv[2] === 'code-vul') getSourceCodeVulnerability(process.argv[3])
    if (process.argv[2] === 'count-scam') countScamTypes(process.argv[3], process.argv[4])
    if (process.argv[2] === 'count-vul') countVulTypes(process.argv[3], process.argv[4])
}

module.exports = {
    TokenHasContract,
    getSourceCodeScam,
    getSourceCodeVulnerability
}
