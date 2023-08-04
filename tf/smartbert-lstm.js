/*
 * Use SmartBERT + LSTM
 * @Author: Youwei Huang
 * @Email: devilyouwei@foxmail.com
 * 2023-2-11
 * modified to use python trained model
 */

const MyModelSmartBert = require('./my-model/mymodel-smartbert')

const nn = new MyModelSmartBert('smartbert_lstm')

if (process.argv[2] == 'evaluate') nn.evaluate(process.argv[3], process.argv[4], process.argv[5])
if (process.argv[2] == 'predict') nn.predict(process.argv[3], process.argv[4])
