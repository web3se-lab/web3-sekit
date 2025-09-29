/**
 * The base model, only for extending
 * To extend, you need to complete buildModel and padding methods
 * @class MyModel
 */

const fs = require('fs')
const ROOT = require('app-root-path')

const $ = require('../utils')
const $data = require('../../db/data')

const PAD = 0.0 // pad
const DIM = 768 // dimension for sentence embedding
const SEQ = 256 // seq num limit for lstm (max number of functions)
const START = 20000

module.exports = class MyModel {
    /**
     * input a mymodel name (important! determine the saved model and evaluation)
     * @constructor
     * @param {string} name model's name
     */
    constructor(name) {
        this.name = name
        this.modelPath = `file://${ROOT}/tf/models/v2/${name}/model.json`
        this.evaluatePath = `${ROOT}/tf/evaluates/v2/${name}.json`
        this.tf = $.tf
        this.TYPE = $.TYPE
        this.PAD = PAD
        this.DIM = DIM
        this.SEQ = SEQ
    }

    /**
     * TODO build a model, need to complete when extended
     * @method buildModel
     * @return {any} a tensorflow model
     */
    buildModel() {}

    // padding to [256, 512]
    padding(xs) {
        return xs.map(x => {
            while (x.length < SEQ) x.push(Array(DIM).fill(PAD))
            return x.slice(0, SEQ)
        })
    }

    // Need to change with model, this is for lstm/bilstm model example
    preX(json) {
        if (!json) return null

        const arr = []
        for (const i in json) for (const j in json[i]) arr.push(json[i][j])
        return arr
    }

    // prepare y data, multihot of scam type
    preY(json) {
        if (!json) return null

        const arr = new Array(Object.keys(this.TYPE).length).fill(0)
        for (const item of json) arr[this.TYPE[item.type]] = 1
        return arr
    }

    // load model from local
    async loadModel() {
        console.log('========================= Load My Model ==========================')
        console.log('Model', this.name)
        console.log('Path', this.modelPath)
        console.log('Evaluate', this.evaluatePath)
        console.log('Load mymodel...')
        if (!this.mymodel) this.mymodel = await this.tf.loadGraphModel(this.modelPath)
        console.log('========================= Load My Model ==========================')
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
                const res = await $data.getSourceCodeScam(id++)
                if (res && res.risk && res.embedding) {
                    console.log('Evaluating')
                    console.log('Id', id)
                    console.log('Address', res.address)
                    const xs = [this.preX(res.embedding)]
                    const yp = this.label(
                        (await this.mymodel.executeAsync(this.tf.tensor(this.padding(xs)))).arraySync()
                    )
                    const ya = this.label([this.preY(res.risk)])
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
        let startTime = Date.now()
        let endTime = Date.now()
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
                if (res && res.risk && res.embedding) {
                    console.log('Predicting')
                    console.log('Id', id)
                    console.log('Address', res.address)
                    xs.push(this.preX(res.embedding))
                    ys.push(this.preY(res.risk))
                }
                id++
            }
            const tx = this.tf.tensor(this.padding(xs))
            startTime = Date.now()
            const yp = this.label((await this.mymodel.executeAsync(tx)).arraySync())
            endTime = Date.now()
            const ya = this.label(ys)

            console.log('Predict', yp)
            console.log('Actual', ya)
            const duration = endTime - startTime
            console.log(`Prediction completed in ${duration}ms (${(duration / 1000).toFixed(2)}s)`)
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
                vector[i][j] = arr[i][j] >= 0.5 ? 1 : 0
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
