// Copyright IBM Corp. 2012,2019. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

/*!
 * Module dependencies
 */
const bson = require('bson');
const g = require('strong-globalize')();
const mongodb = require('mongodb');
const urlParser = require('mongodb/lib/url_parser');
const util = require('util');
const async = require('async');
const Connector = require('loopback-connector').Connector;
const debug = require('debug')('loopback:connector:mongodb');
const Decimal128 = mongodb.Decimal128;
const Decimal128TypeRegex = /decimal128/i;

const ObjectIdValueRegex = /^[0-9a-fA-F]{24}$/;
const ObjectIdTypeRegex = /objectid/i;

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
    if (ObjectIdValueRegex.test(id)) {
      return new bson.ObjectID(id);
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
  const username = options.username || options.user;
  let portUrl = '';
  // only include port if not using mongodb+srv
  if (options.protocol !== 'mongodb+srv') {
    portUrl = ':' + options.port;
  }
  if (username && options.password) {
    return (
      options.protocol +
      '://' +
      username +
      ':' +
      options.password +
      '@' +
      options.hostname +
      portUrl +
      '/' +
      options.database
    );
  } else {
    return (
      options.protocol +
      '://' +
      options.hostname +
      portUrl +
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

  const s = dataSource.settings;

  s.safe = s.safe !== false;
  s.w = s.w || 1;
  s.url = s.url || generateMongoDBURL(s);
  s.useNewUrlParser = s.useNewUrlParser !== false;
  s.useUnifiedTopology = s.useUnifiedTopology !== false;
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
  const self = this;
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
    const validOptionNames = [
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
      'serverSelectionTimeoutMS',
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
      'useUnifiedTopology',
      // Ignored options
      'native_parser',
      // Legacy options
      'server',
      'replset',
      'replSet',
      'mongos',
      'db',
    ];

    const lbOptions = Object.keys(self.settings);
    const validOptions = {};
    lbOptions.forEach(function(option) {
      if (validOptionNames.indexOf(option) > -1) {
        validOptions[option] = self.settings[option];
      }
    });
    debug('Valid options: %j', validOptions);

    function onError(err) {
      /* istanbul ignore if */
      if (self.debug) {
        g.error(
          '{{MongoDB}} connection is failed: %s %s',
          self.settings.url,
          err,
        );
      }
      if (callback) callback(err);
    }

    new mongodb.MongoClient(self.settings.url, validOptions).connect(function(
      err,
      client,
    ) {
      if (err) {
        onError(err);
        return;
      }
      if (self.debug) {
        debug('MongoDB connection is established: ' + self.settings.url);
      }
      self.client = client;
      // The database name might be in the url
      return urlParser(self.settings.url, self.settings, function(err, url) {
        if (err) {
          onError(err);
          return;
        }
        self.db = client.db(
          url.dbName || self.settings.database,
          url.db_options || self.settings,
        );
        if (callback) callback(err, self.db);
      });
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
 * @param {String} modelName The model name
 * @returns {String} collection name
 */
MongoDB.prototype.collectionName = function(modelName) {
  const modelClass = this._models[modelName];
  if (modelClass.settings.mongodb) {
    modelName = modelClass.settings.mongodb.collection || modelName;
  }
  return modelName;
};

/**
 * Access a MongoDB collection by model name
 * @param {String} modelName The model name
 * @returns {*}
 */
MongoDB.prototype.collection = function(modelName) {
  if (!this.db) {
    throw new Error(g.f('{{MongoDB}} connection is not established'));
  }
  const collectionName = this.collectionName(modelName);
  return this.db.collection(collectionName);
};

/*!
 * Convert the data from database to JSON
 *
 * @param {String} modelName The model name
 * @param {Object} data The data from DB
 */
MongoDB.prototype.fromDatabase = function(modelName, data) {
  if (!data) {
    return null;
  }
  const modelInfo = this._models[modelName] || this.dataSource.modelBuilder.definitions[modelName];
  const props = modelInfo.properties;
  for (const p in props) {
    const prop = props[p];
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
    } else if (data[p] && prop && prop.type.definition) {
      data[p] = this.fromDatabase(prop.type.definition.name, data[p]);
    }
  }

  data = this.fromDatabaseToPropertyNames(modelName, data);

  return data;
};

/*!
 * Convert JSON to database-appropriate format
 *
 * @param {String} modelName The model name
 * @param {Object} data The JSON data to convert
 */
MongoDB.prototype.toDatabase = function(modelName, data) {
  const modelCtor = this._models[modelName];
  const props = modelCtor.properties;

  if (this.settings.enableGeoIndexing !== true) {
    visitAllProperties(data, modelCtor, coercePropertyValue);
    // Override custom column names
    data = this.fromPropertyToDatabaseNames(modelName, data);
    return data;
  }

  for (const p in props) {
    const prop = props[p];
    const isGeoPoint = data[p] && prop && prop.type && prop.type.name === 'GeoPoint';
    if (isGeoPoint) {
      data[p] = {
        coordinates: [data[p].lng, data[p].lat],
        type: 'Point',
      };
    }
  }

  visitAllProperties(data, modelCtor, coercePropertyValue);
  // Override custom column names
  data = this.fromPropertyToDatabaseNames(modelName, data);
  if (debug.enabled) debug('toDatabase data: ', util.inspect(data));
  return data;
};

/**
 * Execute a mongodb command
 * @param {String} modelName The model name
 * @param {String} command The command name
 * @param [...] params Parameters for the given command
 */
MongoDB.prototype.execute = function(modelName, command) {
  const self = this;
  // Get the parameters for the given command
  const args = [].slice.call(arguments, 2);
  // The last argument must be a callback function
  const callback = args[args.length - 1];

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
          modelName,
          command,
          err,
        );
      }
      doExecute();
    });
  }

  function doExecute() {
    let collection;
    const context = Object.assign({}, {
      model: modelName,
      collection: collection,
      req: {
        command: command,
        params: args,
      },
    });

    try {
      collection = self.collection(modelName);
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
        debug('MongoDB: model=%s command=%s', modelName, command, args);
        return collection[command].apply(collection, args);
      },
      callback,
    );
  }
};

MongoDB.prototype.coerceId = function(modelName, id, options) {
  // See https://github.com/strongloop/loopback-connector-mongodb/issues/206
  if (id == null) return id;
  const self = this;
  let idValue = id;
  const idName = self.idName(modelName);

  // Type conversion for id
  const idProp = self.getPropertyDefinition(modelName, idName);

  if (idProp && typeof idProp.type === 'function') {
    if (!(idValue instanceof idProp.type)) {
      idValue = idProp.type(id);
      if (idProp.type === Number && isNaN(id)) {
        // Reset to id
        idValue = id;
      }
    }

    const modelCtor = this._models[modelName];
    idValue = coerceToObjectId(modelCtor, idProp, idValue);
  }
  return idValue;
};

/**
 * Create a new model instance for the given data
 * @param {String} modelName The model name
 * @param {Object} data The model data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.create = function(modelName, data, options, callback) {
  const self = this;
  if (self.debug) {
    debug('create', modelName, data);
  }
  let idValue = self.getIdValue(modelName, data);
  const idName = self.idName(modelName);

  if (idValue === null) {
    delete data[idName]; // Allow MongoDB to generate the id
  } else {
    const oid = self.coerceId(modelName, idValue, options); // Is it an Object ID?c
    data._id = oid; // Set it to _id
    if (idName !== '_id') {
      delete data[idName];
    }
  }

  data = self.toDatabase(modelName, data);

  this.execute(modelName, 'insertOne', data, {safe: true}, function(err, result) {
    if (self.debug) {
      debug('create.callback', modelName, err, result);
    }
    if (err) {
      return callback(err);
    }
    idValue = result.ops[0]._id;

    try {
      idValue = self.coerceId(modelName, idValue, options);
    } catch (err) {
      return callback(err);
    }

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
 * @param {String} modelName The model name
 * @param {Object} data The model data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.save = function(modelName, data, options, callback) {
  const self = this;
  if (self.debug) {
    debug('save', modelName, data);
  }
  const idValue = self.getIdValue(modelName, data);
  const idName = self.idName(modelName);

  const oid = self.coerceId(modelName, idValue, options);
  data._id = oid;
  if (idName !== '_id') {
    delete data[idName];
  }

  data = self.toDatabase(modelName, data);

  this.execute(modelName, 'updateOne', {_id: oid}, {$set: data}, {upsert: true}, function(err, result) {
    if (!err) {
      self.setIdValue(modelName, data, idValue);
      if (idName !== '_id') {
        delete data._id;
      }
    }
    if (self.debug) {
      debug('save.callback', modelName, err, result);
    }

    const info = {};
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
 * @param {String} modelName The model name
 * @param {*} id The id value
 * @param {Function} [callback] The callback function
 *
 */
MongoDB.prototype.exists = function(modelName, id, options, callback) {
  const self = this;
  if (self.debug) {
    debug('exists', modelName, id);
  }
  id = self.coerceId(modelName, id, options);
  this.execute(modelName, 'findOne', {_id: id}, function(err, data) {
    if (self.debug) {
      debug('exists.callback', modelName, id, err, data);
    }
    callback(err, !!(!err && data));
  });
};

/**
 * Find a model instance by id
 * @param {String} modelName The model name
 * @param {*} id The id value
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.find = function find(modelName, id, options, callback) {
  const self = this;
  if (self.debug) {
    debug('find', modelName, id);
  }
  const idName = self.idName(modelName);
  const oid = self.coerceId(modelName, id, options);
  this.execute(modelName, 'findOne', {_id: oid}, function(err, data) {
    if (self.debug) {
      debug('find.callback', modelName, id, err, data);
    }

    data = self.fromDatabase(modelName, data);
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
MongoDB.prototype.parseUpdateData = function(modelName, data, options) {
  options = options || {};
  const parsedData = {};

  const modelClass = this._models[modelName];

  let allowExtendedOperators = this.settings.allowExtendedOperators;
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
    const acceptedOperators = [
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

    let usedOperators = 0;

    // each accepted operator will take its place on parsedData if defined
    for (let i = 0; i < acceptedOperators.length; i++) {
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
 * @param {String} modelName The model name
 * @param {Object} data The model instance data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.updateOrCreate = function updateOrCreate(
  modelName,
  data,
  options,
  callback,
) {
  const self = this;
  if (self.debug) {
    debug('updateOrCreate', modelName, data);
  }

  const id = self.getIdValue(modelName, data);
  const idName = self.idName(modelName);
  const oid = self.coerceId(modelName, id, options);
  delete data[idName];

  data = self.toDatabase(modelName, data);

  // Check for other operators and sanitize the data obj
  data = self.parseUpdateData(modelName, data, options);

  this.execute(
    modelName,
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
        debug('updateOrCreate.callback', modelName, id, err, result);
      }
      const object = result && result.value;
      if (!err && !object) {
        // No result
        err = 'No ' + modelName + ' found for id ' + id;
      }
      if (!err) {
        self.setIdValue(modelName, object, oid);
        if (object && idName !== '_id') {
          delete object._id;
        }
      }

      let info;
      if (result && result.lastErrorObject) {
        info = {isNewInstance: !result.lastErrorObject.updatedExisting};
      } else {
        debug('updateOrCreate result format not recognized: %j', result);
      }

      if (callback) {
        callback(err, self.fromDatabase(modelName, object), info);
      }
    },
  );
};

/**
 * Replace model instance if it exists or create a new one if it doesn't
 *
 * @param {String} modelName The model name
 * @param {Object} data The model instance data
 * @param {Object} options The options object
 * @param {Function} [cb] The callback function
 */
MongoDB.prototype.replaceOrCreate = function(modelName, data, options, cb) {
  if (this.debug) debug('replaceOrCreate', modelName, data);

  const id = this.getIdValue(modelName, data);
  const oid = this.coerceId(modelName, id, options);
  const idName = this.idName(modelName);
  data._id = data[idName];
  delete data[idName];
  this.replaceWithOptions(modelName, oid, data, {upsert: true}, cb);
};

/**
 * Delete a model instance by id
 * @param {String} modelName The model name
 * @param {*} id The id value
 * @param [callback] The callback function
 */
MongoDB.prototype.destroy = function destroy(modelName, id, options, callback) {
  const self = this;
  if (self.debug) {
    debug('delete', modelName, id);
  }
  id = self.coerceId(modelName, id, options);
  this.execute(modelName, 'deleteOne', {_id: id}, function(err, result) {
    if (self.debug) {
      debug('delete.callback', modelName, id, err, result);
    }
    let res = result && result.result;
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
  for (const f in fields) {
    return !fields[f]; // If the fields has exclusion
  }
  return true;
}

MongoDB.prototype.buildWhere = function(modelName, where, options) {
  const self = this;
  const query = {};
  if (where === null || typeof where !== 'object') {
    return query;
  }

  where = sanitizeFilter(where, options);

  let implicitNullType = false;
  if (this.settings.hasOwnProperty('implicitNullType')) {
    implicitNullType = !!this.settings.implicitNullType;
  }

  const idName = self.idName(modelName);
  Object.keys(where).forEach(function(k) {
    let cond = where[k];
    if (k === 'and' || k === 'or' || k === 'nor') {
      if (Array.isArray(cond)) {
        cond = cond.map(function(c) {
          return self.buildWhere(modelName, c, options);
        });
      }
      query['$' + k] = cond;
      delete query[k];
      return;
    }
    if (k === idName) {
      k = '_id';
    }
    let propName = k;
    if (k === '_id') {
      propName = idName;
    }

    const propDef = self.getPropertyDefinition(modelName, propName);
    if (propDef && propDef.mongodb && typeof propDef.mongodb.dataType === 'string') {
      if (Decimal128TypeRegex.test(propDef.mongodb.dataType)) {
        cond = Decimal128.fromString(cond);
        debug('buildWhere decimal value: %s, constructor name: %s', cond, cond.constructor.name);
      } else if (isStoredAsObjectID(propDef)) {
        cond = ObjectID(cond);
      }
    }

    // Convert property to database column name
    k = self.getDatabaseColumnName(modelName, k);

    let spec = false;
    let regexOptions = null;
    if (cond && cond.constructor.name === 'Object') {
      regexOptions = cond.options;
      spec = Object.keys(cond)[0];
      cond = cond[spec];
    }

    const modelCtor = self._models[modelName];

    if (spec) {
      if (spec === 'between') {
        query[k] = {$gte: cond[0], $lte: cond[1]};
      } else if (spec === 'inq') {
        cond = [].concat(cond || []);
        query[k] = {
          $in: cond.map(function(x) {
            if (isObjectIDProperty(modelCtor, propDef, x, options))
              return ObjectID(x);
            return x;
          }),
        };
      } else if (spec === 'nin') {
        cond = [].concat(cond || []);
        query[k] = {
          $nin: cond.map(function(x) {
            if (isObjectIDProperty(modelCtor, propDef, x, options))
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
      if (cond === null && !implicitNullType) {
        // http://docs.mongodb.org/manual/reference/operator/query/type/
        // Null: 10
        query[k] = {$type: 10};
      } else {
        if (isObjectIDProperty(modelCtor, propDef, cond, options)) {
          cond = ObjectID(cond);
        }
        query[k] = cond;
      }
    }
  });
  return query;
};

MongoDB.prototype.buildSort = function(modelName, order, options) {
  let sort = {};
  const idName = this.idName(modelName);

  const modelClass = this._models[modelName];

  let disableDefaultSort = false;
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
    const idNames = this.idNames(modelName);
    if (idNames && idNames.length) {
      order = idNames;
    }
  }
  if (order) {
    order = sanitizeFilter(order, options);
    let keys = order;
    if (typeof keys === 'string') {
      keys = keys.split(',');
    }
    for (let index = 0, len = keys.length; index < len; index++) {
      const m = keys[index].match(/\s+(A|DE)SC$/);
      let key = keys[index];
      key = key.replace(/\s+(A|DE)SC$/, '').trim();
      if (key === idName) {
        key = '_id';
      } else {
        key = this.getDatabaseColumnName(modelName, key);
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
        ", fallback to mongodb default unit 'meters'",
      );
      return distance;
  }
}

function buildNearFilter(query, params) {
  if (!Array.isArray(params)) {
    params = [params];
  }

  params.forEach(function(near) {
    let coordinates = {};

    if (typeof near.near === 'string') {
      const s = near.near.split(',');
      coordinates.lng = parseFloat(s[0]);
      coordinates.lat = parseFloat(s[1]);
    } else if (Array.isArray(near.near)) {
      coordinates.lng = near.near[0];
      coordinates.lat = near.near[1];
    } else {
      coordinates = near.near;
    }

    const props = ['maxDistance', 'minDistance'];
    // use mongodb default unit 'meters' rather than 'miles'
    const unit = near.unit || 'meters';

    const queryValue = {
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

    let property;

    if (near.mongoKey) {
      // if mongoKey is an Array, set the $near query at the right depth, following the Array
      if (Array.isArray(near.mongoKey)) {
        property = query.where;

        let i;
        for (i = 0; i < near.mongoKey.length; i++) {
          const subKey = near.mongoKey[i];

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

  let isFound = false;

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
        const prop = node[key];

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

  const prop = model.properties[propName] || {};

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

  for (const propName in model.properties) {
    const columnName = this.getDatabaseColumnName(model, propName);

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
 * @param {String} modelName The model name
 * @param {Object} filter The filter
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.all = function all(modelName, filter, options, callback) {
  const self = this;
  if (self.debug) {
    debug('all', modelName, filter);
  }
  filter = filter || {};
  const idName = self.idName(modelName);
  let query = {};
  if (filter.where) {
    query = self.buildWhere(modelName, filter.where, options);
  }
  let fields = filter.fields;

  // Convert custom column names
  fields = self.fromPropertyToDatabaseNames(modelName, fields);

  if (fields) {
    const findOpts = {projection: fieldsArrayToObj(fields)};
    this.execute(modelName, 'find', query, findOpts, processResponse);
  } else {
    this.execute(modelName, 'find', query, processResponse);
  }

  function processResponse(err, cursor) {
    if (err) {
      return callback(err);
    }

    const collation = options && options.collation;
    if (collation) {
      cursor.collation(collation);
    }

    // don't apply sorting if dealing with a geo query
    if (!hasNearFilter(filter.where)) {
      const order = self.buildSort(modelName, filter.order, options);
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

    const shouldSetIdValue = idIncluded(fields, idName);
    const deleteMongoId = !shouldSetIdValue || idName !== '_id';

    cursor.toArray(function(err, data) {
      if (self.debug) {
        debug('all', modelName, filter, err, data);
      }
      if (err) {
        return callback(err);
      }
      const objs = data.map(function(o) {
        if (shouldSetIdValue) {
          self.setIdValue(modelName, o, o._id);
        }
        // Don't pass back _id if the fields is set
        if (deleteMongoId) {
          delete o._id;
        }

        o = self.fromDatabase(modelName, o);
        return o;
      });
      if (filter && filter.include) {
        self._models[modelName].model.include(
          objs,
          filter.include,
          options,
          callback,
        );
      } else {
        callback(null, objs);
      }
    });
  }
};

/**
 * Delete all instances for the given model
 * @param {String} modelName The model name
 * @param {Object} [where] The filter for where
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.destroyAll = function destroyAll(
  modelName,
  where,
  options,
  callback,
) {
  const self = this;
  if (self.debug) {
    debug('destroyAll', modelName, where);
  }
  if (!callback && 'function' === typeof where) {
    callback = where;
    where = undefined;
  }
  where = self.buildWhere(modelName, where, options);
  if (debug.enabled) debug('destroyAll where %s', util.inspect(where));

  this.execute(modelName, 'deleteMany', where || {}, function(err, info) {
    if (err) return callback && callback(err);

    if (self.debug) debug('destroyAll.callback', modelName, where, err, info);

    const affectedCount = info.result ? info.result.n : undefined;

    if (callback) {
      callback(err, {count: affectedCount});
    }
  });
};

/**
 * Count the number of instances for the given model
 *
 * @param {String} modelName The model name
 * @param {Function} [callback] The callback function
 * @param {Object} filter The filter for where
 *
 */
MongoDB.prototype.count = function count(modelName, where, options, callback) {
  const self = this;
  if (self.debug) {
    debug('count', modelName, where);
  }
  where = self.buildWhere(modelName, where, options) || {};
  const method = Object.keys(where).length === 0 ? 'estimatedDocumentCount' : 'countDocuments';
  this.execute(modelName, method, where, function(err, count) {
    if (self.debug) {
      debug('count.callback', modelName, err, count);
    }
    if (callback) {
      callback(err, count);
    }
  });
};

/**
 * Replace properties for the model instance data
 * @param {String} modelName The model name
 * @param {*} id The instance id
 * @param {Object} data The model data
 * @param {Object} options The options object
 * @param {Function} [cb] The callback function
 */
MongoDB.prototype.replaceById = function replace(modelName, id, data, options, cb) {
  if (this.debug) debug('replace', modelName, id, data);
  const oid = this.coerceId(modelName, id, options);
  this.replaceWithOptions(modelName, oid, data, {upsert: false}, function(
    err,
    data,
  ) {
    cb(err, data);
  });
};

function errorIdNotFoundForReplace(idValue) {
  const msg = 'Could not replace. Object with id ' + idValue + ' does not exist!';
  const error = new Error(msg);
  error.statusCode = error.status = 404;
  return error;
}

/**
 * Update a model instance with id
 * @param {String} modelName The model name
 * @param {Object} id The id of the model instance
 * @param {Object} data The property/value pairs to be updated or inserted if {upsert: true} is passed as options
 * @param {Object} options The options you want to pass for update, e.g, {upsert: true}
 * @callback {Function} [cb] Callback function
 */
MongoDB.prototype.replaceWithOptions = function(modelName, id, data, options, cb) {
  const self = this;
  const idName = self.idName(modelName);
  delete data[idName];
  data = self.toDatabase(modelName, data);
  this.execute(modelName, 'replaceOne', {_id: id}, data, options, function(
    err,
    info,
  ) {
    debug('updateWithOptions.callback', modelName, {_id: id}, data, err, info);
    if (err) return cb && cb(err);
    let result;
    const cbInfo = {};
    if (info.result && info.result.n == 1) {
      result = self.fromDatabase(modelName, data);
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
 * @param {String} modelName The model name
 * @param {Object} data The model data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.updateAttributes = function updateAttrs(
  modelName,
  id,
  data,
  options,
  cb,
) {
  const self = this;

  data = self.toDatabase(modelName, data || {});

  // Check for other operators and sanitize the data obj
  data = self.parseUpdateData(modelName, data, options);

  if (self.debug) {
    debug('updateAttributes', modelName, id, data);
  }

  if (Object.keys(data).length === 0) {
    if (cb) {
      process.nextTick(function() {
        cb(null, {});
      });
    }
    return;
  }

  const oid = self.coerceId(modelName, id, options);
  const idName = this.idName(modelName);

  this.execute(
    modelName,
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
        debug('updateAttributes.callback', modelName, id, err, result);
      }
      const object = result && result.value;
      if (!err && !object) {
        // No result
        err = errorIdNotFoundForUpdate(modelName, id);
      }
      self.setIdValue(modelName, object, id);
      if (object && idName !== '_id') {
        delete object._id;
      }
      if (cb) {
        cb(err, object);
      }
    },
  );
};

function errorIdNotFoundForUpdate(modelvalue, idValue) {
  const msg = 'No ' + modelvalue + ' found for id ' + idValue;
  const error = new Error(msg);
  error.statusCode = error.status = 404;
  return error;
}

/**
 * Update all matching instances
 * @param {String} modelName The model name
 * @param {Object} where The search criteria
 * @param {Object} data The property/value pairs to be updated
 * @callback {Function} cb Callback function
 */
MongoDB.prototype.update = MongoDB.prototype.updateAll = function updateAll(
  modelName,
  where,
  data,
  options,
  cb,
) {
  const self = this;
  if (self.debug) {
    debug('updateAll', modelName, where, data);
  }
  const idName = this.idName(modelName);

  where = self.buildWhere(modelName, where, options);

  let updateData = Object.assign({}, data);
  delete updateData[idName];
  updateData = self.toDatabase(modelName, updateData);

  // Check for other operators and sanitize the data obj
  updateData = self.parseUpdateData(modelName, updateData, options);

  this.execute(
    modelName,
    'updateMany',
    where,
    updateData,
    {upsert: false},
    function(err, info) {
      if (err) return cb && cb(err);

      if (self.debug)
        debug('updateAll.callback', modelName, where, updateData, err, info);

      const affectedCount = info.result ? info.result.n : undefined;

      if (cb) {
        cb(err, {count: affectedCount});
      }
    },
  );
};

/**
 * Disconnect from MongoDB
 */
MongoDB.prototype.disconnect = function(cb) {
  if (this.debug) {
    debug('disconnect');
  }
  /*
  not implemented: `unref`
  at NativeTopology.unref (node_modules/mongodb/lib/core/sdam/topology.js:697:13)
  at Db.unref (node_modules/mongodb/lib/db.js:921:19)
  at MongoDB.disconnect (node_modules/loopback-connector-mongodb/lib/mongodb.js:1660:13)
  */
  /*
  if (this.db) {
    this.db.unref();
  }
  */
  if (this.client) {
    this.client.close();
  }
  this.db = null;
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
  const self = this;
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

    const enableGeoIndexing = this.settings.enableGeoIndexing === true;

    async.each(
      models,
      function(modelName, modelCallback) {
        const indexes = self._models[modelName].settings.indexes || [];
        let indexList = [];
        let index = {};
        let options = {};

        if (typeof indexes === 'object') {
          for (const indexName in indexes) {
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
        const properties = self._models[modelName].properties;
        /* eslint-disable one-var */
        for (const p in properties) {
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
              const indexType =
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
              .collection(modelName)
              .createIndex(
                index.fields || index.keys,
                index.options,
                indexCallback,
              );
          },
          modelCallback,
        );
      },
      cb,
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
  const self = this;
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
      function(modelName, modelCallback) {
        const collectionName = self.collectionName(modelName);
        if (self.debug) {
          debug('drop collection %s for model %s', collectionName, modelName);
        }

        self.db.dropCollection(collectionName, function(err, collection) {
          if (err) {
            debug(
              'Error dropping collection %s for model %s: ',
              collectionName,
              modelName,
              err,
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
            debug('create collection %s for model %s', collectionName, modelName);
          }
          self.db.createCollection(collectionName, modelCallback);
        });
      },
      function(err) {
        if (err) {
          return cb && cb(err);
        }
        self.autoupdate(models, cb);
      },
    );
  } else {
    self.dataSource.once('connected', function() {
      self.automigrate(models, cb);
    });
  }
};

MongoDB.prototype.ping = function(cb) {
  const self = this;
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

// Case insensitive check if a string looks like "ObjectID"
function typeIsObjectId(input) {
  if (!input) return false;
  return typeof input === 'string' && input.match(ObjectIdTypeRegex);
}

// Determine if a property must be stored as ObjectID
function isStoredAsObjectID(propDef) {
  if (!propDef) return false;

  if (propDef.mongodb) {
    if (ObjectIdTypeRegex.test(propDef.mongodb.dataType)) return true;
  } else if (propDef.type) {
    if (typeof propDef.type === 'string' && typeIsObjectId(propDef.type)) return true;
    else if (Array.isArray(propDef.type)) {
      if (propDef.type[0] === ObjectID || typeIsObjectId(propDef.type[0])) {
        return true;
      }
    }
  }
  return false;
}

// Determine if strictObjectIDCoercion should be enabled
function isStrictObjectIDCoercionEnabled(modelCtor, options) {
  const settings = modelCtor.settings;
  return (settings && settings.strictObjectIDCoercion) ||
    (modelCtor.model && modelCtor.model.getConnector().settings.strictObjectIDCoercion) ||
    options &&
    options.strictObjectIDCoercion;
}

// Tries to coerce a property into ObjectID after checking multiple conditions
function coerceToObjectId(modelCtor, propDef, propValue) {
  if (isStoredAsObjectID(propDef)) {
    if (isObjectIDProperty(modelCtor, propDef, propValue)) {
      return ObjectID(propValue);
    } else {
      throw new Error(`${propValue} is not an ObjectID string`);
    }
  } else if (isStrictObjectIDCoercionEnabled(modelCtor)) {
    if (isObjectIDProperty(modelCtor, propDef, propValue)) {
      return ObjectID(propValue);
    }
  } else if (ObjectIdValueRegex.test(propValue)) {
    return ObjectID(propValue);
  }
  return propValue;
}

/**
 * Check whether the property is an ObjectID (or Array thereof)
 *
 */
function isObjectIDProperty(modelCtor, propDef, value, options) {
  if (!propDef) return false;

  if (typeof value === 'string' && value.match(ObjectIdValueRegex)) {
    if (isStoredAsObjectID(propDef)) return true;
    else return !isStrictObjectIDCoercionEnabled(modelCtor, options);
  } else if (value instanceof mongodb.ObjectID) {
    return true;
  } else {
    return false;
  }
}

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
 * @param {String} modelName The model name
 * @param {Object} data The model instance data
 * @param {Object} filter The filter
 * @param {Function} [callback] The callback function
 */
function optimizedFindOrCreate(modelName, filter, data, options, callback) {
  const self = this;
  if (self.debug) {
    debug('findOrCreate', modelName, filter, data);
  }

  if (!callback) callback = options;

  const idValue = self.getIdValue(modelName, data);
  const idName = self.idName(modelName);

  if (idValue == null) {
    delete data[idName]; // Allow MongoDB to generate the id
  } else {
    const oid = self.coerceId(modelName, idValue, options); // Is it an Object ID?
    data._id = oid; // Set it to _id
    if (idName !== '_id') {
      delete data[idName];
    }
  }

  filter = filter || {};
  let query = {};
  if (filter.where) {
    if (filter.where[idName]) {
      let id = filter.where[idName];
      delete filter.where[idName];
      id = self.coerceId(modelName, id, options);
      filter.where._id = id;
    }
    query = self.buildWhere(modelName, filter.where, options);
  }

  const sort = self.buildSort(modelName, filter.order, options);

  const projection = fieldsArrayToObj(filter.fields);

  this.collection(modelName).findOneAndUpdate(
    query,
    {$setOnInsert: data},
    {projection: projection, sort: sort, upsert: true},
    function(err, result) {
      if (self.debug) {
        debug('findOrCreate.callback', modelName, filter, err, result);
      }
      if (err) {
        return callback(err);
      }

      let value = result.value;
      const created = !!result.lastErrorObject.upserted;

      if (created && (value == null || Object.keys(value).length == 0)) {
        value = data;
        self.setIdValue(modelName, value, result.lastErrorObject.upserted);
      } else {
        value = self.fromDatabase(modelName, value);
        self.setIdValue(modelName, value, value._id);
      }

      if (value && idName !== '_id') {
        delete value._id;
      }

      if (filter && filter.include) {
        self._models[modelName].model.include([value], filter.include, function(
          err,
          data,
        ) {
          callback(err, data[0], created);
        });
      } else {
        callback(null, value, created);
      }
    },
  );
}

/**
 * @param {*} data Plain Data Object for the matching property definition(s)
 * @param {*} modelCtor Model constructor
 * @param {*} visitor A callback function which takes a property value and
 * definition to apply custom property coercion
 */
function visitAllProperties(data, modelCtor, visitor) {
  if (data === null || data === undefined) return;
  const modelProps = modelCtor.properties ? modelCtor.properties : modelCtor.definition.properties;
  const allProps = new Set(Object.keys(data).concat(Object.keys(modelProps)));
  for (const p of allProps) {
    const value = data[p];
    const def = modelProps[p];
    if (!value) continue;
    if (def && def.type && isNestedModel(def.type)) {
      if (Array.isArray(def.type) && Array.isArray(value)) {
        for (const it of value) {
          visitAllProperties(it, def.type[0].definition, visitor);
        }
      } else {
        visitAllProperties(value, def.type.definition, visitor);
      }
    } else {
      visitor(modelCtor, value, def, (newValue) => { data[p] = newValue; });
    }
    continue;
  }
}

/**
 * @param {*} modelCtor Model constructor
 * @param {*} propValue Property value to coerce into special types supported by the connector
 * @param {*} propDef Property definition to check if property is for MongoDB
 */
function coercePropertyValue(modelCtor, propValue, propDef, setValue) {
  let coercedValue;
  // Process only mongo-specific data types
  if (propDef && propDef.mongodb && propDef.mongodb.dataType) {
    const dataType = propDef.mongodb.dataType;
    if (typeof dataType === 'string') {
      if (hasDataType('decimal128', propDef)) {
        if (Array.isArray(propValue)) {
          coercedValue = propValue.map(val => Decimal128.fromString(val));
          return setValue(coercedValue);
        } else {
          coercedValue = Decimal128.fromString(propValue);
          return setValue(coercedValue);
        }
      } else if (typeIsObjectId(dataType)) {
        if (isObjectIDProperty(modelCtor, propDef, propValue)) {
          coercedValue = ObjectID(propValue);
          return setValue(coercedValue);
        } else {
          throw new Error(`${propValue} is not an ObjectID string`);
        }
      }
    }
  } else {
    // Object ID coercibility depends on multiple factors, let coerceToObjectId() handle it
    propValue = coerceToObjectId(modelCtor, propDef, propValue);
    setValue(propValue);
  }
}

/**
* A utility function which checks for nested property definitions
*
* @param {*} propType Property type metadata
*
*/
function isNestedModel(propType) {
  if (!propType) return false;
  if (Array.isArray(propType)) return isNestedModel(propType[0]);
  return propType.definition && propType.definition.properties;
}

/**
* A utility function which checks if a certain property definition matches
* the given data type
* @param {*} dataType The data type to check the property definition against
* @param {*} propertyDef A property definition containing metadata about property type
*/
function hasDataType(dataType, propertyDef) {
  return propertyDef && propertyDef.mongodb &&
    propertyDef.mongodb.dataType &&
    propertyDef.mongodb.dataType.toLowerCase() === dataType.toLowerCase();
}
