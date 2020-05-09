var COS = require('cos-nodejs-sdk-v5');
var fs = require('fs');
var appid = 1252071452;

var cos = eval(fs.readFileSync('cos/cos_data.js').toString()); // product
// var cos = eval(fs.readFileSync('./cos_data.js').toString()); // develop test
var Bucket = 'kana' + '-' + String(appid);
var Region = 'ap-shanghai';


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