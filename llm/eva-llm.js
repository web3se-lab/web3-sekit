// gpt_experiment.js
require('dotenv').config()
const fs = require('fs')
const axios = require('axios')
const path = require('path')
const UniAI = require('uniai').default

const { OPENAI_API, OPENAI_KEY } = process.env

// prompt.md
const fileContent = fs.readFileSync(path.join(__dirname, './instruct/intent-eva.md'), 'utf-8')

// 风险类型
const riskTypes = [
    'fee',
    'disabletrading',
    'blacklist',
    'reflect',
    'maxtx',
    'mint',
    'honeypot',
    'reward',
    'rebase',
    'maxsell'
]

// ================== Step 1: 拉取数据 ================== //
async function fetchData(key) {
    try {
        const url = `http://localhost:8081/data/intent?key=${key}`
        const res = await axios.get(url)
        const data = res.data

        if (data.sourceCode && data.risk) {
            console.log(`Key ${key}:`)

            const riskPresence = {}
            riskTypes.forEach(r => (riskPresence[r] = 0))
            const riskTypesList = []

            for (const risk of data.risk) {
                const type = risk.type.toLowerCase()
                if (Object.prototype.hasOwnProperty.call(riskPresence, type)) {
                    riskPresence[type] = 1
                    riskTypesList.push(type)
                }
            }

            const riskPresenceArray = riskTypes.map(r => riskPresence[r])
            console.log('Real Ans:', riskTypesList)
            console.log('Real Ans Array:', riskPresenceArray)

            return [key, riskTypesList, riskPresenceArray, data.sourceCode]
        }
    } catch (err) {
        console.error(`Request failed for key ${key}:`, err.message)
    }
    return null
}

// ================== Step 2: GPT 请求 ================== //
async function sendToChatApi(sourceCode) {
    const ai = new UniAI({
        OpenAI: { proxy: OPENAI_API, key: OPENAI_KEY }
    })
    const message = [
        { role: 'system', content: fileContent },
        { role: 'user', content: sourceCode }
    ]

    try {
        const res = await ai.chat(message, {
            provider: 'openai',
            model: 'gpt-4.1',
            stream: false,
            top: 0.5,
            maxLength: 4096
        })
        let content = res.content
        console.log('GPT JSON:', res)

        content = content.replace(/```json\n|```/g, '') // 清理格式

        let contentJson
        try {
            contentJson = JSON.parse(content)
        } catch (e) {
            console.error('JSON parse error:', e.message)
            contentJson = []
        }

        let intents
        if (Array.isArray(contentJson)) {
            intents = contentJson
        } else if (contentJson.intents) {
            intents = contentJson.intents
        } else {
            intents = []
        }

        console.log('GPT Response:', intents)
        const intentsLower = intents.map(i => i.toLowerCase())
        const riskTypesArray = riskTypes.map(r => (intentsLower.includes(r) ? 1 : 0))
        console.log('GPT Response Array:', riskTypesArray)

        return [res, intents, riskTypesArray]
    } catch (err) {
        console.error('Request failed:', err.message)
        return [{}, [], Array(riskTypes.length).fill(0)]
    }
}

// ================== Step 3: 保存结果 ================== //
function saveToJson(key, realAns, realAnsArray, gptJson, gptResponse, gptResponseArray) {
    const result = {
        Key: key,
        'Real Ans': realAns,
        'Real Ans Array': realAnsArray,
        'GPT JSON': gptJson,
        'GPT Response': gptResponse,
        'GPT Response Array': gptResponseArray
    }

    const filename = `data_key_${key}.json`
    fs.writeFileSync(path.join(__dirname, './experiment', filename), JSON.stringify(result, null, 2), 'utf-8')
    console.log(`Data for key ${key} saved to ${filename}\n`)
    return result
}

// ================== Step 4: 进度条 ================== //
function printProgressBar(iteration, total, length = 50) {
    const percent = ((iteration / total) * 100).toFixed(1)
    const filledLength = Math.floor((length * iteration) / total)
    const bar = '█'.repeat(filledLength) + '-'.repeat(length - filledLength)
    process.stdout.write(`\rProgress: |${bar}| ${percent}% Complete`)
    if (iteration === total) process.stdout.write('\n')
}

// ================== Step 5: 主程序 ================== //
async function main() {
    const startKey = 20000
    const targetCount = 10000
    const concurrency = 5
    let currentKey = startKey
    let finished = 0
    const allData = []

    // 生成下一个key
    function getNextKey() {
        if (finished + inProgress.length >= targetCount) return null
        return currentKey++
    }

    // 包装fetchData和sendToChatApi，带重试
    async function processKey(key) {
        // 检查data_key_${key}.json的GPT JSON字段
        const filePath = path.join(__dirname, './experiment', `data_key_${key}.json`)
        if (fs.existsSync(filePath)) {
            try {
                const fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
                if (fileData['GPT JSON'] !== '') {
                    // 已有有效结果，跳过
                    allData.push(fileData)
                    return null
                }
            } catch (e) {
                // 文件损坏或解析失败，继续处理
            }
        }
        let result = await fetchData(key)
        if (!result) {
            // retry once
            result = await fetchData(key)
            if (!result) return null
        }
        const [k, realAns, realAnsArray, sourceCode] = result
        let gptJson, gptResponse, gptResponseArray
        ;[gptJson, gptResponse, gptResponseArray] = await sendToChatApi(JSON.stringify(sourceCode))
        // gpt失败重试一次
        if (!gptResponse || gptResponse.length === 0) {
            ;[gptJson, gptResponse, gptResponseArray] = await sendToChatApi(JSON.stringify(sourceCode))
        }
        const record = saveToJson(k, realAns, realAnsArray, gptJson, gptResponse, gptResponseArray)
        return record
    }

    // 并发窗口
    const inProgress = []
    async function runner() {
        while (finished < targetCount) {
            while (inProgress.length < concurrency && finished + inProgress.length < targetCount) {
                const key = getNextKey()
                if (key === null) break
                const p = (async () => {
                    const record = await processKey(key)
                    if (record) {
                        allData.push(record)
                    }
                    finished++
                    printProgressBar(finished, targetCount)
                })().finally(() => {
                    // 移除已完成的promise
                    const idx = inProgress.indexOf(p)
                    if (idx > -1) inProgress.splice(idx, 1)
                })
                inProgress.push(p)
            }
            // 等待任意一个完成
            if (inProgress.length > 0) {
                await Promise.race(inProgress)
            }
        }
        // 等待所有剩余任务完成
        await Promise.all(inProgress)
        fs.writeFileSync(path.join(__dirname, 'gpt_experiment.json'), JSON.stringify(allData, null, 2))
        console.log('All data saved to gpt_experiment.json')
    }
    await runner()
}

// 执行
main()
