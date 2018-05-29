/**
* User login controller
* All session-related routes are handled here.
*/

var _ = require('lodash');
var async = require('async-chainable');
var colors = require('chalk');
var passport = require('passport');

/**
* Attempt login sequence with given login credentials - AJAX internal API based method
* @param {string} req.body.username The username to login
* @param {string} req.body.password The password to login with
* @fires session.login
*/
app.post('/api/session/login', function (req, res) {
  async()
    .then(function (next) {
      if (!req.body.username) return next('Username is not specified');
      if (!req.body.password) return next('Password is not specified');
      next();
    })
    .then(function (next) {
      // Mangle incomming details to trim data + lowercase username
      // These are mainly to be nice to people on mobile with weird predictive keyboards
      req.body.username = _.trim(req.body.username.toLowerCase());
      req.body.password = _.trim(req.body.password);
      next();
    })
    .then('profile', function (next) {
      passport.authenticate('local', function (err, user, info) {
        if (err) return next(err);
        if (user) {
          console.log(colors.green('Successful login for'), colors.cyan(req.body.username));
          app.fire('session.login', function (err) {
            req.logIn(user, function (err) {
              if (err) return next(err);
              user.lastLogin = Date.now();
              user.save({ $data: { user: user._id, ip: req.clientIp, userAgent: req.useragent } }, next);
            });
          }, user);
        } else {
          console.log(colors.red('Failed login for'), colors.cyan(req.body.username));
          next(req.flash('passportMessage')[0]);
        }
      })(req, res, next);
    })
    .end(function (err) {
      if (err) {
        if (err == 'Account is deleted') return res.sendError('Account has been deleted');
        if (err == 'Account not verified') return res.sendError('Email has not been verified');
        return res.sendError('Invalid username or password');
      }
      res.redirect('/api/session/profile');
    });
});
