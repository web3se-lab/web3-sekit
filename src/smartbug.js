const fs = require('fs')
const path = require('path')
const $contract = require('../db/contract')
const ROOT = require('app-root-path')

async function insert() {
    const files = fs.readdirSync(`${ROOT}/db/resource-smartbugs-wild`)
    files
        .filter(file => path.extname(file) === '.sol')
        .forEach(async file => {
            const address = path.basename(file, '.sol')

            // 读取文件内容
            try {
                const text = fs.readFileSync(path.join(`${ROOT}/db/smartbugs-wild`, file), 'utf8')

                const res = await $contract.insert({
                    ContractAddress: address,
                    SourceCode: text,
                    Network: 'ethMain',
                    Creator: 'smartbugs'
                })
                console.log('insert', address)
                console.log('id', res.Id)
            } catch (err) {
                console.error('无法读取文件: ' + err)
            }
        })
}

insert()
