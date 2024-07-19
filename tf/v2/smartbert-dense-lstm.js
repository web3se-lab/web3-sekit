/*
 * Use a dense layer to reduce expanded token dimension, to LSTM layer
 * @Author: Youwei Huang
 * @Email: devilyouwei@foxmail.com
 * 2023-2-16 in Istanbul
 */

const MyModelSmartBert = require('./base-model/mymodel-smartbert')
const UNIT = 128
const SEQ = null
const TKN = 512
const DIM = 768
const PAD = 0.0
const DROP = 0.5 // best is 0.5

class SmartBertDenseLSTM extends MyModelSmartBert {
    buildModel() {
        const tf = this.tf
        const input = tf.layers.masking({ maskValue: PAD, inputShape: [SEQ, TKN, DIM] })
        const reshape = tf.layers.reshape({ targetShape: [SEQ, TKN * DIM] })
        const dense = tf.layers.dense({ units: DIM })
        const lstm = tf.layers.lstm({ units: UNIT, returnSequences: false })
        const dropout = tf.layers.dropout({ rate: DROP })
        const sigmoid = tf.layers.dense({ units: Object.keys(this.TYPE).length, activation: 'sigmoid' })
        return tf.sequential({ layers: [input, reshape, dense, lstm, dropout, sigmoid] })
    }
}

const nn = new SmartBertDenseLSTM('smartbert_dense_lstm')

if (process.argv[2] == 'train') nn.train(process.argv[3], process.argv[4], process.argv[5], process.argv[6])
if (process.argv[2] == 'evaluate') nn.evaluate(process.argv[3], process.argv[4], process.argv[5])
if (process.argv[2] == 'predict') nn.predict(process.argv[3], process.argv[4])
if (process.argv[2] == 'summary') nn.summary()
