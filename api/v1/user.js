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
var models = require('../../models');
var User = models.User;
var tools = require('../../common/tools');
var jwtSecret = 'k4TrFwWSGAFPE7MdAh1NrZ5YZHKbrkW5'
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

// 登录获取token
exports.login = function (req, res, next) {
    var loginname = validator.trim(req.body.name).toLowerCase();
    var pass = validator.trim(req.body.pass);
    var ep = new eventproxy();

    ep.fail(next);

    if (!loginname || !pass) {
        res.status(422);
        return res.render('sign/signin', {error: '信息不完整。'});
    }

    var getUser;
    if (loginname.indexOf('@') !== -1) {
        getUser = User.getUserByMail;
    } else {
        getUser = User.getUserByLoginName;
    }

    ep.on('login_error', function (login_error) {
        res.status(403);
        return res.json({success: false, error_msg: '用户或密码错误'});
    });

    getUser(loginname, function (err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return ep.emit('login_error');
        }
        var passhash = user.pass;
        tools.bcompare(pass, passhash, ep.done(function (bool) {
            if (!bool) {
                return ep.emit('login_error');
            }
            if (!user.active) {
                // 重新发送激活邮件
                mail.sendActiveMail(user.email, utility.md5(user.email + passhash + config.session_secret), user.loginname);
                res.status(403);
                return res.json({success: false, error_msg: '此帐号还没有被激活，激活链接已发送到 ' + user.email + ' 邮箱，请查收。'});
            }
            // 生成jwt
            var token = jwt.sign(user._id, jwtSecret, {
                expiresIn: 60 * 60 * 24// 授权时效24小时
            });
            return res.json({success: true, error_msg: '', data: token});
        }));
    });
};

exports.wxAuth = function (req, res, next) {
    var encryptedData = validator.trim(req.body.encryptedData || '');
    var iv = validator.trim(req.body.iv || '');
    var token = validator.trim(req.body.token || req.query.token || req.headers['x-access-token']);
    var data = WXBizDataCrypt(WEIXIN_OAUTH.appid, WEIXIN_OAUTH.secret).decryptData(encryptedData, iv);
    var openid = data.openId
    var ep = new eventproxy();
    var userId = ''
    if (token) {
        // 解码 token (验证 secret 和检查有效期（exp）)
        jwt.verify(token, jwtSecret, function (err, _decoded) {
            if (err) {
                return res.json({success: false, error_msg: '无效的token.'});
            } else {
                // 如果验证通过，在req中写入解密结果
                userId = _decoded;
            }
        });
    } else {
        return res.status(403).json({
            success: false,
            error_msg: '请先登录获取token'
        })
    }
    ep.fail(next);
    UserProxy.getUserByOpenid(openid, ep.done(function (user) {
        if (!user) {
            // 通过openid找不到用户就绑定当前用户
            UserProxy.getUserById(userId, ep.done(function (user2) {
                if (!user2) {
                    // 还找不到就是当前用户已删除
                    return res.status(404).json({
                        success: false,
                        error_msg: '无法找到该用户，请重新登陆获取token'
                    })
                }
                User.update({
                    _id: user2._id
                }, {
                    openid: openid
                })

                return res.status(200).json({
                    success: true,
                    error_msg: '绑定成功',
                    data: {
                        name: user2.name,
                        profile_image_url: user2.profile_image_url,
                        score: user2.score,
                    }
                })
            }))
        }
        // 找到该用户说明已绑定，直接更新用户信息
        User.update({
            _id: user._id
        }, {
            wxUserInfo: req.body.userInfo
        })
        //返回登陆用户信息
        return res.status(200).json({
            success: true,
            error_msg: '登录成功',
            data: {
                name: user.name,
                profile_image_url: user.profile_image_url,
                score: user.score,
            }
        })
    }))
}


exports.putAction = function (req, res, next) {
    var token = validator.trim(req.body.token || req.query.token || req.headers['x-access-token']);
    var name = req.body.name || '';
    var pass = req.body.pass || '';
    if (token) {
        // 解码 token (验证 secret 和检查有效期（exp）)
        jwt.verify(token, jwtSecret, function (err, userId) {
            if (err) {
                return res.json({success: false, error_msg: '无效的token.'});
            } else {
                var pd = {}
                if (name) {
                    pd.name = name
                }
                if (pass) {
                    tools.bhash(pass, function (passhash) {
                        pd.pass = passhash
                        User.update({
                            _id: userId
                        }, pd)
                    })
                } else {
                    User.update({
                        _id: userId
                    }, pd)
                }

            }
        });
    } else {
        return res.status(403).json({
            success: false,
            error_msg: '请先登录获取token'
        })
    }
}