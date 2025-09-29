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
        const tokens = {
            totalTokens: res.totalTokens || 0,
            promptTokens: res.promptTokens || 0,
            completionTokens: res.completionTokens || 0
        }

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

        return [res, intents, riskTypesArray, tokens]
    } catch (err) {
        console.error('Request failed:', err.message)
        return [{}, [], Array(riskTypes.length).fill(0), { totalTokens: 0, promptTokens: 0, completionTokens: 0 }]
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

// ================== 测试100份并发时间 ================== //
async function test100Concurrent() {
    console.log('================ 开始100份并发测试 ================')
    const testStartTime = Date.now()
    const startKey = 20000
    const testCount = 100
    const concurrency = 100
    let currentKey = startKey
    let finished = 0
    const testData = []

    // 生成下一个key
    function getNextKey() {
        if (finished + inProgress.length >= testCount) return null
        return currentKey++
    }

    // 简化的处理函数，只做请求不保存文件
    async function processKeyTest(key) {
        let result = await fetchData(key)
        if (!result) {
            result = await fetchData(key)
            if (!result) return null
        }
        const [k, realAns, , sourceCode] = result

        // 只计算API请求时间
        const apiStartTime = Date.now()
        let gptResponse, allTokens
        const [, response1, , tokens1] = await sendToChatApi(JSON.stringify(sourceCode))
        gptResponse = response1
        allTokens = tokens1

        if (!gptResponse || gptResponse.length === 0) {
            const [, response2, , tokens2] = await sendToChatApi(JSON.stringify(sourceCode))
            gptResponse = response2
            // 合并token信息
            allTokens = {
                totalTokens: (tokens1?.totalTokens || 0) + (tokens2?.totalTokens || 0),
                promptTokens: (tokens1?.promptTokens || 0) + (tokens2?.promptTokens || 0),
                completionTokens: (tokens1?.completionTokens || 0) + (tokens2?.completionTokens || 0)
            }
        }
        const apiEndTime = Date.now()
        const apiDuration = apiEndTime - apiStartTime

        return { key: k, realAns, gptResponse, apiDuration, tokens: allTokens }
    }

    // 并发窗口
    const inProgress = []
    while (finished < testCount) {
        while (inProgress.length < concurrency && finished + inProgress.length < testCount) {
            const key = getNextKey()
            if (key === null) break
            const p = (async () => {
                const record = await processKeyTest(key)
                if (record) {
                    testData.push(record)
                }
                finished++
                console.log(`测试进度: ${finished}/${testCount}`)
            })().finally(() => {
                const idx = inProgress.indexOf(p)
                if (idx > -1) inProgress.splice(idx, 1)
            })
            inProgress.push(p)
        }
        if (inProgress.length > 0) {
            await Promise.race(inProgress)
        }
    }
    await Promise.all(inProgress)

    const testEndTime = Date.now()
    const testDuration = testEndTime - testStartTime
    const totalApiTime = testData.reduce((sum, item) => sum + item.apiDuration, 0)
    const averageApiTime = testData.length > 0 ? totalApiTime / testData.length : 0

    // Token统计
    const totalTokens = {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0
    }

    for (const item of testData) {
        if (item.tokens) {
            totalTokens.totalTokens += item.tokens.totalTokens || 0
            totalTokens.promptTokens += item.tokens.promptTokens || 0
            totalTokens.completionTokens += item.tokens.completionTokens || 0
        }
    }

    console.log('================ 100份并发测试完成 ================')
    console.log(`总测试耗时: ${testDuration}ms (${(testDuration / 1000).toFixed(2)}s)`)
    console.log(`纯API请求总时间: ${totalApiTime}ms (${(totalApiTime / 1000).toFixed(2)}s)`)
    console.log(`平均每个API请求: ${averageApiTime.toFixed(2)}ms`)
    console.log(`成功处理数量: ${testData.length}`)
    console.log(`并发效率: 节省了 ${(((totalApiTime - testDuration) / totalApiTime) * 100).toFixed(1)}% 的时间`)
    console.log('------------------- Token统计 -------------------')
    console.log(`总Token数: ${totalTokens.totalTokens.toLocaleString()}`)
    console.log(`输入Token数: ${totalTokens.promptTokens.toLocaleString()}`)
    console.log(`输出Token数: ${totalTokens.completionTokens.toLocaleString()}`)
    console.log(`平均每个请求Token数: ${(totalTokens.totalTokens / testData.length).toFixed(0)}`)
    console.log('===================================================')

    return testData
}

// ================== Step 5: 主程序 ================== //
async function main() {
    const overallStartTime = Date.now()
    console.log('================ 开始批量处理 ================')
    console.log('开始时间:', new Date().toLocaleString())

    const startKey = 20000
    const targetCount = 10000
    const concurrency = 100
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
        let gptJson, gptResponse, gptResponseArray, allTokens

        // 计算API请求时间
        const apiStartTime = Date.now()
        const [json1, response1, array1, tokens1] = await sendToChatApi(JSON.stringify(sourceCode))
        gptJson = json1
        gptResponse = response1
        gptResponseArray = array1
        allTokens = tokens1

        // gpt失败重试一次
        if (!gptResponse || gptResponse.length === 0) {
            const [json2, response2, array2, tokens2] = await sendToChatApi(JSON.stringify(sourceCode))
            gptJson = json2
            gptResponse = response2
            gptResponseArray = array2
            // 合并token信息
            allTokens = {
                totalTokens: (tokens1?.totalTokens || 0) + (tokens2?.totalTokens || 0),
                promptTokens: (tokens1?.promptTokens || 0) + (tokens2?.promptTokens || 0),
                completionTokens: (tokens1?.completionTokens || 0) + (tokens2?.completionTokens || 0)
            }
        }
        const apiEndTime = Date.now()
        const apiDuration = apiEndTime - apiStartTime

        const record = saveToJson(k, realAns, realAnsArray, gptJson, gptResponse, gptResponseArray)
        record.apiDuration = apiDuration // 添加API请求时间到记录中
        record.tokens = allTokens // 添加token信息到记录中
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

        const overallEndTime = Date.now()
        const totalDuration = overallEndTime - overallStartTime
        const totalApiTime = allData.reduce((sum, item) => sum + (item.apiDuration || 0), 0)
        const averageApiTime = allData.length > 0 ? totalApiTime / allData.length : 0

        // Token统计
        const totalTokens = {
            totalTokens: 0,
            promptTokens: 0,
            completionTokens: 0
        }

        for (const item of allData) {
            if (item.tokens) {
                totalTokens.totalTokens += item.tokens.totalTokens || 0
                totalTokens.promptTokens += item.tokens.promptTokens || 0
                totalTokens.completionTokens += item.tokens.completionTokens || 0
            }
        }

        console.log('================ 批量处理完成 ================')
        console.log('结束时间:', new Date().toLocaleString())
        console.log(`总程序耗时: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`)
        console.log(`纯API请求总时间: ${totalApiTime}ms (${(totalApiTime / 1000).toFixed(2)}s)`)
        console.log(`平均每个API请求: ${averageApiTime.toFixed(2)}ms`)
        console.log(`实际处理数量: ${allData.length}`)
        console.log(`并发效率: API时间占总时间的 ${((totalApiTime / totalDuration) * 100).toFixed(1)}%`)
        console.log('------------------- Token统计 -------------------')
        console.log(`总Token数: ${totalTokens.totalTokens.toLocaleString()}`)
        console.log(`输入Token数: ${totalTokens.promptTokens.toLocaleString()}`)
        console.log(`输出Token数: ${totalTokens.completionTokens.toLocaleString()}`)
        console.log(`平均每个请求Token数: ${(totalTokens.totalTokens / allData.length).toFixed(0)}`)
        console.log('===============================================')
    }
    await runner()
}

// 执行
// 如果命令行参数包含 'test100'，则运行100并发测试；否则运行完整的main函数
const args = process.argv.slice(2)
if (args.includes('test100')) {
    test100Concurrent()
} else {
    main()
}
