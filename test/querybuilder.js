'use strict';
var expect = require('chai').expect;

var db = require('../lib/db'),
    Query = require('../lib/query'),
    QueryParam = db.QueryParam;

/* jshint ignore:start */

var query = null;

describe('SELECT', function(){

  beforeEach(function(){
    query = new Query('select', { from : 'User' });
  });

  it('should generate a minimal query that selects everything', function(){
    expect(query._generateSQL()).to.be.equal('select * from [User];');
  });

  it('should generate a minimal limited query', function(){
    query.limit(5);
    var sql = 'select top 5 * from [User];';
    expect(query._generateSQL()).to.be.equal(sql);
  });

  it('should generate a minimal query with offset', function(){
    query.skip(20);
    var sql = 'select * from [User] offset 20 rows;';
    expect(query._generateSQL()).to.be.equal(sql);
  });

  it('should generate a minimal query selecting some fields', function(){
    query.select(['id', 'name']);
    var sql = 'select [Id], [Name] from [User];';
    expect(query._generateSQL()).to.be.equal(sql);
  });

  it('should generate a minimal query and store into a new table', function(){
    query.into('UserCopy');
    var sql = 'select * into [UserCopy] from [User];';
    expect(query._generateSQL()).to.be.equal(sql);
  });

  it('should generate a minimal filtered query', function(){
    query.where({ 'active' : new QueryParam('isActive', true)});
    var sql = 'select * from [User] where [Active]=@isActive;';
    expect(query._generateSQL()).to.be.equal(sql);
  });

  it('should generate a minimal grouped query', function(){
    query.groupBy('name');
    var sql = 'select * from [User] group by [Name];';
    expect(query._generateSQL()).to.be.equal(sql);

    query.groupBy(['type', 'verified']);
    sql = 'select * from [User] group by [Name], [Type], [Verified];'
    expect(query._generateSQL()).to.be.equal(sql);
  });

  it('should generate a minimal grouped filtered query', function(){
    query
    .groupBy('name')
    .having({ 'active' : new QueryParam('isActive', true)});

    var sql = 'select * from [User] group by [Name] having [Active]=@isActive;';
    expect(query._generateSQL()).to.be.equal(sql);
  });

  it('should generate correctly a where clause containing "or"', function(){
    query
      .select(['id', 'name', 'last_modified'])
      .where({
        'active': new QueryParam('isActive', true),
        '$or' : [
          { 'type' : new QueryParam('typeBusiness', 'business')},
          {
            'type' : new QueryParam('typeClient', 'client'),
            'verified': new QueryParam('verified', true)
          }
        ]
      })
      .limit(10);

    var sql = 'select top 10 [Id], [Name], [LastModified] ' +
      'from [User] where [Active]=@isActive and ([Type]=@typeBusiness or ' +
      '[Type]=@typeClient and [Verified]=@verified);'
    expect(query._generateSQL()).to.be.equal(sql);
  });

  it('should generate a minimal ordered query', function(){
    query.sort('name');

    var sql = 'select * from [User] order by [Name] asc;';
    expect(query._generateSQL()).to.be.equal(sql);

    query.sort([
      { column: 'type', collation: 'utf8', order: 'desc' },
      'active'
    ]);

    sql = 'select * from [User] order by [Name] asc, [Type] collate utf8 desc, [Active] asc;';
    expect(query._generateSQL()).to.be.equal(sql);
  });

  it('should generate a complete query with all the options included', function(){
    query
    .into('MyReport')
    .select(['name', 'active'])
    .where({
      'type': new QueryParam('typeClient', 'client'),
      'verified': new QueryParam('isVerified', true)
    })
    .groupBy('birth_date')
    .having({
      'birth_date': new QueryParam('birthDate', new Date(1990, 1, 1))
    })
    .sort(['name', { column: 'active', order: 'desc' }])
    .limit(5)
    .skip(10);

    var sql = 'select top 5 [Name], [Active] into [MyReport] from [User] ' +
      'where [Type]=@typeClient and [Verified]=@isVerified group by [BirthDate] ' +
      'having [BirthDate]=@birthDate order by [Name] asc, [Active] desc offset 10 rows;';
    expect(query._generateSQL()).to.be.equal(sql);
  });

  it('should generate a complete query with all the options included by ' +
     'calling the Query constructor', function(){
    query = new Query('select', {
      select: ['name', 'active'],
      into: 'MyReport',
      from: 'User',
      where: {
        'type': new QueryParam('typeClient', 'client'),
        'verified': new QueryParam('isVerified', true)
      },
      groupBy: 'birth_date',
      having: {
        'birth_date': new QueryParam('birthDate', new Date(1990, 1, 1))
      },
      sort: ['name', { column: 'active', order: 'desc' }],
      limit: 5,
      skip: 10,
    });

    var sql = 'select top 5 [Name], [Active] into [MyReport] from [User] ' +
      'where [Type]=@typeClient and [Verified]=@isVerified group by [BirthDate] ' +
      'having [BirthDate]=@birthDate order by [Name] asc, [Active] desc offset 10 rows;';
    expect(query._generateSQL()).to.be.equal(sql);
  });

  it('should generate a query using query operators', function(){
    query.where({
      $or: [
        { 'type': new QueryParam('typeBusiness', 'business')},
        { 'type': new QueryParam('typeClient', 'client'),
          'verified': new QueryParam('isVerified', true)
        }
      ],
      'name': { $null: false },
      'age': { $gte: new QueryParam('minAge', 18),
               $lt: new QueryParam('maxAge', 50) },
      'active': new QueryParam('isActive', true),
      'alert_level': [new QueryParam('lowLevel', 1),
                      new QueryParam('mediumLevel', 2)],
      'status': { $nin: [new QueryParam('statusBlocked', 'blocked'),
                         new QueryParam('statusDeleted', 'deleted')]}
    });

    var sql = 'select * from [User] where ([Type]=@typeBusiness or ' +
      '[Type]=@typeClient and [Verified]=@isVerified) and ([Name] is not null) ' +
      'and ([Age]>=@minAge and [Age]<@maxAge) and [Active]=@isActive and ' +
      '[AlertLevel] in (@lowLevel, @mediumLevel) and ([Status] not in ' +
      '(@statusBlocked, @statusDeleted));'
    expect(query._generateSQL()).to.be.equal(sql);
  });

});

/* jshint ignore:end */