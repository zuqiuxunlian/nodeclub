var UserModel  = require('../../models').User;
var eventproxy = require('eventproxy');
var validator  = require('validator');
var jwtSecret = require('../../config').session_secret;
var jwt = require('jsonwebtoken');

// 非登录用户直接屏蔽
var auth = function (req, res, next) {
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  let openid = '';
  if (token) {
    // 解码 token (验证 secret 和检查有效期（exp）)
    jwt.verify(token, jwtSecret, function (err, tokenObj) {
      if (err) {
        return res.json({success: false, error_msg: '无效的token.'});
      } else {
        openid = tokenObj.openid
      }
    });
  }

  if(openid){ // 优先使用jwt的openid
    return UserModel.where({
      openid
    }).findOne().then(user=>{
      if (!user) {
        res.status(401);
        return res.send({success: false, error_msg: '错误的accessToken'});
      }
      if (user.is_block) {
        res.status(403);
        return res.send({success: false, error_msg: '您的账户被禁用'});
      }
      req.user = user;
      next();
    })
  }
  var ep = new eventproxy();
  ep.fail(next);

  var accessToken = String(req.body.accesstoken || req.query.accesstoken || '');
  accessToken = validator.trim(accessToken);

  UserModel.findOne({accessToken: accessToken}, ep.done(function (user) {
    if (!user) {
      res.status(401);
      return res.send({success: false, error_msg: '错误的accessToken'});
    }
    if (user.is_block) {
      res.status(403);
      return res.send({success: false, error_msg: '您的账户被禁用'});
    }
    req.user = user;
    next();
  }));

};

exports.auth = auth;

// 非登录用户也可通过
var tryAuth = function (req, res, next) {
  var ep = new eventproxy();
  ep.fail(next);

  var accessToken = String(req.body.accesstoken || req.query.accesstoken || '');
  accessToken = validator.trim(accessToken);

  UserModel.findOne({accessToken: accessToken}, ep.done(function (user) {
    if (!user) {
      return next()
    }
    if (user.is_block) {
      res.status(403);
      return res.send({success: false, error_msg: '您的账户被禁用'});
    }
    req.user = user;
    next();
  }));

};

exports.tryAuth = tryAuth;
