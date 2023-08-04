const xlsx = require('node-xlsx').default
const ROOT = require('app-root-path')
const cheerio = require('cheerio')
const FILE = `${ROOT}/db/contracts5.csv`
const $contract = require('./getContract')
const $token = require('./getToken')
const { sleep, get, getAPI } = require('./utils')
const { embedAPI, tokenizeAPI, removeBr, tf } = require('../tensorflow/utils')
const NETWORK = 'ethMain'
const config = require('../config/network.json')[NETWORK]

// /db/csv files
async function getFromCSV(from) {
    try {
        console.log('Get from CSV', FILE)
        const data = xlsx.parse(FILE)[0].data
        data.splice(0, 2)
        const addrs = []
        let start = false
        for (const item of data) {
            if (item[1] === from || !from) start = true
            if (!start) continue
            addrs.push(item[1])
        }
        console.log('Start from', from)
        for (const item of addrs) {
            from = item
            const flag = await $contract.check(item)
            if (flag) continue // skip existed contract
            if (item.substring(0, 2) !== '0x') continue // slip invalid contract address
            const source = await getAPI(NETWORK, item)
            source.ContractAddress = item
            source.Network = NETWORK
            if (source.SourceCode) await $contract.insert(source)
        }
    } catch (e) {
        console.error(e)
        getFromCSV(from)
    }
}

// give address and download contract source code
async function getFromAddress(address) {
    try {
        console.log('Get from Address', address)
        const flag = await $contract.check(address)
        if (!flag) {
            const source = await getAPI(NETWORK, address)
            source.ContractAddress = address
            source.Network = NETWORK
            if (source.SourceCode) await $contract.insert(source)
        }
    } catch (e) {
        console.error(e)
    }
}

// download a token list from https://bscscan.com/tokens
async function getFromTokens() {
    try {
        const url = config['tokens']
        console.log('Get from Token List', url)
        for (let i = 1; i <= 19; i++) {
            const html = await get(url + '?p=' + i)
            const h = cheerio.load(html)
            const a = h('#tblResult a.text-primary')
            for (const e of a) {
                const href = h(e).attr('href').split('/')
                const addr = href[2]
                const flag = await $contract.check(addr)
                if (flag) continue // skip existed contract
                const source = await getAPI(NETWORK, addr)
                source.ContractAddress = addr
                source.Network = NETWORK
                if (source.SourceCode) await $contract.insert(source)
            }
        }
    } catch (e) {
        console.error(e)
    }
}

// get verified vyper contract list
async function getVyper() {
    try {
        for (let i = 1; i <= 11; i++) {
            const url = `${config.contract}/${i}?filter=vyper`
            console.log('Get Vyper', url)
            const html = await get(url)
            const h = cheerio.load(html)
            const addr = h('.hash-tag.text-truncate')
            for (const x of addr) {
                const addr = h(x).text()
                const flag = await $contract.check(addr)
                if (flag) continue // skip existed contract
                const source = await getAPI(NETWORK, addr)
                source.ContractAddress = addr
                source.Network = NETWORK
                console.log('address', addr)
                if (source.SourceCode) await $contract.insert(source)
            }
        }
    } catch (e) {
        console.error(e)
    }
}

// add Creator, TxHash, ContractType=isToken?
async function labelToken(start = 1, end) {
    try {
        end = parseInt(end) || (await $contract.maxId())
        let i = parseInt(start)
        while (i <= end) {
            const data = await $contract.findOneByPk(i)
            if (!data) continue
            if (!data.SourceCode) continue // skip not verified contract
            if (data.Network != NETWORK) continue
            if (data.ContractType) await $token.upsert({ ContractAddress: data.ContractAddress })
            if (!data.Creator || !data.TxHash) {
                // update info, label is token?
                const url = `${config.address}/${data.ContractAddress}`
                const html = await get(url)
                const h = cheerio.load(html)
                const creator = h('#ContentPlaceHolder1_trContract .hash-tag[title="Creator Address"]').text()
                const txHash = h('#ContentPlaceHolder1_trContract .hash-tag[title="Creator Txn Hash"]').text()
                if (!creator || !txHash) {
                    console.log('sleep', 10000)
                    await sleep(10000)
                    continue
                }
                if (creator) data.Creator = creator
                if (txHash) data.TxHash = txHash
                // is token?
                const tokenH = h('#ContentPlaceHolder1_tr_tokeninfo')
                if (tokenH.length > 0) data.ContractType = tokenH.find('.row>.col-md-8>a').text().trim()
                if (data.ContractType) await $token.upsert({ ContractAddress: data.ContractAddress })
                const res = await data.save()
                console.log('Update Info', res.Id)
            }
            i++
        }
    } catch (e) {
        console.error(e)
    }
}

async function tokenAll(start = 1, end) {
    const max = end || (await $contract.maxId())
    for (let i = start; i <= max; i++) {
        const code = await $contract.getCodeMapById(i)
        if (!code) continue
        console.log('Tokenize', i)
        const json = {}
        for (const i in code) {
            json[i] = {}
            for (const j in code[i]) json[i][j] = await tokenizeAPI(removeBr(code[i][j])) // remove redundant spaces and br
        }
        console.log(json)
        const data = {
            Id: i,
            TokenIds: JSON.stringify(json)
        }
        await $contract.upsert(data)
    }
}

// embed all: average pool embedding
async function embedAllAvg(start = 1, end) {
    const max = end || (await $contract.maxId())
    for (let i = start; i <= max; i++) {
        const code = await $contract.getCodeMapById(i)
        if (!code) continue
        console.log('Embed Avg', i)
        const json = {}
        for (const i in code) {
            json[i] = {}
            for (const j in code[i]) json[i][j] = await embedAPI(removeBr(code[i][j]), 'embeddingAvg')
        }
        console.log(json)
        const data = {
            Id: i,
            Embedding: JSON.stringify(json)
        }
        await $contract.upsert(data)
    }
}

// embed all: max pool embedding
async function embedAllMax(start = 1, end) {
    const max = end || (await $contract.maxId())
    for (let i = start; i <= max; i++) {
        const code = await $contract.getCodeMapById(i)
        if (!code) continue
        console.log('Embed Max', i)
        const json = {}
        for (const i in code) {
            json[i] = {}
            for (const j in code[i]) json[i][j] = await embedAPI(removeBr(code[i][j]), 'embeddingMax')
        }
        console.log(json)
        const data = {
            Id: i,
            EmbeddingMax: JSON.stringify(json)
        }
        await $contract.upsert(data)
    }
}

if (process.argv[1].includes('updateContract')) {
    // argv 2 is contract address
    if (process.argv[2].substring(0, 2) == '0x') getFromAddress(process.argv[2])
    else if (process.argv[2] == 'tokens') getFromTokens()
    else if (process.argv[2] == 'csv') getFromCSV(process.argv[3])
    else if (process.argv[2] == 'labelToken') labelToken(process.argv[3], process.argv[4])
    else if (process.argv[2] == 'removeNull') $contract.removeNull()
    else if (process.argv[2] == 'vyper') getVyper()
    else if (process.argv[2] == 'embed-all-avg') embedAllAvg(process.argv[3], process.argv[4])
    else if (process.argv[2] == 'embed-all-max') embedAllMax(process.argv[3], process.argv[4])
    else if (process.argv[2] == 'tokenize-all') tokenAll(process.argv[3], process.argv[4])
}
