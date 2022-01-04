'use strict'

const { Producer } = require('sqs-producer')
const {fetchServersInternal} = require("./servers");

const producer = Producer.create({
    queueUrl: process.env.SQS_QUEUE_URL,
    region: 'us-east-1'
});

module.exports.loadQueue = async (event) => {
    const servers = await fetchServersInternal()

    for (const server of servers) {
        try {
            await producer.send({
                id: server.attrs.name.replace(/ /g, ''),
                body: JSON.stringify({
                    name: server.attrs.name,
                    host: server.attrs.host,
                    port: server.attrs.port
                })
            })
        } catch (e) {
            console.error('Error occurred sending server ' + JSON.stringify(server) + ': ' + e)
        }

        console.log(`successfully sent ${server.attrs.name} to sqs`)
    }
}