// find vulnerabilities in smart contracts
require('dotenv').config()
const ROOT = require('app-root-path')
const UniAI = require('uniai').default
const { readFileSync, writeFileSync } = require('fs')
const { ChatModelProvider, ChatModel, ChatRoleEnum } = require('uniai')
const $data = require('../db/data')
const $ = require('./util')
const { OPENAI_KEY, OPENAI_API, GLM_API, ZHIPU_AI_KEY } = process.env

const ai = new UniAI({ OpenAI: { key: OPENAI_KEY, proxy: OPENAI_API }, GLM: { local: GLM_API, key: ZHIPU_AI_KEY } })

/**
 * Agent: Detect vulnerabilities by LLM
 * @param {number} id - PK
 */
async function detect(id, provider = ChatModelProvider.GLM, model = ChatModel.GLM_9B) {
    const system = `
    As a smart contract security expert, your task is to detect, locate, explain, and repair vulnerabilities in smart contracts.
    
    A smart contract may have one or more of the following vulnerabilities:
    - Timestamp Dependency (TP)
    - Reentrancy (RE)
    - Integer Overflow/Underflow (IO)
    - Dangerous delegatecall (DE)
    
    To effectively address all vulnerabilities, follow this three-step approach:
    1. **Detection**: Check for any vulnerabilities based on provided criteria and categorize them.
    2. **Identification**: Pinpoint the exact location of the vulnerabilities in the code, include the vulnerable code snippet, and briefly explain the issue.
    3. **Repair**: Fix the identified vulnerabilities and provide the corrected code.
    
    Output in JSON format, including the following three fields:
      1. vulnerabilities: An array of vulernabilities;
      2. detail: The vulnerable code snippet and explanation of vunerabilities;
      3. repair: fixed function code snippets.
    
    If no vulnerabilities are found, return: 
    {
        "vulnerabilities": [],
        "detail": null,
        "repair": null
    }
    `

    const data = await $data.getSourceCodeVulnerability(id)
    if (!data) throw new Error('Not found')

    const input = [{ role: ChatRoleEnum.SYSTEM, content: system }]
    input.push({ role: ChatRoleEnum.USER, content: data.sourceCode })

    const res = await ai.chat(input, { provider, model, top: 0 })
    console.log(res)

    return {
        vulId: data.vulId,
        contractId: data.contractId,
        contract: data.codeTree,
        result: $.extractJSON(res.content),
        truth: data.vulnerability
    }
}

async function jsonData() {
    const system = `
As a smart contract security expert, your task is to detect, locate, explain, and repair vulnerabilities in smart contracts.

A smart contract may have one or more of the following vulnerabilities:
- Timestamp Dependency (TP)
- Reentrancy (RE)
- Integer Overflow/Underflow (IO)
- Dangerous delegatecall (DE)

To effectively address all vulnerabilities, follow this three-step approach:
1. **Detection**: Check for any vulnerabilities based on provided criteria and categorize them.
2. **Identification**: Pinpoint the exact location of the vulnerabilities in the code, include the vulnerable code snippet, and briefly explain the issue.
3. **Repair**: Fix the identified vulnerabilities and provide the corrected code.

Output in JSON format, including the following three fields:
  1. vulnerabilities: An array of vulernabilities;
  2. detail: The vulnerable code snippet and explanation of vunerabilities;
  3. repair: fixed function code snippets.

If no vulnerabilities are found, return: 
{
    "vulnerabilities": [],
    "detail": null,
    "repair": null
}
`

    const json = {}
    for (let id = 1; id < 2600; id++) {
        const data = await $data.getSourceCodeVulnerability(id)
        if (!data) continue

        const { vulnerability, detail, repair, dir } = data
        let index = ''
        if (dir === 'timestamp dependency') index = 'TP'
        if (dir === 'reentrancy') index = 'RE'
        if (dir === 'integer overflow') index = 'IO'
        if (dir === 'dangerous delegatecall ') index = 'DE'

        const output = { vulnerabilities: vulnerability ? Object.keys(vulnerability) : [], detail, repair }

        if (!json[index]) json[index] = []
        // const result = await compData(data.sourceCode, JSON.stringify(output))
        const messages = [
            { role: ChatRoleEnum.SYSTEM, content: system },
            { role: ChatRoleEnum.USER, content: data.sourceCode },
            { role: ChatRoleEnum.ASSISTANT, content: JSON.stringify(output) }
        ]
        json[index].push({ messages })
    }
    writeFileSync(`${ROOT}/llm/data/data.json`, JSON.stringify(json))

    // Split dataset to train adn evaluate
    const trainData = []
    const evalData = []

    // Extract 80% of data for each key for training, and 20% for evaluation
    for (const key in json) {
        const dataList = json[key]
        const cutoff = Math.floor(dataList.length * 0.8)
        trainData.push(...dataList.slice(0, cutoff))
        evalData.push(...dataList.slice(cutoff))
    }

    // Write the train and eval data to separate JSON files
    writeFileSync(`${ROOT}/llm/data/train.json`, JSON.stringify(trainData))
    writeFileSync(`${ROOT}/llm/data/dev.json`, JSON.stringify(evalData))
}

async function markdown(file, index) {
    const text = readFileSync(`${ROOT}/llm/data/${file}.json`, 'utf-8')
    const json = JSON.parse(text)
    const data = json[index]
    const res = $.extractJSON(data.messages[2].content)
    let md = ``
    md += `# Repair ${res.vulnerabilities}\n`
    md += `## Detail\n${res.detail}\n\n`
    md += `## Repair\n${res.repair}\n\n`
    md += `# Contract\n\n\`\`\`solidity\n${data.messages[1].content}\n\`\`\``
    writeFileSync(`${ROOT}/llm/md/${file}-${index}.md`, md)
}

if (process.argv[1].includes('llm/vul')) {
    // argv 2 is contract id
    if (process.argv[2] == 'detect') detect(process.argv[3])
    if (process.argv[2] == 'json-data') jsonData()
    if (process.argv[2] == 'md-data') markdown(process.argv[3], process.argv[4])
}

module.exports = { detect }
