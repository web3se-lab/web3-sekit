const { embedAPI, tokenizeAPI } = require('../tf/utils')
const $ = require('../src/utils')

async function embed(req, res, next) {
    try {
        const code = req.body.code
        const type = req.body.type || 'solidity'
        const func = req.body.func || 'embeddingAvg'
        const tree = $.getCodeMap($.clearCode(code), type)
        const data = {}
        for (const i in tree) {
            data[i] = {}
            for (const j in tree[i]) data[i][j] = await embedAPI(tree[i][j], func)
        }
        res.json(data)
    } catch (e) {
        next(e)
    }
}

async function tokenize(req, res, next) {
    try {
        const code = req.body.code
        const type = req.body.type || 'solidity'
        const tree = $.getCodeMap($.clearCode(code), type)
        const data = {}
        for (const i in tree) {
            data[i] = {}
            for (const j in tree[i]) data[i][j] = await tokenizeAPI(tree[i][j])
        }
        res.json(data)
    } catch (e) {
        next(e)
    }
}

// generate tree
async function tree(req, res, next) {
    try {
        const code = req.body.code
        const type = req.body.type || 'solidity'
        const data = $.getCodeMap($.clearCode(code), type)
        res.json(data)
    } catch (e) {
        next(e)
    }
}

module.exports = { embed, tokenize, tree }
