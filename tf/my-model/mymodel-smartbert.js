/*
 * Use SmartBERT++ Base Model
 * @Author: Youwei Huang
 * @Email: devilyouwei@foxmail.com
 * 2023-2-12
 * Extend from MyModel
 */

const MyModel = require('./mymodel')
const $contract = require('../../src/getContract')

const PAD_TKN = 768
const PAD = 0.0

module.exports = class MyModelSmartBert extends MyModel {
    // LSTM get input ids from local database
    async preX(address) {
        const res = await $contract.getEmbeddingByAddress(address)
        if (!res) return null
        const arr = []
        for (const i in res) for (const j in res[i]) arr.push(res[i][j])
        return arr
    }
    // [null, 512] padding to [max, 512]
    padding(xs) {
        // finding max length batch
        const maxLength = Math.max.apply(
            Math,
            xs.map(x => x.length)
        )
        return xs.map(x => {
            while (x.length < maxLength) x.push(Array(PAD_TKN).fill(PAD))
            return x
        })
    }
}
