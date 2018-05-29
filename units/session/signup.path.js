var async = require('async-chainable');
var email = require('mfdc-email');
var uuidv4 = require('uuid/v4');

/**
* Attempt signup sequence with given credentials
* @param {string} [req.body.name] The users real name if app.config.session.signup.requireName requires it
* @param {string} [req.body.username] The users requested username if app.config.session.signup.requireUsername requires it, otherwise the email is used
* @param {string} req.body.email The users email
* @param {string} req.body.password The users password
*/
app.post('/api/session/signup', function (req, res, finish) {
  async()
    .then(function (next) { // Form validation
      if (app.config.session.signup.requireName && !req.body.name) {
        next('No name specified')
      } else if (app.config.session.signup.requireUsername && !req.body.username) {
        next('No username specified')
      } else if (!req.body.email) {
        next('No email specified')
      } else if (!/^(.*)@(.*)$/.test(req.body.email)) { // FIXME: Ugh!
        next('That doesnt look like a valid email address')
      } else if (!req.body.password) {
        next('No password specified')
      } else {
        // Assign username=email if its optional
        if (!app.config.session.signup.requireUsername) req.body.username = req.body.email;
        next();
      }
    })
    .then(function (next) { // Check email isn't already in use
      app.db.users.findOne({ $errNotFound: false, email: req.body.email }, function (err, user) {
        if (user) return next('Email already registered');
        next();
      });
    })
    .then(function (next) { // Check username isn't already in use
      app.db.users.findOne({ username: req.body.username }, function (err, user) {
        if (user) return next('Username already registered');
        next();
      });
    })
    .then('user', function (next) { // Create the user
      var newUser = {
        name: req.body.name,
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        $data: {
          ip: req.clientIp,
          userAgent: req.useragent
        }
      };

      if (app.config.session.signup.validateEmail) {
        newUser._token = uuidv4();
        newUser.status = 'unverifiedEmail';
      }

      return app.db.users.create(newUser, next);
    })
    .then(function (next) {
      if (app.config.session.signup.validateEmail) {
        email()
          .to(this.user.email)
          .subject(app.config.title + ' - Verify your email')
          .template(app.config.paths.root + '/units/email/signup-verify.email.html')
          .templateParams({
            app: app,
            url: app.config.publicUrl + '/auth/mail-verify/' + this.user._token,
            user: this.user,
          })
          .send(next)
      } else {
        email()
          .to(this.user.email)
          .from(`${app.config.title} <${app.config.email.from}>`)
          .subject(app.config.title + ' Signup')
          .template(app.config.paths.root + '/units/email/signup-welcome.email.txt')
          .templateParams({
            app: app,
            url: app.config.publicUrl,
            user: this.user,
          })
          .send(next)
      }
    })
    .end(function (err) {
      if (err) { // There was an issue creating the account
        return res.status(400).send(err);
      } else {
        // Signup successfully processed, send pending verify and email status back to client
        return res.send({})
      }
    });
});

/**
* Resend verification email
* @param {string} req.body.email The email address to use
*/
app.post('/api/session/resendVerificationEmail', function (req, res) {
  async()
    .then(function (next) {
      if (!req.body.email) return next('No email provided');
      next();
    })
    // Fetch things we need to link against {{{
    .then('user', function (next) {
      app.db.users.findOne({ email: req.body.email }, function (err, user) {
        if (err && err != 'Not found') return next(err);
        next(null, user);
      });
    })
    // }}}
    .then(function (next) {
      if (!this.user) return next('Email is not associated to any account');
      if (this.user.status != 'unverifiedEmail') return next('Email already verified');
      next();
    })
    .then(function (next) {
      if (!this.user._token) {
        this.user._token = uuidv4();
        this.user.save({ $data: { user: this.user._id, ip: req.clientIp, userAgent: req.useragent } }, next);
      } else {
        next();
      }
    })
    // {{{ Send Verification Email
    .then(function (next) {
      email()
        .to(this.user.email)
        .from(`${app.config.title} <${app.config.email.from}>`)
        .subject(req.body.date ? `${app.config.title} - Verify your email [${req.body.date}]` : `${app.config.title} - Verify your email`)
        .template(app.config.paths.root + '/units/email/signup-verify.email.html')
        .templateParams({
          app: app,
          url: app.config.publicUrl + '/auth/mail-verify/' + this.user._token,
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
* Validate the given token to complete a user's signup
*/
app.post('/api/session/validate/:token', function (req, res) {
  async()
    // Sanity checks {{{
    .then(function (next) {
      if (!req.params.token) return next('No token provided');
      next();
    })
    // }}}
    // Find user by token {{{
    .then('user', function (next) {
      app.db.users.findOne({ _token: req.params.token }, function (err, user) {
        if (err && err != 'Not found') return next(err);
        next(null, user);
      });
    })
    // }}}
    // Activate user {{{
    .then(function (next) {
      if (!this.user) return next('Provided token is expired');

      this.user.status = 'active';
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
