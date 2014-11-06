'use strict';
var expect = require('chai').expect;

var Model = require('../lib/model');

/* jshint ignore:start */

var query = null;

describe('Schema normalization', function(){

  it('should accept a simple field definition with a tedious data type', function(){
    var model = new Model('user', { name: Model.TYPES.VarChar });
    expect(model._schema).to.be.deep.equal({ name : { type : Model.TYPES.VarChar }});
  });

  it('should accept a simple field definition with a native data type', function(){
    var model = new Model('user', { name: String });
    expect(model._schema).to.be.deep.equal({ name : { type : Model.TYPES.VarChar }});
  });

  it('should fail if an invalid field type is provided', function(){
    var fn = function(){ return new Model('user', { name: 'Some other thing' }); };
    expect(fn).to.throw('Invalid type for field name');
  });

  it('should fail if no field type is provided', function(){
    var fn = function(){ return new Model('user', { name: { other: 'stuff' } }); };
    expect(fn).to.throw('Type declaration missing for field name');
  });

  it('should defaults native types to driver types correctly', function(){
    var model = new Model('user', {
      name : String,
      age : Number,
      validated : Boolean,
      registerDate : Date,
      picture : Buffer
    });

    expect(model._schema.name.type).to.be.equal(Model.TYPES.VarChar);
    expect(model._schema.age.type).to.be.equal(Model.TYPES.Int);
    expect(model._schema.validated.type).to.be.equal(Model.TYPES.Bit);
    expect(model._schema.registerDate.type).to.be.equal(Model.TYPES.DateTime);
    expect(model._schema.picture.type).to.be.equal(Model.TYPES.Binary);
  });

});

/* jshint ignore:end */
