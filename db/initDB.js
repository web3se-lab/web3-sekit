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

if (process.argv[1].includes('DB')) {
    if (process.argv[2] == 'test') connect()
    if (process.argv[2] == 'init') init(process.argv[3])
    if (process.argv[2] == 'drop') drop(process.argv[3])
}

module.exports = { model, connect, pool }
