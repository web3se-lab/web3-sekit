const { findOneByPk, findOneByAddress, count, maxId } = require('../db/contract')
const $ = require('../src/utils')

async function get(request, reply) {
    try {
        const key = request.body?.key || request.query?.key
        if (!key) return reply.send({ maxId: await maxId(), count: await count() })

        const attrs = ['Id', 'ContractName', 'ContractAddress', 'Network', 'SourceCode', 'CompilerVersion']
        let data
        if (!data) data = await findOneByAddress(key, attrs)
        if (!data) data = await findOneByPk(key, attrs)
        const type = data.CompilerVersion.includes('vyper') ? 'vyper' : 'solidity'
        data.dataValues.codeTree = $.getCodeMap($.clearCode($.multiContracts(data.SourceCode), type), type)
        return reply.send(data.dataValues)
    } catch (e) {
        console.error(e)
        return reply.code(500).send({ error: e.message })
    }
}

module.exports = { get }
