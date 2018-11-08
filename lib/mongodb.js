// Copyright IBM Corp. 2012,2016. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

/*!
 * Module dependencies
 */
var bson = require('bson');
var g = require('strong-globalize')();
var mongodb = require('mongodb');
var urlParser = require('mongodb/lib/url_parser');
var util = require('util');
var async = require('async');
var Connector = require('loopback-connector').Connector;
var debug = require('debug')('loopback:connector:mongodb');
var Decimal128 = mongodb.Decimal128;

exports.ObjectID = ObjectID;
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
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      return bson.ObjectID(id);
    } else {
      return id;
    }
  } catch (e) {
    return id;
  }
}

exports.generateMongoDBURL = generateMongoDBURL;
/*!
 * Generate the mongodb URL from the options
 */
function generateMongoDBURL(options) {
  // See https://docs.mongodb.com/manual/reference/connection-string/#dns-seedlist-connection-format
  // It can be `mongodb+srv` now.
  options.protocol = options.protocol || 'mongodb';
  options.hostname = options.hostname || options.host || '127.0.0.1';
  options.port = options.port || 27017;
  options.database = options.database || options.db || 'test';
  var username = options.username || options.user;
  if (username && options.password) {
    return (
      options.protocol +
      '://' +
      username +
      ':' +
      options.password +
      '@' +
      options.hostname +
      ':' +
      options.port +
      '/' +
      options.database
    );
  } else {
    return (
      options.protocol +
      '://' +
      options.hostname +
      ':' +
      options.port +
      '/' +
      options.database
    );
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

  s.safe = s.safe !== false;
  s.w = s.w || 1;
  s.url = s.url || generateMongoDBURL(s);
  dataSource.connector = new MongoDB(s, dataSource);
  dataSource.ObjectID = mongodb.ObjectID;

  if (callback) {
    if (s.lazyConnect) {
      process.nextTick(function() {
        callback();
      });
    } else {
      dataSource.connector.connect(callback);
    }
  }
};

// MongoDB has deprecated some commands. To preserve
// compatibility of model connector hooks, this maps the new
// commands to previous names for the observors of this command.
const COMMAND_MAPPINGS = {
  insertOne: 'insert',
  updateOne: 'save',
  findOneAndUpdate: 'findAndModify',
  deleteOne: 'delete',
  deleteMany: 'delete',
  replaceOne: 'update',
  updateMany: 'update',
  countDocuments: 'count',
  estimatedDocumentCount: 'count',
};

/**
 * Helper function to be used in {@ fieldsArrayToObj} in order for V8 to avoid re-creating a new
 * function every time {@ fieldsArrayToObj} is called
 *
 * @see fieldsArrayToObj
 * @param {object} result
 * @param {string} field
 * @returns {object}
 */
function arrayToObjectReducer(result, field) {
  result[field] = 1;
  return result;
}

exports.fieldsArrayToObj = fieldsArrayToObj;

/**
 * Helper function to accept an array representation of fields projection and return the mongo
 * required object notation
 *
 * @param {string[]} fieldsArray
 * @returns {Object}
 */
function fieldsArrayToObj(fieldsArray) {
  if (!Array.isArray(fieldsArray)) return fieldsArray; // fail safe check in case non array object created
  return fieldsArray.length ?
    fieldsArray.reduce(arrayToObjectReducer, {}) :
    {_id: 1};
}

exports.MongoDB = MongoDB;

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
  if (
    this.settings.enableOptimisedfindOrCreate === true ||
    this.settings.enableOptimisedFindOrCreate === true ||
    this.settings.enableOptimizedfindOrCreate === true ||
    this.settings.enableOptimizedFindOrCreate === true
  ) {
    MongoDB.prototype.findOrCreate = optimizedFindOrCreate;
  }
  if (this.settings.enableGeoIndexing === true) {
    MongoDB.prototype.buildNearFilter = buildNearFilter;
  } else {
    MongoDB.prototype.buildNearFilter = undefined;
  }
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
MongoDB.prototype.connect = function(callback) {
  var self = this;
  if (self.db) {
    process.nextTick(function() {
      if (callback) callback(null, self.db);
    });
  } else if (self.dataSource.connecting) {
    self.dataSource.once('connected', function() {
      process.nextTick(function() {
        if (callback) callback(null, self.db);
      });
    });
  } else {
    // See https://github.com/mongodb/node-mongodb-native/blob/3.0.0/lib/mongo_client.js#L37
    var validOptionNames = [
      'poolSize',
      'ssl',
      'sslValidate',
      'sslCA',
      'sslCert',
      'sslKey',
      'sslPass',
      'sslCRL',
      'autoReconnect',
      'noDelay',
      'keepAlive',
      'keepAliveInitialDelay',
      'connectTimeoutMS',
      'family',
      'socketTimeoutMS',
      'reconnectTries',
      'reconnectInterval',
      'ha',
      'haInterval',
      'replicaSet',
      'secondaryAcceptableLatencyMS',
      'acceptableLatencyMS',
      'connectWithNoPrimary',
      'authSource',
      'w',
      'wtimeout',
      'j',
      'forceServerObjectId',
      'serializeFunctions',
      'ignoreUndefined',
      'raw',
      'bufferMaxEntries',
      'readPreference',
      'pkFactory',
      'promiseLibrary',
      'readConcern',
      'maxStalenessSeconds',
      'loggerLevel',
      'logger',
      'promoteValues',
      'promoteBuffers',
      'promoteLongs',
      'domainsEnabled',
      'checkServerIdentity',
      'validateOptions',
      'appname',
      'auth',
      'user',
      'password',
      'authMechanism',
      'compression',
      'fsync',
      'readPreferenceTags',
      'numberOfRetries',
      'auto_reconnect',
      'minSize',
      'useNewUrlParser',
      // Ignored options
      'native_parser',
      // Legacy options
      'server',
      'replset',
      'replSet',
      'mongos',
      'db',
    ];

    var lbOptions = Object.keys(self.settings);
    var validOptions = {};
    lbOptions.forEach(function(option) {
      if (validOptionNames.indexOf(option) > -1) {
        validOptions[option] = self.settings[option];
      }
    });
    debug('Valid options: %j', validOptions);
    new mongodb.MongoClient(self.settings.url, validOptions).connect(function(
      err,
      client
    ) {
      if (!err) {
        if (self.debug) {
          debug('MongoDB connection is established: ' + self.settings.url);
        }
        self.client = client;
        // The database name might be in the url
        return urlParser(self.settings.url, self.settings, function(err, url) {
          self.db = client.db(
            url.dbName || self.settings.database,
            url.db_options || self.settings
          );
          if (callback) callback(err, self.db);
        });
      } else {
        if (self.debug || !callback) {
          g.error(
            '{{MongoDB}} connection is failed: %s %s',
            self.settings.url,
            err
          );
        }
        if (callback) callback(err, self.db);
      }
    });
  }
};

MongoDB.prototype.getTypes = function() {
  return ['db', 'nosql', 'mongodb'];
};

MongoDB.prototype.getDefaultIdType = function() {
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
MongoDB.prototype.collection = function(model) {
  if (!this.db) {
    throw new Error(g.f('{{MongoDB}} connection is not established'));
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
MongoDB.prototype.fromDatabase = function(model, data) {
  if (!data) {
    return null;
  }
  var modelInfo = this._models[model] || this.dataSource.modelBuilder.definitions[model];
  var props = modelInfo.properties;
  for (var p in props) {
    var prop = props[p];
    if (prop && prop.type === Buffer) {
      if (data[p] instanceof mongodb.Binary) {
        // Convert the Binary into Buffer
        data[p] = data[p].read(0, data[p].length());
      }
    } else if (prop && prop.type === String) {
      if (data[p] instanceof mongodb.Binary) {
        // Convert the Binary into String
        data[p] = data[p].toString();
      }
    } else if (
      data[p] &&
      prop &&
      prop.type &&
      prop.type.name === 'GeoPoint' &&
      this.settings.enableGeoIndexing === true
    ) {
      data[p] = {
        lat: data[p].coordinates[1],
        lng: data[p].coordinates[0],
      };
    } else if (prop && prop.type.definition) {
      data[p] = this.fromDatabase(prop.type.definition.name, data[p]);
    }
  }

  data = this.fromDatabaseToPropertyNames(model, data);

  return data;
};

/*!
 * Convert JSON to database-appropriate format
 *
 * @param {String} model The model name
 * @param {Object} data The JSON data to convert
 */
MongoDB.prototype.toDatabase = function(model, data) {
  var props = this._models[model].properties;

  if (this.settings.enableGeoIndexing === true) {
    for (var p in props) {
      var prop = props[p];
      const isGeoPoint = data[p] && prop && prop.type && prop.type.name === 'GeoPoint';
      if (isGeoPoint) {
        data[p] = {
          coordinates: [data[p].lng, data[p].lat],
          type: 'Point',
        };
      }
    }
  }

  convertDecimalProps(data, props);
  // Override custom column names
  data = this.fromPropertyToDatabaseNames(model, data);
  if (debug.enabled) debug('toDatabase data: ', util.inspect(data));
  return data;
};

/**
 * Execute a mongodb command
 * @param {String} model The model name
 * @param {String} command The command name
 * @param [...] params Parameters for the given command
 */
MongoDB.prototype.execute = function(model, command) {
  var self = this;
  // Get the parameters for the given command
  var args = [].slice.call(arguments, 2);
  // The last argument must be a callback function
  var callback = args[args.length - 1];

  // Topology is destroyed when the server is disconnected
  // Execute if DB is connected and functional otherwise connect/reconnect first
  if (self.db && self.db.topology && !self.db.topology.isDestroyed()) {
    doExecute();
  } else {
    if (self.db) {
      self.disconnect();
      self.db = null;
    }
    self.connect(function(err, db) {
      if (err) {
        debug(
          'Connection not established - MongoDB: model=%s command=%s -- error=%s',
          model,
          command,
          err
        );
      }
      doExecute();
    });
  }

  function doExecute() {
    var collection;
    var context = Object.assign({}, {
      model: model,
      collection: collection,
      req: {
        command: command,
        params: args,
      },
    });

    try {
      collection = self.collection(model);
    } catch (err) {
      debug('Error: ', err);
      callback(err);
      return;
    }

    if (command in COMMAND_MAPPINGS) {
      context.req.command = COMMAND_MAPPINGS[command];
    }

    self.notifyObserversAround(
      'execute',
      context,
      function(context, done) {
        args[args.length - 1] = function(err, result) {
          if (err) {
            debug('Error: ', err);
          } else {
            context.res = result;
            debug('Result: ', result);
          }
          done(err, result);
        };
        debug('MongoDB: model=%s command=%s', model, command, args);
        return collection[command].apply(collection, args);
      },
      callback
    );
  }
};

MongoDB.prototype.coerceId = function(model, id, options) {
  // See https://github.com/strongloop/loopback-connector-mongodb/issues/206
  if (id == null) return id;
  var self = this;
  var idValue = id;
  var idName = self.idName(model);

  // Type conversion for id
  var idProp = self.getPropertyDefinition(model, idName);
  if (idProp && typeof idProp.type === 'function') {
    if (!(idValue instanceof idProp.type)) {
      idValue = idProp.type(id);
      if (idProp.type === Number && isNaN(id)) {
        // Reset to id
        idValue = id;
      }
    }

    if (self.isObjectIDProperty(model, idProp, idValue, options)) {
      idValue = ObjectID(idValue);
    }
  }
  return idValue;
};

/**
 * Create a new model instance for the given data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.create = function(model, data, options, callback) {
  var self = this;
  if (self.debug) {
    debug('create', model, data);
  }
  var idValue = self.getIdValue(model, data);
  var idName = self.idName(model);

  if (idValue === null) {
    delete data[idName]; // Allow MongoDB to generate the id
  } else {
    var oid = self.coerceId(model, idValue, options); // Is it an Object ID?c
    data._id = oid; // Set it to _id
    if (idName !== '_id') {
      delete data[idName];
    }
  }

  data = self.toDatabase(model, data);

  this.execute(model, 'insertOne', data, {safe: true}, function(err, result) {
    if (self.debug) {
      debug('create.callback', model, err, result);
    }
    if (err) {
      return callback(err);
    }
    idValue = result.ops[0]._id;
    idValue = self.coerceId(model, idValue, options);
    // Wrap it to process.nextTick as delete data._id seems to be interferring
    // with mongo insert
    process.nextTick(function() {
      // Restore the data object
      delete data._id;
      data[idName] = idValue;
      callback(err, err ? null : idValue);
    });
  });
};

/**
 * Save the model instance for the given data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.save = function(model, data, options, callback) {
  var self = this;
  if (self.debug) {
    debug('save', model, data);
  }
  var idValue = self.getIdValue(model, data);
  var idName = self.idName(model);

  var oid = self.coerceId(model, idValue, options);
  data._id = oid;
  if (idName !== '_id') {
    delete data[idName];
  }

  data = self.toDatabase(model, data);

  this.execute(model, 'updateOne', {_id: oid}, {$set: data}, {upsert: true}, function(err, result) {
    if (!err) {
      self.setIdValue(model, data, idValue);
      if (idName !== '_id') {
        delete data._id;
      }
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

    if (callback) {
      callback(err, result && result.ops, info);
    }
  });
};

/**
 * Check if a model instance exists by id
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {Function} [callback] The callback function
 *
 */
MongoDB.prototype.exists = function(model, id, options, callback) {
  var self = this;
  if (self.debug) {
    debug('exists', model, id);
  }
  id = self.coerceId(model, id, options);
  this.execute(model, 'findOne', {_id: id}, function(err, data) {
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
  var idName = self.idName(model);
  var oid = self.coerceId(model, id, options);
  this.execute(model, 'findOne', {_id: oid}, function(err, data) {
    if (self.debug) {
      debug('find.callback', model, id, err, data);
    }

    data = self.fromDatabase(model, data);
    if (data && idName !== '_id') {
      delete data._id;
    }
    if (callback) {
      callback(err, data);
    }
  });
};

Connector.defineAliases(MongoDB.prototype, 'find', 'findById');

/**
 * Parses the data input for update operations and returns the
 * sanitised version of the object.
 *
 * @param data
 * @returns {*}
 */
MongoDB.prototype.parseUpdateData = function(model, data, options) {
  options = options || {};
  var parsedData = {};

  var modelClass = this._models[model];

  var allowExtendedOperators = this.settings.allowExtendedOperators;
  if (options.hasOwnProperty('allowExtendedOperators')) {
    allowExtendedOperators = options.allowExtendedOperators === true;
  } else if (
    allowExtendedOperators !== false &&
    modelClass.settings.mongodb &&
    modelClass.settings.mongodb.hasOwnProperty('allowExtendedOperators')
  ) {
    allowExtendedOperators =
      modelClass.settings.mongodb.allowExtendedOperators === true;
  } else if (allowExtendedOperators === true) {
    allowExtendedOperators = true;
  }

  if (allowExtendedOperators) {
    // Check for other operators and sanitize the data obj
    var acceptedOperators = [
      // Field operators
      '$currentDate',
      '$inc',
      '$max',
      '$min',
      '$mul',
      '$rename',
      '$setOnInsert',
      '$set',
      '$unset',
      // Array operators
      '$addToSet',
      '$pop',
      '$pullAll',
      '$pull',
      '$pushAll',
      '$push',
      // Bitwise operator
      '$bit',
    ];

    var usedOperators = 0;

    // each accepted operator will take its place on parsedData if defined
    for (var i = 0; i < acceptedOperators.length; i++) {
      if (data[acceptedOperators[i]]) {
        parsedData[acceptedOperators[i]] = data[acceptedOperators[i]];
        usedOperators++;
      }
    }

    // if parsedData is still empty, then we fallback to $set operator
    if (usedOperators === 0 && Object.keys(data).length > 0) {
      parsedData.$set = data;
    }
  } else if (Object.keys(data).length > 0) {
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
MongoDB.prototype.updateOrCreate = function updateOrCreate(
  model,
  data,
  options,
  callback
) {
  var self = this;
  if (self.debug) {
    debug('updateOrCreate', model, data);
  }

  var id = self.getIdValue(model, data);
  var idName = self.idName(model);
  var oid = self.coerceId(model, id, options);
  delete data[idName];

  data = self.toDatabase(model, data);

  // Check for other operators and sanitize the data obj
  data = self.parseUpdateData(model, data, options);

  this.execute(
    model,
    'findOneAndUpdate',
    {
      _id: oid,
    },
    data,
    {
      upsert: true,
      returnOriginal: false,
      sort: [['_id', 'asc']],
    },
    function(err, result) {
      if (self.debug) {
        debug('updateOrCreate.callback', model, id, err, result);
      }
      var object = result && result.value;
      if (!err && !object) {
        // No result
        err = 'No ' + model + ' found for id ' + id;
      }
      if (!err) {
        self.setIdValue(model, object, oid);
        if (object && idName !== '_id') {
          delete object._id;
        }
      }

      var info;
      if (result && result.lastErrorObject) {
        info = {isNewInstance: !result.lastErrorObject.updatedExisting};
      } else {
        debug('updateOrCreate result format not recognized: %j', result);
      }

      if (callback) {
        callback(err, object, info);
      }
    }
  );
};

/**
 * Replace model instance if it exists or create a new one if it doesn't
 *
 * @param {String} model The name of the model
 * @param {Object} data The model instance data
 * @param {Object} options The options object
 * @param {Function} [cb] The callback function
 */
MongoDB.prototype.replaceOrCreate = function(model, data, options, cb) {
  if (this.debug) debug('replaceOrCreate', model, data);

  var id = this.getIdValue(model, data);
  var oid = this.coerceId(model, id, options);
  var idName = this.idName(model);
  data._id = data[idName];
  delete data[idName];
  this.replaceWithOptions(model, oid, data, {upsert: true}, cb);
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
  id = self.coerceId(model, id, options);
  this.execute(model, 'deleteOne', {_id: id}, function(err, result) {
    if (self.debug) {
      debug('delete.callback', model, id, err, result);
    }
    var res = result && result.result;
    if (res) {
      res = {count: res.n};
    }
    if (callback) {
      callback(err, res);
    }
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
  if (idName in fields && !fields[idName]) {
    // Excluded
    return false;
  }
  for (var f in fields) {
    return !fields[f]; // If the fields has exclusion
  }
  return true;
}

MongoDB.prototype.buildWhere = function(model, where, options) {
  var self = this;
  var query = {};
  if (where === null || typeof where !== 'object') {
    return query;
  }

  where = sanitizeFilter(where, options);

  var idName = self.idName(model);
  Object.keys(where).forEach(function(k) {
    var cond = where[k];
    if (k === 'and' || k === 'or' || k === 'nor') {
      if (Array.isArray(cond)) {
        cond = cond.map(function(c) {
          return self.buildWhere(model, c, options);
        });
      }
      query['$' + k] = cond;
      delete query[k];
      return;
    }
    if (k === idName) {
      k = '_id';
    }
    var propName = k;
    if (k === '_id') {
      propName = idName;
    }

    var prop = self.getPropertyDefinition(model, propName);

    const isDecimal = prop &&
      prop.mongodb && prop.mongodb.dataType &&
      prop.mongodb.dataType.toLowerCase() === 'decimal128';
    if (isDecimal) {
      cond = Decimal128.fromString(cond);
      debug('buildWhere decimal value: %s, constructor name: %s', cond, cond.constructor.name);
    }

    // Convert property to database column name
    k = self.getDatabaseColumnName(model, k);

    var spec = false;
    var regexOptions = null;
    if (cond && cond.constructor.name === 'Object') {
      regexOptions = cond.options;
      spec = Object.keys(cond)[0];
      cond = cond[spec];
    }
    if (spec) {
      if (spec.charAt(0) === '$') spec = spec.substr(1);
      if (spec === 'between') {
        query[k] = {$gte: cond[0], $lte: cond[1]};
      } else if (spec === 'inq') {
        cond = [].concat(cond || []);
        query[k] = {
          $in: cond.map(function(x) {
            if (self.isObjectIDProperty(model, prop, x, options))
              return ObjectID(x);
            return x;
          }),
        };
      } else if (spec === 'nin') {
        cond = [].concat(cond || []);
        query[k] = {
          $nin: cond.map(function(x) {
            if (self.isObjectIDProperty(model, prop, x, options))
              return ObjectID(x);
            return x;
          }),
        };
      } else if (spec === 'like') {
        if (cond instanceof RegExp) {
          query[k] = {$regex: cond};
        } else {
          query[k] = {$regex: new RegExp(cond, regexOptions)};
        }
      } else if (spec === 'nlike') {
        if (cond instanceof RegExp) {
          query[k] = {$not: cond};
        } else {
          query[k] = {$not: new RegExp(cond, regexOptions)};
        }
      } else if (spec === 'neq') {
        query[k] = {$ne: cond};
      } else if (spec === 'regexp') {
        if (cond.global)
          g.warn('{{MongoDB}} regex syntax does not respect the {{`g`}} flag');

        query[k] = {$regex: cond};
      } else {
        query[k] = {};
        query[k]['$' + spec] = cond;
      }
    } else {
      if (cond === null) {
        // http://docs.mongodb.org/manual/reference/operator/query/type/
        // Null: 10
        query[k] = {$type: 10};
      } else {
        if (self.isObjectIDProperty(model, prop, cond, options)) {
          cond = ObjectID(cond);
        }
        query[k] = cond;
      }
    }
  });
  return query;
};

MongoDB.prototype.buildSort = function(model, order, options) {
  var sort = {};
  var idName = this.idName(model);

  var modelClass = this._models[model];

  var disableDefaultSort = false;
  if (this.settings.hasOwnProperty('disableDefaultSort')) {
    disableDefaultSort = this.settings.disableDefaultSort;
  }
  if (modelClass.settings.hasOwnProperty('disableDefaultSort')) {
    disableDefaultSort = modelClass.settings.disableDefaultSort;
  }
  if (options && options.hasOwnProperty('disableDefaultSort')) {
    disableDefaultSort = options.disableDefaultSort;
  }

  if (!order && !disableDefaultSort) {
    var idNames = this.idNames(model);
    if (idNames && idNames.length) {
      order = idNames;
    }
  }
  if (order) {
    order = sanitizeFilter(order, options);
    var keys = order;
    if (typeof keys === 'string') {
      keys = keys.split(',');
    }
    for (var index = 0, len = keys.length; index < len; index++) {
      var m = keys[index].match(/\s+(A|DE)SC$/);
      var key = keys[index];
      key = key.replace(/\s+(A|DE)SC$/, '').trim();
      if (key === idName) {
        key = '_id';
      } else {
        key = this.getDatabaseColumnName(model, key);
      }

      if (m && m[1] === 'DE') {
        sort[key] = -1;
      } else {
        sort[key] = 1;
      }
    }
  } else if (!disableDefaultSort) {
    // order by _id by default
    sort = {_id: 1};
  }
  return sort;
};

function convertToMeters(distance, unit) {
  switch (unit) {
    case 'meters':
      return distance;
    case 'kilometers':
      return distance * 1000;
    case 'miles':
      return distance * 1600;
    case 'feet':
      return distance * 0.3048;
    default:
      console.warn(
        'unsupported unit ' +
        unit +
        ", fallback to mongodb default unit 'meters'"
      );
      return distance;
  }
}

function buildNearFilter(query, params) {
  if (!Array.isArray(params)) {
    params = [params];
  }

  params.forEach(function(near) {
    var coordinates = {};

    if (typeof near.near === 'string') {
      var s = near.near.split(',');
      coordinates.lng = parseFloat(s[0]);
      coordinates.lat = parseFloat(s[1]);
    } else if (Array.isArray(near.near)) {
      coordinates.lng = near.near[0];
      coordinates.lat = near.near[1];
    } else {
      coordinates = near.near;
    }

    var props = ['maxDistance', 'minDistance'];
    // use mongodb default unit 'meters' rather than 'miles'
    var unit = near.unit || 'meters';

    var queryValue = {
      near: {
        $geometry: {
          coordinates: [coordinates.lng, coordinates.lat],
          type: 'Point',
        },
      },
    };

    props.forEach(function(p) {
      if (near[p]) {
        queryValue.near['$' + p] = convertToMeters(near[p], unit);
      }
    });

    var property;

    if (near.mongoKey) {
      // if mongoKey is an Array, set the $near query at the right depth, following the Array
      if (Array.isArray(near.mongoKey)) {
        property = query.where;

        for (var i = 0; i < near.mongoKey.length; i++) {
          var subKey = near.mongoKey[i];

          if (near.mongoKey.hasOwnProperty(i + 1)) {
            if (!property.hasOwnProperty(subKey)) {
              property[subKey] = Number.isInteger(near.mongoKey[i + 1]) ?
                [] :
                {};
            }

            property = property[subKey];
          }
        }

        property[near.mongoKey[i - 1]] = queryValue;
      } else {
        // mongoKey is a single string, just set it directly
        property = query.where[near.mongoKey] = queryValue;
      }
    }
  });
}

function hasNearFilter(where) {
  if (!where) return false;
  // TODO: Optimize to return once a `near` key is found
  // instead of searching through everything

  var isFound = false;

  searchForNear(where);

  function found(prop) {
    return prop && prop.near;
  }

  function searchForNear(node) {
    if (!node) {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(function(prop) {
        isFound = found(prop);

        if (!isFound) {
          searchForNear(prop);
        }
      });
    } else if (typeof node === 'object') {
      Object.keys(node).forEach(function(key) {
        var prop = node[key];

        isFound = found(prop);

        if (!isFound) {
          searchForNear(prop);
        }
      });
    }
  }
  return isFound;
}

MongoDB.prototype.getDatabaseColumnName = function(model, propName) {
  if (typeof model === 'string') {
    model = this._models[model];
  }

  if (typeof model !== 'object') {
    return propName; // unknown model type?
  }

  if (typeof model.properties !== 'object') {
    return propName; // missing model properties?
  }

  var prop = model.properties[propName] || {};

  // console.log('getDatabaseColumnName', propName, prop);

  // Try mongo overrides
  if (prop.mongodb) {
    propName =
      prop.mongodb.fieldName ||
      prop.mongodb.field ||
      prop.mongodb.columnName ||
      prop.mongodb.column ||
      prop.columnName ||
      prop.column ||
      propName;
  } else {
    // Try top level overrides
    propName = prop.columnName || prop.column || propName;
  }

  // Done
  // console.log('->', propName);
  return propName;
};

MongoDB.prototype.convertColumnNames = function(model, data, direction) {
  if (typeof data !== 'object') {
    return data; // skip
  }

  if (typeof model === 'string') {
    model = this._models[model];
  }

  if (typeof model !== 'object') {
    return data; // unknown model type?
  }

  if (typeof model.properties !== 'object') {
    return data; // missing model properties?
  }

  for (var propName in model.properties) {
    var columnName = this.getDatabaseColumnName(model, propName);

    // Copy keys/data if needed
    if (propName === columnName) {
      continue;
    }

    if (direction === 'database') {
      data[columnName] = data[propName];
      delete data[propName];
    }

    if (direction === 'property') {
      data[propName] = data[columnName];
      delete data[columnName];
    }
  }

  return data;
};

MongoDB.prototype.fromPropertyToDatabaseNames = function(model, data) {
  return this.convertColumnNames(model, data, 'database');
};

MongoDB.prototype.fromDatabaseToPropertyNames = function(model, data) {
  return this.convertColumnNames(model, data, 'property');
};

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
    query = self.buildWhere(model, filter.where, options);
  }
  var fields = filter.fields;

  // Convert custom column names
  fields = self.fromPropertyToDatabaseNames(model, fields);

  if (fields) {
    var findOpts = {projection: fieldsArrayToObj(fields)};
    this.execute(model, 'find', query, findOpts, processResponse);
  } else {
    this.execute(model, 'find', query, processResponse);
  }

  function processResponse(err, cursor) {
    if (err) {
      return callback(err);
    }

    // don't apply sorting if dealing with a geo query
    if (!hasNearFilter(filter.where)) {
      var order = self.buildSort(model, filter.order, options);
      cursor.sort(order);
    }

    if (filter.limit) {
      cursor.limit(filter.limit);
    }
    if (filter.skip) {
      cursor.skip(filter.skip);
    } else if (filter.offset) {
      cursor.skip(filter.offset);
    }

    var shouldSetIdValue = idIncluded(fields, idName);
    var deleteMongoId = fields || idName !== '_id';

    cursor.toArray(function(err, data) {
      if (self.debug) {
        debug('all', model, filter, err, data);
      }
      if (err) {
        return callback(err);
      }
      var objs = data.map(function(o) {
        if (shouldSetIdValue) {
          self.setIdValue(model, o, o._id);
        }
        // Don't pass back _id if the fields is set
        if (deleteMongoId) {
          delete o._id;
        }

        o = self.fromDatabase(model, o);
        return o;
      });
      if (filter && filter.include) {
        self._models[model].model.include(
          objs,
          filter.include,
          options,
          callback
        );
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
MongoDB.prototype.destroyAll = function destroyAll(
  model,
  where,
  options,
  callback
) {
  var self = this;
  if (self.debug) {
    debug('destroyAll', model, where);
  }
  if (!callback && 'function' === typeof where) {
    callback = where;
    where = undefined;
  }
  where = self.buildWhere(model, where, options);
  if (debug.enabled) debug('destroyAll where %s', util.inspect(where));

  this.execute(model, 'deleteMany', where || {}, function(err, info) {
    if (err) return callback && callback(err);

    if (self.debug) debug('destroyAll.callback', model, where, err, info);

    var affectedCount = info.result ? info.result.n : undefined;

    if (callback) {
      callback(err, {count: affectedCount});
    }
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
  where = self.buildWhere(model, where, options) || {};
  const method = Object.keys(where).length === 0 ? 'estimatedDocumentCount' : 'countDocuments';
  this.execute(model, method, where, function(err, count) {
    if (self.debug) {
      debug('count.callback', model, err, count);
    }
    if (callback) {
      callback(err, count);
    }
  });
};

/**
 * Replace properties for the model instance data
 * @param {String} model The name of the model
 * @param {*} id The instance id
 * @param {Object} data The model data
 * @param {Object} options The options object
 * @param {Function} [cb] The callback function
 */
MongoDB.prototype.replaceById = function replace(model, id, data, options, cb) {
  if (this.debug) debug('replace', model, id, data);
  var oid = this.coerceId(model, id, options);
  this.replaceWithOptions(model, oid, data, {upsert: false}, function(
    err,
    data
  ) {
    cb(err, data);
  });
};

function errorIdNotFoundForReplace(idValue) {
  var msg = 'Could not replace. Object with id ' + idValue + ' does not exist!';
  var error = new Error(msg);
  error.statusCode = error.status = 404;
  return error;
}

/**
 * Update a model instance with id
 * @param {String} model The name of the model
 * @param {Object} id The id of the model instance
 * @param {Object} data The property/value pairs to be updated or inserted if {upsert: true} is passed as options
 * @param {Object} options The options you want to pass for update, e.g, {upsert: true}
 * @callback {Function} [cb] Callback function
 */
MongoDB.prototype.replaceWithOptions = function(model, id, data, options, cb) {
  var self = this;
  var idName = self.idName(model);
  delete data[idName];
  this.execute(model, 'replaceOne', {_id: id}, data, options, function(
    err,
    info
  ) {
    debug('updateWithOptions.callback', model, {_id: id}, data, err, info);
    if (err) return cb && cb(err);
    var result;
    var cbInfo = {};
    if (info.result && info.result.n == 1) {
      result = data;
      delete result._id;
      result[idName] = id;
      // create result formats:
      //   2.4.x :{ ok: 1, n: 1, upserted: [ Object ] }
      //   { ok: 1, nModified: 0, n: 1, upserted: [ Object ] }
      //
      // replace result formats:
      //   2.4.x: { ok: 1, n: 1 }
      //   { ok: 1, nModified: 1, n: 1 }
      if (info.result.nModified !== undefined) {
        cbInfo.isNewInstance = info.result.nModified === 0;
      }
    } else {
      result = undefined;
      err = errorIdNotFoundForReplace(id);
    }
    if (cb) {
      cb(err, result, cbInfo);
    }
  });
};

/**
 * Update properties for the model instance data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.updateAttributes = function updateAttrs(
  model,
  id,
  data,
  options,
  cb
) {
  var self = this;

  data = self.toDatabase(model, data || {});

  // Check for other operators and sanitize the data obj
  data = self.parseUpdateData(model, data, options);

  if (self.debug) {
    debug('updateAttributes', model, id, data);
  }

  if (Object.keys(data).length === 0) {
    if (cb) {
      process.nextTick(function() {
        cb(null, {});
      });
    }
    return;
  }

  var oid = self.coerceId(model, id, options);
  var idName = this.idName(model);

  this.execute(
    model,
    'findOneAndUpdate',
    {
      _id: oid,
    },
    data,
    {
      sort: [['_id', 'asc']],
    },
    function(err, result) {
      if (self.debug) {
        debug('updateAttributes.callback', model, id, err, result);
      }
      var object = result && result.value;
      if (!err && !object) {
        // No result
        err = errorIdNotFoundForUpdate(model, id);
      }
      self.setIdValue(model, object, id);
      if (object && idName !== '_id') {
        delete object._id;
      }
      if (cb) {
        cb(err, object);
      }
    }
  );
};

function errorIdNotFoundForUpdate(modelvalue, idValue) {
  var msg = 'No ' + modelvalue + ' found for id ' + idValue;
  var error = new Error(msg);
  error.statusCode = error.status = 404;
  return error;
}

/**
 * Update all matching instances
 * @param {String} model The model name
 * @param {Object} where The search criteria
 * @param {Object} data The property/value pairs to be updated
 * @callback {Function} cb Callback function
 */
MongoDB.prototype.update = MongoDB.prototype.updateAll = function updateAll(
  model,
  where,
  data,
  options,
  cb
) {
  var self = this;
  if (self.debug) {
    debug('updateAll', model, where, data);
  }
  var idName = this.idName(model);

  where = self.buildWhere(model, where, options);

  delete data[idName];
  data = self.toDatabase(model, data);

  // Check for other operators and sanitize the data obj
  data = self.parseUpdateData(model, data, options);

  this.execute(
    model,
    'updateMany',
    where,
    data,
    {upsert: false},
    function(err, info) {
      if (err) return cb && cb(err);

      if (self.debug)
        debug('updateAll.callback', model, where, data, err, info);

      var affectedCount = info.result ? info.result.n : undefined;

      if (cb) {
        cb(err, {count: affectedCount});
      }
    }
  );
};

/**
 * Disconnect from MongoDB
 */
MongoDB.prototype.disconnect = function(cb) {
  if (this.debug) {
    debug('disconnect');
  }
  if (this.db) {
    this.db.unref();
  }
  if (this.client) {
    this.client.close();
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
MongoDB.prototype.autoupdate = function(models, cb) {
  var self = this;
  if (self.db) {
    if (self.debug) {
      debug('autoupdate');
    }
    if (!cb && 'function' === typeof models) {
      cb = models;
      models = undefined;
    }
    // First argument is a model name
    if ('string' === typeof models) {
      models = [models];
    }

    models = models || Object.keys(self._models);

    var enableGeoIndexing = this.settings.enableGeoIndexing === true;

    async.each(
      models,
      function(model, modelCallback) {
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
                options: options,
              };
            }
            indexList.push(index);
          }
        } else if (Array.isArray(indexes)) {
          indexList = indexList.concat(indexes);
        }
        var properties = self._models[model].properties;
        /* eslint-disable one-var */
        for (var p in properties) {
          if (properties[p].index) {
            index = {};
            index[p] = 1; // Add the index key
            if (typeof properties[p].index === 'object') {
              // If there is a mongodb key for the index, use it
              if (typeof properties[p].index.mongodb === 'object') {
                options = properties[p].index.mongodb;
                index[p] = options.kind || 1;

                // If 'kind' is set delete it so it isn't accidentally inserted as an index option
                if (options.kind) {
                  delete options.kind;
                }

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
            } else if (
              enableGeoIndexing &&
              properties[p].type &&
              properties[p].type.name === 'GeoPoint'
            ) {
              var indexType =
                typeof properties[p].index === 'string' ?
                  properties[p].index :
                  '2dsphere';

              options = {name: 'index' + indexType + p};
              index[p] = indexType;
            } else {
              options = {background: true};
              if (properties[p].unique) {
                options.unique = true;
              }
            }
            indexList.push({keys: index, options: options});
          }
        }
        /* eslint-enable one-var */

        if (self.debug) {
          debug('create indexes: ', indexList);
        }

        async.each(
          indexList,
          function(index, indexCallback) {
            if (self.debug) {
              debug('createIndex: ', index);
            }
            self
              .collection(model)
              .createIndex(
                index.fields || index.keys,
                index.options,
                indexCallback
              );
          },
          modelCallback
        );
      },
      cb
    );
  } else {
    self.dataSource.once('connected', function() {
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
MongoDB.prototype.automigrate = function(models, cb) {
  var self = this;
  if (self.db) {
    if (self.debug) {
      debug('automigrate');
    }
    if (!cb && 'function' === typeof models) {
      cb = models;
      models = undefined;
    }
    // First argument is a model name
    if ('string' === typeof models) {
      models = [models];
    }

    models = models || Object.keys(self._models);

    // Make it serial as multiple models might map to the same collection
    async.eachSeries(
      models,
      function(model, modelCallback) {
        var collectionName = self.collectionName(model);
        if (self.debug) {
          debug('drop collection %s for model %s', collectionName, model);
        }

        self.db.dropCollection(collectionName, function(err, collection) {
          if (err) {
            debug(
              'Error dropping collection %s for model %s: ',
              collectionName,
              model,
              err
            );
            if (
              !(
                err.name === 'MongoError' &&
                err.ok === 0 &&
                err.errmsg === 'ns not found'
              )
            ) {
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
      },
      function(err) {
        if (err) {
          return cb && cb(err);
        }
        self.autoupdate(models, cb);
      }
    );
  } else {
    self.dataSource.once('connected', function() {
      self.automigrate(models, cb);
    });
  }
};

MongoDB.prototype.ping = function(cb) {
  var self = this;
  if (self.db) {
    this.db.collection('dummy').findOne({_id: 1}, cb);
  } else {
    self.dataSource.once('connected', function() {
      self.ping(cb);
    });
    self.dataSource.once('error', function(err) {
      cb(err);
    });
    self.connect(function() {});
  }
};

/**
 * Check whether the property is an ObjectID (or Array thereof)
 *
 */
MongoDB.prototype.isObjectIDProperty = function(model, prop, value, options) {
  if (
    prop &&
    (prop.type === ObjectID ||
      (Array.isArray(prop.type) && prop.type[0] === ObjectID))
  ) {
    return true;
  } else if ('string' === typeof value) {
    var settings = this._models[model] && this._models[model].settings;
    options = options || {};
    var strict =
      (settings && settings.strictObjectIDCoercion) ||
      this.settings.strictObjectIDCoercion ||
      options.strictObjectIDCoercion;
    if (strict) return false; // unless explicitly typed, don't coerce
    return /^[0-9a-fA-F]{24}$/.test(value);
  } else {
    return false;
  }
};

function sanitizeFilter(filter, options) {
  options = Object.assign({}, options);
  if (options && options.disableSanitization) return filter;
  if (!filter || typeof filter !== 'object') return filter;

  for (const key in filter) {
    if (key === '$where' || key === 'mapReduce') {
      debug(`sanitizeFilter: deleting ${key}`);
      delete filter[key];
    }
  }

  return filter;
}

exports.sanitizeFilter = sanitizeFilter;

/**
 * Find a matching model instances by the filter or create a new instance
 *
 * Only supported on mongodb 2.6+
 *
 * @param {String} model The model name
 * @param {Object} data The model instance data
 * @param {Object} filter The filter
 * @param {Function} [callback] The callback function
 */
function optimizedFindOrCreate(model, filter, data, options, callback) {
  var self = this;
  if (self.debug) {
    debug('findOrCreate', model, filter, data);
  }

  if (!callback) callback = options;

  var idValue = self.getIdValue(model, data);
  var idName = self.idName(model);

  if (idValue == null) {
    delete data[idName]; // Allow MongoDB to generate the id
  } else {
    var oid = self.coerceId(model, idValue, options); // Is it an Object ID?
    data._id = oid; // Set it to _id
    if (idName !== '_id') {
      delete data[idName];
    }
  }

  filter = filter || {};
  var query = {};
  if (filter.where) {
    if (filter.where[idName]) {
      var id = filter.where[idName];
      delete filter.where[idName];
      id = self.coerceId(model, id, options);
      filter.where._id = id;
    }
    query = self.buildWhere(model, filter.where, options);
  }

  var sort = self.buildSort(model, filter.order, options);

  var projection = fieldsArrayToObj(filter.fields);

  this.collection(model).findOneAndUpdate(
    query,
    {$setOnInsert: data},
    {projection: projection, sort: sort, upsert: true},
    function(err, result) {
      if (self.debug) {
        debug('findOrCreate.callback', model, filter, err, result);
      }
      if (err) {
        return callback(err);
      }

      var value = result.value;
      var created = !!result.lastErrorObject.upserted;

      if (created && (value == null || Object.keys(value).length == 0)) {
        value = data;
        self.setIdValue(model, value, result.lastErrorObject.upserted);
      } else {
        value = self.fromDatabase(model, value);
        self.setIdValue(model, value, value._id);
      }

      if (value && idName !== '_id') {
        delete value._id;
      }

      if (filter && filter.include) {
        self._models[model].model.include([value], filter.include, function(
          err,
          data
        ) {
          callback(err, data[0], created);
        });
      } else {
        callback(null, value, created);
      }
    }
  );
}

/**
 * Convert the decimal properties from string to decimal.
 * Only supported after mongodb 3.4
 *
 * @param {Object} data The data that might contain a decimal property
 * @param {Object} props The model property definitions
 */
function convertDecimalProps(data, propDef) {
  if (propDef == null) return data;

  if (Array.isArray(data)) {
    const arrType = getArrayItemDef(propDef);
    if (arrType) {
      data.forEach(function(elem, i) {
        data[i] = convertDecimalProps(elem, arrType);
      });
      if (debug.enabled) debug('convertDecimalProps converted array: ', util.inspect(data));
    };
  } else if (!!data && typeof data === 'object') {
    // !!data: skips executing the code when data is `null`
    const ownData = Object.getOwnPropertyNames(data);
    ownData.forEach(function(k) {
      data[k] = convertDecimalProps(data[k], getObjectDef(propDef, k));
    });
    if (debug.enabled) debug('convertDecimalProps converted object: ', util.inspect(data));
  } else {
    const isDecimal = propDef && propDef.mongodb &&
    propDef.mongodb.dataType &&
    propDef.mongodb.dataType.toLowerCase() === 'decimal128';
    if (isDecimal) {
      data = Decimal128.fromString(data);
      if (debug.enabled) debug('convertDecimalProps decimal value: ', data);
    }
  }

  return data;
}

function getArrayItemDef(propDef) {
  if (debug.enabled) debug('getArrayItemDef property definition: ', util.inspect(propDef));
  if (isLBArr(propDef)) return propDef[0];
  return null;
}

function getObjectDef(propDef, name) {
  if (debug.enabled) debug('getObjectDef property definition: %o, name: %s',
    util.inspect(propDef), name);
  if (typeof propDef === 'object') return propDef[name];
  return null;
}

function isLBArr(propDef) {
  return typeof propDef === 'object' && Array.isArray(propDef.type);
}
