const { findOneByPk, findOneByAddress, count, maxId } = require('../src/getContract')

async function get(req, res, next) {
    try {
        const key = req.query.keyword
        let data
        if (!key) data = { maxId: await maxId(), count: await count() }
        else if (key.substr(0, 2) === '0x') data = await findOneByAddress(key)
        else data = await findOneByPk(key)
        res.json(data)
    } catch (e) {
        next(e)
    }
}

module.exports = { get }
