const dynamo = require('dynamodb')
const joi = require('joi')

dynamo.AWS.config.update({region: 'us-east-1'})

const TimeSeries = dynamo.define('timeseries', {
    hashKey: 'n',
    rangeKey: 't',
    schema: {
        n: joi.string(),
        t: joi.number(),
        v: joi.number()
    }
})

TimeSeries.config({tableName: process.env.TIMESERIES_TABLE_NAME})

const ServerRequests = dynamo.define('server-requests', {
    hashKey: 'name',
    schema: {
        name: joi.string(),
        host: joi.string(),
        port: joi.number(),
        time: joi.number(),
        players: joi.number(),
        requestedBy: joi.string(),
        status: joi.string(),
        deniedReason: joi.string()
    }
})

ServerRequests.config({tableName: process.env.SERVER_REQUESTS_TABLE_NAME})

module.exports.timeSeries = () => { return TimeSeries }
module.exports.serverRequests = () => { return ServerRequests }