(function() {
  var aglio, assert, blueprint, fs, path, protagonist, root, sinon;

  aglio = require('../lib/main');

  assert = require('assert');

  fs = require('fs');

  path = require('path');

  protagonist = require('protagonist');

  sinon = require('sinon');

  root = path.dirname(__dirname);

  blueprint = fs.readFileSync(path.join(root, 'example.md'), 'utf-8');

  describe('API Blueprint Synchronous Renderer', function() {
    it('Should render blank string', function() {
      return assert(aglio.renderSync('', {
        template: 'default',
        locals: {
          foo: 1
        }
      }));
    });
    it('Should render a complex document', function() {
      var html;
      html = aglio.renderSync(blueprint, 'default');
      assert(html);
      return assert(html.indexOf('This is content that was included'));
    });
    it('Should render mixed line endings and tabs properly', function() {
      var temp;
      temp = '# GET /message\r\n+ Response 200 (text/plain)\r\r\t\tHello!\n';
      return aglio.renderSync(temp, 'default');
    });
    it('Should render a custom template by filename', function() {
      var template;
      template = path.join(root, 'templates', 'default.jade');
      return assert(aglio.renderSync('# Blueprint', template));
    });
    it('Should error on bad template', function() {
      return assert.throws(function() {
        return aglio.renderSync(blueprint, 'bad');
      });
    });
    return it('Should error on protagonist failure', function() {
      sinon.stub(protagonist, 'parseSync', function(content) {
        throw new Error('test');
      });
      assert.throws(function() {
        return aglio.renderSync(blueprint, 'default');
      });
      return protagonist.parseSync.restore();
    });
  });

}).call(this);
