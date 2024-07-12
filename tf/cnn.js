/*
 * Use Convolutional neural network
 * @Author: Youwei Huang
 * @Email: devilyouwei@foxmail.com
 * 2022-8-23
 */

const MyModel = require('./my-model/mymodel')
const PAD_FUN = 256
const PAD_TKN = 512
const PAD = 1

class CNN extends MyModel {
    // [null, 512] padding to [256, 512]
    padding(xs) {
        return xs.map(x => {
            while (x.length < PAD_FUN) x.push(Array(PAD_TKN).fill(PAD))
            return x.slice(0, PAD_FUN)
        })
    }
}

const nn = new CNN('cnn')

if (process.argv[2] == 'evaluate') nn.evaluate(process.argv[3], process.argv[4], process.argv[5])
if (process.argv[2] == 'predict') nn.predict(process.argv[3], process.argv[4])
if (process.argv[2] == 'summary') nn.summary()
