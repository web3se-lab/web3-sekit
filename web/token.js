const { findOneByPk, findOneByAddress, count, maxId } = require('../src/getToken')

async function get(req, res, next) {
    try {
        const key = req.body.key
        let data
        if (!key) data = { maxId: await maxId(), count: await count() }
        else if (key.substr(0, 2) === '0x') data = await findOneByAddress(key)
        else data = await findOneByPk(key)
        if (!data) throw new Error(`${key} not found`)
        res.json(data)
    } catch (e) {
        next(e)
    }
}

module.exports = { get }
