const { findOneByPk, findOneByAddress } = require('../db/contract')

async function get(request, reply) {
    try {
        const key = request.body?.key || request.query?.key
        const attrs = ['Id', 'ContractName', 'ContractAddress', 'Network', 'SourceCode', 'CompilerVersion', 'ABI']
        let data
        if (!data) data = await findOneByAddress(key, attrs)
        if (!data) data = await findOneByPk(key, attrs)
        return reply.send(data)
    } catch (e) {
        console.error(e)
        return reply.code(500).send({ error: e.message })
    }
}

module.exports = { get }
