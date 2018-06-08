/**
* Angular gulp task
*/

var gulp = require('gulp');
var fancyLog = require('fancy-log');
var ansiColor = require('ansi-colors');
var async = require('async-chainable');
var asyncExec = require('async-chainable-exec');
var notify = require('gulp-notify');
var rimraf = require('rimraf');

gulp.task('angular', ['load:app', 'angular:clean'], function (next) {
  let command = ['ng', 'build'];
  if (app.config.isProduction) {
    command.push('--prod');
    async()
      .use(asyncExec)
      .exec(command, { passthru: true })
      .end(function (err) {
        if (err) throw new Error(err);
        next();
      });
  } else {
    command.push('--watch', '--deleteOutputPath=false');
    async()
      .use(asyncExec)
      .execDefaults({
        log: function (cmd) {
          if (app.config.gulp.notifications)
            notify(Object.assign(app.config.gulp.notifySettings, {
              title: app.config.title + ' - Angular',
              message: 'Building frontend scripts',
              icon: __dirname + '/icons/angular.png',
            })).write(0);
        }
      })
      .exec(command, { passthru: true })
      .end(function (err) {
        if (err) throw new Error(err);
      });
    next();
  }
});

/**
* Removes all files from the dist folder
*
* One way to run clean before all tasks is to run
* from the cmd line: gulp clean && gulp build
* @return {Stream}
*/
gulp.task('angular:clean', function (next) {
  fancyLog('Cleaning: ' + ansiColor.blue(paths.dist));

  return rimraf(paths.dist + '/*', next);
});