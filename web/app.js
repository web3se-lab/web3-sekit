require('dotenv').config()

const fastify = require('fastify')({
    logger: false,
    bodyLimit: 10 * 1024 * 1024 // 10MB limit
})
const ROOT = require('app-root-path')

const CTRL = `${ROOT}/web/`

// Register CORS plugin
fastify.register(require('@fastify/cors'), {
    origin: '*',
    methods: '*',
    allowedHeaders: ['Content-Type'],
    credentials: true
})

// Register multipart plugin for file uploads
fastify.register(require('@fastify/multipart'), {
    limits: {
        fieldNameSize: 100,
        fieldSize: 5 * 1024 * 1024, // 10MB
        fields: 10,
        fileSize: 5 * 1024 * 1024, // 10MB
        files: 5,
        headerPairs: 2000
    }
})

// Register static files plugin for serving favicon
fastify.register(require('@fastify/static'), {
    root: `${ROOT}/static`,
    prefix: '/static/'
})

// Home route
fastify.get('/', async (request, reply) => {
    return reply.type('text/html').send(`
        <h1>Web3 Crack API</h1>
        <a href="https://github.com/decentralizedlab/web3-crack">See Documentation</a>`)
})

// Favicon route handler
fastify.get('/favicon.ico', async (request, reply) => {
    return reply.redirect('/static/favicon.ico')
})

// MVC router - handle GET and POST routes only
const handleMVCRoute = async (request, reply) => {
    try {
        const { controller: ctl, action: act } = request.params

        if (!ctl || !act) return reply.code(404).send({ error: 'Route not found' })

        // Convert GET query parameters to body for compatibility
        if (request.method === 'GET') request.body = request.query || {}

        // Load controller and execute action
        const controller = require(CTRL + ctl)
        if (typeof controller[act] !== 'function') return reply.code(404).send({ error: 'Action not found' })

        // Create Express-like req/res objects for compatibility
        const path = `/${ctl}/${act}`
        const req = {
            ...request,
            path: path,
            method: request.method,
            body: request.body,
            query: request.query,
            params: request.params,
            headers: request.headers
        }

        const res = {
            send: data => reply.send(data),
            json: data => reply.send(data),
            status: code => reply.code(code),
            header: (name, value) => reply.header(name, value),
            sendStatus: code => reply.code(code).send(),
            end: () => reply.send()
        }

        const next = error => {
            if (error) {
                console.error(error)
                reply.code(500).send({ error: error.message })
            }
        }

        await controller[act](req, res, next)
    } catch (e) {
        console.error(e)
        reply.code(500).send({ error: e.message })
    }
}

// Register MVC routes for GET and POST methods
fastify.get('/:controller/:action', handleMVCRoute)
fastify.post('/:controller/:action', handleMVCRoute)

// Start server
const start = async () => {
    try {
        fastify.listen({
            port: process.env.WEB_PORT || 3000,
            host: '0.0.0.0'
        })
        console.log(`Server listening on port ${process.env.WEB_PORT || 3000}`)
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

start()
