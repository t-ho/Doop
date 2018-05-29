var async = require('async-chainable');
var email = require('mfdc-email');
var uuidv4 = require('uuid/v4');

/**
* Send a password reset email to a user
* @param {string} req.body.email The users email address
*/
app.post('/api/users/recover', function (req, res) {
  async()
    // Sanity checks {{{
    .then(function (next) {
      if (!req.body.email) return next('No email provided');
      next();
    })
    // }}}
    // Fetch things we need to link against {{{
    .then('user', function (next) {
      app.db.users.findOne({ email: req.body.email }, function (err, user) {
        if (err && err != 'Not found') return next(err);
        next(null, user);
      });
    })
    // }}}
    .then(function (next) {
      if (!this.user) return next(`Email is not associated with any account`);
      if (this.user.status == 'deleted') return next(`Email is not an active account`);
      next();
    })
    // Set token {{{
    .then(function (next) {
      this.user._token = uuidv4();
      this.user.save({ $data: { user: this.user._id, ip: req.clientIp, userAgent: req.useragent } }, next);
    })
    // }}}
    // {{{ Send reset password email
    .then(function (next) {
      email()
        .to(this.user.email)
        .from(`${app.config.title} <${app.config.email.from}>`)
        .subject(`${app.config.title} - Password reset`)
        .template(app.config.paths.root + '/units/email/forgot-password.email.html')
        .templateParams({
          app: app,
          url: app.config.publicUrl + '/auth/reset-password/' + this.user._token,
          user: this.user,
        })
        .send(next)
    })
    // }}}
    // End {{{
    .end(function (err) {
      if (err) return res.status(400).send(err);
      res.send({ success: true });
    });
  // }}}
});

/**
* Accept a password recovery email
* @param {string} req.body.email The email to store
* @param {string} req.body.token The token to accept
* @param {string} req.body.password The users password to store
*/
app.post('/api/users/recoverAccept', function (req, res) {
  async()
    // Sanity checks {{{
    .then(function (next) {
      if (!req.body.email) return next('No email provided');
      if (!req.body.token) return next('No token provided');
      if (!req.body.password) return next('No password provided');
      next();
    })
    // }}}
    // Find user by email and token {{{
    .then('user', function (next) {
      app.db.users.findOne({ _token: req.body.token, email: req.body.email }, function (err, user) {
        if (err && err != 'Not found') return next(err);
        next(null, user);
      });
    })
    // }}}
    // Update user {{{
    .then(function (next) {
      if (!this.user) return next('Provided token is expired');

      this.user.password = req.body.password;
      this.user._token = undefined;

      this.user.save({ $data: { user: this.user._id, ip: req.clientIp, userAgent: req.useragent } }, next);
    })
    // }}}
    // End {{{
    .end(function (err) {
      if (err) return res.status(400).send(err);
      res.send({ success: true });
    });
  // }}}
});
