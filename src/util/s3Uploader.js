const AWS = require('aws-sdk')
const S3 = new AWS.S3();

module.exports.uploadFile = async (fileName, data) => {
    return new Promise((res, rej) => {
        const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
        console.log(base64Data)
        const binaryData = new Buffer(base64Data, 'base64')

        S3.putObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            Body: binaryData
        }, (err, data) => {
            if (err) {
                rej(err)
            } else {
                res(data)
            }
        })
    })
}