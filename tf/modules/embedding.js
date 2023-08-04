const ROOT = require('app-root-path')
const { tf } = require('../utils')

// one function is one sentence to embed
async function embed(code) {
    const model = await tf.node.loadSavedModel(`${ROOT}/tf/models/universal-sentence-encoder`)
    if (typeof code === 'string') code = JSON.parse(code)
    let arr = []
    for (const i in code) for (const j in code[i]) code[i][j] = arr.push(code[i][j]) - 1
    if (!arr.length) return null
    const inputs = tf.tensor(arr)
    const embedded = model.predict({ inputs }).outputs
    arr = embedded.arraySync()
    for (const i in code) for (const j in code[i]) code[i][j] = arr[code[i][j]]
    return code
}

module.exports = { embed }
