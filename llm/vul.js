// find vulnerabilities in smart contracts
require('dotenv').config()
const ROOT = require('app-root-path')
const UniAI = require('uniai').default
const { readFileSync, writeFileSync } = require('fs')
const { ChatModelProvider, ChatModel, ChatRoleEnum } = require('uniai')
const $data = require('../db/data')
const $vul = require('../db/vulnerability')
const $ = require('./util')
const { OPENAI_KEY, OPENAI_API, GLM_API, ZHIPU_AI_KEY } = process.env

const ai = new UniAI({ OpenAI: { key: OPENAI_KEY, proxy: OPENAI_API }, GLM: { local: GLM_API, key: ZHIPU_AI_KEY } })

/**
 * Agent: Detect vulnerabilities by LLM
 * @param {number} id - PK
 */
async function detect(id, provider = ChatModelProvider.GLM, model = ChatModel.GLM_9B) {
    const system = `
You are a smart contract security expert, your task is to detect, locate, and repair vulnerabilities in smart contracts.

A smart contract may have one or more of the following vulnerabilities:
- Timestamp Dependency (TP)
- Reentrancy (RE)
- Integer Overflow/Underflow (IO)
- Dangerous delegatecall (DE)

To effectively address and fix all vulnerabilities, follow this three-step instructions:
1. **Detect**: Check for any vulnerabilities based on provided criteria and categorize them.
2. **Locate**: Pinpoint the exact location of the vulnerabilities in the code, include the vulnerable code snippet, and briefly explain the issue.
3. **Repair**: Fix the identified vulnerabilities and provide the corrected code.

`

    const data = await $data.getSourceCodeVulnerability(id)
    if (!data) throw new Error('Not found')

    const input = [
        { role: ChatRoleEnum.SYSTEM, content: `${system}\nSmart Contract:\n${data.sourceCode}` },
        { role: ChatRoleEnum.USER, content: `Detect` }
        // { role: ChatRoleEnum.ASSISTANT, content: JSON.stringify(data.vulnerability) },
        // { role: ChatRoleEnum.USER, content: `Locate` }
    ]

    const res = await ai.chat(input, { provider, model })
    console.log(res)
    console.log(data.vulnerability)

    return {
        vulId: data.vulId,
        contractId: data.contractId,
        contract: data.codeTree,
        result: $.extractJSON(res.content),
        truth: data.vulnerability
    }
}

const map = {
    // 'block number dependency': { TP: 0, TN: 0, FP: 0, FN: 0 },
    // 'ether frozen': { TP: 0, TN: 0, FP: 0, FN: 0 },
    // 'ether strict equality': { TP: 0, TN: 0, FP: 0, FN: 0 },
    // 'unchecked external call': { TP: 0, TN: 0, FP: 0, FN: 0 }
    'dangerous delegatecall': { TP: 0, TN: 0, FP: 0, FN: 0 },
    'integer overflow': { TP: 0, TN: 0, FP: 0, FN: 0 },
    reentrancy: { TP: 0, TN: 0, FP: 0, FN: 0 },
    'timestamp dependency': { TP: 0, TN: 0, FP: 0, FN: 0 }
}

async function evaluate() {
    const text = readFileSync(`${ROOT}/llm/data/dev.jsonl`, 'utf-8')
    const json = JSON.parse(text)
    for (const item of json) {
        const [system, user, assitant] = item.messages
        const res = await ai.chat([system, user], { provider: ChatModelProvider.GLM, model: ChatModel.GLM_9B })
        const y1 = Object.keys(JSON.parse(res.content))
        const y2 = Object.keys(JSON.parse(assitant.content))
        console.log('predict', y1)
        console.log('truth', y2)
        for (const i in map) {
            if (y1.includes(i) && y2.includes(i)) map[i].TP++
            if (y1.includes(i) && !y2.includes(i)) map[i].FP++
            if (!y1.includes(i) && y2.includes(i)) map[i].FN++
            if (!y1.includes(i) && !y2.includes(i)) map[i].TN++
        }
        console.log(map)
    }
}

async function jsonData() {
    // structure train data set
    const max = await $vul.maxId()
    const json1 = {} // push vulnerable data
    const json2 = {} // push empty data

    for (let id = 1; id <= max; id++) {
        const data = await $data.getSourceCodeVulnerability(id)
        if (!data) continue

        const { vulnerability, detail, repair, dir } = data

        if (!Object.keys(map).includes(dir)) continue

        if (vulnerability) {
            if (!json1[dir]) json1[dir] = []
            const messages = [
                { role: ChatRoleEnum.SYSTEM, content: data.sourceCode },
                { role: ChatRoleEnum.USER, content: `Detect` },
                { role: ChatRoleEnum.ASSISTANT, content: JSON.stringify(vulnerability) },
                { role: ChatRoleEnum.USER, content: `Locate` },
                { role: ChatRoleEnum.ASSISTANT, content: detail },
                { role: ChatRoleEnum.USER, content: `Repair` },
                { role: ChatRoleEnum.ASSISTANT, content: repair }
            ]
            json1[dir].push({ messages })
        } else {
            if (!json2[dir]) json2[dir] = []
            const messages = [
                { role: ChatRoleEnum.SYSTEM, content: data.sourceCode },
                { role: ChatRoleEnum.USER, content: `Detect` },
                { role: ChatRoleEnum.ASSISTANT, content: JSON.stringify([]) },
                { role: ChatRoleEnum.USER, content: `Locate` },
                { role: ChatRoleEnum.ASSISTANT, content: `No vulnerabilities` },
                { role: ChatRoleEnum.USER, content: `Repair` },
                { role: ChatRoleEnum.ASSISTANT, content: `No vulnerabilities` }
            ]
            json2[dir].push({ messages })
        }
    }

    // Split dataset to train adn evaluate
    const train = []
    const test = []

    // Split 80% of data for each key for training, and 20% for evaluation
    for (const key in json1) {
        const dataList = json1[key]
        const dataList2 = $.getRandomElements(json2[key], Math.floor(dataList.length * 0.2))
        const cutoff = Math.floor(dataList.length * 0.8)
        const cutoff2 = Math.floor(dataList2.length * 0.8)
        const slice1 = dataList.slice(0, cutoff).concat(dataList2.slice(0, cutoff2))
        const slice2 = dataList.slice(cutoff).concat(dataList2.slice(cutoff2))

        console.log(key)
        console.log('total', dataList.length + dataList2.length)
        console.log('train', slice1.length)
        console.log('test', slice2.length)
        console.log('empty', dataList2.length)
        console.log()
        train.push(...slice1)
        test.push(...slice2)
    }

    // calculate empty vulnerability data
    const empty = JSON.stringify([])
    console.log('Empty/Train data', `${train.filter(v => v.messages[2].content === empty).length}/${train.length}`)
    console.log('Empty/Test data', `${test.filter(v => v.messages[2].content === empty).length}/${test.length}`)

    // Write the train and eval data to separate JSON files
    writeFileSync(`${ROOT}/llm/data/train.jsonl`, JSON.stringify(train))
    writeFileSync(`${ROOT}/llm/data/dev.jsonl`, JSON.stringify(test))
}

async function markdown(file, index) {
    const text = readFileSync(`${ROOT}/llm/data/${file}.jsonl`, 'utf-8')
    const json = JSON.parse(text)
    const data = json[index]
    let md = ``
    md += `## Contract\n\n\`\`\`solidity\n${data.messages[0].content}\n\`\`\`\n`
    md += `## Vulnerability\n\n\`\`\`json\n${data.messages[2].content}\n\`\`\`\n`
    md += `## Detail\n\n\`\`\`json\n${data.messages[4].content}\n\`\`\`\n`
    writeFileSync(`${ROOT}/llm/md/${file}-${index}.md`, md)
}

if (process.argv[1].includes('llm/vul')) {
    // argv 2 is contract id
    if (process.argv[2] == 'detect') detect(process.argv[3])
    if (process.argv[2] == 'evaluate') evaluate()
    if (process.argv[2] == 'json-data') jsonData()
    if (process.argv[2] == 'md-data') markdown(process.argv[3], process.argv[4])
}

module.exports = { detect }
