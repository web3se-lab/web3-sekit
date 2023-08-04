/*
 * BiLSTM + intent highlight scale
 * @Author: Youwei Huang
 * @Email: devilyouwei@foxmail.com
 */

const MyModelSmartBert = require('./base-model/mymodel-smartbert')
const { load } = require('./modules/highlight')
const kmeans = load()
const PAD = 0.0
const DIM = 768
const DIST = 0.015
const MULT = 10

class SmartBertHighLSTM extends MyModelSmartBert {
    padding(xs) {
        // rank first
        console.log('Scaling...')
        xs = xs.map(x =>
            x.map(v =>
                kmeans.predict(this.tf.tensor(v)).distance.arraySync()[0] >= DIST
                    ? this.tf.tensor(v).mul(this.tf.scalar(MULT)).arraySync()
                    : v
            )
        )
        // padding
        console.log('Finding max length...')
        const maxLength = Math.max.apply(
            Math,
            xs.map(x => x.length)
        )
        console.log('Padding...', maxLength)
        return xs.map(x => {
            while (x.length < maxLength) x.push(new Array(DIM).fill(PAD))
            return x
        })
    }
}

const nn = new SmartBertHighLSTM('smartbert_high_lstm')

if (process.argv[2] == 'evaluate') nn.evaluate(process.argv[3], process.argv[4], process.argv[5])
if (process.argv[2] == 'predict') nn.predict(process.argv[3], process.argv[4])
