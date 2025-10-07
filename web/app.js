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

        if (!ctl || !act) {
            return reply.code(404).send({ error: 'Route not found' })
        }

        // Handle multipart/form-data for file uploads
        if (request.isMultipart && request.isMultipart()) {
            const parts = request.parts()
            const body = {}
            const files = {}
            
            for await (const part of parts) {
                if (part.file) {
                    // Handle file uploads
                    const buffer = await part.toBuffer()
                    files[part.fieldname] = {
                        filename: part.filename,
                        mimetype: part.mimetype,
                        buffer: buffer,
                        size: buffer.length
                    }
                } else {
                    // Handle regular form fields
                    body[part.fieldname] = part.value
                }
            }
            
            request.body = { ...request.body, ...body }
            request.files = files
        }

        // Load controller and execute action
        const controller = require(CTRL + ctl)
        if (typeof controller[act] !== 'function') {
            return reply.code(404).send({ error: 'Action not found' })
        }

        // Call controller action directly with Fastify request/reply
        await controller[act](request, reply)
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
