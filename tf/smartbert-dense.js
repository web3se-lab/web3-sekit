/*
 * Use a dense layer to reduce expanded token dimension, to LSTM layer
 * @Author: Youwei Huang
 * @Email: devilyouwei@foxmail.com
 * 2023-2-16 in Istanbul
 */

const MyModelSmartBert = require('./base/mymodel-smartbert')
const PAD_FUN = 256
const DIM = 768
const PAD = 0.0

class SmartBertDense extends MyModelSmartBert {
    padding(xs) {
        return xs.map(x => {
            while (x.length < PAD_FUN) x.push(Array(DIM).fill(PAD))
            return x.slice(0, PAD_FUN)
        })
    }
}

const nn = new SmartBertDense('smartbert_dense')

if (process.argv[2] == 'evaluate') nn.evaluate(process.argv[3], process.argv[4], process.argv[5])
if (process.argv[2] == 'predict') nn.predict(process.argv[3], process.argv[4])
