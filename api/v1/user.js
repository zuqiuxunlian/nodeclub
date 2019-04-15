var _ = require('lodash');
var validator = require('validator');
var eventproxy = require('eventproxy');
var jwt = require('jsonwebtoken');
var UserProxy = require('../../proxy').User;
var TopicProxy = require('../../proxy').Topic;
var ReplyProxy = require('../../proxy').Reply;
var TopicCollect = require('../../proxy').TopicCollect;
var WXBizDataCrypt = require('../../common/WXBizDataCrypt');
var WEIXIN_OAUTH = require('../../config').WEIXIN_OAUTH;
var jwtSecret = require('../../config').session_secret;
var models = require('../../models');
var User = models.User;
var tools = require('../../common/tools');
var got = require('got')
var uuid = require('node-uuid');
var shortid = require('shortid');

var show = function (req, res, next) {
  var loginname = req.params.loginname;
  var ep = new eventproxy();

  ep.fail(next);

  UserProxy.getUserByLoginName(loginname, ep.done(function (user) {
    if (!user) {
      res.status(404);
      return res.send({success: false, error_msg: '用户不存在'});
    }
    var query = {author_id: user._id};
    var opt = {limit: 15, sort: '-create_at'};
    TopicProxy.getTopicsByQuery(query, opt, ep.done('recent_topics'));

    ReplyProxy.getRepliesByAuthorId(user._id, {limit: 20, sort: '-create_at'},
        ep.done(function (replies) {
          var topic_ids = replies.map(function (reply) {
            return reply.topic_id.toString()
          });
          topic_ids = _.uniq(topic_ids).slice(0, 5); //  只显示最近5条

          var query = {_id: {'$in': topic_ids}};
          var opt = {};
          TopicProxy.getTopicsByQuery(query, opt, ep.done('recent_replies', function (recent_replies) {
            recent_replies = _.sortBy(recent_replies, function (topic) {
              return topic_ids.indexOf(topic._id.toString())
            });
            return recent_replies;
          }));
        }));

    ep.all('recent_topics', 'recent_replies',
        function (recent_topics, recent_replies) {

          user = _.pick(user, ['loginname', 'avatar_url', 'githubUsername',
            'create_at', 'score']);

          user.recent_topics = recent_topics.map(function (topic) {
            topic.author = _.pick(topic.author, ['loginname', 'avatar_url']);
            topic = _.pick(topic, ['id', 'author', 'title', 'last_reply_at']);
            return topic;
          });
          user.recent_replies = recent_replies.map(function (topic) {
            topic.author = _.pick(topic.author, ['loginname', 'avatar_url']);
            topic = _.pick(topic, ['id', 'author', 'title', 'last_reply_at']);
            return topic;
          });

          res.send({success: true, data: user});
        });
  }));
};

exports.show = show;

// 本站用戶綁定微信用戶
exports.weixinBind = function (req, res, next) {
  var token = validator.trim(req.body.token || req.query.token || req.headers['x-access-token']);
  var loginname = validator.trim(req.body.name).toLowerCase();
  var pass = validator.trim(req.body.pass);
  // TODO: 需要讨论一下绑定流程
}
exports.weixinLogin = async function (req, res, next) {
  try {
    var encryptedData = validator.trim(req.body.authInfo.encryptedData || '');
    var iv = validator.trim(req.body.authInfo.iv || '');
    var code = validator.trim(req.body.code || '');
    const resJson = await got(`https://api.weixin.qq.com/sns/jscode2session?appid=${WEIXIN_OAUTH.appid}&secret=${WEIXIN_OAUTH.secret}&js_code=${code}&grant_type=authorization_code`, {
      json: true
    });
    console.log(resJson.body)
    const sessionKey = resJson.body.session_key;
    var data = WXBizDataCrypt(WEIXIN_OAUTH.appid, sessionKey).decryptData(encryptedData, iv);
    var openid = data.openId
    let user = await User.where({
      openid: openid
    }).findOne()
    const userInfo = req.body.authInfo.userInfo || {}
    if (!user) { //找不到用户就创建用户
      user = new User();
      user.name = userInfo.nickName;
      user.location = userInfo.city;
      user.loginname = shortid.generate();
      user.pass = tools.bhash('');
      user.email = '';
      user.avatar = userInfo.avatarUrl;
      user.active = true;
      user.openid = openid;
      user.accessToken = uuid.v4();
      await user.save();
    } else { // 找到用戶就更新用戶
      await User.updateOne({
        openid: openid
      }, {
        name: userInfo.nickName,
        avatar: userInfo.avatarUrl
      })
    }
    // 生成jwt
    const token = jwt.sign({openid}, jwtSecret, {
      expiresIn: 60 * 60 * 24// 授权时效24小时
    });
    return res.status(200).json({
      success: true,
      data: token
    })
  } catch (e) {
    return res.status(500).json({
      success: false,
      error_msg: `服务器错误，${JSON.stringify(e)}`
    })
  }
}


exports.putAction = async function (req, res, next) {
  var pd = {
    loginname: req.body.loginname || null,
    name: req.body.name || null,
    email: req.body.email || null,
    url: req.body.url || null,
    location: req.body.location || null,
    weibo: req.body.weibo || null,
    signature: req.body.signature || null,
  }
  if (req.user) {
    Object.keys(pd).forEach(key => {
      if (pd[key] === null) delete pd[key]
    })

    if(pd.loginname){
      pd.loginname = pd.loginname.toLowerCase()
      if (pd.loginname.length < 5) {
        return res.status(500).json({
          success: false,
          error_msg: '用户名至少需要5个字符，不支持中文。'
        })
      }
      if (!tools.validateId(pd.loginname)) {
        return res.status(500).json({
          success: false,
          error_msg: '用户名不合法'
        })
      }

      const findIsUsed = await User.where({
        loginname:new RegExp('^'+pd.loginname+'$', "i")
      }).findOne()
      if(findIsUsed){
        return res.status(500).json({
          success: false,
          errno: 1,
          error_msg: '该用户名已使用'
        })
      }
    }
    if(pd.email){
      pd.email = pd.email.toLowerCase()
      const vailEmail = validator.isEmail(pd.email)
      if(!vailEmail){
        return res.status(500).json({
          success: false,
          error_msg: '请输入正确的邮箱'
        })
      }
      const findIsUsed = await User.where({
        email:new RegExp('^'+pd.email+'$', "i")
      }).findOne()
      if(findIsUsed){
        return res.status(500).json({
          success: false,
          errno: 2,
          error_msg: '该邮箱已使用'
        })
      }
    }
    await User.update({
      _id: req.user._id
    },pd)
    return res.status(200).json({
      success: true,
      error_msg: '修改成功'
    })
  } else {
    return res.status(403).json({
      success: false,
      error_msg: '请先登录获取token'
    })
  }
}
