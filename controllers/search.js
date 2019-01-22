exports.index = function (req, res, next) {
  var q = req.query.q;
  q = encodeURIComponent(q);
  // res.redirect('https://www.google.com.hk/#hl=zh-CN&q=site:bbs.zuqiuxunlian.com+' + q);
  res.redirect('https://www.baidu.com/s?wd=site:bbs.zuqiuxunlian.com ' + q);
};
