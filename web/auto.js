require('dotenv').config()
const $ = require('../src/utils')
const API = process.env.UNIAI_API
const TOKEN = process.env.UNIAI_TOKEN
const CONF = {
    contractType: ['contract', 'library', 'abstract contract', 'interface'],
    paramType: ['variable', 'function', 'event', 'modifier', 'constructor']
}

async function config(_, res, next) {
    try {
        const conf = CONF
        res.json(conf)
    } catch (e) {
        console.error(e)
        next(e)
    }
}

async function generate(req, res, next) {
    try {
        const { title, type, description, params } = req.body
        const model = req.body.model || 'GPT'
        const subModel = req.body.subModel || 'gpt-turbo-3.5'
        const chunk = req.body.chunk || false
        const content = `
        请根据要求用solidity写一份智能合约，分成两段，上半段为代码，下半段为对代码的解释：
            1. 智能合约名称: ${title}，用英文；
            2. 智能合约种类：${type}；
            2. 智能合约功能需求：${description}；
            3. 要求智能合约包含如下自定义变量：${JSON.stringify(params)}
        `
        console.log(content)
        const message = await $.post(
            `${API}/ai/chat-stream`,
            {
                prompts: [{ role: 'user', content }],
                temperature: 0.9,
                chunk,
                model,
                subModel
            },
            {
                responseType: 'stream',
                headers: { token: TOKEN }
            }
        )

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        message.on('data', buff => res.write(buff.toString()))
        message.on('close', () => res.end())
    } catch (e) {
        console.error(e)
        next(e)
    }
}
module.exports = { generate, config }
