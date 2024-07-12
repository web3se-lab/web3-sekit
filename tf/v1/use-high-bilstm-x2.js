/*
 * BiLSTM + intent highlight scale
 */

const MyModel = require('./model')
const load = require('./highlight')
const kmeans = load()

const SCALE = 2

class BiLSTMHighScale extends MyModel {
    // build my model structure
    buildModel() {
        const tf = this.tf
        const mask = tf.layers.masking({ maskValue: this.MASK, inputShape: [null, 512] })
        const drop = tf.layers.dropout({ rate: 0.5 })
        const lstm = tf.layers.bidirectional({
            layer: tf.layers.lstm({ units: this.UNIT, returnSequences: false })
        })
        const sigmoid = tf.layers.dense({ units: Object.keys(this.TYPE).length, activation: 'sigmoid' })
        return tf.sequential({ layers: [mask, drop, lstm, sigmoid] })
    }

    // scale highlight
    scale(xs) {
        // rank by distance desc
        console.log('==========================highlight scale padding==========================')
        console.log('Scaling...', SCALE)
        return xs.map(x =>
            x.map(v =>
                kmeans.predict(this.tf.tensor(v)).distance.arraySync()[0] < this.DIST
                    ? v
                    : this.tf.tensor(v).mul(this.tf.scalar(SCALE)).arraySync()
            )
        )
    }
}

const nn = new BiLSTMHighScale('mymodel-bilstm-high-scaleX2-dropout')

if (process.argv[2] == 'train') nn.train(process.argv[3], process.argv[4], process.argv[5], process.argv[6])
if (process.argv[2] == 'evaluate') nn.evaluate(process.argv[3], process.argv[4], process.argv[5])
if (process.argv[2] == 'predict') nn.predict(process.argv[3], process.argv[4])
if (process.argv[2] == 'summary') nn.summary()
