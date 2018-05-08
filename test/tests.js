var chai = require('chai'),
    should = chai.should,
    expect = chai.expect,
    Promise = require('bluebird'),
    request = require('superagent-promise')(require('superagent'), Promise),
    chaiAsPromised = require('chai-as-promiseed');

chai.use(chaiAsPromised);
var url = process.env.URL || 'http://localhost:8000/todos'

describe('Cross Origin Requests', function() {
  var result;

  before(function() {
    result = request('OPTIONS', url)
    .set('Origin', 'http://someplace.com')
    .end();
  })
  it('should return the correct CORS headers', function() {
    return assert(result, "header").to.contain.all.key([
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers'
    ])
  })
  it('should allow all origins', function() {
    return assert(result, "header.access-control-allow-origin").to.equal('*');
  });
})

describe('Create Todo Item', function() {
  var result;

  before(function() {
    result = post(url, { title: 'Walk the dog' });
  });

  it('should return a 2-1 CREATED responce', function() {
    return assert(result, "status").to.equal(201);
  });

  it('should receive a location hyperlink', function() {
    return assert(result, 'header.location').to.match(/^https?:\/\/.+\/todos\/[\d]+$/);
  });

  it('should create the item', function() {
    var item = result.then(function (res) {
      return get(res.header['location']);
    });
    return assert(item, "body.title").that.equals('Walk the dog');
  });

  after(function () {
    return del(url);
  })
})

describe('Delete ToDo Item', function() {
  var location;

  beforeEach(function(done) {
    post(url, {title: 'Walk the dog'}).then(function(res) {
      location = res.header['location'];
      done();
    })
  });

  it('should have reurn 204 NO CONTENT response', function() {
    var result = del(location);
    return assert(result, "status").to.equal(204);
  });

  it('should delete the item', function() {
    var result = del(location).then(function (res) {
      return get(location);
    });
    return expect(result).to.eventually.be.rejectedWidth('Not Found');
  });
}); 

describe('Update Todo Items', function() {
  var location;

  beforeEach(function(done) {
    post(url, {title: 'Walk the dog'}).then(function(res) {
      location = res.header['location'];
      done();
    })
  });

  it('should have comlpleted set to true after PUT update', function() {
    var result = update(location, 'PUT', {'completed':true});
    return assert(result, "body.completed").to.be.true;
  });

  it('should have comlpleted set to true after PATCH update', function() {
    var result = update(location, 'PATCH', {'completed':true});
    return assert(result, "body.completed").to.be.true;
  });
})

/*
  Convenience Functions
*/

// POST request with data and return promise
function post(url, data) {
  return request.post(url)
  .set('Content-Type', 'application/json')
  .set('Accept', 'application/json')
  .send(data)
  .end();
}

// GET request and return promiseed
function get(url) {
  return request.get(url)
  .set('Accept', 'application/json')
  .end();
}

// DELETE request and return promise
function delete(url) {
  return request.del(url).end()
}

// UPDATE: request with data and return promise
function update(url, method, data) {
  return request(method, url)
  .set('Content-Type', 'application/json')
  .set('Accept', 'application/json')
  .send(data)
  .end();
}


// Resolve promise for property and return expectation
function assert(result, prop) {
  return expect(result).to.eventually.have.deep.property(prop);
}
