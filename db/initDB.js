require('dotenv').config()
const Sequelize = require('sequelize')
const { once } = require('events')
const Model = require('./Model')

const DEFAULT_BATCH_SIZE = 1000

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
            includeFields = null,
            excludeFields = [],
            where = {},
            limit = null,
            format = 'json',
            streamTo = null,
            batchSize = DEFAULT_BATCH_SIZE
        } = options

        await connect()
        const models = model()
        const { tableModel, tableSchema, fields } = prepareTableContext(models, tableName, includeFields, excludeFields)

        const lowerFormat = format.toLowerCase()
        if (lowerFormat === 'csv' && streamTo) {
            return await exportTableCsvStream({
                tableName,
                tableModel,
                tableSchema,
                fields,
                where,
                limit,
                stream: streamTo,
                batchSize
            })
        }

        console.log(`Exporting table: ${tableName}`)

        const structure = buildTableStructure(tableSchema)
        const queryOptions = {
            where,
            raw: true,
            attributes: fields
        }

        if (limit) {
            queryOptions.limit = limit
        }

        const data = await tableModel.findAll(queryOptions)

        console.log(`Found ${data.length} records`)

        const result = {
            structure,
            data,
            meta: {
                tableName,
                tableDisplayName: tableSchema.name,
                recordCount: data.length,
                exportTime: new Date().toISOString(),
                fields,
                excludedFields: excludeFields,
                queryConditions: where
            }
        }

        switch (lowerFormat) {
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

function prepareTableContext(models, tableName, includeFields, excludeFields) {
    if (!models[tableName]) {
        throw new Error(`Table ${tableName} not found`)
    }

    const tableSchema = Model[tableName]
    const allFields = Object.keys(tableSchema.table)

    let fields
    if (includeFields && Array.isArray(includeFields) && includeFields.length) {
        fields = includeFields.filter(field => allFields.includes(field) && !excludeFields.includes(field))
    } else if (excludeFields && excludeFields.length) {
        fields = allFields.filter(field => !excludeFields.includes(field))
    } else {
        fields = allFields
    }

    if (!fields.length) {
        throw new Error(`No fields selected for export on table ${tableName}`)
    }

    return {
        tableModel: models[tableName],
        tableSchema,
        fields
    }
}

function buildTableStructure(tableSchema) {
    const structure = {
        name: tableSchema.name,
        fields: {},
        options: tableSchema.options
    }

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

    return structure
}

async function exportTableCsvStream({
    tableName,
    tableModel,
    tableSchema,
    fields,
    where,
    limit,
    stream,
    batchSize = DEFAULT_BATCH_SIZE
}) {
    const hasLimit = typeof limit === 'number' && limit >= 0
    const targetCount = hasLimit ? limit : Infinity
    let totalRows = 0
    let offset = 0
    const effectiveBatchSize = batchSize > 0 ? batchSize : DEFAULT_BATCH_SIZE

    await writeLine(stream, fields.join(','))

    while (totalRows < targetCount) {
        const remaining = targetCount - totalRows
        const currentLimit = hasLimit ? Math.min(effectiveBatchSize, remaining) : effectiveBatchSize
        if (hasLimit && currentLimit <= 0) break

        const rows = await tableModel.findAll({
            where,
            raw: true,
            attributes: fields,
            offset,
            limit: currentLimit
        })

        if (!rows.length) break

        for (const row of rows) {
            const values = fields.map(field => formatCsvValue(row[field]))
            await writeLine(stream, values.join(','))
        }

        totalRows += rows.length
        offset += rows.length

        if (rows.length < currentLimit) break
    }

    return {
        rowsWritten: totalRows,
        meta: {
            tableName,
            tableDisplayName: tableSchema.name,
            fields,
            exportTime: new Date().toISOString(),
            limit,
            batchSize: effectiveBatchSize
        }
    }
}

async function writeLine(stream, line) {
    if (!stream.write(`${line}\n`)) {
        await once(stream, 'drain')
    }
}

function formatCsvValue(value) {
    if (value === null || value === undefined) return ''

    if (typeof value === 'object') {
        value = JSON.stringify(value)
    }

    if (typeof value === 'string') {
        const needsEscaping = /[",\n\r]/.test(value)
        const escaped = value.replace(/"/g, '""')
        return needsEscaping ? `"${escaped}"` : escaped
    }

    return value
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
        const values = headers.map(header => formatCsvValue(row[header]))
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
                options.limit = parseInt(arg.split('=')[1], 10)
            } else if (arg.startsWith('--batchSize=')) {
                options.batchSize = parseInt(arg.split('=')[1], 10)
            } else if (arg.startsWith('--batch=')) {
                options.batchSize = parseInt(arg.split('=')[1], 10)
            }
        }

        if (Number.isNaN(options.limit)) delete options.limit
        if (Number.isNaN(options.batchSize)) delete options.batchSize

        const format = (options.format || 'json').toLowerCase()

        if (format === 'csv') {
            exportTable(tableName, { ...options, streamTo: process.stdout })
                .then(summary => {
                    const rows = summary ? summary.rowsWritten : 0
                    console.error(`\nExported ${rows} rows from ${tableName}`)
                })
                .catch(error => {
                    console.error(error)
                    process.exitCode = 1
                })
        } else {
            exportTable(tableName, options)
                .then(result => {
                    console.log('\n' + result)
                })
                .catch(error => {
                    console.error(error)
                    process.exitCode = 1
                })
        }
    }
}

module.exports = { model, connect, pool, exportTable, exportTables }
