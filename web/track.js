const { getByAddress } = require('../db/wallet')
const $wallet = require('../src/wallet')

async function balance(req, res, next) {
    try {
        const address = req.body.address
        const network = req.body.network || 'tron'
        const result = await getByAddress(address, network)
        const params = ['trx', 'USDT', 'USDC']
        const data = []
        // get from network
        if (!result) {
            const arr = await $wallet.getBalance(address, network)
            for (const item of arr) if (params.includes(item['token_abbr'])) data.push(item)
        } else {
            const arr = JSON.parse(result.Balance)
            for (const item of arr) if (params.includes(item['token_abbr'])) data.push(item)
        }

        if (!data) throw new Error(`Address not found`)
        res.json(data)
    } catch (e) {
        next(e)
    }
}

module.exports = { balance }
