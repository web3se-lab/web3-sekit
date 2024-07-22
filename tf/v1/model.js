/**
 * The base model, only for extending
 * To extend, you need to complete buildModel and padding methods
 * @class MyModel
 */

const fs = require('fs')
const ROOT = require('app-root-path')

const $ = require('../utils')
const $data = require('../../db/data')

const UNIT = 64 // LSTM unit num for 1 layer
const PAD = 0.0 // pad
const DIM = 512 // dimension for sentence embedding
const SEQ = 256 // seq num limit for lstm (max number of functions)
const BATCH_SIZE = 50
const BATCH = 200
const START = 20000
const EPOCH = 50
const DIST = 0.21 // highlight within distance bound

module.exports = class MyModel {
    /**
     * input a mymodel name (important! determine the saved model and evaluation)
     * @constructor
     * @param {string} name model's name
     */
    constructor(name) {
        this.name = name
        this.modelPath = `file://${ROOT}/tf/models/v1/${name}`
        this.evaluatePath = `${ROOT}/tf/evaluates/v1/${name}.json`
        this.tf = $.tf
        this.TYPE = $.TYPE
        this.UNIT = UNIT
        this.PAD = PAD
        this.DIM = DIM
        this.SEQ = SEQ
        this.DIST = DIST
    }

    /**
     * TODO build a model, need to complete when extended
     * @method buildModel
     * @return {any} a tensorflow model
     */
    buildModel() {}

    // handle input-ready xs, most need padding
    padding(xs) {
        return (this.scale ? this.scale(xs) : xs).map(x => {
            console.log('Origin length', x.length)
            while (x.length < this.SEQ) x.push(Array(this.DIM).fill(this.PAD))
            console.log('Padded length-------->', x.length)
            return x.slice(0, this.SEQ)
        })
        // return a matrix [seq_len, dimension] -> [256, 512]
    }

    // prepare x data
    preX(xs = []) {
        const arr = []
        for (const i in xs) for (const j in xs[i]) arr.push(xs[i][j])
        return this.embed(arr)
    }

    // prepare y data
    preY(ys) {
        const arr = new Array(Object.keys(this.TYPE).length).fill(0)
        for (const item of ys) arr[this.TYPE[item.type]] = 1
        return arr
    }

    // load model from local
    async loadModel() {
        try {
            console.log('========================= Load My Model ==========================')
            console.log('Model', this.name)
            console.log('Path', this.modelPath)
            console.log('Evaluate', this.evaluatePath)
            console.log('Load mymodel...')
            if (!this.mymodel) this.mymodel = await this.tf.loadLayersModel(`${this.modelPath}/model.json`)
            console.log('========================= Load My Model ==========================')
        } catch (e) {
            console.log('xxxxxxxxxxxxxxxxxx Fail to load my model, Build my model xxxxxxxxxxxxxxxxx')
            console.error(e.message)
            if (!this.mymodel) this.mymodel = this.buildModel()
            console.log('xxxxxxxxxxxxxxxxxx Fail to load my model, Build my model xxxxxxxxxxxxxxxxx')
        } finally {
            console.log('========================= Load Encoder ==========================')
            if (!this.encoder)
                this.encoder = await this.tf.node.loadSavedModel(`${ROOT}/tf/models/universal-sentence-encoder`)
            console.log('========================= Load Encoder ==========================')
        }
    }

    // embed string
    embed(inputs = []) {
        console.log('Embedding...', inputs.length)
        inputs = this.tf.tensor(inputs)
        return this.encoder.predict({ inputs }).outputs.arraySync()
    }

    // compile model if training
    compile() {
        this.mymodel.compile({
            optimizer: 'adam',
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        })
    }

    // train model
    async train(bs = BATCH_SIZE, batch = BATCH, epoch = EPOCH, id = 1) {
        console.log('Training================================>')

        bs = parseInt(bs)
        batch = parseInt(batch)
        epoch = parseInt(epoch)
        id = parseInt(id)

        console.log('Batch Size', bs)
        console.log('Batch', batch)
        console.log('Epoch', epoch)
        console.log('Total', bs * batch)
        console.log('From', id)

        let count = 0
        let xs = []
        let ys = []

        try {
            await this.loadModel()
            this.compile() // training needs to compile

            while (count < bs * batch) {
                const res = await $data.getSourceCodeScam(id)
                if (res && res.risk && res.codeTree) {
                    console.log('Id', id)
                    console.log('Address', res.address)
                    xs.push(this.preX(res.codeTree))
                    ys.push(this.preY(res.risk))
                    if (xs.length === bs) {
                        const tx = this.tf.tensor(this.padding(xs))
                        console.log(tx)
                        const ty = this.tf.tensor(ys)
                        console.log(ty)
                        await this.mymodel.fit(tx, ty, { batchSize: bs, shuffle: true, epochs: epoch })
                        tx.dispose()
                        ty.dispose()
                        xs = []
                        ys = []
                    }
                    count++
                    console.log('count', count)
                    console.log('Id', id)
                    console.log('Address', res.address)
                }
                id++
                await this.mymodel.save(this.modelPath)
            }
        } catch (e) {
            console.error(e)
            console.log('id', id)
            console.log('count', count)
        } finally {
            if (this.mymodel) this.mymodel.dispose()
        }
    }

    // change to Accuracy, Precision and Recall evaluate
    async evaluate(id = START, slice = 10000) {
        console.log('Evaluating================================>')

        id = parseInt(id)
        slice = parseInt(slice)

        console.log('From', id)
        console.log('Count', slice)
        // generate evaluation metrics
        const eva = []
        for (const i in this.TYPE)
            eva[this.TYPE[i]] = {
                intent: i,
                TP: 0,
                FP: 0,
                TN: 0,
                FN: 0,
                accuracy: 0,
                precision: 0,
                recall: 0,
                F1: 0
            }
        eva.push({ intent: 'all', TP: 0, FP: 0, TN: 0, FN: 0, accuracy: 0, precision: 0, recall: 0, F1: 0 })
        const all = eva.length - 1

        let count = 0
        const evas = []

        try {
            await this.loadModel()

            while (count < slice) {
                const res = await $data.getSourceCodeScam(id)
                if (res && res.risk && res.codeTree) {
                    console.log('Evaluating')
                    console.log('Id', id)
                    console.log('Address', res.address)
                    const xs = [this.preX(res.codeTree)]
                    const yp = this.label(this.mymodel.predict(this.tf.tensor(this.padding(xs))).arraySync()) // the predicting y
                    const ya = this.label([this.preY(res.risk)]) // the actual y
                    console.log('Predict', yp)
                    console.log('Actual', ya)
                    const predict = yp.vector[0]
                    const actual = ya.vector[0]
                    for (const i in predict) {
                        if (predict[i] === 1 && actual[i] === 1) eva[i].TP++, eva[all].TP++
                        if (predict[i] === 1 && actual[i] === 0) eva[i].FP++, eva[all].FP++
                        if (predict[i] === 0 && actual[i] === 0) eva[i].TN++, eva[all].TN++
                        if (predict[i] === 0 && actual[i] === 1) eva[i].FN++, eva[all].FN++
                        for (const item of eva) {
                            item.accuracy = (item.TP + item.TN) / (item.TP + item.TN + item.FP + item.FN)
                            item.precision = item.TP / (item.TP + item.FP)
                            item.recall = item.TP / (item.TP + item.FN)
                            item.F1 = (2 * item.precision * item.recall) / (item.precision + item.recall)
                        }
                    }
                    console.log(eva)
                    evas.push(JSON.parse(JSON.stringify(eva)))
                    count++
                }
                id++
            }

            fs.writeFileSync(this.evaluatePath, JSON.stringify(evas))
            console.log(eva)
            console.log('Save to', this.evaluatePath)
        } catch (e) {
            console.error(e)
        } finally {
            if (this.mymodel) this.mymodel.dispose()
        }
    }

    async predict(id = 1, slice = 1) {
        console.log('==============================Predicting=================================')
        id = parseInt(id)
        slice = parseInt(slice)
        console.log('Id', id)
        console.log('Slice', slice)
        try {
            await this.loadModel()
            const xs = []
            const ys = []
            while (xs.length < slice) {
                const res = await $data.getSourceCodeScam(id)
                if (res && res.risk && res.codeTree) {
                    console.log('Predicting')
                    console.log('Id', id)
                    console.log('Address', res.address)
                    xs.push(this.preX(res.codeTree))
                    ys.push(this.preY(res.risk))
                }
                id++
            }
            const yp = this.label(this.mymodel.predict(this.tf.tensor(this.padding(xs))).arraySync())
            const ya = this.label(ys)

            console.log('Predict', yp)
            console.log('Actual', ya)
        } catch (e) {
            console.error(e)
        } finally {
            if (this.mymodel) this.mymodel.dispose()
        }
    }

    // get labels from output
    label(arr) {
        const name = []
        const vector = []
        for (const i in arr) {
            const risks = []
            vector[i] = []
            for (const j in arr[i]) {
                vector[i][j] = arr[i][j] > 0.5 ? 1 : 0
                if (vector[i][j] === 1) for (const k in this.TYPE) if (this.TYPE[k] == j) risks.push(k)
            }
            name.push(risks)
        }
        return { vector, name }
    }

    // summary my model
    async summary() {
        try {
            await this.loadModel()
            this.mymodel.summary()
        } catch (e) {
            console.error(e)
        } finally {
            this.mymodel.dispose()
        }
    }
}
