/*
 * CNN highlight
 * @Author: Youwei Huang
 * @Email: devilyouwei@foxmail.com
 */

const MyModelSmartBert = require('./base-model/mymodel-smartbert')
const { load } = require('./modules/highlight')
const kmeans = load()
const MULT = 2
const DIST = 0.015
const PAD = 0.0
const DIM = 768
const PAD_FUN = 256

class SmartBertHighCNN extends MyModelSmartBert {
    padding(xs) {
        // scale first
        console.log('Scaling...', MULT)
        xs = xs.map(x =>
            x.map(v =>
                kmeans.predict(this.tf.tensor(v)).distance.arraySync()[0] >= DIST
                    ? this.tf.tensor(v).mul(this.tf.scalar(MULT)).arraySync()
                    : v
            )
        )
        console.log('Padding...', PAD)
        // padding
        return xs.map(x => {
            while (x.length < PAD_FUN) x.push(Array(DIM).fill(PAD))
            return x.slice(0, PAD_FUN)
        })
    }
}

const nn = new SmartBertHighCNN('smartbert_high_cnn')

if (process.argv[2] == 'evaluate') nn.evaluate(process.argv[3], process.argv[4], process.argv[5])
if (process.argv[2] == 'predict') nn.predict(process.argv[3], process.argv[4])
