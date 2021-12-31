'use strict';

const limiter = require("../util/rateLimiter");
const RestResponses = require("../util/restResponses");
const {success} = require("../util/restResponses");
const ServerData = require('../util/dynamo').serverData()

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

module.exports.fetchServers = async (event) => {
    try {
        await limiter.limit(2, event)
    } catch (e) {
        return RestResponses.rateLimited()
    }

    const servers = await fetchServers()
    return success(servers)
}