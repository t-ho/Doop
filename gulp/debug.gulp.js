/**
* Provides tasks that output debugging information or perform debugging tests
*/

var gulp = require('gulp');
var fancyLog = require('fancy-log');
var util = require('util');


/**
* Dump the full app structure to the console
* This is similar to `gulp config` but dumps the stub `app` structure also
*/
gulp.task('app', ['load:app'], function () {
  fancyLog(util.inspect(app, { depth: null, colors: true }));
});


/**
* Dump the current app.config subtree to the console
*/
gulp.task('app.config', ['load:app'], function () {
  fancyLog(util.inspect(app.config, { depth: null, colors: true }));
});


/**
* Connect to the local DB (using the current config) and output all user rows
*/
gulp.task('db:test', ['load:app.db'], function (next) {
  fancyLog('Testing User query...');
  app.db.users.find({}, function (err, data) {
    if (err) {
      gutil('Got error', err.red);
    } else {
      fancyLog('Got data', data);
    }
    next(err);
  });
});
