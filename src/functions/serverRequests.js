'use strict';

const Pinger = require('minecraft-server-ping')
const RestResponses = require("../util/restResponses")
const limiter = require("../util/rateLimiter");
const ServerRequest = require('../util/dynamo').serverRequests()

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

module.exports.fetchServerRequests = async (event) => {
    try {
        await limiter.limitPost(1, event)
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

module.exports.createServerRequest = async (event) => {
    try {
        await limiter.limitPost(1, event)
    } catch (e) {
        return RestResponses.rateLimited()
    }

    if (!event['body']) {
        return RestResponses.badRequest('Missing required parameters: \'name\', \'host\'')
    }

    const body = JSON.parse(event['body'])

    const host = body.host
    const name = body.name
    const port = body.port ? parseInt(body.port) : 25565

    if (!host) {
        return RestResponses.badRequest('Missing required parameters: \'host\'')
    }

    if (!name) {
        return RestResponses.badRequest('Missing required parameters: \'name\'')
    }

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

    // Server with this name cannot already exist
    try {
        const maybeServer = await ServerRequest.get(name.toUpperCase())
        if (maybeServer != null) {
            return RestResponses.badRequest('Server or request with this name already exists!')
        }
    } catch (e) {
        console.error(e)
        return RestResponses.internalServerError('Internal server error occurred [3]')
    }

    const serverRequest = new ServerRequest({
        name: name.toUpperCase(),
        host,
        port,
        players,
        time: Math.round(Date.now() / 1000),
        requestedBy: event.headers['X-Forwarded-For'].split(',')[0],
        status: 'PENDING'
    })

    try {
        await serverRequest.save()
    } catch (e) {
        console.error(e)
        return RestResponses.internalServerError('Internal server error occurred [4]')
    }


    return RestResponses.success({message: 'Successfully created server request'})
}