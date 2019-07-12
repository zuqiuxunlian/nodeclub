var express           = require('express');
var topicController   = require('./api/v1/topic');
var topicCollectController   = require('./api/v1/topic_collect');
var userController    = require('./api/v1/user');
var toolsController   = require('./api/v1/tools');
var replyController   = require('./api/v1/reply');
var messageController = require('./api/v1/message');
var middleware        = require('./api/v1/middleware');
var limit             = require('./middlewares/limit');
var config            = require('./config');

var router            = express.Router();


// 主题
router.get('/topics', topicController.index);
router.get('/topic/:id', middleware.tryAuth, topicController.show);
router.post('/topics', middleware.auth, limit.peruserperday('create_topic', config.create_post_per_day, {showJson: true}), topicController.create);
router.post('/topics/:id', middleware.auth, topicController.update);
router.delete('/topics/:id', middleware.auth, topicController.delete);

// 主题收藏
router.post('/topic_collect/collect', middleware.auth, topicCollectController.collect); // 关注某话题
router.post('/topic_collect/de_collect', middleware.auth, topicCollectController.de_collect); // 取消关注某话题
router.get('/topic_collect/:loginname', topicCollectController.list);

// 用户
router.get('/user/:loginname', userController.show);
router.post('/user/weixin/login', userController.weixinLogin);
router.get('/me', middleware.auth, userController.me);
router.post('/me', middleware.auth, userController.update);
router.post('/me/change_password', middleware.auth, userController.changePassword);

// accessToken 测试
router.post('/accesstoken', middleware.auth, toolsController.accesstoken);
// 七牛的上传token
// REVIEW: 此处存在被滥用风险
router.get('/upload_token', toolsController.upload_token);
// 小程序的动态设置
router.get('/weapp_config', toolsController.weapp_config);
// 小程序的首页广告
router.get('/ads', toolsController.ads);

// 评论
router.post('/topic/:topic_id/replies', middleware.auth, limit.peruserperday('create_reply', config.create_reply_per_day, {showJson: true}), replyController.create);
router.delete('/reply/:reply_id', middleware.auth, replyController.delete);
router.post('/reply/:reply_id/ups', middleware.auth, replyController.ups);

// 通知
router.get('/messages', middleware.auth, messageController.index);
router.get('/message/count', middleware.auth, messageController.count);
router.post('/message/mark_all', middleware.auth, messageController.markAll);
router.post('/message/mark_one/:msg_id', middleware.auth, messageController.markOne);

module.exports = router;
