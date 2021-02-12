var eventproxy = require('eventproxy');
const qiniu = require("qiniu");
const proc = require("process");
var qn_access = require('../../config').qn_access;
var weapp_opts = require('../../config').weapp_opts;

var accesstoken = function (req, res, next) {
  var ep = new eventproxy();
  ep.fail(next);

  res.send({
    success: true,
    loginname: req.user.loginname,
    avatar_url: req.user.avatar_url,
    id: req.user.id
  });
};
exports.accesstoken = accesstoken;


var upload_token = function (req, res, next) {
  var ep = new eventproxy();
  ep.fail(next);
  var accessKey = qn_access.accessKey;
  var secretKey = qn_access.secretKey;
  var mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
  var bucket = qn_access.bucket;
  var options = {
    scope: bucket,
    expires: 60*60*24  //自定义凭证有效期(24小时)
  }
  var putPolicy = new qiniu.rs.PutPolicy(options);
  var uploadToken=putPolicy.uploadToken(mac);
  res.send({success: true, data: uploadToken});
}
exports.upload_token = upload_token;

var weapp_config = function (req, res, next) {
  var version = req.headers['version'];
  var ep = new eventproxy();
  ep.fail(next);
  if (version == weapp_opts.review_version) {
    res.send({success: true, data: {has_post: false, card_ads: weapp_opts.card_ads}});
  } else {
    res.send({success: true, data: {has_post: true, card_ads: weapp_opts.card_ads}});
  }
}
exports.weapp_config = weapp_config;

var ads = function (req, res, next) {
  var ep = new eventproxy();
  ep.fail(next);
    res.send(
      {
        success: true,
        data: {
          card_ads: [
          ]
        }
      });
}
exports.ads = ads;
