/*
 * USE + Bidirectional LSTM
 */

const MyModel = require('./model')

class BiLSTM extends MyModel {
    buildModel() {
        const tf = this.tf
        const mask = tf.layers.masking({ maskValue: this.PAD, inputShape: [this.SEQ, this.DIM] })
        const lstm = tf.layers.bidirectional({
            layer: tf.layers.lstm({ units: this.UNIT, returnSequences: false })
        })
        const sigmoid = tf.layers.dense({ units: Object.keys(this.TYPE).length, activation: 'sigmoid' })
        return tf.sequential({ layers: [mask, lstm, sigmoid] })
    }
}

const nn = new BiLSTM('mymodel-bilstm')

if (process.argv[2] == 'train') nn.train(process.argv[3], process.argv[4], process.argv[5], process.argv[6])
if (process.argv[2] == 'evaluate') nn.evaluate(process.argv[3], process.argv[4], process.argv[5])
if (process.argv[2] == 'predict') nn.predict(process.argv[3], process.argv[4])
if (process.argv[2] == 'summary') nn.summary()
