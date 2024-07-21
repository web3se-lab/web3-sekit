const ROOT = require('app-root-path')
const $data = require('../db/data')
const $contract = require('../db/contract')
const { embed } = require('../tf/modules/embedding')
const $ = require('../src/utils')

const EVA_PATH = `${ROOT}/tf/evaluates`

// get code content from DB
async function get(req, res, next) {
    try {
        const key = req.body.key
        let data
        const attrs = ['Id', 'ContractName', 'ContractAddress', 'Network', 'SourceCode', 'CompilerVersion', 'ABI']
        if (!key) data = { maxId: await $contract.maxId(), count: await $contract.count() }
        else if (key.substr(0, 2) === '0x') data = await $contract.findOneByAddress(key, attrs)
        else data = await $contract.findOneByPk(key, attrs)
        if (!data) throw new Error(`${key} not found`)
        const type = data.CompilerVersion.includes('vyper') ? 'vyper' : 'solidity'
        res.json({
            Type: type,
            CodeTree: $.getCodeMap($.clearCode($.multiContracts(data.SourceCode), type), type),
            ...data.dataValues
        })
    } catch (e) {
        next(e)
    }
}

// smart contract to embedding
async function embedding(req, res, next) {
    try {
        const text = req.body.text
        const type = req.body.type || 'solidity'
        res.json({
            Embedding: await embed($.getCodeMap($.clearCode($.multiContracts(text), type), type))
        })
    } catch (e) {
        next(e)
    }
}

// get code with risk array
async function intent(req, res, next) {
    try {
        const key = req.body.key // key is for token table
        const data = await $data.getSourceCodeScam(key)
        if (!data) throw new Error(`${key} not found`)
        return res.json(data)
    } catch (e) {
        next(e)
    }
}

async function vulnerability(req, res, next) {
    try {
        const key = req.body.key // key is for token table
        const data = await $data.getSourceCodeVulnerability(key)
        if (!data) throw new Error(`${key} not found`)
        return res.json(data)
    } catch (e) {
        next(e)
    }
}

// get evaluation result data
async function evaluate(req, res, next) {
    try {
        const index = req.body.index
        const version = parseInt(req.body.version)
        const data = []
        if (!version) {
            // classic models, denote by v0
            data.push({ title: 'Dense', data: `v${version}/dense.json` })
            data.push({ title: 'LSTM', data: `v${version}/lstm.json` })
            data.push({ title: 'BiLSTM', data: `v${version}/bilstm.json` })
            data.push({ title: 'CNN', data: `v${version}/cnn.json` })
        } else if (version === 1) {
            // SmartIntentNN V1
            data.push({ title: 'USE + LSTM', data: `v${version}/use-lstm.json` })
            data.push({ title: 'USE + BiLSTM', data: `v${version}/use-bilstm.json` })
            data.push({ title: 'USE + BiLSTM + Highlight (X2)', data: `v${version}/use-high-bilstm-x2.json` })
            data.push({ title: 'USE + BiLSTM + Highlight (X4)', data: `v${version}/use-high-bilstm-x4.json` })
            data.push({ title: 'USE + BiLSTM + Highlight (X16)', data: `v${version}/use-high-bilstm-x16.json` })
        } else if (version === 2) {
            // SmartIntentNN V2
            data.push({ title: 'SmartBERT + Dense', data: `v${version}/smartbert_dense.json` })
            data.push({ title: 'SmartBERT + CNN', data: `v${version}/smartbert_cnn.json` })
            data.push({ title: 'SmartBERT + LSTM', data: `v${version}/smartbert_lstm.json` })
            data.push({ title: 'SmartBERT + BiLSTM', data: `v${version}/smartbert_bilstm.json` })
        }

        return res.json({ title: data[index].title, data: $.loadJson(`${EVA_PATH}/${data[index].data}`) })
    } catch (e) {
        next(e)
    }
}

module.exports = { get, embedding, evaluate, intent, vulnerability }
