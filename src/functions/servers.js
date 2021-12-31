'use strict';

const limiter = require("../util/rateLimiter");
const RestResponses = require("../util/restResponses");
const {success} = require("../util/restResponses");
const ServerData = require('../util/dynamo').serverData()

const fetchServers = () => {
    return new Promise((res, rej) => {
        ServerData.scan().loadAll().exec((err, data) => {
            if (err) {
                rej(err)
            } else {
                res(data['Items'])
            }
        })
    })
}

const deleteServer = (name) => {
    return new Promise((res, rej) => {
        ServerData.destroy(name, (err) => {
            if (err) {
                rej(err)
            } else {
                res('Successfully deleted server')
            }
        })
    })
}

module.exports.fetchServers = async (event) => {
    try {
        await limiter.limit(2, event)
    } catch (e) {
        return RestResponses.rateLimited()
    }

    const servers = await fetchServers()
    return success(servers)
}

module.exports.deleteServer = async (event) => {
    try {
        await limiter.limitPost(1, event)
    } catch (e) {
        return RestResponses.rateLimited()
    }

    if (!event['body']) {
        return RestResponses.badRequest('Missing required parameters \'name\'')
    }

    const body = JSON.parse(event['body'])
    const name = body.name

    if (!name) {
        return RestResponses.badRequest('Missing required parameter \'name\'')
    }

    try {
        const server = await ServerData.get(name.toUpperCase())
        if (server == null) {
            return RestResponses.notFound()
        }

        const result = await deleteServer(name.toUpperCase())
        return RestResponses.success({message: result})
    } catch (e) {
        console.error(e)
        return RestResponses.internalServerError(e.message)
    }
}