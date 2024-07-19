/*
 * BiLSTM + intent highlight scale
 * @Author: Youwei Huang
 * @Email: devilyouwei@foxmail.com
 */

const MyModelSmartBert = require('../my-model/mymodel-smartbert')
const { load } = require('../modules/highlight')
const kmeans = load()
const PAD = 0.0
const DIM = 768

class SmartBertHighBiLSTM extends MyModelSmartBert {
    padding(xs) {
        // rank first
        console.log('Ranking...')
        xs = xs.map(x =>
            x.sort(
                (x1, x2) =>
                    kmeans.predict(this.tf.tensor(x1)).distance.arraySync()[0] -
                    kmeans.predict(this.tf.tensor(x2)).distance.arraySync()[0]
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

const nn = new SmartBertHighBiLSTM('smartbert_high_bilstm')

if (process.argv[2] == 'evaluate') nn.evaluate(process.argv[3], process.argv[4], process.argv[5])
if (process.argv[2] == 'predict') nn.predict(process.argv[3], process.argv[4])
