'use strict';
const Pinger = require('minecraft-server-ping')
const TimeSeries = require('../util/dynamo').timeSeries();

module.exports.pingAndSave = async (event) => {
    for (const record of event['Records']) {
        try {
            const rec = JSON.parse(record['body'])
            const data = await Pinger.ping(rec.host, rec.port)
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