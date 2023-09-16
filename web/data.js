const ROOT = require('app-root-path')
const $data = require('../db/data')
const $vul = require('../db/vulnerability')
const type = require('./type')
const { findOneByPk, findOneByAddress, count, maxId } = require('../db/contract')
const { embed } = require('../tf/modules/embedding')
const $ = require('../src/utils')

const EVA_PATH = `${ROOT}/tf/evaluates`

// get code content from DB
async function get(req, res, next) {
    try {
        const key = req.body.key
        let data
        const attrs = ['Id', 'ContractName', 'ContractAddress', 'Network', 'SourceCode', 'CompilerVersion', 'ABI']
        if (!key) data = { maxId: await maxId(), count: await count() }
        else if (key.substr(0, 2) === '0x') data = await findOneByAddress(key, attrs)
        else data = await findOneByPk(key, attrs)
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
        const data = await $vul.findOneByPk(key)
        if (!data) throw new Error(`${key} not found`)
        return res.json({
            data: data.SourceCode,
            label: type.vulnerability[data.Vulnerability],
            vulnerability: data.Vulnerability
        })
    } catch (e) {
        next(e)
    }
}

// get evaluation result data
async function evaluate(_, res, next) {
    try {
        const data = [
            {
                title: 'LSTM',
                data: $.loadJson(`${EVA_PATH}/lstm.json`)
            },
            {
                title: 'BiLSTM',
                data: $.loadJson(`${EVA_PATH}/bilstm.json`)
            },
            {
                title: 'CNN',
                data: $.loadJson(`${EVA_PATH}/cnn.json`)
            },
            {
                title: 'SmartBERT + Feedforward',
                data: $.loadJson(`${EVA_PATH}/smartbert_dense.json`)
            },
            {
                title: 'SmartBERT + LSTM',
                data: $.loadJson(`${EVA_PATH}/smartbert_lstm.json`)
            },
            {
                title: 'SmartBERT + BiLSTM',
                data: $.loadJson(`${EVA_PATH}/smartbert_bilstm.json`)
            },
            {
                title: 'SmartBERT + CNN',
                data: $.loadJson(`${EVA_PATH}/smartbert_cnn.json`)
            },
            {
                title: 'SmartBERT + Highlight + CNN',
                data: $.loadJson(`${EVA_PATH}/smartbert_high_cnn.json`)
            }
        ]
        return res.json(data)
    } catch (e) {
        next(e)
    }
}

module.exports = { get, embedding, evaluate, intent, vulnerability }
