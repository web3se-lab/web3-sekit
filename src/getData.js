const ROOT = require('app-root-path')
const fs = require('fs')
const tree = require('treeify')
const { Op } = require('sequelize')
const { Contract, Token } = require('../db/DB')
const { findOneByPk } = require('./getContract')
const $ = require('./utils')

async function TokenHasContract(key, tokenAttr, codeAttr) {
    const options = {
        attributes: tokenAttr,
        include: [{ model: Contract, attributes: codeAttr }]
    }

    if (typeof key === 'string' && key.substring(0, 2) === '0x') options.where = { ContractAddress: key }
    else options.where = { Id: parseInt(key) }
    Token.hasOne(Contract, { sourceKey: 'ContractAddress', foreignKey: 'ContractAddress' })
    return await Token.findOne(options)
}

async function getSourceCodeRisk(key) {
    const res = await TokenHasContract(
        key,
        ['Id', 'ContractAddress', 'Risk'],
        ['SourceCode', 'CompilerVersion', 'Network']
    )

    const sourceCode = res.contract.SourceCode
    const type = res.contract.CompilerVersion.includes('vyper') ? 'vyper' : 'solidity'
    const network = res.contract.Network
    const sourceCodeMap = $.getCodeMap($.clearCode($.multiContracts(sourceCode), type), type)
    const address = res.ContractAddress

    if (process.argv[2] === 'code-risk') {
        codeMap(sourceCodeMap)
        console.log('Id', res.Id)
        console.log('Address', address)
        console.log('Risk', res.Risk)
        console.log('Network', network)
    }

    return res
}

async function getSourceCodeScam(key) {
    const res = await TokenHasContract(
        key,
        ['Id', 'ContractAddress', 'Scams'],
        ['SourceCode', 'CompilerVersion', 'Network']
    )
    if (!res) return null

    const risk = JSON.parse(res.Scams)
    const sourceCode = res.contract.SourceCode
    const type = res.contract.CompilerVersion.includes('vyper') ? 'vyper' : 'solidity'
    const network = res.contract.Network
    const codeTree = $.getCodeMap($.clearCode($.multiContracts(sourceCode), type), type)
    const address = res.ContractAddress

    if (process.argv[2] === 'code-scam') {
        codeMap(codeTree)
        console.log('Id', res.Id)
        console.log('Address', address)
        console.log('Scams', risk)
    }

    return { address, type, network, risk, codeTree, sourceCode }
}

async function getSourceCodeTokenType(key) {
    const res = await TokenHasContract(
        key,
        ['Id', 'ContractAddress', 'TokenType'],
        ['SourceCode', 'CompilerVersion', 'Network']
    )

    if (process.argv[2] === 'code-token-type') {
        console.log('Id', res.Id)
        console.log('Address', res.ContractAddress)
        console.log('TokenType', res.TokenType)
        codeMap(res.code.SourceCodeMap)
    }
    return res
}

async function countTokenTypes() {
    const token20 = await Token.count({
        where: {
            TokenType: { [Op.like]: '%20' }
        }
    })
    const token721 = await Token.count({
        where: {
            TokenType: { [Op.like]: '%721' }
        }
    })
    console.log('ERC-20', token20)
    console.log('ERC-721', token721)
}

async function countHoneypot() {
    const honeypot = await Token.count({ where: { IsHoneypot: true } })
    const notHoneypot = await Token.count({ where: { IsHoneypot: false } })
    const unknown = await Token.count({ where: { IsHoneypot: null } })
    const known = honeypot + notHoneypot
    console.log({ honeypot, notHoneypot, known, unknown })
}

async function countRisk() {
    const unknown = await Contract.count({ where: { Risk: 0 } })
    const low = await Contract.count({ where: { Risk: 1 } })
    const medium = await Contract.count({ where: { Risk: 2 } })
    const high = await Contract.count({ where: { Risk: 3 } })
    const known = low + medium + high
    console.log({ unknown, low, medium, high, known })
}

async function countScamTypes(start, max) {
    start = parseInt(start) || 1
    max = parseInt(max) || (await Token.max('Id'))
    const scam = {}
    let count = 0
    for (let i = start; i <= max; i++) {
        const res = await Token.findByPk(i, { attributes: ['Id', 'ContractAddress', 'Scams'] })
        if (!res || !res.Scams) continue
        count++
        console.log('Id', res.Id)
        console.log('Address', res.ContractAddress)
        const data = JSON.parse(res.Scams)
        for (const item of data) {
            if (!scam[item.type]) scam[item.type] = 0
            scam[item.type]++
        }
    }
    console.log('Count', count)
    console.log(scam)
}

function codeMap(code) {
    if (typeof code === 'string') code = JSON.parse(code)
    for (const i in code) {
        console.log(i)
        for (const j in code[i]) console.log(`---${j}`)
    }
}

async function getSourceCodeTxt(start, max) {
    start = parseInt(start) || 1
    max = parseInt(max) || (await Contract.max('Id'))
    const fun = new Set()
    for (let i = start; i <= max; i++) {
        const attrs = ['Id', 'ContractName', 'ContractAddress', 'Network', 'SourceCode', 'CompilerVersion', 'ABI']
        const res = await findOneByPk(i, attrs)
        if (!res) continue
        console.log('Id', res.Id)
        console.log('Address', res.ContractAddress)
        const type = res.CompilerVersion.includes('vyper') ? 'vyper' : 'solidity'
        const sourceCode = $.multiContracts(res.SourceCode)
        const clearCode = $.clearCode(sourceCode, type)
        const data = $.getCodeMap(clearCode, type)
        console.log(tree.asTree(data, false, true))
        for (const i in data) for (const j in data[i]) fun.add(data[i][j])
        console.log(fun.size)
    }
    const txt = JSON.stringify(Array.from(fun))
    fs.writeFileSync(`${ROOT}/db/data.json`, txt)
}

async function json2txt() {
    const json = require(`${ROOT}/db/data.json`)
    for (const item of json) {
        fs.appendFileSync(`${ROOT}/db/data.txt`, item + '\n', e => {
            if (e) console.error(e)
        })
    }
}

if (process.argv[1].includes('getData')) {
    if (process.argv[2] === 'code-risk') getSourceCodeRisk(process.argv[3])
    if (process.argv[2] === 'code-scam') getSourceCodeScam(process.argv[3])
    if (process.argv[2] === 'code-token-type') getSourceCodeTokenType(process.argv[3])
    if (process.argv[2] === 'count-token-type') countTokenTypes()
    if (process.argv[2] === 'count-honeypot') countHoneypot()
    if (process.argv[2] === 'count-risk') countRisk()
    if (process.argv[2] === 'count-scam') countScamTypes(process.argv[3], process.argv[4])
    if (process.argv[2] === 'code-txt') getSourceCodeTxt(process.argv[3], process.argv[4])
    if (process.argv[2] === 'json-txt') json2txt()
}

module.exports = {
    getSourceCodeRisk,
    getSourceCodeScam,
    getSourceCodeTokenType
}
