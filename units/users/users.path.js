var _ = require('lodash');
var monoxide = require('monoxide');
var async = require('async-chainable');
var email = require('mfdc-email');

/**
* Activate the current user
* @param {string} req.body.email The email address to use
* FIXME: This will probably break with new changes - MC 2017-06-06
*/
app.post('/api/session/activate', app.middleware.ensure.admin, function (req, res) {
  async()
    // Fetch things we need to link against {{{
    .then('user', function (next) {
      app.db.users.findOne({ email: req.body.email }, function (err, res) {
        next(null, res)
      })
    })
    // }}}
    // Actually save the data {{{
    .then(function (next) {
      this.user.save({
        $data: { user: req.user._id },
        status: 'active',
      }, next);
    })
    // }}}
    // {{{ Send Welcome Email
    .then(function (next) {
      email()
        .to(this.user.email)
        .subject(app.config.email.signupSubject)
        .from(`${app.config.title} <${app.config.email.from}>`)
        .template(app.config.paths.root + '/units/email/signup-welcome.email.txt')
        .templateParams({
          name: this.user.name,
          url: app.config.email.templateUrl,
          signoff: app.config.email.signoff,

        })
        .send(next)
    })
    // }}}
    // End {{{
    .end(function (err) {
      if (err) return res.status(400).send(err.toString());
      res.send({ status: 'active' });
    });
  // }}}
});

/**
* Set a single permission for the given user
* @param {string} req.params.id The ID of the user to set the permission
* @param {string} req.body.permission The permission to set
* @param {string} req.body.value The value of the permission to set
*/
app.post('/api/users/:id/permission', app.middleware.ensure.admin, function (req, res) {
  async()
    // Sanity checks {{{
    .then(function (next) {
      if (!req.body.permission) return next('No permission specified');
      if (req.body.value === undefined) return next('No value specified');
      next();
    })
    // }}}
    // Fetch user {{{
    .then('user', function (next) {
      app.db.users.findOneByID(req.params.id, next);
    })
    // }}}
    // Save the permission {{{
    .then(function (next) {
      this.user.permissions[req.body.permission] = req.body.value;
      this.user.save({ $data: { user: req.user._id, ip: req.clientIp, userAgent: req.useragent } }, next);
    })
    // }}}
    // End {{{
    .end(function (err) {
      if (err) return res.sendError(err);
      res.send({});
    });
  // }}}
});

/**
 * Update user info
 * Note: Only root user can update all the info of any user. Admin user can only update info of 'admin' and 'user' user. And users with 'users' permission can only update normal user's info.
 * @param {string} req.params.id The ID of the user to update the info
 * @param {string} req.body The user object to update 
 */
app.post('/api/users/:id', app.middleware.ensure.canAny('users'), function (req, res) {
  async()
    // Sanity check {{{
    .then(function (next) {
      if (!req.body) next('There is nothing to save');
      next();
    })
    // }}}
    // fetch user {{{
    .then('user', function (next) {
      app.db.users.findOneByID(req.params.id, next);
    })
    // }}}
    .then('patch', function (next) {
      if (req.user.role == 'root') {
        next(null, _.pick(req.body, ['name', 'permissions', 'role', 'status']));
      } else if (req.user.role == 'admin') {
        if (this.user.role == 'root') return next('Permission denied');
        if (req.body.role && req.body.role != 'admin' && req.body.role != 'user') return next('Permission denied');
        next(null, _.pick(req.body, ['name', 'permissions', 'role', 'status']));
      } else { // permission.users == true
        if (this.user.role == 'root' || this.user.role == 'admin') {
          next('Permission denied');
        } else {
          next(null, _.pick(req.body, ['name', 'permissions', 'status']));
        }
      }
    })
    // Save user info {{{
    .then(function (next) {
      _.merge(this.user, this.patch);
      this.user.save({ $data: { user: req.user._id, ip: req.clientIp, userAgent: req.useragent } }, next);
    })
    // }}}
    // End {{{
    .end(function (err) {
      if (err) return res.status(400).send(err);
      res.send(_.pick(this.user, ['_id', '__v', 'username', 'email', 'created', 'lastLogin', 'name', 'role', 'permissions', 'settings', 'stars', 'status']));
    });
  // }}}
});
