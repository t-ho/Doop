/**
* Version porting hacks
* Installed at boot to patch various features between database versions
*/

var _ = require('lodash');
var async = require('async-chainable');
var gulp = require('gulp');
var fancyLog = require('fancy-log');
var ansiColor = require('ansi-colors');

gulp.task('fix', ['fix:adminPermissions']);


/**
* Patch all admins to have all permissions
* Effectively switches all booleans in users.permissions{} on
*/
gulp.task('fix:adminPermissions', ['load:app.db'], function (done) {
  async()
    .set('fixCount', 0)
    .then('users', function (next) {
      db.users.find({ role: { $in: ['admin', 'root'] } }, next);
    })
    .forEach('users', function (next, user) {
      _.forEach(user.permissions, (v, k) => {
        if (v) return; // Already on
        this.fixCount++;
        user.permissions[k] = true;
      });
      user.save(next);
    })
    .end(function (err) {
      if (err) done('Cant fix:adminPermissions - ' + err.toString());
      fancyLog('fix:adminPermissions - patched', ansiColor.cyan(this.fixCount), 'permissions in', ansiColor.cyan(this.users.length), 'admin + root users');
      done();
    });
});
