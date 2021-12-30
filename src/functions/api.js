'use strict';

const TimeSeries = require('../util/dynamo').timeSeries();
const RestResponses = require('../util/restResponses');

const limiter = require('lambda-rate-limiter')({
    interval: 1000,
    uniqueTokenPerInterval: 500
})

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
    const ip = event.headers['X-Forwarded-For'].split(',')[0]

    console.log(`inbound request from ${ip}, params: ${JSON.stringify(event['queryStringParameters'])}`)

    try {
        await limiter.check(3, ip)
    } catch (e) {
        console.log(`rate limited: ${ip}`)
        return RestResponses.rateLimited()
    }

    if (!event['queryStringParameters']) {
        return RestResponses.badRequest('Missing required fields: \'serverName\', \'time\', \'backwards\'')
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
        return RestResponses.internalServerError('Internal server error [2]')
    }
}