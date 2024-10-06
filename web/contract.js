const { findOneByPk, findOneByAddress } = require('../db/contract')

async function get(req, res, next) {
    try {
        const key = req.body.key
        const attrs = ['Id', 'ContractName', 'ContractAddress', 'Network', 'SourceCode', 'CompilerVersion', 'ABI']
        let data
        if (!data) data = await findOneByAddress(key, attrs)
        if (!data) data = await findOneByPk(key, attrs)
        res.json(data)
    } catch (e) {
        next(e)
    }
}

module.exports = { get }
