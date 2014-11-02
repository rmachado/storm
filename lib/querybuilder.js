'use strict';

var _ = require('underscore'),
    db = require('./db'),
    QueryParam = db.QueryParam;

var utils = require('./utils');

// Generate a SELECT query from model
module.exports.select = function(q) {
  var sql = 'select';

  if(q._limit)
    sql += ' top ' + q._limit;

  if(q._fields === '*' || _.isEmpty(q._fields))
    sql += ' *';
  else
    sql += ' ' + _.map(q._fields, utils.quoteField).join(', ');

  if(q._into)
    sql += ' into ' + utils.quoteTable(q._into);

  sql += ' from ' + utils.quoteTable(q._from);

  if(!_.isEmpty(q._where)){
    sql += ' where ' + generateSearch(q._where);
  }

  if(!_.isEmpty(q._groupBy)){
    sql += ' group by ' + _.map(q._groupBy, utils.quoteField).join(', ');
  }

  if(!_.isEmpty(q._having)){
    sql += ' having ' + generateSearch(q._having);
  }

  if(!_.isEmpty(q._orderBy)){
    sql += ' order by ' + _.map(q._orderBy, function(criteria){
      var str = utils.quoteField(criteria.column);

      if(criteria.collation)
        str += ' collate ' + criteria.collation;
      if(criteria.order)
        str += ' ' + criteria.order.toLowerCase();

      return str;
    }).join(', ');
  }

  if(q._skip)
    sql += ' offset ' + q._skip + ' rows';

  return sql + ';';
};

var generateSearch = function(search) {
  return _.map(Object.keys(search), function(key){
    var value = search[key];
    if(key === '$or') {
      return '(' + _.map(value, generateSearch).join(' or ') + ')';
    }
    else if(_.isArray(value)) {
      if(!_.isEmpty(value))
        return utils.quoteField(key) + ' in (' +
          _.map(value, generateValue).join(', ') + ')';
    }
    else if(_.isObject(value) && value instanceof QueryParam) { // Simple search
      return utils.quoteField(key) + '=' + generateValue(value);
    }
    else if(_.isObject(value)){ // Compound search
      key = utils.quoteField(key);
      var params = [];
      _.each(value, function(v, k){
        var param = generateOperator(key, k, v);
        if(param)
          params.push(param);
      });
      return '(' + params.join(' and ') + ')';
    }
  }).join(' and ');
};

var generateValue = function(value){
  if(value instanceof QueryParam)
    return '@' + value.name;
  else
    throw new Error('Invalid value: ' + value + '. Must be a parameter');
};

var generateOperator = function(key, op, value){
  switch(op){
    case '$gt':
      return key + '>' + generateValue(value);
    case '$gte':
      return key + '>=' + generateValue(value);
    case '$lt':
      return key + '<' + generateValue(value);
    case '$lte':
      return key + '<=' + generateValue(value);
    case '$in':
      return key + ' in (' + _.map(value, generateValue).join(', ') + ')';
    case '$nin':
      return key + ' not in (' + _.map(value, generateValue).join(', ') + ')';
    case '$ne':
      return key + '!=' + generateValue(value);
    case '$null':
      return key + ' is ' + (value ? '' : 'not ') + 'null';
  }
};
