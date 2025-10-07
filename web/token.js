const { findOneByPk, findOneByAddress, count, maxId } = require('../src/getToken')

async function get(request, reply) {
    try {
        // Get data from body (POST) or query (GET)
        const key = request.body?.key || request.query?.key
        let data
        if (!key) data = { maxId: await maxId(), count: await count() }
        else if (key.substr(0, 2) === '0x') data = await findOneByAddress(key)
        else data = await findOneByPk(key)
        if (!data) throw new Error(`${key} not found`)
        return reply.send(data)
    } catch (e) {
        console.error(e)
        return reply.code(500).send({ error: e.message })
    }
}

module.exports = { get }
