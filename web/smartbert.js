const { embedAPI, tokenizeAPI } = require('../tf/utils')
const $ = require('../src/utils')

async function embed(req, res, next) {
    try {
        const code = req.body.code
        const type = req.body.type || 'solidity'
        const pool = req.body.pool || 'avg'
        const tree = $.getCodeMap($.clearCode($.multiContracts(code), type), type)

        const data = []
        for (const i in tree) for (const j in tree[i]) tree[i][j] = data.push(tree[i][j]) - 1
        const result = await embedAPI(data, pool)
        for (const i in tree) for (const j in tree[i]) tree[i][j] = result[tree[i][j]]

        res.json(tree)
    } catch (e) {
        next(e)
    }
}

async function tokenize(req, res, next) {
    try {
        const code = req.body.code
        const type = req.body.type || 'solidity'
        const tree = $.getCodeMap($.clearCode($.multiContracts(code), type), type)

        const data = []
        for (const i in tree) for (const j in tree[i]) tree[i][j] = data.push(tree[i][j]) - 1
        const result = await tokenizeAPI(data)
        for (const i in tree) for (const j in tree[i]) tree[i][j] = result[tree[i][j]]

        res.json(tree)
    } catch (e) {
        next(e)
    }
}

// generate tree
async function tree(req, res, next) {
    try {
        const code = req.body.code
        const type = req.body.type || 'solidity'
        const data = $.getCodeMap($.clearCode($.multiContracts(code), type), type)
        res.json(data)
    } catch (e) {
        next(e)
    }
}

module.exports = { embed, tokenize, tree }
