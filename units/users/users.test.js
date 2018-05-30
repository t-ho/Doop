var expect = require('chai').expect;

describe('ReST interface /api/users', function () {
  beforeEach(function (done) {
    app.test.agent.post(app.config.url + '/api/session/login')
      .send({
        username: app.test.username.root,
        password: app.test.password,
      })
      .end(function (err, res) {
        if (res.body.error) mlog.error(res.body.error);
        expect(res.body).to.not.have.property('error');
        expect(err).to.be.not.ok;
        user = res.body;
        done();
      });

  });
  it('GET /api/users', function (done) {
    app.test.agent.get(app.config.url + '/api/users')
      .end(function (err, res) {
        if (res.body.error) return done(res.body.error);
        expect(err).to.not.be.ok;
        expect(res.body).to.be.an('array');

        res.body.forEach(function (i) {
          expect(i).to.have.property('_id');
          expect(i).to.not.have.property('_passhash');
          expect(i).to.not.have.property('_passhash2');
          expect(i).to.not.have.property('_passsalt');
          expect(i).to.not.have.property('_token');
          expect(i).to.have.property('created');
          expect(i.created).to.be.a('string');
          expect(i).to.have.property('email');
          expect(i.email).to.be.a('string');
          expect(i).to.have.property('lastLogin');
          expect(i.lastLogin).to.be.a('string');
          expect(i).to.have.property('name');
          expect(i.name).to.be.a('string');
          expect(i).to.have.property('role');
          expect(i.role).to.be.a('string');
          expect(i.role).to.be.oneOf(['user', 'admin', 'root']);
          expect(i).to.have.property('settings');
          expect(i).to.have.property('status');
          expect(i.status).to.be.a('string');
          expect(i.status).to.be.oneOf(['active', 'deleted', 'unverifiedEmail']);
          expect(i).to.have.property('username');
          expect(i.username).to.be.a('string');
          expect(i).to.have.property('permissions');
          expect(i.permissions).to.have.property('debug');
          expect(i.permissions).to.have.property('logs');
          expect(i.permissions).to.have.property('users');
        });

        done();
      });
  });

});
