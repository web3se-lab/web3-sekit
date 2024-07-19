/*
 * Use SmartBERT + BiLSTM (Concat)
 * @Author: Youwei Huang
 * @Email: devilyouwei@foxmail.com
 * 2023-2-11
 * modified to use python trained model
 */

const ROOT = require('app-root-path')
const MyModelSmartBert = require('./base-model/mymodel-smartbert')
const $contract = require('../src/getContract')

const PAD_TKN = 768
const PAD = 0.0

class SmartBertBiLSTMConcat extends MyModelSmartBert {
    async loadModel() {
        this.mymodel = await this.tf.node.loadSavedModel(`${ROOT}/tensorflow/models-py/${this.name}`)
    }
    async preX(address) {
        const resAvg = await $contract.getEmbeddingByAddress(address, 'Embedding')
        const resMax = await $contract.getEmbeddingByAddress(address, 'EmbeddingMax')
        if (!resAvg || !resMax) return null
        const arr = []
        for (const i in resAvg) for (const j in resAvg[i]) arr.push(resAvg[i][j].concat(resMax[i][j]))
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
            while (x.length < maxLength) x.push(Array(PAD_TKN * 2).fill(PAD))
            return x
        })
    }
}

const nn = new SmartBertBiLSTMConcat('smartbert_concat_bilstm')

if (process.argv[2] == 'evaluate') nn.evaluate(process.argv[3], process.argv[4], process.argv[5])
if (process.argv[2] == 'predict') nn.predict(process.argv[3], process.argv[4])
