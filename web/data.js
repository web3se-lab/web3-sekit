const ROOT = require('app-root-path')
const $data = require('../src/getData')
const $ = require('../src/utils')

const EVA_PATH = `${ROOT}/tf/evaluates`

async function sourceCodeRisk(req, res, next) {
    try {
        const key = req.query.key // key is for token table
        const data = await $data.getSourceCodeScam(key)
        if (!data) return res.sendStatus(404)
        return res.json({ ...data })
    } catch (e) {
        next(e)
    }
}

// return evaluation data
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

module.exports = { sourceCodeRisk, evaluate }
