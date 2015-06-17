/*!
 * Module dependencies
 */
var mongodb = require('mongodb');
var util = require('util');
var async = require('async');
var Connector = require('loopback-connector').Connector;
var debug = require('debug')('loopback:connector:mongodb');

/*!
 * Convert the id to be a BSON ObjectID if it is compatible
 * @param {*} id The id value
 * @returns {ObjectID}
 */
function ObjectID(id) {
  if (id instanceof mongodb.ObjectID) {
    return id;
  }
  if (typeof id !== 'string') {
    return id;
  }
  try {
    // MongoDB's ObjectID constructor accepts number, 12-byte string or 24-byte
    // hex string. For LoopBack, we only allow 24-byte hex string, but 12-byte
    // string such as 'line-by-line' should be kept as string
    if(/^[0-9a-fA-F]{24}$/.test(id)) {
      return new mongodb.ObjectID(id);
    } else {
      return id;
    }
  } catch (e) {
    return id;
  }
}

/*!
 * Generate the mongodb URL from the options
 */
function generateMongoDBURL(options) {
  options.hostname = (options.hostname || options.host || '127.0.0.1');
  options.port = (options.port || 27017);
  options.database = (options.database || options.db || 'test');
  var username = options.username || options.user;
  if (username && options.password) {
    return "mongodb://" + username + ":" + options.password + "@" + options.hostname + ":" + options.port + "/" + options.database;
  } else {
    return "mongodb://" + options.hostname + ":" + options.port + "/" + options.database;
  }
}

/**
 * Initialize the MongoDB connector for the given data source
 * @param {DataSource} dataSource The data source instance
 * @param {Function} [callback] The callback function
 */
exports.initialize = function initializeDataSource(dataSource, callback) {
  if (!mongodb) {
    return;
  }

  var s = dataSource.settings;

  s.safe = (s.safe !== false);
  s.w = s.w || 1;
  s.url = s.url || generateMongoDBURL(s);
  dataSource.connector = new MongoDB(s, dataSource);
  dataSource.ObjectID = mongodb.ObjectID;

  if (callback) {
    dataSource.connector.connect(callback);
  }
};

/**
 * The constructor for MongoDB connector
 * @param {Object} settings The settings object
 * @param {DataSource} dataSource The data source instance
 * @constructor
 */
function MongoDB(settings, dataSource) {
  Connector.call(this, 'mongodb', settings);

  this.debug = settings.debug || debug.enabled;

  if (this.debug) {
    debug('Settings: %j', settings);
  }

  this.dataSource = dataSource;

}

util.inherits(MongoDB, Connector);

/**
 * Connect to MongoDB
 * @param {Function} [callback] The callback function
 *
 * @callback callback
 * @param {Error} err The error object
 * @param {Db} db The mongo DB object
 */
MongoDB.prototype.connect = function (callback) {
  var self = this;
  if (self.db) {
    process.nextTick(function () {
      callback && callback(null, self.db);
    });
  } else {
    connectToMongoDB(self.settings.url, self.settings, function (err, db) {
      if (!err) {
        if (self.debug) {
          debug('MongoDB connection is established: ' + self.settings.url);
        }
        self.db = db;
      } else {
        if (self.debug || !callback) {
          console.error('MongoDB connection is failed: ' + self.settings.url, err);
        }
      }
      callback && callback(err, db);
    });
  }
};

// Workaround for https://jira.mongodb.org/browse/NODE-478
function connectToMongoDB(url, options, callback) {
  var waitForFullSetup = false;
  var user, password;
  var index1 = 'mongodb://'.length;
  var servers = url.substring(index1);
  servers = servers.substring(0, servers.indexOf('/'));
  if (servers.indexOf(',') !== -1) {
    var index2 = servers.indexOf('@');
    if (index2 !== -1) {
      waitForFullSetup = true;
      var credential = servers.substring(0, index2).split(':');
      user = credential[0];
      password = credential[1];
      var index3 = url.indexOf('@');
      url = 'mongodb://' + url.substring(index3 + 1);
    }
  }

  if (!waitForFullSetup) {
    mongodb.MongoClient.connect(url, options, callback);
  } else {
    mongodb.MongoClient.connect(url, options, function(err, db) {
      if (err) return callback(err);

      if (db) {
        db.authenticate(user, password, options, function(err, ok) {
            if (err) return callback(err);
            if (ok) {
              return callback(null, db);
            } else {
              return callback(null, null);
            }
          });
        return;
      }
      callback(err, db);
    });
  }
}


MongoDB.prototype.getTypes = function () {
  return ['db', 'nosql', 'mongodb'];
};

MongoDB.prototype.getDefaultIdType = function () {
  return ObjectID;
};

/**
 * Get collection name for a given model
 * @param {String} model Model name
 * @returns {String} collection name
 */
MongoDB.prototype.collectionName = function(model) {
  var modelClass = this._models[model];
  if (modelClass.settings.mongodb) {
    model = modelClass.settings.mongodb.collection || model;
  }
  return model;
};

/**
 * Access a MongoDB collection by model name
 * @param {String} model The model name
 * @returns {*}
 */
MongoDB.prototype.collection = function (model) {
  if (!this.db) {
    throw new Error('MongoDB connection is not established');
  }
  var collectionName = this.collectionName(model);
  return this.db.collection(collectionName);
};

/*!
 * Convert the data from database to JSON
 *
 * @param {String} model The model name
 * @param {Object} data The data from DB
 */
MongoDB.prototype.fromDatabase = function (model, data) {
  if (!data) {
    return null;
  }
  var props = this._models[model].properties;
  for (var p in props) {
    var prop = props[p];
    if (prop && prop.type === Buffer) {
      if(data[p] instanceof mongodb.Binary) {
        // Convert the Binary into Buffer
        data[p] = data[p].read(0, data[p].length());
      }
    } else if(prop && prop.type === String) {
      if(data[p] instanceof mongodb.Binary) {
        // Convert the Binary into String
        data[p] = data[p].toString();
      }
    }
  }
  return data;
};

/**
 * Execute a mongodb command
 * @param {String} model The model name
 * @param {String} command The command name
 * @param [...] params Parameters for the given command
 */
MongoDB.prototype.execute = function(model, command) {
  var collection = this.collection(model);
  // Get the parameters for the given command
  var args = [].slice.call(arguments, 2);
  // The last argument must be a callback function
  var callback = args[args.length - 1];
  var context = {
    model: model,
    collection: collection, req: {
      command: command,
      params: args
    }
  };
  this.notifyObserversAround('execute', context, function(context, done) {
    args[args.length - 1] = function(err, result) {
      if (err) {
        debug('Error: ', err);
      } else {
        context.res = result;
        debug('Result: ', result);
      }
      done(err, result);
    }
    debug('MongoDB: model=%s command=%s', model, command, args);
    return collection[command].apply(collection, args);
  }, callback);
};

/**
 * Create a new model instance for the given data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.create = function (model, data, options, callback) {
  var self = this;
  if (self.debug) {
    debug('create', model, data);
  }
  var idValue = self.getIdValue(model, data);
  var idName = self.idName(model);

  if (idValue === null) {
    delete data[idName]; // Allow MongoDB to generate the id
  } else {
    var oid = ObjectID(idValue); // Is it an Object ID?c
    data._id = oid; // Set it to _id
    idName !== '_id' && delete data[idName];
  }
  this.execute(model, 'insert', data, {safe: true}, function (err, result) {
    if (self.debug) {
      debug('create.callback', model, err, result);
    }
    if(err) {
      return callback(err);
    }
    idValue = result.ops[0]._id;
    var modelClass = self._models[model];
    var idType = modelClass.properties[idName].type;
    if (idType === String) {
      idValue = String(idValue);
    } else if (idType === Number) {
      var num = Number(idValue);
      if (!isNaN(num)) {
        idValue = num;
      }
    } else if (idType === ObjectID) {
      idValue = ObjectID(idValue);
    }
    callback(err, err ? null : idValue);
  });
};

/**
 * Save the model instance for the given data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.save = function (model, data, options, callback) {
  var self = this;
  if (self.debug) {
    debug('save', model, data);
  }
  var idValue = self.getIdValue(model, data);
  var idName = self.idName(model);

  var oid = ObjectID(idValue);
  data._id = oid;
  idName !== '_id' && delete data[idName];

  this.execute(model, 'save', data, {w: 1}, function (err, result) {
    if (!err) {
      self.setIdValue(model, data, idValue);
      idName !== '_id' && delete data._id;
    }
    if (self.debug) {
      debug('save.callback', model, err, result);
    }

    var info = {};
    if (result && result.result) {
      // create result formats:
      //   { ok: 1, n: 1, upserted: [ [Object] ] }
      //   { ok: 1, nModified: 0, n: 1, upserted: [ [Object] ] }
      //
      // update result formats:
      //   { ok: 1, n: 1 }
      //   { ok: 1, nModified: 1, n: 1 }
      if (result.result.ok === 1 && result.result.n === 1) {
        info.isNewInstance = !!result.result.upserted;
      } else {
        debug('save result format not recognized: %j', result.result);
      }
    }

    callback && callback(err, result && result.ops, info);
  });
};

/**
 * Check if a model instance exists by id
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {Function} [callback] The callback function
 *
 */
MongoDB.prototype.exists = function (model, id, options, callback) {
  var self = this;
  if (self.debug) {
    debug('exists', model, id);
  }
  id = ObjectID(id);
  this.execute(model, 'findOne', {_id: id}, function (err, data) {
    if (self.debug) {
      debug('exists.callback', model, id, err, data);
    }
    callback(err, !!(!err && data));
  });
};

/**
 * Find a model instance by id
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.find = function find(model, id, options, callback) {
  var self = this;
  if (self.debug) {
    debug('find', model, id);
  }
  var idValue = id;
  var idName = self.idName(model);

  // Type conversion for id
  var idProp = self._models[model].properties[idName];
  if(idProp && typeof idProp.type === 'function') {
    if(!(id instanceof idProp.type)) {
      idValue = idProp.type(id);
      if (idProp.type === Number && isNaN(id)) {
        // Reset to id
        idValue = id;
      }
    }
  }
  var oid = ObjectID(idValue);
  this.execute(model, 'findOne', {_id: oid}, function (err, data) {
    if (self.debug) {
      debug('find.callback', model, id, err, data);
    }

    data = self.fromDatabase(model, data);
    data && idName !== '_id' && delete data._id;
    callback && callback(err, data);
  });
};

/**
 * Parses the data input for update operations and returns the
 * sanitised version of the object.
 *
 * @param data
 * @returns {*}
 */
MongoDB.prototype.parseUpdateData = function(model, data) {
  var parsedData = {};

  if (this.settings.allowExtendedOperators === true) {
    // Check for other operators and sanitize the data obj
    var acceptedOperators = [
      // Field operators
      '$currentDate', '$inc', '$max', '$min', '$mul', '$rename', '$setOnInsert', '$set', '$unset',
      // Array operators
      '$addToSet', '$pop', '$pullAll', '$pull', '$pushAll', '$push',
      // Bitwise operator
      '$bit'
    ];

    var usedOperators = 0;

    // each accepted operator will take its place on parsedData if defined
    for (var i = 0; i < acceptedOperators.length; i++) {
      if(data[acceptedOperators[i]]) {
        parsedData[acceptedOperators[i]] = data[acceptedOperators[i]];
        usedOperators++;
      }
    }

    // if parsedData is still empty, then we fallback to $set operator
    if(usedOperators === 0) {
      parsedData.$set = data;
    }
  } else {
    parsedData.$set = data;
  }

  return parsedData;
};

/**
 * Update if the model instance exists with the same id or create a new instance
 *
 * @param {String} model The model name
 * @param {Object} data The model instance data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.updateOrCreate = function updateOrCreate(model, data, options, callback) {
  var self = this;
  if (self.debug) {
    debug('updateOrCreate', model, data);
  }

  var id = self.getIdValue(model, data);
  var idName = self.idName(model);
  var oid = ObjectID(id);
  delete data[idName];

  // Check for other operators and sanitize the data obj
  data = self.parseUpdateData(model, data);

  this.execute(model, 'findAndModify', {
    _id: oid
  }, [
    ['_id', 'asc']
  ], data, {upsert: true, new: true}, function (err, result) {
    if (self.debug) {
      debug('updateOrCreate.callback', model, id, err, result);
    }
    var object = result && result.value;
    if (!err && !object) {
      // No result
      err = 'No ' + model + ' found for id ' + id;
    }
    if (!err) {
      self.setIdValue(model, object, id);
      object && idName !== '_id' && delete object._id;
    }

    var info;
    if (result && result.lastErrorObject) {
      info = { isNewInstance: !result.lastErrorObject.updatedExisting };
    } else {
      debug('updateOrCreate result format not recognized: %j', result);
    }

    callback && callback(err, object, info);
  });
};

/**
 * Delete a model instance by id
 * @param {String} model The model name
 * @param {*} id The id value
 * @param [callback] The callback function
 */
MongoDB.prototype.destroy = function destroy(model, id, options, callback) {
  var self = this;
  if (self.debug) {
    debug('delete', model, id);
  }
  id = ObjectID(id);
  this.execute(model, 'remove', {_id: id}, function (err, result) {
    if (self.debug) {
      debug('delete.callback', model, id, err, result);
    }
    callback && callback(err, result && result.ops);
  });
};

/*!
 * Decide if id should be included
 * @param {Object} fields
 * @returns {Boolean}
 * @private
 */
function idIncluded(fields, idName) {
  if (!fields) {
    return true;
  }
  if (Array.isArray(fields)) {
    return fields.indexOf(idName) >= 0;
  }
  if (fields[idName]) {
    // Included
    return true;
  }
  if ((idName in fields) && !fields[idName]) {
    // Excluded
    return false;
  }
  for (var f in fields) {
    return !fields[f]; // If the fields has exclusion
  }
  return true;
}

MongoDB.prototype.buildWhere = function (model, where) {
  var self = this;
  var query = {};
  if (where === null || (typeof where !== 'object')) {
    return query;
  }
  var idName = self.idName(model);
  Object.keys(where).forEach(function (k) {
    var cond = where[k];
    if (k === idName) {
      k = '_id';
      cond = ObjectID(cond);
    }
    if (k === 'and' || k === 'or' || k === 'nor') {
      if (Array.isArray(cond)) {
        cond = cond.map(function (c) {
          return self.buildWhere(model, c);
        });
      }
      query['$' + k ] = cond;
      delete query[k];
      return;
    }
    var spec = false;
    var options = null;
    if (cond && cond.constructor.name === 'Object') {
      options = cond.options;
      spec = Object.keys(cond)[0];
      cond = cond[spec];
    }
    if (spec) {
      if (spec === 'between') {
        query[k] = { $gte: cond[0], $lte: cond[1]};
      } else if (spec === 'inq') {
        query[k] = { $in: cond.map(function (x) {
          if ('string' !== typeof x) return x;
          return ObjectID(x);
        })};
      } else if (spec === 'like') {
        query[k] = {$regex: new RegExp(cond, options)};
      } else if (spec === 'nlike') {
        query[k] = {$not: new RegExp(cond, options)};
      } else if (spec === 'neq') {
        query[k] = {$ne: cond};
      }
      else {
        query[k] = {};
        query[k]['$' + spec] = cond;
      }
    } else {
      if (cond === null) {
        // http://docs.mongodb.org/manual/reference/operator/query/type/
        // Null: 10
        query[k] = {$type: 10};
      } else {
        query[k] = cond;
      }
    }
  });
  return query;
}

/**
 * Find matching model instances by the filter
 *
 * @param {String} model The model name
 * @param {Object} filter The filter
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.all = function all(model, filter, options, callback) {
  var self = this;
  if (self.debug) {
    debug('all', model, filter);
  }
  filter = filter || {};
  var idName = self.idName(model);
  var query = {};
  if (filter.where) {
    if (filter.where[idName]) {
      var id = filter.where[idName];
      delete filter.where[idName];
      id = ObjectID(id);
      filter.where._id = id;
    }
    query = self.buildWhere(model, filter.where);
  }
  var fields = filter.fields;
  if (fields) {
    this.execute(model, 'find', query, fields, processResponse);
  } else {
    this.execute(model, 'find', query, processResponse);
  }

  function processResponse(err, cursor) {
    if (err) {
      return callback(err);
    }
    var order = {};
    if (!filter.order) {
      var idNames = self.idNames(model);
      if (idNames && idNames.length) {
        filter.order = idNames;
      }
    }
    if (filter.order) {
      var keys = filter.order;
      if (typeof keys === 'string') {
        keys = keys.split(',');
      }
      for (var index = 0, len = keys.length; index < len; index++) {
        var m = keys[index].match(/\s+(A|DE)SC$/);
        var key = keys[index];
        key = key.replace(/\s+(A|DE)SC$/, '').trim();
        if (key === idName) {
          key = '_id';
        }
        if (m && m[1] === 'DE') {
          order[key] = -1;
        } else {
          order[key] = 1;
        }
      }
    } else {
      // order by _id by default
      order = {_id: 1};
    }
    cursor.sort(order);

    if (filter.limit) {
      cursor.limit(filter.limit);
    }
    if (filter.skip) {
      cursor.skip(filter.skip);
    } else if (filter.offset) {
      cursor.skip(filter.offset);
    }
    cursor.toArray(function(err, data) {
      if (self.debug) {
        debug('all', model, filter, err, data);
      }
      if (err) {
        return callback(err);
      }
      var objs = data.map(function(o) {
        if (idIncluded(fields, self.idName(model))) {
          self.setIdValue(model, o, o._id);
        }
        // Don't pass back _id if the fields is set
        if (fields || idName !== '_id') {
          delete o._id;
        }
        o = self.fromDatabase(model, o);

        return o;
      });
      if (filter && filter.include) {
        self._models[model].model.include(objs, filter.include, options, callback);
      } else {
        callback(null, objs);
      }
    });
  }
};

/**
 * Delete all instances for the given model
 * @param {String} model The model name
 * @param {Object} [where] The filter for where
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.destroyAll = function destroyAll(model, where, options, callback) {
  var self = this;
  if (self.debug) {
    debug('destroyAll', model, where);
  }
  if (!callback && 'function' === typeof where) {
    callback = where;
    where = undefined;
  }
  where = self.buildWhere(model, where);
  this.execute(model, 'remove', where || {}, function(err, info) {
    if (err) return callback && callback(err);

    if (self.debug)
      debug('destroyAll.callback', model, where, err, info);

    var affectedCount = info.result ? info.result.n : undefined;

    callback && callback(err, {count: affectedCount});
  });
};

/**
 * Count the number of instances for the given model
 *
 * @param {String} model The model name
 * @param {Function} [callback] The callback function
 * @param {Object} filter The filter for where
 *
 */
MongoDB.prototype.count = function count(model, where, options, callback) {
  var self = this;
  if (self.debug) {
    debug('count', model, where);
  }
  where = self.buildWhere(model, where);
  this.execute(model, 'count', where, function (err, count) {
    if (self.debug) {
      debug('count.callback', model, err, count);
    }
    callback && callback(err, count);
  });
};

/**
 * Update properties for the model instance data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.updateAttributes = function updateAttrs(model, id, data, options, cb) {
  var self = this;

  // Check for other operators and sanitize the data obj
  data = self.parseUpdateData(model, data);

  if (self.debug) {
    debug('updateAttributes', model, id, data);
  }
  var oid = ObjectID(id);
  var idName = this.idName(model);

  this.execute(model, 'findAndModify', {_id: oid}, [
    ['_id', 'asc']
  ], data, {}, function (err, result) {
    if (self.debug) {
      debug('updateAttributes.callback', model, id, err, result);
    }
    var object = result && result.value;
    if (!err && !object) {
      // No result
      err = 'No ' + model + ' found for id ' + id;
    }
    self.setIdValue(model, object, id);
    object && idName !== '_id' && delete object._id;
    cb && cb(err, object);
  });
};

/**
 * Update all matching instances
 * @param {String} model The model name
 * @param {Object} where The search criteria
 * @param {Object} data The property/value pairs to be updated
 * @callback {Function} cb Callback function
 */
MongoDB.prototype.update =
  MongoDB.prototype.updateAll = function updateAll(model, where, data, options, cb) {
    var self = this;
    if (self.debug) {
      debug('updateAll', model, where, data);
    }
    var idName = this.idName(model);

    where = self.buildWhere(model, where);
    delete data[idName];

    // Check for other operators and sanitize the data obj
    data = self.parseUpdateData(model, data);

    this.execute(model, 'update', where, data, {multi: true, upsert: false},
      function(err, info) {
        if (err) return cb && cb(err);

        if (self.debug)
          debug('updateAll.callback', model, where, data, err, info);

        var affectedCount = info.result ? info.result.n : undefined;

        cb && cb(err, {count: affectedCount});
      });
  };

/**
 * Disconnect from MongoDB
 */
MongoDB.prototype.disconnect = function (cb) {
  if (this.debug) {
    debug('disconnect');
  }
  if (this.db) {
    this.db.close();
  }
  if (cb) {
    process.nextTick(cb);
  }
};

/**
 * Perform autoupdate for the given models. It basically calls createIndex
 * @param {String[]} [models] A model name or an array of model names. If not
 * present, apply to all models
 * @param {Function} [cb] The callback function
 */
MongoDB.prototype.autoupdate = function (models, cb) {
  var self = this;
  if (self.db) {
    if (self.debug) {
      debug('autoupdate');
    }
    if ((!cb) && ('function' === typeof models)) {
      cb = models;
      models = undefined;
    }
    // First argument is a model name
    if ('string' === typeof models) {
      models = [models];
    }

    models = models || Object.keys(self._models);

    async.each(models, function (model, modelCallback) {
      var indexes = self._models[model].settings.indexes || [];
      var indexList = [];
      var index = {};
      var options = {};

      if (typeof indexes === 'object') {
        for (var indexName in indexes) {
          index = indexes[indexName];
          if (index.keys) {
            // The index object has keys
            options = index.options || {};
            options.name = options.name || indexName;
            index.options = options;
          } else {
            options = {name: indexName};
            index = {
              keys: index,
              options: options
            };
          }
          indexList.push(index);
        }
      } else if (Array.isArray(indexes)) {
        indexList = indexList.concat(indexes);
      }

      var properties = self._models[model].properties;
      for (var p in properties) {
        if (properties[p].index) {
          index = {};
          index[p] = 1; // Add the index key
          if (typeof properties[p].index === 'object') {
            // If there is a mongodb key for the index, use it
            if (typeof properties[p].index.mongodb === 'object') {
              options = properties[p].index.mongodb;
              index[p] = options.kind || 1;

              // Backwards compatibility for former type of indexes
              if (properties[p].index.unique === true) {
                options.unique = true;
              }

            } else {
              // If there isn't an  properties[p].index.mongodb object, we read the properties from  properties[p].index
              options = properties[p].index;
            }

            if (options.background === undefined) {
              options.background = true;
            }
          // If properties[p].index isn't an object we hardcode the background option and check for properties[p].unique
          } else {
            options = {background: true};
            if(properties[p].unique) {
              options.unique = true;
            }
          }
          indexList.push({keys: index, options: options});
        }
      }

      if (self.debug) {
        debug('create indexes: ', indexList);
      }

      async.each(indexList, function (index, indexCallback) {
        if (self.debug) {
          debug('createIndex: ', index);
        }
        self.collection(model).createIndex(index.fields || index.keys, index.options, indexCallback);
      }, modelCallback);

    }, cb);
  } else {
    self.dataSource.once('connected', function () {
      self.autoupdate(models, cb);
    });
  }
};

/**
 * Perform automigrate for the given models. It drops the corresponding collections
 * and calls createIndex
 * @param {String[]} [models] A model name or an array of model names. If not present, apply to all models
 * @param {Function} [cb] The callback function
 */
MongoDB.prototype.automigrate = function (models, cb) {
  var self = this;
  if (self.db) {
    if (self.debug) {
      debug('automigrate');
    }
    if ((!cb) && ('function' === typeof models)) {
      cb = models;
      models = undefined;
    }
    // First argument is a model name
    if ('string' === typeof models) {
      models = [models];
    }

    models = models || Object.keys(self._models);

    // Make it serial as multiple models might map to the same collection
    async.eachSeries(models, function (model, modelCallback) {

      var collectionName = self.collectionName(model);
      if (self.debug) {
        debug('drop collection %s for model %s', collectionName, model);
      }

      self.db.dropCollection(collectionName, function(err, collection) {
        if (err) {
          debug('Error dropping collection %s for model %s: ', collectionName, model, err);
          if (!(err.name === 'MongoError' && err.ok === 0
            && err.errmsg === 'ns not found')) {
            // For errors other than 'ns not found' (collection doesn't exist)
            return modelCallback(err);
          }
        }
        // Recreate the collection
        if (self.debug) {
          debug('create collection %s for model %s', collectionName, model);
        }
        self.db.createCollection(collectionName, modelCallback);
      });
    }, function (err) {
      if (err) {
        return cb && cb(err);
      }
      self.autoupdate(models, cb);
    });
  } else {
    self.dataSource.once('connected', function () {
      self.automigrate(models, cb);
    });
  }
};

MongoDB.prototype.ping = function (cb) {
  var self = this;
  if (self.db) {
    this.db.collection('dummy').findOne({_id: 1}, cb);
  } else {
    self.dataSource.once('connected', function () {
      self.ping(cb);
    });
    self.dataSource.once('error', function (err) {
      cb(err);
    });
    self.connect(function() {});
  }
};

