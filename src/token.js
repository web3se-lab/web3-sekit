/*
 * Update token info
 * UI is needed
 */
const { get, sleep, getBrowser, getTime } = require('./utils')
const cheerio = require('cheerio')
const network = 'bscMain'
const config = require('../config/network.json')[network]
const $token = require('./getToken')
const $contract = require('./getContract')

const REFRESH = false

console.log('network', network)

async function updateInfo(start = 1) {
    start = parseInt(start)
    const browser = await getBrowser()
    try {
        const page = await browser.newPage()
        const max = await $token.maxId()
        for (let i = start; i <= max; i++) {
            start = i
            const data = await $token.findOneByPk(i)
            if (!data) continue
            const tokenNetwork = await $contract.getNetwork(data.ContractAddress)
            if (tokenNetwork !== network) continue
            const pass = (getTime() - getTime(data.updatedAt)) / 3600 / 1000
            // TokenType is existed and not refresh mode or passtime<24hours, skip
            if (data.TokenType && (!REFRESH || pass < 24)) continue
            const url = `${config.token}/${data.ContractAddress}`
            await page.goto(url)
            const html = await page.content()
            const h = cheerio.load(html)
            const tokenType = h('.card-header>.card-header-title>span>b').text().trim()
            if (!tokenType) {
                console.log('sleep', 10000)
                await sleep(10000)
                i--
                continue
            }
            // write to table Token
            data.TokenType = tokenType
            console.log('TokenType', tokenType)
            const valueH = h('#ContentPlaceHolder1_tr_valuepertoken')
            if (valueH.length) {
                const price = valueH
                    .find('.row>.col-6:first-child>.d-block>span:first-child')
                    .text()
                    .replace(/[^\d.]/g, '')
                const bnb = valueH
                    .find('.row>.col-6:first-child>.d-block>span.text-secondary')
                    .text()
                    .replace(/[^\d.]/g, '')
                const market = valueH
                    .find('.row>.col-6:last-child>.d-block>button')
                    .text()
                    .replace(/[^\d.]/g, '')
                if (price) data.Price = parseFloat(price)
                if (bnb) data.BNB = parseFloat(bnb)
                if (market) data.Market = parseFloat(market)
                console.log('Price', data.Price)
                console.log('BNB', data.BNB)
                console.log('Market', data.Market)
            }
            const holderH = h('#ContentPlaceHolder1_tr_tokenHolders')
            if (holderH.length) {
                const holders = holderH
                    .find('.mr-3')
                    .text()
                    .replace(/[^\d.]/g, '')
                if (holders) data.Holders = parseFloat(holders)
                console.log('Holders', data.Holders)
            }
            const decimalH = h('#ContentPlaceHolder1_trDecimals')
            if (decimalH.length) {
                const decimals = decimalH
                    .find('.col-md-8')
                    .text()
                    .replace(/[^\d.]/g, '')
                if (decimals) data.Decimals = parseInt(decimals)
                console.log('Decimals', data.Decimals)
            }
            const supply = h('span.hash-tag')
                .text()
                .replace(/[^\d.]/g, '')
            if (supply) {
                data.Supply = parseFloat(supply)
                console.log('Supply', data.Supply)
            }

            const frame = await page.frames().find(f => f.name() === 'tokentxnsiframe')
            if (frame) {
                const flag = await frame
                    .waitForSelector('p.mb-2.mb-md-0')
                    .then(() => true)
                    .catch(() => false)
                // flag=false is timeout
                if (flag) {
                    const html = await frame.content()
                    const h = cheerio.load(html)
                    const transferH = h('p.mb-2.mb-md-0')
                    const rmSmall = transferH.text().replace(/\(.*?\)/g, '')
                    const transfer = rmSmall.replace(/[^\d.]/g, '')
                    data.Transfers = parseInt(transfer)
                    if (data.Transfers < 0) data.Transfers = 0
                } else data.Transfers = 0
                console.log('Transfers', data.Transfers)
            }
            data.updatedAt = new Date()
            // update
            const flag = await data.save()
            console.log('updateTokenInfo', flag.Id)
        }
    } catch (e) {
        console.error(e)
        setTimeout(() => {
            updateInfo(start)
        }, 10000)
    } finally {
        browser.close()
    }
}

async function updateHoneypot(start = 1) {
    start = parseInt(start)
    const max = await $token.maxId()
    for (let i = start; i <= max; i++) {
        const data = await $token.findOneByPk(i)
        if (!data) continue
        if (!data.TokenType.includes('20')) continue
        if (data.IsHoneypot !== null && !REFRESH) continue
        const tokenNetwork = await $contract.getNetwork(data.ContractAddress)
        if (tokenNetwork !== network) continue
        try {
            const res = await get(`${config.honeypot}${data.ContractAddress}`)
            const json = JSON.parse(res)
            for (const i in json) data[i] = json[i]
            const flag = await data.save()
            console.log('updateTokenHoneypot', flag.Id)
        } catch (e) {
            continue
        }
    }
}

// remove all the token that not existed in Table Contract
async function removeNull() {
    try {
        const max = await $token.maxId()
        for (let i = 1; i <= max; i++) {
            const data = await $token.findOneByPk(i)
            if (!data) continue
            const flag = await $contract.check(data.ContractAddress)
            if (!flag) {
                console.log('None Contract Token', data.ContractAddress)
                const res = await data.destroy()
                console.log('Delete', res.Id)
            }
        }
    } catch (e) {
        console.error(e)
    }
}

// update risk, bnblp, busdlp from scamsniper
async function updateRisk(start = 1) {
    start = parseInt(start)
    const url = 'https://scamsniper.net/scan/bsc/'
    const browser = await getBrowser()
    try {
        const page = await browser.newPage()
        const max = await $token.maxId()
        for (let i = start; i <= max; i++) {
            start = i
            const data = await $token.findOneByPk(i)
            if (!data) continue
            if (!data.TokenType.includes('20')) continue
            if (data.Risk > 0 && !REFRESH) continue
            const tokenNetwork = await $contract.getNetwork(data.ContractAddress)
            if (tokenNetwork !== network) continue
            await page.goto(url + data.ContractAddress)
            await page.waitForSelector('.scan-result')
            const html = await page.content()
            const h = cheerio.load(html)
            const riskH = h('.scan-result .rating div')
            if (riskH) {
                const txt = riskH.text()
                if (txt.includes('LOW')) data.Risk = 1
                if (txt.includes('MEDIUM')) data.Risk = 2
                if (txt.includes('HIGH')) data.Risk = 3
                console.log('risk', txt)
            }
            const liquH = h('.liquidity-info .pool-info')
            if (liquH) {
                const bnblp = liquH
                    .find('.liquidity-bnb')
                    .text()
                    .replace(/[^\d.]/g, '')
                console.log('BNB-LP', bnblp)
                const busdlp = liquH
                    .find('.liquidity-busd')
                    .text()
                    .replace(/[^\d.]/g, '')
                console.log('BUSD-LP', busdlp)
                data.BNBLP = parseFloat(bnblp)
                data.BUSDLP = parseFloat(busdlp)
            }
            const flag = await data.save()
            console.log('updateRisk', flag.Id)
        }
    } catch (e) {
        console.error(e)
        setTimeout(() => {
            updateInfo(start)
        }, 10000)
    } finally {
        await browser.close()
    }
}

// bsc
async function updateContractRisk() {
    const max = await $token.maxId()
    for (let i = 1; i <= max; i++) {
        const data = await $token.findOneByPk(i)
        if (!data) continue
        if (!data.Risk) continue
        await $contract.updateByAddress({ ContractAddress: data.ContractAddress, Risk: data.Risk })
    }
}

if (process.argv[1].includes('src/token')) {
    if (process.argv[2] === 'info') updateInfo(process.argv[3])
    if (process.argv[2] === 'honeypot') updateHoneypot(process.argv[3])
    if (process.argv[2] === 'removeNull') removeNull()
    if (process.argv[2] === 'risk') updateRisk(process.argv[3])
    if (process.argv[2] === 'risk-contract') updateContractRisk()
}
