const ROOT = require('app-root-path')
const $data = require('../db/data')
const $contract = require('../db/contract')
const { embed } = require('../tf/modules/embedding')
const { embedAPI } = require('../tf/utils')
const $ = require('../src/utils')
const Model = require('../tf/v2/model')

const EVA_PATH = `${ROOT}/tf/evaluates`
const nn = new Model('smartbert_bilstm_js')

// get code content from DB
async function get(req, res) {
    try {
        const key = req.body?.key || req.query?.key
        let data
        const attrs = ['Id', 'ContractName', 'ContractAddress', 'Network', 'SourceCode', 'CompilerVersion']
        if (!key) data = { maxId: await $contract.maxId(), count: await $contract.count() }
        else if (key.substr(0, 2) === '0x') data = await $contract.findOneByAddress(key, attrs)
        else data = await $contract.findOneByPk(key, attrs)
        if (!data) throw new Error(`${key} not found`)
        const type = data.CompilerVersion.includes('vyper') ? 'vyper' : 'solidity'
        res.send({
            Type: type,
            CodeTree: $.getCodeMap($.clearCode($.multiContracts(data.SourceCode), type), type),
            ...data.dataValues
        })
    } catch (e) {
        console.error(e)
        return res.code(500).send({ error: e.message })
    }
}

// smart contract to embedding
async function embedding(req, res) {
    try {
        const text = req.body?.text
        const type = req.body?.type || 'solidity'
        res.send({ Embedding: await embed($.getCodeMap($.clearCode($.multiContracts(text), type), type)) })
    } catch (e) {
        console.error(e)
        return res.code(500).send({ error: e.message })
    }
}

// get code with risk array
async function intent(req, res) {
    try {
        const key = req.body?.key || req.query?.key
        const data = await $data.getSourceCodeScam(key)
        if (!data) throw new Error(`${key} not found`)
        return res.send(data)
    } catch (e) {
        console.error(e)
        return res.code(500).send({ error: e.message })
    }
}

async function vulnerability(req, res) {
    try {
        const key = req.body?.key || req.query?.key
        const data = await $data.getSourceCodeVulnerability(key)
        if (!data) throw new Error(`${key} not found`)
        return res.send(data)
    } catch (e) {
        console.error(e)
        return res.code(500).send({ error: e.message })
    }
}

async function predict(req, res) {
    try {
        const starttime = Date.now()
        if (!nn.mymodel) await nn.loadModel()
        const code = req.body.code
        const type = req.body.type || 'solidity'
        const tree = $.getCodeMap($.clearCode($.multiContracts(code), type), type)
        const data = []
        for (const i in tree) for (const j in tree[i]) tree[i][j] = data.push(tree[i][j]) - 1
        const result = await embedAPI(data)

        const xs = [result]
        const tx = nn.tf.tensor(nn.padding(xs))
        const yp = (await nn.mymodel.executeAsync(tx)).arraySync()
        const results = []
        for (const i in yp)
            for (const j in yp[i])
                for (const k in nn.TYPE) if (nn.TYPE[k] == j) results.push({ type: k, score: yp[i][j] })

        return res.send({ results })
    } catch (e) {
        console.error(e)
        return res.code(500).send({ error: e.message })
    }
}

// get evaluation result data
async function evaluate(req, res) {
    try {
        const index = req.body?.index || req.query?.index || 0
        const version = parseInt(req.body?.version || req.query?.version)
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
            data.push({ title: 'USE + LSTM + Highlight (X2)', data: `v${version}/use-high-lstm-x2.json` })
            data.push({ title: 'USE + BiLSTM + Highlight (X2)', data: `v${version}/use-high-bilstm-x2.json` })
            data.push({ title: 'USE + BiLSTM + Highlight (X4)', data: `v${version}/use-high-bilstm-x4.json` })
            data.push({ title: 'USE + BiLSTM + Highlight (X16)', data: `v${version}/use-high-bilstm-x16.json` })
        } else if (version === 2) {
            // SmartIntentNN V2
            data.push({ title: 'SmartBERT + LSTM', data: `v${version}/smartbert_lstm_js.json` })
            data.push({ title: 'SmartBERT + BiLSTM', data: `v${version}/smartbert_bilstm_js.json` })
        }

        if (!data[index]) return res.send(null)
        return res.send({ title: data[index].title, data: $.loadJson(`${EVA_PATH}/${data[index].data}`) })
    } catch (e) {
        console.error(e)
        return res.code(500).send({ error: e.message })
    }
}

module.exports = { get, embedding, evaluate, intent, vulnerability, predict }
