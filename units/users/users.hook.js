var monoxide = require('monoxide');

app.register('postControllers', function (finish) {
  app.use('/api/users/:id?', monoxide.express.middleware('users', {
    query: app.middleware.ensure.canAny(['users', 'logs']),
    create: app.middleware.ensure.can('users'),
    count: app.middleware.ensure.can('users'),
    save: false, // handle in users.path.js
    get: app.middleware.ensure.can('users'),
    delete: app.middleware.ensure.can('users'),
    meta: app.middleware.ensure.can('users'),
  }));

  finish();
});
