/*
 * SmartBERT V1 + Convolutional Neural Network
 * @Author: Youwei Huang
 * @Email: devilyouwei@foxmail.com
 * 2023-2-21 USA
 */

const MyModelSmartBert = require('./my-model/mymodel-smartbert')
const PAD_FUN = 256
const DIM = 768
const PAD = 0.0

class SmartBertCNN extends MyModelSmartBert {
    // [null, 512] padding to [256, 512]
    padding(xs) {
        return xs.map(x => {
            while (x.length < PAD_FUN) x.push(Array(DIM).fill(PAD))
            return x.slice(0, PAD_FUN)
        })
    }
}

const nn = new SmartBertCNN('smartbert_cnn')

if (process.argv[2] == 'evaluate') nn.evaluate(process.argv[3], process.argv[4], process.argv[5])
if (process.argv[2] == 'predict') nn.predict(process.argv[3], process.argv[4])
