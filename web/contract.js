const { findOneByPk, findOneByAddress, count, maxId } = require('../db/contract')

async function get(req, res, next) {
    try {
        const key = req.body.key
        const attrs = ['Id', 'ContractName', 'ContractAddress', 'Network', 'SourceCode', 'CompilerVersion', 'ABI']
        let data
        if (!key) data = { maxId: await maxId(), count: await count() }
        else if (key.substr(0, 2) === '0x') data = await findOneByAddress(key, attrs)
        else data = await findOneByPk(key, attrs)
        if (!data) throw new Error(`${key} not found`)
        res.json(data)
    } catch (e) {
        next(e)
    }
}

module.exports = { get }
