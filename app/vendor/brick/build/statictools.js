
var fs = require('fs');
var nunjucks = require('nunjucks');
var promise = require('promisesaplus');
var _ = require('lodash');
var S = require("string");

var env = new nunjucks.Environment(new nunjucks.FileSystemLoader('build/templates'));

env.addFilter('nl2br', function(str) {
    return str.replace(/\n/g, '<br/>');
});

env.addFilter('preserveTabs', function(str){
    return str.replace(/( {4}|\t)/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
});

var version = S(fs.readFileSync('VERSION')).trim().s;

var size = 0;
size += fs.statSync('dist/brick.css').size;
size += fs.statSync('dist/brick.js').size;

function avow(fn) {
    return function() {
        var p = promise();
        var ret;
        try {
            Array.prototype.unshift.apply(arguments, [p.fulfill, p.reject]);
            ret = fn.apply(this, arguments);
        } catch (e) {
            p.reject(e);
        }
        if (typeof ret !== 'undefined') {
            p.fulfill(ret);
        }
        return p;
    };
}

function err(s) {
    return function (err) {
        console.error(s);
        console.error(err.toString());
    }
}

var staticPage = function(tmpl, path, obj) {
  var t = env.getTemplate(tmpl);
  obj = _.extend({
    version: version,
    size: ~~(size / 1024) + 'K'
  }, obj);
  fs.writeFileSync(path, t.render(obj));
}

var each = avow(function(fulfill, reject, o, fn) {
  var keys = Object.keys(o);
  var num = keys.length;
  var n = -1;
  function next() {
    n++;
    if (n < num) {
      var p = promise();
      fn(p.fulfill, p.reject, o[keys[n]], keys[n]);
      p.then(next, reject);
    } else {
      fulfill();
    }
  }
  next();
});

var getJSON = avow(function (fulfill, reject, path) {
  fs.readFile(path, function(err, res) {
    if (err) {
        reject(err);
    }
    fulfill(JSON.parse(res));
  });
});

module.exports = {
  avow: avow,
  err: err,
  each: each,
  env: env,
  version: version,
  staticPage: staticPage,
  getJSON: getJSON
};