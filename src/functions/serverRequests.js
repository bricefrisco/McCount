'use strict';

const Pinger = require('minecraft-server-ping')
const RestResponses = require("../util/restResponses")
const limiter = require("../util/rateLimiter");
const ServerRequest = require('../util/dynamo').serverRequests()
const ServerData = require('../util/dynamo').serverData()
const S3 = require('../util/s3Uploader')
const Servers = require('../functions/servers')

const fetchServerRequestsByStatus = (status) => {
    return new Promise((res, rej) => {
        ServerRequest.query(status).usingIndex('status-date-index').exec((err, data) => {
            if (err) {
                rej(err)
            } else {
                res(data['Items'])
            }
        })
    })
}

module.exports.fetchServerRequest = async (event) => {
    try {
        await limiter.limit(3, event)
    } catch (e) {
        return RestResponses.rateLimited()
    }

    if (!event['queryStringParameters']) {
        return RestResponses.badRequest('Missing required parameter \'host\'')
    }

    let host = event['queryStringParameters']['host']

    if (!host) {
        return RestResponses.badRequest('Missing required parameter \'host\'')
    }

    host = host.toLowerCase()

    try {
        const serverRequest = await ServerRequest.get(host)
        if (serverRequest == null) {
            return RestResponses.notFound();
        }
        return RestResponses.success(serverRequest);
    } catch (e) {
        console.error(e)
        return RestResponses.internalServerError('Internal server error occurred [6]')
    }
}

module.exports.fetchServerRequests = async (event) => {
    try {
        await limiter.limit(3, event)
    } catch (e) {
        return RestResponses.rateLimited()
    }

    if (!event['queryStringParameters']) {
        return RestResponses.badRequest('Missing required parameter \'status\'')
    }

    const status = event['queryStringParameters']['status']
    if (!status) {
        return RestResponses.badRequest('Missing required parameter \'status\'')
    }

    try {
        const data = await fetchServerRequestsByStatus(status.toUpperCase())
        return RestResponses.success(data)
    } catch (e) {
        console.error(e)
        return RestResponses.internalServerError('Internal server error occurred [5]')
    }
}

module.exports.modifyServerRequest = async (event) => {
    if (!event['body']) {
        return RestResponses.badRequest('Missing required parameters \'host\', \'name\', \'status\'')
    }

    const body = JSON.parse(event['body']);
    let host = body.host
    let name = body.name
    let status = body.status
    const deniedReason = body.deniedReason

    if (!host) {
        return RestResponses.badRequest('Missing required parameter \'host\'')
    }

    if (!status) {
        return RestResponses.badRequest('Missing required parameter \'status\'')
    }

    status = status.toUpperCase()

    if (!['PENDING', 'APPROVED', 'DENIED'].includes(status)) {
        return RestResponses.badRequest('Invalid status. Must be \'PENDING\', \'APPROVED\', or \'DENIED\'')
    }

    if (status === 'APPROVED' && !name) {
        return RestResponses.badRequest('Missing required parameter \'name\'')
    }

    host = host.toLowerCase()

    if (name) {
        name = name.toUpperCase()
    }

    if (status.toUpperCase() === 'DENIED' && !deniedReason) {
        return RestResponses.badRequest('Missing required parameter \'deniedReason\'')
    }

    // Validate the server request exists
    let serverRequest
    try {
        serverRequest = await ServerRequest.get(host)
        if (!serverRequest) {
            return RestResponses.notFound();
        }
    } catch (e) {
        console.error(e)
        return RestResponses.internalServerError(e.message)
    }

    try {
        if (status.toUpperCase() === 'DENIED') {
            // If server exists, remove it
            if (serverRequest.attrs.name) {
                try {
                    await Servers.deleteServerInternal(serverRequest.attrs.name);
                } catch (e) {
                    console.error(e)
                }
            }

            await ServerRequest.update({host, status, deniedReason})
        } else if (serverRequest.attrs.status === 'DENIED') {
            await ServerRequest.update({host, name, status, deniedReason: null})
        } else {
            await ServerRequest.update({host, name, status})
        }
    } catch (e) {
        console.error(e)
        return RestResponses.internalServerError(e.message)
    }

    // If status is 'APPROVED', upload server image to S3 and create the server
    if (status.toUpperCase() === 'APPROVED') {

        // Ping the server
        let data
        try {
            data = await Pinger.ping(serverRequest.attrs.host, serverRequest.attrs.port)
        } catch (e) {
            return RestResponses.internalServerError(e.message)
        }

        // Upload to S3
        try {
            await S3.uploadFile(name.toLowerCase() + '.png', data['favicon'])
        } catch (e) {
            console.error(e)
            return RestResponses.internalServerError(e.message)
        }

        // Save the server
        await ServerData.create({
            name: name,
            time: Math.round(Date.now() / 1000),
            players: serverRequest.attrs.players,
            host: serverRequest.attrs.host,
            port: serverRequest.attrs.port
        })

        return RestResponses.success({message: 'Successfully added server'})
    }

    return RestResponses.success({message: 'Successfully updated server request'})
}

module.exports.createServerRequest = async (event) => {
    try {
        await limiter.limitPost(1, event)
    } catch (e) {
        return RestResponses.rateLimited()
    }

    if (!event['body']) {
        return RestResponses.badRequest('Missing required parameters: \'host\'')
    }

    const body = JSON.parse(event['body'])

    let host = body.host
    const port = body.port ? parseInt(body.port) : 25565

    if (!host) {
        return RestResponses.badRequest('Missing required parameters: \'host\'')
    }

    host = host.toLowerCase()

    let data
    try {
        data = await Pinger.ping(host, port)
    } catch (e) {
        return RestResponses.internalServerError(e.message)
    }

    // Server must have >10 players
    const players = data.players.online
    if (players < 10) {
        return RestResponses.badRequest('Server must have >=10 players online (has ' + players + ')')
    }

    // Server with this host cannot already exist
    try {
        const maybeServer = await ServerRequest.get(host.toLowerCase())
        if (maybeServer != null) {
            return RestResponses.badRequest('Server or request with this host already exists!')
        }
    } catch (e) {
        console.error(e)
        return RestResponses.internalServerError('Internal server error occurred [3]')
    }

    const serverRequest = new ServerRequest({
        host,
        port,
        players,
        time: Math.round(Date.now() / 1000),
        requestedBy: event.headers['X-Forwarded-For'].split(',')[0],
        status: 'PENDING'
    })

    // Save server request
    try {
        await serverRequest.save()
    } catch (e) {
        console.error(e)
        return RestResponses.internalServerError('Internal server error occurred [4]')
    }


    return RestResponses.success({message: 'Successfully created server request'})
}