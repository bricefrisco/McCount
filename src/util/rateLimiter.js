const limiter = require('lambda-rate-limiter')({
    interval: 1000,
    uniqueTokenPerInterval: 500
})

module.exports.limit = async (requestsPerSecond, event) => {
    const ip = event.headers['X-Forwarded-For'].split(',')[0]
    console.log(`inbound request from ${ip}, params: ${JSON.stringify(event['queryStringParameters'])}`)
    await limiter.check(requestsPerSecond, ip)
}

module.exports.limitPost = async (requestsPerSecond, event) => {
    const ip = event.headers['X-Forwarded-For'].split(',')[0]
    console.log(`inbound request from ${ip}, body: ${event['body']}`)
    await limiter.check(requestsPerSecond, ip)
}