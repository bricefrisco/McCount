const dynamo = require('dynamodb')
const joi = require('joi')

dynamo.AWS.config.update({region: 'us-east-1'})

const TimeSeries = dynamo.define('timeseries', {
    hashKey: 'n',
    rangeKey: 't',
    schema: {
        n: joi.string().alphanum(),
        t: joi.number(),
        v: joi.number()
    }
})

TimeSeries.config({tableName: process.env.TIMESERIES_TABLE_NAME})

module.exports.timeSeries = () => { return TimeSeries }