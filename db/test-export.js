// 测试数据库导出功能
const { exportTable } = require('./initDB')

async function testExport() {
    try {
        console.log('测试导出Contract表的基本信息...')

        // 测试导出Contract表，排除大字段，限制10条记录
        const result = await exportTable('Contract', {
            excludeFields: ['Embedding', 'Embedding2'],
            format: 'json'
        })

        console.log('导出成功！')
        console.log('结果预览：')
        const parsed = JSON.parse(result)
        console.log(`表名: ${parsed.meta.tableName}`)
        console.log(`记录数: ${parsed.meta.recordCount}`)
        console.log(`字段: ${parsed.meta.fields.join(', ')}`)
        console.log(`排除字段: ${parsed.meta.excludedFields.join(', ')}`)

        if (parsed.data.length > 0) {
            console.log('第一条记录示例：')
            console.log(JSON.stringify(parsed.data[0], null, 2))
        }

        // 测试CSV格式
        console.log('\n测试CSV格式...')
        const csvResult = await exportTable('Contract', {
            includeFields: ['Id', 'ContractAddress', 'Network'],
            limit: 5,
            format: 'csv'
        })
        console.log('CSV结果：')
        console.log(csvResult)
    } catch (error) {
        console.error('测试失败：', error.message)
    }
}

// 如果直接运行此文件则执行测试
if (require.main === module) {
    testExport()
}

module.exports = { testExport }
