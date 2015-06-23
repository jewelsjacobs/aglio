(function() {
  var INCLUDE, ROOT, Remarkable, assembleLocals, crypto, fs, highlight, hljs, includeDirective, includeReplace, jade, md, moment, parseOptions, path, protagonist, slug;

  crypto = require('crypto');

  fs = require('fs');

  hljs = require('highlight.js');

  jade = require('jade');

  moment = require('moment');

  path = require('path');

  protagonist = require('protagonist');

  Remarkable = require('remarkable');

  INCLUDE = /( *)<!-- include\((.*)\) -->/gmi;

  ROOT = path.dirname(__dirname);

  slug = function(value) {
    return value.toLowerCase().replace(/[ \t\n]/g, '-');
  };

  highlight = function(code, lang) {
    if (lang) {
      if (lang === 'no-highlight') {
        return code;
      } else {
        return hljs.highlight(lang, code).value;
      }
    } else {
      return hljs.highlightAuto(code).value;
    }
  };

  includeReplace = function(includePath, match, spaces, filename) {
    var content, fullPath, lines;
    fullPath = path.join(includePath, filename);
    lines = fs.readFileSync(fullPath, 'utf-8').replace(/\r\n?/g, '\n').split('\n');
    content = spaces + lines.join("\n" + spaces);
    return includeDirective(path.dirname(fullPath), content);
  };

  includeDirective = function(includePath, input) {
    return input.replace(INCLUDE, includeReplace.bind(this, includePath));
  };

  md = new Remarkable('full', {
    html: true,
    linkify: true,
    typographer: true,
    highlight: highlight
  });

  exports.getTemplates = function(done) {
    return fs.readdir(path.join(ROOT, 'templates'), function(err, files) {
      var f;
      if (err) {
        return done(err);
      }
      return done(null, ((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = files.length; _i < _len; _i++) {
          f = files[_i];
          if (f[0] !== '_') {
            _results.push(f);
          }
        }
        return _results;
      })()).map(function(item) {
        return item.replace(/\.jade$/, '');
      }));
    });
  };

  exports.collectPathsSync = function(input, includePath) {
    var paths;
    paths = [];
    input.replace(INCLUDE, function(match, spaces, filename) {
      var content, fullPath;
      fullPath = path.join(includePath, filename);
      paths.push(fullPath);
      content = fs.readFileSync(fullPath, 'utf-8');
      return paths = paths.concat(exports.collectPathsSync(content, path.dirname(fullPath)));
    });
    return paths;
  };

  parseOptions = function(input, options) {
    var filteredInput;
    if (typeof options === 'string' || options instanceof String) {
      options = {
        template: options
      };
    }
    if (options.template == null) {
      options.template = 'default';
    }
    if (options.filterInput == null) {
      options.filterInput = true;
    }
    if (options.condenseNav == null) {
      options.condenseNav = true;
    }
    if (options.fullWidth == null) {
      options.fullWidth = false;
    }
    if (options.includePath == null) {
      options.includePath = process.cwd();
    }
    input = includeDirective(options.includePath, input);
    filteredInput = !options.filterInput ? input : input.replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
    return {
      input: filteredInput,
      options: options
    };
  };

  assembleLocals = function(ast, options) {
    var key, locals, value, _ref;
    locals = {
      api: ast,
      condenseNav: options.condenseNav,
      fullWidth: options.fullWidth,
      date: moment,
      highlight: highlight,
      markdown: function(content) {
        return md.render(content);
      },
      slug: slug,
      hash: function(value) {
        return crypto.createHash('md5').update(value.toString()).digest('hex');
      }
    };
    _ref = options.locals || {};
    for (key in _ref) {
      value = _ref[key];
      locals[key] = value;
    }
    return locals;
  };

  exports.renderSync = function(input, options) {
    var err, locals, res, templatePath, _ref;
    _ref = parseOptions(input, options), input = _ref.input, options = _ref.options;
    try {
      res = protagonist.parseSync(input);
    } catch (_error) {
      err = _error;
      err.input = input;
      throw err;
    }
    locals = assembleLocals(res.ast, options);
    if (fs.existsSync(options.template)) {
      templatePath = options.template;
    } else {
      templatePath = path.join(ROOT, 'templates', "" + options.template + ".jade");
    }
    return jade.renderFile(templatePath, locals);
  };

  exports.render = function(input, options, done) {
    var _ref;
    _ref = parseOptions(input, options), input = _ref.input, options = _ref.options;
    return protagonist.parse(input, function(err, res) {
      var locals;
      if (err) {
        err.input = input;
        return done(err);
      }
      locals = assembleLocals(res.ast, options);
      return fs.exists(options.template, function(exists) {
        var templatePath;
        if (exists) {
          templatePath = options.template;
        } else {
          templatePath = path.join(ROOT, 'templates', "" + options.template + ".jade");
        }
        return jade.renderFile(templatePath, locals, function(err, html) {
          if (err) {
            return done(err);
          }
          res.warnings.input = input;
          return done(null, html, res.warnings);
        });
      });
    });
  };

  exports.renderFile = function(inputFile, outputFile, options, done) {
    var render;
    render = function(input) {
      return exports.render(input, options, function(err, html, warnings) {
        if (err) {
          return done(err);
        }
        if (outputFile !== '-') {
          return fs.writeFile(outputFile, html, function(err) {
            return done(err, warnings);
          });
        } else {
          console.log(html);
          return done(null, warnings);
        }
      });
    };
    if (inputFile !== '-') {
      if (options.includePath == null) {
        options.includePath = path.dirname(inputFile);
      }
      return fs.readFile(inputFile, {
        encoding: 'utf-8'
      }, function(err, input) {
        if (err) {
          return done(err);
        }
        return render(input.toString());
      });
    } else {
      process.stdin.setEncoding('utf-8');
      return process.stdin.on('readable', function() {
        var chunk;
        chunk = process.stdin.read();
        if (chunk != null) {
          return render(chunk);
        }
      });
    }
  };

  exports.compileFile = function(inputFile, outputFile, done) {
    var compile;
    compile = function(input) {
      var compiled;
      compiled = includeDirective(path.dirname(inputFile), input);
      if (outputFile !== '-') {
        return fs.writeFile(outputFile, compiled, function(err) {
          return done(err);
        });
      } else {
        console.log(compiled);
        return done(null);
      }
    };
    if (inputFile !== '-') {
      return fs.readFile(inputFile, {
        encoding: 'utf-8'
      }, function(err, input) {
        if (err) {
          return done(err);
        }
        return compile(input.toString());
      });
    } else {
      process.stdin.setEncoding('utf-8');
      return process.stdin.on('readable', function() {
        var chunk;
        chunk = process.stdin.read();
        if (chunk != null) {
          return compile(chunk);
        }
      });
    }
  };

}).call(this);
