// evaluate.js
const fs = require('fs')
const path = require('path')

// 加载数据
function loadData(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
}

// 计算评估指标
function evaluate(data) {
    const yTrue = data.map(item => item['Real Ans Array'])
    const yPred = data.map(item => item['GPT Response Array'])

    // 展平成 1D
    const yTrueFlat = yTrue.flat()
    const yPredFlat = yPred.flat()

    let TP = 0,
        FP = 0,
        FN = 0,
        TN = 0

    for (let i = 0; i < yTrueFlat.length; i++) {
        const t = yTrueFlat[i]
        const p = yPredFlat[i]
        if (t === 1 && p === 1) TP++
        else if (t === 0 && p === 1) FP++
        else if (t === 1 && p === 0) FN++
        else if (t === 0 && p === 0) TN++
    }

    const accuracy = (TP + TN) / (TP + TN + FP + FN)
    const precision = TP + FP === 0 ? 0 : TP / (TP + FP)
    const recall = TP + FN === 0 ? 0 : TP / (TP + FN)
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)

    console.log('==========================================================')
    console.log('Total')
    console.log('Accuracy:', accuracy.toFixed(4))
    console.log('Precision:', precision.toFixed(4))
    console.log('Recall:', recall.toFixed(4))
    console.log('F1 Score:', f1.toFixed(4))
    console.log('==========================================================')
}

// 入口
const filePath = path.join(__dirname, 'gpt_experiment.json') // 替换成你的路径
const data = loadData(filePath)
evaluate(data)
