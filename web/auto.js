require('dotenv').config()
const isJSON = require('@stdlib/assert-is-json')
const md5 = require('md5')
const fs = require('fs')
const ROOT = require('app-root-path')
const { createParser } = require('eventsource-parser')
const solc = require('solc')
const fetch = require('node-fetch')
const CONF = require('../config/solidity.config')
const $ = require('../src/utils')
const CHAIN = require('../config/blockchain.json')

const API = process.env.UNIAI_API
const TOKEN = process.env.UNIAI_TOKEN
const MODEL = process.env.MODEL
const SUBMODEL = process.env.SUBMODEL

async function config(_, res) {
    try {
        const conf = CONF
        res.json({ status: 1, data: conf, msg: 'success to list config' })
    } catch (e) {
        console.error(e)
        res.json({ status: 0, msg: e.message })
    }
}

async function download(req, res, next) {
    try {
        const file = req.body.file
        const path = `${ROOT}/static/contract/${file}.sol`
        res.sendFile(path, { headers: { 'Content-Disposition': `attachment; filename="${file}.sol"` } })
    } catch (e) {
        console.error(e)
        next(e)
    }
}

async function generate(req, res) {
    try {
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        const { title, type, pragma, description, params } = req.body
        const chunk = req.body.chunk || false
        if (!title) throw new Error('no title')
        const content = `
            根据需求用Solidity写一份智能合约，要求给出完整功能的智能合约代码，保证代码可编译且可使用，在最后解释代码：
            - 头部加上注释协议：SPDX-License-Identifier: UNLICENSED
            - 智能合约编译版本 pragma：${pragma}
            - 智能合约名称：${title}，代码中用英文
            - 智能合约类别${type}
            - 智能合约主要功能需求，必须实现且可用：${description}
            - 以下是自定义的其他变量或函数，必须全部实现且可用：${JSON.stringify(params)}
        `

        const message = await $.post(
            `${API}/ai/chat-stream`,
            {
                prompts: [{ role: 'user', content }],
                chunk,
                model: MODEL,
                subModel: SUBMODEL,
                temperature: 0.85,
                top: 0.2
            },
            { responseType: 'stream', headers: { token: TOKEN } }
        )

        let cache
        const parser = createParser(e => {
            if (e.type === 'event') {
                if (!isJSON(e.data)) return
                const data = JSON.parse(e.data)
                res.write(`data: ${JSON.stringify(data)}\n\n`)
                cache = data
            }
        })
        message.on('data', buff => parser.feed(buff.toString()))
        message.on('end', () => {
            if (cache.status === 1) {
                const content = cache.data.content
                // write to file
                const code = $.mdCode(content)[0]
                const filename = md5(code)
                cache.data.file = filename
                cache.data.code = code
                fs.writeFileSync(`${ROOT}/static/contract/${filename}.sol`, code)
                fs.writeFileSync(`${ROOT}/static/contract/${filename}.md`, content)
                res.write(`data: ${JSON.stringify(cache)}\n\n`)
            }
            res.end()
        })
        message.on('error', e => res.write(`data: ${JSON.stringify({ status: 0, msg: e.message })}\n\n`).end())
    } catch (e) {
        console.error(e)
        res.write(`data: ${JSON.stringify({ status: 0, msg: e.message })}\n\n`).end()
    }
}

async function check(req, res) {
    try {
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        const { file } = req.body
        if (!file) throw new Error('No file id')
        const chunk = req.body.chunk || false
        const code = fs.readFileSync(`${ROOT}/static/contract/${file}.sol`)
        const content = `对以下智能合约代码进行检测：漏洞、恶意代码、命名规范、算法逻辑、语法、冗余代码\n如有问题，请给出优化建议，并给出优化方案\n待检测代码如下：\n${code}`
        const message = await $.post(
            `${API}/ai/chat-stream`,
            { prompts: [{ role: 'user', content }], chunk, model: MODEL, subModel: SUBMODEL },
            { responseType: 'stream', headers: { token: TOKEN } }
        )

        message.on('data', buff => res.write(buff))
        message.on('end', () => res.end())
        message.on('error', e => res.write(`data: ${JSON.stringify({ status: 0, msg: e.message })}\n\n`).end())
    } catch (e) {
        console.error(e)
        res.write(`data: ${JSON.stringify({ status: 0, msg: e.message })}\n\n`).end()
    }
}

async function compile(req, res) {
    try {
        const { file } = req.body
        const code = $.mdCode(req.body.code)[0]
        let content
        if (file) content = fs.readFileSync(`${ROOT}/static/contract/${file}.sol`, 'utf-8')
        if (code) content = code
        if (!content) throw new Error('Smart contract code is null')

        const version = content.match(/pragma\s+solidity\s+(\^\d+\.\d+\.\d+);/i)
        if (!version[1]) throw new Error('Can not detect smart contract pragma version')

        const list = JSON.parse(fs.readFileSync(`${ROOT}/config/solc.json`))
        const compileVersion = list.releases[version[1].replace('^', '').trim()]
        if (!compileVersion) throw new Error(`Can not find compiler version: ${version[1]}`)

        const compilerFile = `${ROOT}/static/solc/${compileVersion}`
        if (!fs.existsSync(compilerFile)) {
            // download compiler
            const response = await fetch(`${CONF.list}/bin/${compileVersion}`)
            const code = await response.text()
            if (code) fs.writeFileSync(`${ROOT}/static/solc/${compileVersion}`, code)
            else throw new Error(`Can not find compiler: ${compileVersion}`)
        }

        const compiler = solc.setupMethods(require(compilerFile))
        const input = {
            language: 'Solidity',
            sources: { 'contract.sol': { content } },
            settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } }
        }
        const output = JSON.parse(compiler.compile(JSON.stringify(input)))
        fs.writeFileSync(`${ROOT}/static/contract/${file}.json`, JSON.stringify(output))

        if (output.errors && output.errors.length) throw new Error(JSON.stringify(output.errors[0]))
        res.json({ status: 1, data: output, msg: `success compiled by ${compileVersion}` })
    } catch (e) {
        console.error(e)
        res.json({ status: 0, msg: e.message })
    }
}

async function deploy(req, res) {
    try {
        const abi = JSON.parse(req.body.abi)
        const bytecode = JSON.parse(req.body.bytecode)
        const params = JSON.parse(req.body.params)
        const chain = req.body.chain || 'lechain'
        if (chain === 'lechain') {
            const { lechain } = CHAIN

            const data = await $.post(`${lechain.rpc[0]}/contract/deploy`, {
                abiInfo: abi,
                bytecodeBin: bytecode.object,
                funcParam: params,
                groupId: lechain.groupId,
                user: lechain.user
            })
            res.json({ status: 1, data, msg: 'Deploy success' })
        } else throw new Error('Unrecognized blockchain')
    } catch (e) {
        console.error(e)
        res.json({ status: 0, msg: e.message })
    }
}

async function updateList(_, res) {
    try {
        const response = await fetch(`${CONF.list}/bin/list.json`)
        const text = await response.text()
        fs.writeFileSync(`${ROOT}/config/solc.json`, text)
        const list = JSON.parse(text)
        res.json({ status: 1, data: list, msg: 'Success to save list' })
    } catch (e) {
        console.error(e)
        res.json({ status: 0, msg: e.message })
    }
}

module.exports = { generate, config, download, check, compile, updateList, deploy }
