// Cluster machine learning for highlight functions in contracts.
// Train first, load and then predict.
// 2022-8-2
// Author: devilyouwei

const KMeans = require('tf-kmeans-node').default
const ROOT = require('app-root-path')
const { tf } = require('../utils')
const $contract = require('../../src/getContract')
// where you save your kmeans model
const PATH = `${ROOT}/tf/models/kmeans-model.json`

/**
 * Get K and Functions from database
 * @param {number} id id start id
 * @param {number} slice count from start id
 * @param {number} rate function occurence rate
 * @return {object} {k,fun}
 */
async function getK(id = 1, slice = 1000, rate = 0.75) {
    const occ = {}
    const fun = []
    const length = slice
    while (slice > 0) {
        const data = await $contract.getEmbeddingById(id)
        if (data) {
            const flag = {}
            for (const i in data)
                for (const j in data[i]) {
                    fun.push(data[i][j])

                    // make sure in one contract, the same function, only count once
                    if (flag[`fun_${j}`]) continue

                    occ[`fun_${j}`] ? occ[`fun_${j}`]++ : (occ[`fun_${j}`] = 1)
                    flag[`fun_${j}`] = true
                }
            slice--
        }
        id++
    }
    console.log(occ)
    // find k
    const kfun = []
    for (const i in occ) if (occ[i] / length >= rate) kfun.push({ name: i, num: occ[i] })
    console.log('K Functions', kfun)
    return { k: kfun.length, fun }
}

/**
 * Train K-means model
 * @param {number} id id start id
 * @param {number} slice count from start id
 * @param {number} rate function occurence rate
 * @param {number} maxIter max train epoch
 * @return {KMeans} kmeans
 */
async function train(id = 1, slice = 1000, rate = 0.75, maxIter = 50) {
    id = parseInt(id)
    slice = parseInt(slice)
    rate = parseFloat(rate)
    maxIter = parseInt(maxIter)

    const { k, fun } = await getK(id, slice, rate)
    let kmeans = load()

    console.log('Start to train K-means=============================>')
    console.log('Total Contracts', slice)
    console.log('Total Functions', fun.length)
    console.log('Category Rate', rate)
    console.log('K', k)
    console.log('Max Iter', maxIter)
    if (!kmeans)
        kmeans = new KMeans({
            k,
            maxIter,
            distanceFunction: KMeans.cosineDistance
        })
    const start = new Date().getTime()
    kmeans.train(tf.tensor(fun))
    //console.log(kmeans.centroids.arraySync())
    const split = (new Date().getTime() - start) / 1000
    kmeans.save(PATH)
    console.log('Model save to', PATH)
    console.log(`Train clustering for ${split}s============>`)

    return kmeans
}

/**
 * load k-means model
 * @param {number} path id start id
 * @return {KMeans} trained kmeans
 */
function load(path = PATH) {
    try {
        const model = require(path)

        // filter null centers, should be none, pls check
        model.centroids = model.centroids.filter(item => item[0])
        model.k = model.centroids.length

        model.distanceFunction = KMeans.cosineDistance
        console.log('Load Trained Model================================')
        const kmeans = new KMeans(model)
        console.log(kmeans)
        let count = 0
        kmeans.centroids.arraySync().filter(item => {
            if (!item[0]) count++
        })
        console.log('Invalid Center', count)
        console.log('Load Trained Model================================')
        return kmeans
    } catch (e) {
        console.log('ERROR================================')
        console.log('K-means model not found, train first!')
        console.log('ERROR================================')
    }
}

/**
 * Predict intent highlight of a contract (functions)
 * @param {number} id id start id
 */
async function predict(key = 1) {
    const kmeans = load()
    console.log('Predict========================================================>')
    console.log('Search', key)

    let data
    if (typeof key === 'string' && key.substring(0, 2) === '0x') data = await $contract.getEmbeddingByAddress(key)
    else {
        const res = await $contract.findOneByPk(key, ['ContractAddress'])
        data = await $contract.getEmbeddingByAddress(res.ContractAddress)
    }

    if (!data) return console.error('Not found', key)

    const fun = []
    const map = {}
    for (const i in data)
        for (const j in data[i]) {
            fun.push(data[i][j])
            map[data[i][j]] = `${i}/${j}`
        }
    const xs = tf.tensor(fun)
    console.log('Input', xs)
    const ys = kmeans.predict(xs)
    console.log('Output', ys)
    console.log('Category Index', ys.index.arraySync())
    console.log('Category Distance', ys.distance.arraySync())
    console.log('Category Center')
    ys.center.print()
    let funObj = []
    for (const i in fun)
        funObj.push({
            fun: fun[i],
            distance: ys.distance.arraySync()[i],
            index: ys.index.arraySync()[i]
        })
    funObj = funObj.sort((f1, f2) => f2.distance - f1.distance)
    funObj = funObj.map(item => {
        item.fun = map[item.fun]
        return item
    })
    console.log(funObj)
    return { funObj, k: kmeans.k }
}

if (process.argv[1].includes('highlight')) {
    if (process.argv[2] === 'train') train(process.argv[3], process.argv[4], process.argv[5], process.argv[6])
    if (process.argv[2] === 'load') load()
    if (process.argv[2] === 'predict') predict(process.argv[3])
}

module.exports = { train, load, predict }
