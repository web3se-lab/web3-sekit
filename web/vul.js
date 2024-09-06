const $vul = require('../llm/vul')

async function detect(req, res, next) {
    try {
        const id = req.body.id
        const provider = req.body.provider
        const model = req.body.model
        const data = await $vul.detect(id, provider, model)
        return res.json(data)
    } catch (e) {
        next(e)
    }
}

module.exports = { detect }
