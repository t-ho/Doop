var monoxide = require('monoxide');

var User = module.exports = monoxide.schema('users', {
  created: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  username: { type: String, required: true, index: { unique: true } },
  email: { type: String, required: true, index: { unique: true } },
  _passhash: { type: String },
  _passhash2: { type: String },
  _passsalt: { type: String },
  _token: { type: String },
  name: { type: String },
  status: { type: String, enum: ['active', 'deleted', 'unverifiedEmail'], default: 'active', index: true },
  role: { type: String, enum: ['user', 'admin', 'root'], default: 'user', index: true },
  settings: {
    historyOrder: { type: 'string', enum: ['recentFirst', 'oldestFirst'], default: 'oldestFirst' },
  },
  permissions: {
    debug: { type: 'boolean', default: false },
    logs: { type: 'boolean', default: false },
    users: { type: 'boolean', default: false },
  },
  stars: [{
    link: { type: 'string' }, // The actual hashbang path of the page
    breadcrumbs: [{ // Inhertied from $router.page._breadcrumbs
      link: { type: 'string' },
      title: { type: 'string' },
    }],
    title: { type: 'string' }, // Inherited from $router.page._title
  }],
});

// Deal with logins + user passwords {{{
var crypto = require('crypto');

User
  .virtual('password', null, function (password) { // Allow write but not read
    this._passsalt = crypto.randomBytes(16).toString('base64');
    this._passhash = this.encryptPass(this._passsalt, password);
  })
  .method('encryptPass', function (salt, password) {
    var saltBuffer = new Buffer(salt, 'base64');
    return crypto.pbkdf2Sync(password, saltBuffer, 10000, 64, 'sha512').toString('base64');
  })
  .method('validPassword', function (candidate, next) {
    return next(null, this.encryptPass(this._passsalt || '', candidate) == this._passhash);
  });
// }}}

// Whenever we are saving and we dont have a username use the email address {{{
User
  .hook('create', function (next, query) {
    if (!query.username) query.username = query.email;
    if (query.username) query.username = query.username.toLowerCase(); // Username should always be lower case
    next();
  })
  .hook('save', function (next, query) {
    if (!query.username && query.email) query.username = query.email; // Username should be the email address if we have email but not the username
    if (query.username) query.username = query.username.toLowerCase(); // Username should always be lower case
    next();
  });
// }}}

// Setup utility methods {{{
User
  .method('splitName', function () {
    var nameBits = this.name.split(/\s+/);
    return {
      first: nameBits[0],
      last: nameBits.length > 1 ? nameBits[nameBits.length - 1] : null,
      other: nameBits.length > 2 ? nameBits.slice(1, -1).join(' ') : null,
    };
  });
// }}}

// Force username to ALWAYS be lower case {{{
User.hook('save', function (done, q) {
  if (q.username) q.username = q.username.toLowerCase();
  done();
});
// }}}
