module.exports.badRequest = (message) => {
    return {
        statusCode: 400,
        body: JSON.stringify({message}),
        headers: {
            'Access-Control-Allow-Origin': process.env.CORS_ALLOWED_ORIGINS,
            'Access-Control-Allow-Headers': process.env.CORS_ALLOWED_HEADERS,
            'Access-Control-Allow-Methods': process.env.CORS_ALLOWED_METHODS,
        }
    }
}

module.exports.notFound = () => {
    return {
        statusCode: 404,
        body: JSON.stringify({message: 'Resource not found'}),
        headers: {
            'Access-Control-Allow-Origin': process.env.CORS_ALLOWED_ORIGINS,
            'Access-Control-Allow-Headers': process.env.CORS_ALLOWED_HEADERS,
            'Access-Control-Allow-Methods': process.env.CORS_ALLOWED_METHODS,
        }
    }
}

module.exports.rateLimited = () => {
    return {
        statusCode: 429,
        body: JSON.stringify({message: 'Rate limit exceeded'}),
        headers: {
            'Access-Control-Allow-Origin': process.env.CORS_ALLOWED_ORIGINS,
            'Access-Control-Allow-Headers': process.env.CORS_ALLOWED_HEADERS,
            'Access-Control-Allow-Methods': process.env.CORS_ALLOWED_METHODS,
        }
    }
}

module.exports.internalServerError = (message) => {
    return {
        statusCode: 500,
        body: JSON.stringify({message}),
        headers: {
            'Access-Control-Allow-Origin': process.env.CORS_ALLOWED_ORIGINS,
            'Access-Control-Allow-Headers': process.env.CORS_ALLOWED_HEADERS,
            'Access-Control-Allow-Methods': process.env.CORS_ALLOWED_METHODS,
        }
    }
}

module.exports.success = (data) => {
    return {
        statusCode: 200,
        body: JSON.stringify(data),
        headers: {
            'Access-Control-Allow-Origin': process.env.CORS_ALLOWED_ORIGINS,
            'Access-Control-Allow-Headers': process.env.CORS_ALLOWED_HEADERS,
            'Access-Control-Allow-Methods': process.env.CORS_ALLOWED_METHODS,
        }
    }
}