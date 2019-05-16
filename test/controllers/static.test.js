var app = require('../../app');
var request = require('supertest')(app);

describe('test/controllers/static.test.js', function () {
  it('should get /about', function (done) {
    request.get('/about').expect(200)
      .end(function (err, res) {
        res.text.should.containEql('足球教练社区希望聚集全国最广泛的教练成员');
        done(err);
      });
  });

  it('should get /faq', function (done) {
    request.get('/faq').expect(200)
      .end(function (err, res) {
        res.text.should.containEql('CNode 社区和 Node Club 是什么关系？');
        done(err);
      });
  });

  it('should get /getstart', function (done) {
    request.get('/getstart').expect(200)
    .end(function (err, res) {
      res.text.should.containEql('欢迎来足球教练沙龙社区');
      done(err);
    });
  });

  it('should get /robots.txt', function (done) {
    request.get('/robots.txt').expect(200)
      .end(function (err, res) {
        res.text.should.containEql('User-Agent');
        done(err);
      });
  });
});
