/*
 * Single LSTM
 * modified to class extending mode
 */

const MyModel = require('./model')

class LSTM extends MyModel {
    buildModel() {
        const tf = this.tf
        const mask = tf.layers.masking({ maskValue: this.MASK, inputShape: [null, 512] })
        const lstm = tf.layers.lstm({ units: this.UNIT, returnSequences: false })
        const sigmoid = tf.layers.dense({ units: Object.keys(this.TYPE).length, activation: 'sigmoid' })
        return tf.sequential({ layers: [mask, lstm, sigmoid] })
    }
}

const nn = new LSTM('mymodel-lstm')

if (process.argv[2] == 'train') nn.train(process.argv[3], process.argv[4], process.argv[5], process.argv[6])
if (process.argv[2] == 'evaluate') nn.evaluate(process.argv[3], process.argv[4], process.argv[5])
if (process.argv[2] == 'predict') nn.predict(process.argv[3], process.argv[4])
if (process.argv[2] == 'summary') nn.summary()
