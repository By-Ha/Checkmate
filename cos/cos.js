var COS = require('cos-nodejs-sdk-v5');
var fs = require('fs');

var cos = eval(require('../config').cos_data); // product
var appid = Number(require('../config').cos_appid);
var Bucket = require('../config').cos_bucket + '-' + String(appid);
var Region = require('../config').cos_region;


function getFile(path = '/', callback) {
    cos.getBucket({
        Bucket: Bucket, /* 必须 */
        Region: Region,     /* 必须 */
        Prefix: path,           /* 非必须 */
    }, function (err, data) {
        if (err) callback(err);
        else callback(null, data.Contents);
    });
}

function uploadFile(filepath, filename, remotepath, remotename) {
    cos.putObject({
        Bucket: Bucket, /* 必须 */
        Region: Region,    /* 必须 */
        Key: remotepath + '/' + remotename,              /* 必须 */
        StorageClass: 'STANDARD',
        Body: fs.createReadStream(filepath + '/' + filename), // 上传文件对象
        onProgress: function (progressData) {
            // console.log(JSON.stringify(progressData));
        }
    }, function (err, data) {
        // console.log(err || data);
    });
}


function hasFile(key) {
    cos.headObject({
        Bucket: Bucket, /* 必须 */
        Region: Region,    /* 必须 */
        Key: key,               /* 必须 */
    }, function (err, data) {
        // console.log(err || data);
    });
}

function downloadFile(key, outputPath) {
    cos.getObject({
        Bucket: Bucket, /* 必须 */
        Region: Region,    /* 必须 */
        Key: key,
        Output: fs.createWriteStream(outputPath + '/' + key),
    }, function (err, data) {
        // console.log(err || data);
    });
}

function deleteFile(key) {
    cos.deleteObject({
        Bucket: Bucket, /* 必须 */
        Region: Region,    /* 必须 */
        Key: key
    }, function (err, data) {
        // console.log(err || data);
    });
}

function getAuthorization(key) {
    var url = cos.getObjectUrl({
        Bucket: Bucket,
        Region: Region,
        Key: key
    });
    return url;
}

module.exports = {
    uploadFile
}