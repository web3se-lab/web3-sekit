const $vul = require('../llm/vul')

async function detect(request, reply) {
    try {
        // Get data from body (POST) or query (GET)
        const id = request.body?.id || request.query?.id
        const provider = request.body?.provider || request.query?.provider
        const model = request.body?.model || request.query?.model
        const data = await $vul.detect(id, provider, model)
        return reply.send(data)
    } catch (e) {
        console.error(e)
        return reply.code(500).send({ error: e.message })
    }
}

module.exports = { detect }
