'use strict';

const Pinger = require('minecraft-server-ping')
const RestResponses = require("../util/restResponses")
const TimeSeries = require('../util/dynamo').timeSeries()
const limiter = require('../util/rateLimiter')

module.exports.ping = async (event) => {
    try {
        await limiter.limit(1, event)
    } catch (e) {
        return RestResponses.rateLimited()
    }

    if (!event['queryStringParameters'] || !event['queryStringParameters']['host']) {
        return RestResponses.badRequest('Missing required parameters: \'host\'')
    }

    const host = event['queryStringParameters']['host']
    const port = event['queryStringParameters']['port'] ? parseInt(event['queryStringParameters']['port']) : 25565

    try {
        const data = await Pinger.ping(host, port)
        return RestResponses.success(data)
    } catch (e) {
        return RestResponses.internalServerError(e.message)
    }
}

module.exports.pingAndSave = async (event) => {
    for (const record of event['Records']) {
        try {
            const rec = JSON.parse(record['body'])
            const data = await Pinger.ping(rec.host, rec.port)
            const timeSeries = new TimeSeries({
                n: rec.name,
                t: Math.round(Date.now() / 1000),
                v: data.players.online
            })
            await timeSeries.save();
            console.log('successfully saved ' + JSON.stringify(timeSeries))
        } catch (e) {
            console.error('error occurred while saving ' + record['body'], e)
        }
    }
}