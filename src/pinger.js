'use strict';

const pinger = require('minecraft-server-ping')
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

module.exports.ping = async (event) => {
    for (const record of event['Records']) {
        try {
            const rec = JSON.parse(record['body'])
            const data = await pinger.ping(rec.host, rec.port)
            const timeSeries = new TimeSeries({
                n: rec.name,
                t: Date.now(),
                v: data.players.online
            })
            await timeSeries.save();
            console.log('successfully saved ' + JSON.stringify(timeSeries))
        } catch (e) {
            console.error('error occurred while saving ' + record['body'], e)
        }
    }
}