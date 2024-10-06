const jsonFix = require('json-fixer')

/**
 * Extract json data from markdown
 * @param {string} markdown - input prompt
 */
function extractJSON(markdown) {
    try {
        const regex = /```json\n([\s\S]*?)\n```/g
        const match = regex.exec(markdown)
        return jsonFix((match && match[1]) || markdown).data
    } catch (e) {
        return markdown
    }
}

function getRandomElements(arr, n) {
    // 创建一个新的数组来存储随机选取的元素
    const result = []
    // 创建一个包含数组索引的数组
    const indices = Array.from({ length: arr.length }, (_, i) => i)

    // 随机选择n个索引
    for (let i = 0; i < n; i++) {
        // 随机选择一个索引
        const randomIndex = Math.floor(Math.random() * indices.length)
        // 将随机选择的索引添加到结果数组中
        result.push(arr[indices[randomIndex]])
        // 从索引数组中移除已选择的索引
        indices.splice(randomIndex, 1)
    }

    return result
}

module.exports = { extractJSON, getRandomElements }
