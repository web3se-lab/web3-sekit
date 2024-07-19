/*
 * Use BiLSTM
 * @Author: Youwei Huang
 * @Email: devilyouwei@foxmail.com
 * 2023-2-11
 * modified to class extending mode
 */

const MyModel = require('../my-model/mymodel')

const nn = new MyModel('bilstm')

if (process.argv[2] == 'evaluate') nn.evaluate(process.argv[3], process.argv[4], process.argv[5])
if (process.argv[2] == 'predict') nn.predict(process.argv[3], process.argv[4])
