// Cluster machine learning for highlight functions in contracts.
// Train first, load and then predict.

const KMeans = require('tf-kmeans-node').default
const ROOT = require('app-root-path')
const PATH = `${ROOT}/tf/models/kmeans-model.json`

/**
 * load k-means model
 * @param {number} path id start id
 * @return {KMeans} trained kmeans
 */
module.exports = function load(path = PATH) {
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
