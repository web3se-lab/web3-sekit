/*
 * Use SmartBERT + LSTM
 * @Author: Youwei Huang
 * @Email: devilyouwei@foxmail.com
 * 2023-2-11
 * modified to use python trained model
 */

const Model = require('./model')

const nn = new Model('smartbert_lstm_js')

if (process.argv[2] == 'evaluate') nn.evaluate(process.argv[3], process.argv[4], process.argv[5])
if (process.argv[2] == 'predict') nn.predict(process.argv[3], process.argv[4])
