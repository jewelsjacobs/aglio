(function() {
  var aglio, assert, bin, blueprint, fs, http, jade, path, protagonist, root, sinon,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  aglio = require('../lib/main');

  assert = require('assert');

  bin = require('../lib/bin');

  fs = require('fs');

  http = require('http');

  jade = require('jade');

  path = require('path');

  protagonist = require('protagonist');

  sinon = require('sinon');

  root = path.dirname(__dirname);

  blueprint = fs.readFileSync(path.join(root, 'example.md'), 'utf-8');

  describe('API Blueprint Renderer', function() {
    it('Should get a list of templates', function(done) {
      return aglio.getTemplates(function(err, templates) {
        if (err) {
          return done(err);
        }
        assert(templates.length);
        return done();
      });
    });
    it('Should handle template list error', function(done) {
      sinon.stub(fs, 'readdir', function(name, callback) {
        return callback('error');
      });
      return aglio.getTemplates(function(err, templates) {
        assert(err);
        fs.readdir.restore();
        return done();
      });
    });
    it('Should get a list of included files', function() {
      var input, paths;
      sinon.stub(fs, 'readFileSync', function() {
        return 'I am a test file';
      });
      input = '# Title\n<!-- include(test1.md) -->\nSome content...\n<!-- include(test2.md) -->\nMore content...';
      paths = aglio.collectPathsSync(input, '.');
      fs.readFileSync.restore();
      assert.equal(paths.length, 2);
      assert(__indexOf.call(paths, 'test1.md') >= 0);
      return assert(__indexOf.call(paths, 'test2.md') >= 0);
    });
    it('Should render blank string', function(done) {
      return aglio.render('', {
        template: 'default',
        locals: {
          foo: 1
        }
      }, function(err, html) {
        if (err) {
          return done(err);
        }
        assert(html);
        return done();
      });
    });
    it('Should render a complex document', function(done) {
      return aglio.render(blueprint, 'default', function(err, html) {
        if (err) {
          return done(err);
        }
        assert(html);
        assert(html.indexOf('This is content that was included'));
        return done();
      });
    });
    it('Should render mixed line endings and tabs properly', function(done) {
      var temp;
      temp = '# GET /message\r\n+ Response 200 (text/plain)\r\r\t\tHello!\n';
      return aglio.render(temp, 'default', done);
    });
    it('Should render a custom template by filename', function(done) {
      var template;
      template = path.join(root, 'templates', 'default.jade');
      return aglio.render('# Blueprint', template, function(err, html) {
        if (err) {
          return done(err);
        }
        assert(html);
        return done();
      });
    });
    it('Should return warnings with filtered input', function(done) {
      var filteredTemp, temp;
      temp = '# GET /message\r\n+ Response 200 (text/plain)\r\r\t\tHello!\n';
      filteredTemp = temp.replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
      return aglio.render(temp, 'default', function(err, html, warnings) {
        if (err) {
          return done(err);
        }
        assert.equal(filteredTemp, warnings.input);
        return done();
      });
    });
    it('Should render from/to files', function(done) {
      var dest, src;
      src = path.join(root, 'example.md');
      dest = path.join(root, 'example.html');
      return aglio.renderFile(src, dest, {}, done);
    });
    it('Should render from stdin', function(done) {
      sinon.stub(process.stdin, 'read', function() {
        return '# Hello\n';
      });
      setTimeout(function() {
        return process.stdin.emit('readable', 1);
      });
      return aglio.renderFile('-', 'example.html', 'default', function(err) {
        if (err) {
          return done(err);
        }
        assert(process.stdin.read.called);
        process.stdin.read.restore();
        process.stdin.removeAllListeners();
        return done();
      });
    });
    it('Should render to stdout', function(done) {
      sinon.stub(console, 'log');
      return aglio.renderFile(path.join(root, 'example.md'), '-', 'default', function(err) {
        if (err) {
          return done(err);
        }
        assert(console.log.called);
        console.log.restore();
        return done();
      });
    });
    it('Should compile from/to files', function(done) {
      var dest, src;
      src = path.join(root, 'example.md');
      dest = path.join(root, 'example-compiled.md');
      return aglio.compileFile(src, dest, done);
    });
    it('Should compile from stdin', function(done) {
      sinon.stub(process.stdin, 'read', function() {
        return '# Hello\n';
      });
      setTimeout(function() {
        return process.stdin.emit('readable', 1);
      });
      return aglio.compileFile('-', 'example-compiled.md', function(err) {
        if (err) {
          return done(err);
        }
        assert(process.stdin.read.called);
        process.stdin.read.restore();
        process.stdin.removeAllListeners();
        return done();
      });
    });
    it('Should compile to stdout', function(done) {
      sinon.stub(console, 'log');
      return aglio.compileFile(path.join(root, 'example.md'), '-', function(err) {
        if (err) {
          return done(err);
        }
        assert(console.log.called);
        console.log.restore();
        return done();
      });
    });
    it('Should error on missing input file', function(done) {
      return aglio.renderFile('missing', 'output.html', 'default', function(err, html) {
        assert(err);
        return aglio.compileFile('missing', 'output.md', function(err) {
          assert(err);
          return done();
        });
      });
    });
    it('Should error on bad template', function(done) {
      return aglio.render(blueprint, 'bad', function(err, html) {
        assert(err);
        return done();
      });
    });
    it('Should error on protagonist failure', function(done) {
      sinon.stub(protagonist, 'parse', function(content, callback) {
        return callback('error');
      });
      return aglio.render(blueprint, 'default', function(err, html) {
        assert(err);
        protagonist.parse.restore();
        return done();
      });
    });
    it('Should error on file read failure', function(done) {
      sinon.stub(fs, 'readFile', function(filename, options, callback) {
        return callback('error');
      });
      return aglio.renderFile('foo', 'bar', 'default', function(err, html) {
        assert(err);
        fs.readFile.restore();
        return done();
      });
    });
    it('Should error on file write failure', function(done) {
      sinon.stub(fs, 'writeFile', function(filename, data, callback) {
        return callback('error');
      });
      return aglio.renderFile('foo', 'bar', 'default', function(err, html) {
        assert(err);
        fs.writeFile.restore();
        return done();
      });
    });
    return it('Should error on non-file failure', function(done) {
      sinon.stub(aglio, 'render', function(content, template, callback) {
        return callback('error');
      });
      return aglio.renderFile(path.join(root, 'example.md'), 'bar', 'default', function(err, html) {
        assert(err);
        aglio.render.restore();
        return done();
      });
    });
  });

  describe('Executable', function() {
    it('Should list templates', function(done) {
      sinon.stub(console, 'log');
      return bin.run({
        l: true
      }, function() {
        console.log.restore();
        return done();
      });
    });
    it('Should render a file', function(done) {
      sinon.stub(console, 'error');
      sinon.stub(aglio, 'renderFile', function(i, o, t, callback) {
        var warnings;
        warnings = [
          {
            code: 1,
            message: 'Test message',
            location: [
              {
                index: 0,
                length: 1
              }
            ]
          }
        ];
        warnings.input = 'test';
        return callback(null, warnings);
      });
      bin.run({}, function(err) {
        return assert(err);
      });
      return bin.run({
        i: path.join(root, 'example.md'),
        o: '-'
      }, function() {
        console.error.restore();
        aglio.renderFile.restore();
        return done();
      });
    });
    it('Should compile a file', function(done) {
      sinon.stub(aglio, 'compileFile', function(i, o, callback) {
        return callback(null);
      });
      return bin.run({
        c: 1,
        i: path.join(root, 'example.md'),
        o: '-'
      }, function() {
        aglio.compileFile.restore();
        return done();
      });
    });
    it('Should start a live preview server', function(done) {
      this.timeout(5000);
      sinon.stub(aglio, 'render', function(i, t, callback) {
        return callback(null, 'foo');
      });
      sinon.stub(http, 'createServer', function(handler) {
        return {
          listen: function(port, host, cb) {
            var req, res;
            req = {
              url: '/favicon.ico'
            };
            res = {
              end: function(data) {
                return assert(!data);
              }
            };
            handler(req, res);
            req = {
              url: '/'
            };
            res = {
              writeHead: function(status, headers) {
                return false;
              },
              end: function(data) {
                var file;
                aglio.render.restore();
                cb();
                file = fs.readFileSync('example.md', 'utf8');
                return setTimeout(function() {
                  fs.writeFileSync('example.md', file, 'utf8');
                  return setTimeout(function() {
                    console.log.restore();
                    return done();
                  }, 500);
                }, 500);
              }
            };
            return handler(req, res);
          }
        };
      });
      sinon.stub(console, 'log');
      sinon.stub(console, 'error');
      bin.run({
        s: true
      }, function(err) {
        console.error.restore();
        return assert(err);
      });
      return bin.run({
        i: path.join(root, 'example.md'),
        s: true,
        p: 3000,
        h: 'localhost'
      }, function() {
        return http.createServer.restore();
      });
    });
    return it('Should handle errors', function(done) {
      sinon.stub(aglio, 'renderFile', function(i, o, t, callback) {
        return callback({
          code: 1,
          message: 'foo',
          input: 'foo bar baz',
          location: [
            {
              index: 1,
              length: 1
            }
          ]
        });
      });
      sinon.stub(console, 'error');
      return bin.run({
        i: path.join(root, 'example.md'),
        o: '-'
      }, function() {
        assert(console.error.called);
        console.error.restore();
        aglio.renderFile.restore();
        return done();
      });
    });
  });

}).call(this);
