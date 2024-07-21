/*
 * Use Single LSTM
 * @Author: Youwei Huang
 * @Email: devilyouwei@foxmail.com
 * 2022-8-16
 * modified to class extending mode
 */

const MyModel = require('./model')

const nn = new MyModel('lstm')

if (process.argv[2] == 'evaluate') nn.evaluate(process.argv[3], process.argv[4], process.argv[5])
if (process.argv[2] == 'predict') nn.predict(process.argv[3], process.argv[4])
