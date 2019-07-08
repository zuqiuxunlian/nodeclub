足球教练社区
=

[![build status][travis-image]][travis-url]
[![codecov.io][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![node version][node-image]][node-url]

[travis-image]: https://img.shields.io/travis/zuqiuxunlian/zuqiujiaolian/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/zuqiuxunlian/zuqiujiaolian
[codecov-image]: https://img.shields.io/codecov/c/github/zuqiuxunlian/zuqiujiaolian/master.svg?style=flat-square
[codecov-url]: https://codecov.io/github/zuqiuxunlian/zuqiujiaolian?branch=master
[david-image]: https://img.shields.io/david/zuqiuxunlian/zuqiujiaolian.svg?style=flat-square
[david-url]: https://david-dm.org/zuqiuxunlian/zuqiujiaolian
[node-image]: https://img.shields.io/badge/node.js-%3E=_4.2-green.svg?style=flat-square
[node-url]: http://nodejs.org/download/

## 介绍

足球教练社区代码fork自CNODEjs社区版

https://github.com/cnodejs/nodeclub

感谢社区的贡献和支持。

## 小程序客户端
https://github.com/zuqiuxunlian/wechat-cnode

## 新增API接口
API PATH: https://bbs.zuqiuxunlian.com/v1/api

### 小程序登录
通过 wx.login() 接口获得临时登录凭证 code 后传到开发者服务器调用此接口完成登录流程.

`POST /user/weixin/login`

**body**

```
{
    "code": "023eO7eP1npiz91QGvdP1NkdeP1eO7eK",
    "authInfo": Object
}
```

**Response**

```
{
  "success": true,
  "data": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcGVuaWQiOiJvVjVLZjR1UW5waU9RajhOWFNBcEctV2hzMDQwIiwiaWF0IjoxNTU1MTY2NTE2LCJleHAiOjE1NTc3NTg1MTZ9.xxxxxxxxxx"
}
```

### 认证用户信息
通过Token或者accessToken获取用户信息。

通过小程序授权产生的token
`GET /me?token=""`

小程序的token用的jwt token，有过期时间设置。可以用来访问所有其他的API


通过web登录产生的token
`GET /me?accesstoken=""`

**Response**

```
{
    "success": true,
    "data": {
        "is_block": false,
        "score": 10,
        "topic_count": 2,
        "reply_count": 0,
        "follower_count": 0,
        "following_count": 0,
        "collect_tag_count": 0,
        "collect_topic_count": 0,
        "active": true,
        "receive_reply_mail": false,
        "receive_at_mail": false,
        "create_at": "2019-04-13T13:59:17.781Z",
        "update_at": "2019-04-13T14:12:51.084Z",
        "name": "草帽-王腾",
        "location": "Shenzhen",
        "loginname": "K-KSogo9f",
        "pass": "$2a$10$58M85ZaSUsb3556xdJhKe.qT135nREAuoc1fccoseN6isfZS4/lmi",
        "email": "",
        "avatar": "https://wx.qlogo.cn/mmopen/vi_32/xxxxxxxxxx/132",
        "openid": "xxxxxxxxx-Whs040",
        "accessToken": "6b34cd10-xxxxxxxxxxxxxxx",
    }
}
```

### 用户信息修改
修改用户名和密码，可以用于web登录。

`POST /me`  需要认证

**Body**

```
{
	"loginname": "", //用户名，不能重复
	"name": "", //昵称
	"email": "awong1900s@163.com", //邮箱也是唯一
	"url": "", //个人网站
	"location": "", //位置
	"weibo": "",
	"signature": "" //个人介绍
}
```

**Response**

200

```
{
    "success": true,
    "error_msg": "修改成功"
}
```

500

```
{
    "success": false,
    "errno": 1,
    "error_msg": "该用户名已使用"
}
```

### 用户密码修改
`POST /me/change_password`  需要认证

**Body**

这里没有让用户输入原密码，考虑到产品安全性要求不高，此处接受这样处理。
```
{
	"newPass": "newpassxxxx",
	"rePass": "newpassxxxx"
}
```
**Response**

200
```
{
    "success": true,
    "error_msg": "修改成功"
}
```

### 获取上传token
`GET /upload_token`  需要认证

上传token用于客户端上传图片到七牛云。token有效期为24小时。

上传Token使用文档：https://github.com/qiniu/nodejs-sdk/blob/master/docs/nodejs-sdk-v7.md

上传文件命名用hash命名，避免重复上传：https://developer.qiniu.com/kodo/kb/1365/how-to-avoid-the-users-to-upload-files-with-the-same-key

**Response**

data值即为upload token

200
```
{
    "success": true,
    "data": ":Sxxxxxxxxxxx"
}
```

### 动态设置API
`GET /weapp_config`

最好同时隐藏发帖和回帖窗口。

|参数|描述|
|-----|----|
|has_post| 是否开放小程序发帖和回帖|
|card_ads|首页推广，未来使用|
 

`200`
```
{
    "success": true,
    "data": {
        "has_post": false,
        "card_ads": [
            {
                'name': '广告名称',
                'path': '/pages/article/detail?from=list&id=5d1f03a7fe663115042cd0b6',
                'appid': '',
                'image': 'https://img2.tuhu.org/activity/image/FjaSVA7uSZuH5EHrp9CHTPcnpwgT_w750_h230.jpeg'
            },
            {
                'name': '广告名称2',
                'path': '/pages/article/detail?from=list&id=5d1f03a7fe663115042cd0b6',
                'appid': '',
                'image': 'https://img2.tuhu.org/activity/image/FjaSVA7uSZuH5EHrp9CHTPcnpwgT_w750_h230.jpeg'
            }
        ]
    }
}
```
## License

MIT
