'use strict';

var _ = require('underscore');

var db = require('./db'),
    Query = require('./query');

var TYPE_DEFAULTS = _.indexBy([
  { type : Number,  defaults: db.TYPES.Int },
  { type : Boolean, defaults: db.TYPES.Bit },
  { type : String,  defaults: db.TYPES.VarChar },
  { type : Date,    defaults: db.TYPES.DateTime },
  { type : Buffer,  defaults: db.TYPES.Binary },
], 'type');

/* Model class constructor
 *
 * @param {String} name the model name
 * @param {Object} schema the model schema definition
 * @param {DataType} schema.field.type the field type
 * @param {String} schema.field.column the column name in the database
 * @param {Boolean} schema.field.nullable whether the field allows null values (default: false)
 * @param {Object} schema.field.default the field default value
 * @param {Function} schema.field.get custom getter function
 * @param {Function} schema.field.set custom setter function
 * @param {Object} schema.field.validate specify model based validations (see docs)
 * @param {Object} options specify schema options
 */
var Model = function (name, schema, options) {
  this.name = name;
  this._schema = normalizeSchema(schema);
  this._options = options || {};
};

Model.prototype.create = function(obj) {

};

Model.prototype.findById = function(id, options) {

};

Model.prototype.find = function(query, options) {

};

Model.prototype.findOne = function(query, options) {

};

Model.prototype.remove = function(query) {

};

Model.prototype.update = function(query, updates) {

};

Model.prototype.findByIdAndUpdate = function(query, updates) {

};

Model.prototype.count = function(query) {

};

Model.prototype.validate = function(fn, msg) {

};

Model.TYPES = db.TYPES;

var isDriverType = function(type){
  return _.contains(db.TYPES, type);
};

var isNativeType = function(type){
  return _.has(TYPE_DEFAULTS, type);
};

var FIELD_OPTIONS = [
  { name : 'column',   validate : _.isString   },
  { name : 'nullable', validate : _.isBoolean  },
  { name : 'default'                           },
  { name : 'get',      validate : _.isFunction },
  { name : 'set',      validate : _.isFunction },
  { name : 'validate', validate : _.isObject   },
];

var normalizeSchema = function(schema) {
  var normalized = {};
  _.each(schema, function(props, fieldName) {
    var fieldData = {};

    // Validate and normalize field type
    if(isDriverType(props)) {
      fieldData.type = props;
    }
    else if(isNativeType(props)) {
      fieldData.type = TYPE_DEFAULTS[props].defaults;
    }
    else if(_.isObject(props) && props.type){
      if(isNativeType(props.type)){
        props.type = TYPE_DEFAULTS[props.type].defaults;
      }
      else if(!isDriverType(props.type)){
        throw new Error('Invalid type for field ' + fieldName);
      }
    }
    else if(_.isObject(props)){
      throw new Error('Type declaration missing for field ' + fieldName);
    }
    else {
      throw new Error('Invalid type for field ' + fieldName);
    }

    // Validate options
    _.each(FIELD_OPTIONS, function(opt){
      if(props[opt.name]){
        if(!opt.validate || opt.validate( props[opt.name] )){
          fieldData[opt.name] = props[opt.name];
        }
        else {
          throw new Error('Invalid value for field option ' + opt.name);
        }
      }
    });

    // Save the normalized field data
    normalized[fieldName] = fieldData;
  });

  return normalized;
};

module.exports = Model;
