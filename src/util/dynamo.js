const dynamo = require('dynamodb')
const joi = require('joi')
dynamo.AWS.config.update({region: 'us-east-1'})


// --- TimeSeries --- //
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

// --- ServerRequests --- //
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
    },
    indexes: [{
        hashKey: 'status', name: 'status-date-index', type: 'global'
    }]
})
ServerRequests.config({tableName: process.env.SERVER_REQUESTS_TABLE_NAME})

// --- ServerData --- //
const ServerData = dynamo.define('server-data', {
    hashKey: 'name',
    schema: {
        name: joi.string(),
        time: joi.number(),
        players: joi.number(),
        host: joi.string(),
        port: joi.number()
    },
    indexes: [{
        hashKey: 'name', rangeKey: 'players', name: 'player-count-index', type: 'global'
    }]
})
ServerData.config({tableName: process.env.SERVER_DATA_TABLE_NAME})


module.exports.timeSeries = () => { return TimeSeries }
module.exports.serverRequests = () => { return ServerRequests }
module.exports.serverData = () => { return ServerData }