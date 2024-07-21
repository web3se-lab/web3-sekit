/*
 * Use Convolutional neural network
 * @Author: Youwei Huang
 * @Email: devilyouwei@foxmail.com
 * 2022-8-23
 */

const MyModel = require('./model')

const nn = new MyModel('cnn')

if (process.argv[2] == 'evaluate') nn.evaluate(process.argv[3], process.argv[4], process.argv[5])
if (process.argv[2] == 'predict') nn.predict(process.argv[3], process.argv[4])
