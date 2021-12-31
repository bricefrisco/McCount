'use strict';

const TimeSeries = require('../util/dynamo').timeSeries();
const RestResponses = require('../util/restResponses');

const limiter = require('../util/rateLimiter')

const fetchTimeSeries = (serverName, start, end) => {
    return new Promise((res, rej) => {
        TimeSeries.query(serverName).where('t').between(start, end)
            .limit(100).exec((err, data) => {
           if (err) {
               rej(err)
           } else {
               res(data['Items'].map(item => ({time: item.attrs.t, value: item.attrs.v})))
           }
        })
    })
}

module.exports.fetchTimeSeries = async (event) => {
    try {
        await limiter.limit(3, event)
    } catch (e) {
        return RestResponses.rateLimited()
    }

    if (!event['queryStringParameters']) {
        return RestResponses.badRequest('Missing required parameters: \'serverName\', \'start\', \'end\'')
    }

    const serverName = event['queryStringParameters']['serverName']
    const start = event['queryStringParameters']['start']
    const end = event['queryStringParameters']['end']

    if (!serverName) {
        return RestResponses.badRequest('Missing required parameter \'serverName\'')
    }

    if (!start) {
        return RestResponses.badRequest('Missing required parameter \'start\'')
    }

    if (!end) {
        return RestResponses.badRequest('Missing required parameter \'end\'')
    }

    try {
        const data = await fetchTimeSeries(serverName, parseInt(start), parseInt(end));
        return RestResponses.success(data)
    } catch (e) {
        console.error(e)
        return RestResponses.internalServerError('Internal server error occurred [2]')
    }
}