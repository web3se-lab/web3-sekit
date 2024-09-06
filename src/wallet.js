require('dotenv').config()
const $ = require('./utils')
const $wallet = require('../db/wallet')

const { TRON_API, TRON_KEY } = process.env

async function getBalance(address, network) {
    if (network === 'tron') {
        const res = await $.get(
            `${TRON_API}/api/account/wallet`,
            { address, asset_type: 1 },
            { 'TRON-PRO-API-KEY': TRON_KEY }
        )
        const balance = res.data
        $wallet.upsert({
            Network: network,
            Address: address,
            Balance: balance
        })
        return balance
    }
}

module.exports = { getBalance }
