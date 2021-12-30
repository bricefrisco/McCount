module.exports.badRequest = (message) => {
    return {
        statusCode: 400,
        body: JSON.stringify({message})
    }
}

module.exports.internalServerError = (message) => {
    return {
        statusCode: 500,
        body: JSON.stringify({message})
    }
}

module.exports.rateLimited = () => {
    return {
        statusCode: 429,
        body: JSON.stringify({message: 'Rate limit exceeded'})
    }
}

module.exports.success = (data) => {
    return {
        statusCode: 200,
        body: JSON.stringify(data)
    }
}