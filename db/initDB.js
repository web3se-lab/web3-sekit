require('dotenv').config()
const Sequelize = require('sequelize')
const Model = require('./Model')

function pool() {
    const env = process.env
    return new Sequelize(env.MYSQL_DB, env.MYSQL_USER, env.MYSQL_PASS, {
        dialect: env.DB_DIALECT,
        host: env.MYSQL_HOST,
        pool: {
            min: 0,
            max: 5,
            acquire: 30000,
            idle: 10000
        }
    })
}

// test connection to db
async function connect() {
    console.log('Connect to MySQL')
    const db = pool()
    await db.authenticate()
    console.log('Connection has been established successfully.')
    return db
}

async function init(table) {
    try {
        const db = await connect()
        console.log('Update table', table || '*')
        const m = model(db)
        const alter = true
        // update a table
        if (table) await m[table].sync({ alter })
        // update all
        else for (const i in m) await m[i].sync({ alter })
        console.log('Table updated', table || '*')
    } catch (e) {
        console.error(e)
    }
}

async function drop(table) {
    try {
        const db = await connect()
        console.log('Drop table', table || '*')
        const m = model(db)
        // drop table
        if (table) await m[table].drop()
        // drop all
        else for (const i in m) await m[i].drop()
        console.log('Table dropped', table || '*')
    } catch (e) {
        console.error(e)
    }
}

function model() {
    const tables = []
    for (const i in Model) tables[i] = pool().define(Model[i].name, Model[i].table, Model[i].options)
    return tables
}

// Export table structure and data
async function exportTable(tableName, options = {}) {
    try {
        const {
            includeFields = null, // 包含的字段数组，如果为null则包含所有字段
            excludeFields = [], // 排除的字段数组
            where = {}, // 查询条件
            limit = null, // 限制导出记录数
            format = 'json' // 导出格式: 'json', 'csv', 'sql'
        } = options

        await connect()
        const models = model()

        if (!models[tableName]) {
            throw new Error(`Table ${tableName} not found`)
        }

        console.log(`Exporting table: ${tableName}`)

        // 获取表结构
        const tableSchema = Model[tableName]
        const structure = {
            name: tableSchema.name,
            fields: {},
            options: tableSchema.options
        }

        // 处理字段结构
        for (const fieldName in tableSchema.table) {
            const field = tableSchema.table[fieldName]
            structure.fields[fieldName] = {
                type: field.type ? field.type.toString() : 'UNKNOWN',
                allowNull: field.allowNull !== false,
                defaultValue: field.defaultValue,
                primaryKey: field.primaryKey || false,
                autoIncrement: field.autoIncrement || false,
                unique: field.unique || false
            }
        }

        // 构建查询选项
        const queryOptions = {
            where,
            raw: true
        }

        if (limit) {
            queryOptions.limit = limit
        }

        // 处理字段选择
        if (includeFields && Array.isArray(includeFields)) {
            queryOptions.attributes = includeFields.filter(field => !excludeFields.includes(field))
        } else if (excludeFields.length > 0) {
            const allFields = Object.keys(tableSchema.table)
            queryOptions.attributes = allFields.filter(field => !excludeFields.includes(field))
        }

        // 获取数据
        const data = await models[tableName].findAll(queryOptions)

        console.log(`Found ${data.length} records`)

        const result = {
            structure,
            data,
            meta: {
                tableName,
                recordCount: data.length,
                exportTime: new Date().toISOString(),
                fields: queryOptions.attributes || Object.keys(tableSchema.table),
                excludedFields: excludeFields,
                queryConditions: where
            }
        }

        // 根据格式导出
        switch (format.toLowerCase()) {
            case 'json':
                return formatAsJson(result)
            case 'csv':
                return formatAsCsv(result)
            case 'sql':
                return formatAsSql(result, tableName)
            default:
                return formatAsJson(result)
        }
    } catch (error) {
        console.error('Export error:', error)
        throw error
    }
}

// Format as JSON
function formatAsJson(result) {
    return JSON.stringify(result, null, 2)
}

// Format as CSV
function formatAsCsv(result) {
    if (result.data.length === 0) {
        return 'No data to export'
    }

    const headers = result.meta.fields
    const csvLines = []

    // Add headers
    csvLines.push(headers.join(','))

    // Add data rows
    result.data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header]
            if (value === null || value === undefined) {
                return ''
            }
            // Escape quotes and wrap in quotes if contains comma
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return '"' + value.replace(/"/g, '""') + '"'
            }
            return value
        })
        csvLines.push(values.join(','))
    })

    return csvLines.join('\n')
}

// Format as SQL INSERT statements
function formatAsSql(result, tableName) {
    if (result.data.length === 0) {
        return `-- No data to export for table ${tableName}`
    }

    const headers = result.meta.fields
    const sqlLines = []

    // Add table structure comment
    sqlLines.push(`-- Export for table: ${tableName}`)
    sqlLines.push(`-- Export time: ${result.meta.exportTime}`)
    sqlLines.push(`-- Record count: ${result.meta.recordCount}`)
    sqlLines.push('')

    // Add INSERT statements
    result.data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header]
            if (value === null || value === undefined) {
                return 'NULL'
            }
            if (typeof value === 'string') {
                return `'${value.replace(/'/g, "''")}'`
            }
            if (typeof value === 'object') {
                return `'${JSON.stringify(value).replace(/'/g, "''")}'`
            }
            return value
        })

        sqlLines.push(`INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${values.join(', ')});`)
    })

    return sqlLines.join('\n')
}

// Export multiple tables
async function exportTables(tableNames, options = {}) {
    const results = {}

    for (const tableName of tableNames) {
        try {
            console.log(`\nExporting ${tableName}...`)
            results[tableName] = await exportTable(tableName, options)
        } catch (error) {
            console.error(`Failed to export ${tableName}:`, error.message)
            results[tableName] = { error: error.message }
        }
    }

    return results
}

if (process.argv[1].includes('DB')) {
    if (process.argv[2] == 'test') connect()
    if (process.argv[2] == 'init') init(process.argv[3])
    if (process.argv[2] == 'drop') drop(process.argv[3])
    if (process.argv[2] == 'export') {
        const tableName = process.argv[3]
        const options = {}

        // Parse additional options
        for (let i = 4; i < process.argv.length; i++) {
            const arg = process.argv[i]
            if (arg.startsWith('--include=')) {
                options.includeFields = arg.split('=')[1].split(',')
            } else if (arg.startsWith('--exclude=')) {
                options.excludeFields = arg.split('=')[1].split(',')
            } else if (arg.startsWith('--format=')) {
                options.format = arg.split('=')[1]
            } else if (arg.startsWith('--limit=')) {
                options.limit = parseInt(arg.split('=')[1])
            }
        }

        exportTable(tableName, options)
            .then(result => {
                console.log('\n' + result)
            })
            .catch(console.error)
    }
}

module.exports = { model, connect, pool, exportTable, exportTables }
