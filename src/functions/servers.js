'use strict';

const limiter = require("../util/rateLimiter");
const RestResponses = require("../util/restResponses");
const {success} = require("../util/restResponses");
const ServerData = require('../util/dynamo').serverData()

const fetchServersPaginated = (players) => {
    return new Promise((res, rej) => {
        if (!players) {
            ServerData.query('ACTIVE').usingIndex('active-server-player-count')
                .where('players').lt(99999999).limit(25)
                .exec((err, data) => {
                    if (err) {
                        rej(err)
                    } else {
                        res(data['Items'])
                    }
                })
        } else {
            ServerData.query('ACTIVE').usingIndex('active-server-player-count')
                .where('players').lte(parseInt(players)).limit(25)
                .exec((err, data) => {
                    if (err) {
                        rej(err)
                    } else {
                        res(data['Items'])
                    }
                })
        }
    })
}

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
        await limiter.limit(3, event);
    } catch (e) {
        return RestResponses.rateLimited()
    }

    const players = (event['queryStringParameters'] && event['queryStringParameters']['playersLt'])
        && event['queryStringParameters']['playersLt']

    try {
        const data = await fetchServersPaginated(players);
        return RestResponses.success(data);
    } catch (e) {
        console.error(e)
        return RestResponses.internalServerError('Internal server error occurred [7]')
    }
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

module.exports.fetchServersInternal = async () => {
    return fetchServers()
}

module.exports.deleteServerInternal = async(name) => {
    return deleteServer(name);
}