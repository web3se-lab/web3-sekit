/**
 * The base model, only for extending
 * To extend, you need to complete buildModel, preX, and padding methods
 * @class MyModel
 */

const fs = require('fs')
const ROOT = require('app-root-path')

const $ = require('../utils')
const { TokenHasContract } = require('../../db/data')

const PAD_TKN = 512
const SEQ = 256 // seq num limit for lstm (max number of functions)
const PAD = 1

module.exports = class MyModel {
    /**
     * input a mymodel name (important! determine the saved model and evaluation)
     * @constructor
     * @param {string} name model's name
     */
    constructor(name) {
        this.name = name
        this.modelPath = `file://${ROOT}/tf/models/v0/${name}/model.json` // python models
        this.evaluatePath = `${ROOT}/tf/evaluates/v0/${name}.json` // evaluate path
        this.tf = $.tf
        this.TYPE = $.TYPE
    }

    // padding to [256, 512]
    padding(xs) {
        return xs.map(x => {
            while (x.length < SEQ) x.push(Array(PAD_TKN).fill(PAD))
            return x.slice(0, SEQ)
        })
    }

    // Need to change with model, this is for lstm/bilstm model example
    preX(json) {
        if (!json) return null

        const data = JSON.parse(json)
        const arr = []
        for (const i in data) for (const j in data[i]) arr.push(data[i][j])
        return arr
    }

    // prepare y data, multihot of scam type
    preY(json) {
        if (!json) return null

        const ys = JSON.parse(json)
        const arr = new Array(Object.keys(this.TYPE).length).fill(0)
        for (const item of ys) arr[this.TYPE[item.type]] = 1
        return arr
    }

    // load model from local
    async loadModel() {
        console.log('Model Name', this.name)
        console.log('Model Path', this.modelPath)
        console.log('Now Loading my model...from python convert tfjs')
        return (this.model = await this.tf.loadLayersModel(this.modelPath))
    }

    // compile model if training
    compile() {
        this.model.compile({
            optimizer: 'adam',
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        })
    }

    // change to Accuracy, Precision and Recall evaluate
    async evaluate(id = 20000, slice = 10000) {
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
                const res = await TokenHasContract(id, ['Id', 'Scams'], ['TokenIds', 'ContractAddress'])
                console.log('Id', id)
                id++
                if (!res) continue

                console.log('Evaluating')
                console.log('Address', res.contract.ContractAddress)
                const x = this.preX(res.contract.TokenIds)
                const y = this.preY(res.Scams)
                if (x && y) {
                    const xs = [x]
                    const yp = this.label(this.model.predict(this.tf.tensor(this.padding(xs))).arraySync()) // the predicting y
                    const ya = this.label([y]) // the actual y
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

            const path = this.evaluatePath
            fs.writeFileSync(path, JSON.stringify(evas))
            console.log(eva)
            console.log('Save to', path)
        } catch (e) {
            console.error(e)
        } finally {
            if (this.model) this.model.dispose()
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
                const res = await TokenHasContract(id, ['Id', 'Scams'], ['TokenIds', 'ContractAddress'])
                if (res && res.contract.ContractAddress) {
                    const x = this.preX(res.contract.TokenIds)
                    const y = this.preY(res.Scams)
                    if (x && y) {
                        console.log('Predicting')
                        console.log('Id', id)
                        console.log('Address', res.contract.ContractAddress)
                        xs.push(x)
                        ys.push(y)
                    }
                }
                id++
            }
            const yp = this.label(this.model.predict(this.tf.tensor(this.padding(xs))).arraySync())
            const ya = this.label(ys)

            console.log('Predict', yp)
            console.log('Actual', ya)
        } catch (e) {
            console.error(e)
        } finally {
            if (this.model) this.model.dispose()
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
            this.model.summary()
        } catch (e) {
            console.error(e)
        } finally {
            if (this.model) this.model.dispose()
        }
    }
}
