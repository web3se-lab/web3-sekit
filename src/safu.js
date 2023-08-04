/*
 * Update data from Safu
 */
const $contract = require('./getContract')
const $token = require('./getToken')
const $ = require('./utils')
const network = 'bscMain'
const config = require('../config/network.json')[network]
const REFRESH = false

const address = '0xa9f291779a4DD91746e02ff1bB59Fe4513ae78d9'
const signature =
    '0xc7f92fde9c8aa9c1c8dc896982d10f942334f70506167f18f9079c516224240f2452c63cd488910d667c9443e373d1ac54032165f85d90de16fcee6b4ef0e89e1b'

async function updateScam(start = 1, end) {
    try {
        start = parseInt(start)
        end = parseInt(end)
        const max = end || (await $token.maxId())
        for (let i = start; i <= max; i++) {
            start = i
            const data = await $token.findOneByPk(i)
            if (!data) continue
            if ((await $contract.getNetwork(data.ContractAddress)) !== network) continue
            if (data.Scams && !REFRESH) continue
            console.log('Id', data.Id)
            const tokenAddress = data.ContractAddress
            const query = { tokenAddress, address, signature }
            const res = await $.json(config.analysecode, query)
            console.log(res)
            if (res.result) {
                data.Scams = JSON.stringify(res.result.detectedScams)
                data.IsProxy = res.result.isProxy
            }
            await data.save()
        }
    } catch (e) {
        console.error(e)
        setTimeout(() => {
            updateScam(start, end)
        }, 5000)
    }
}

async function updateHoneypot(start = 1, end) {
    try {
        start = parseInt(start)
        end = parseInt(end)
        const max = end || (await $token.maxId())
        for (let i = start; i <= max; i++) {
            start = i
            const data = await $token.findOneByPk(i)
            if (!data) continue
            if ((await $contract.getNetwork(data.ContractAddress)) !== network) continue
            if (data.IsHoneypot && !REFRESH) continue
            console.log('Id', data.Id)
            const tokenAddress = data.ContractAddress
            const query = { tokenAddress, address, signature }
            const res = await $.json(config.simulatebuy, query)
            console.log(res)
            data.IsHoneypot = res.result.isHoneypot
            if (data.IsHoneypot) {
                data.Error = res.result.error
                // unknown honeypot
                if (data.Error === 'Error: Returned error: execution reverted') {
                    data.IsHoneypot = null
                    data.Error = null
                }
            } else {
                data.SellGas = res.result.sellGas.replaceAll(',', '')
                data.BuyGas = res.result.buyGas.replaceAll(',', '')
                data.SellTax = res.result.sellFee
                data.BuyTax = res.result.buyFee
            }
            await data.save()
        }
    } catch (e) {
        console.error(e)
        setTimeout(() => {
            updateHoneypot(start, end)
        }, 5000)
    }
}

if (process.argv[1].includes('safu')) {
    if (process.argv[2] === 'scam') updateScam(process.argv[3], process.argv[4])
    if (process.argv[2] === 'honeypot') updateHoneypot(process.argv[3], process.argv[4])
}
