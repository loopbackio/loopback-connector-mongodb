/*!
 * Module dependencies
 */
var mongodb = require('mongodb');
var util = require('util');
var Connector = require('loopback-datasource-juggler').Connector;

/*!
 * Convert the id to be a BSON ObjectID if it is compatible
 * @param {*} id The id value
 * @returns {ObjectID}
 */
function ObjectID(id) {
    if (typeof id !== 'string') {
        return id;
    }
    if(id instanceof mongodb.ObjectID) {
        return id;
    }
    try {
        return new mongodb.ObjectID(id);
    } catch(e) {
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
    if (options.username && options.password) {
        return "mongodb://" + options.username + ":" + options.password + "@" + options.hostname + ":" + options.port + "/" + options.database;
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

    if(callback) {
        dataSource.connecting = true;
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

    this.debug = settings.debug;

    if(this.debug) {
        console.log('MongoDB', settings);
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
        process.nextTick(function() {
            callback && callback(null, self.db);
        });
    } else {
        if(self.debug) {
            // Configure the mongodb logger
            self.settings.logger = { doDebug: true, 
                                     doError: true, 
                                     log: console.log, 
                                     debug: console.log, 
                                     error: console.error };
        }
        mongodb.MongoClient.connect(self.settings.url, {db: self.settings}, function (err, db) {
            if(!err) {
                if(self.debug) {
                    console.log('MongoDB connection is established: ' + self.settings.url);
                }
                self.db = db;
            } else {
                if(self.debug || !callback) {
                    console.error('MongoDB connection is failed: ' + self.settings.url, err);
                }
            }
            callback && callback(err, db);
        });
    }
};

/**
 * Define a foreign key
 * @param {String} model The model name
 * @param {String} key The key name
 * @param {funciton} [cb] The callback function
 * @private
 */
MongoDB.prototype.defineForeignKey = function (model, key, cb) {
    cb(null, ObjectID);
};

/**
 * Access a MongoDB collection by name
 * @param {String} name The collection name
 * @returns {*}
 */
MongoDB.prototype.collection = function (name) {
    if(!this.db) {
        throw new Error('MongoDB connection is not established');
    }
    return this.db.collection(name);
};

/**
 * Create a new model instance for the given data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.create = function (model, data, callback) {
    var self = this;
    if(self.debug) {
        console.log('create', model, data);
    }
    var idValue = self.getIdValue(model, data);
    var idName = self.idName(model);

    if (idValue === null) {
        delete data[idName]; // Allow MongoDB to generate the id
    } else {
        data._id = idValue; // Set it to _id
        delete data[idName];
    }
    this.collection(model).insert(data, {safe: true}, function (err, m) {
        if(self.debug) {
            console.log('create.callback', model, err, m);
        }
        callback(err, err ? null : m[0]._id);
    });
};

/**
 * Save the model instance for the given data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.save = function (model, data, callback) {
    var self = this;
    if(self.debug) {
        console.log('save', model, data);
    }
    var idValue = self.getIdValue(model, data);
    var idName = self.idName(model);

    var oid = ObjectID(idValue);
    delete data[idName];

    this.collection(model).update({_id: oid}, data, {safe: true, upsert: true}, function (err, result) {
        if(!err) {
            self.setIdValue(model, data, idValue);
        }
        if(self.debug) {
            console.log('save.callback', model, err, result);
        }
        callback && callback(err, result);
    });
};

/**
 * Check if a model instance exists by id
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {Function} [callback] The callback function
 *
 */
MongoDB.prototype.exists = function (model, id, callback) {
    var self = this;
    if(self.debug) {
        console.log('exists', model, id);
    }
    id = ObjectID(id);
    this.collection(model).findOne({_id: id}, function (err, data) {
        if(self.debug) {
            console.log('exists.callback', model, id, err, data);
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
MongoDB.prototype.find = function find(model, id, callback) {
    var self = this;
    if(self.debug) {
        console.log('find', model, id);
    }
    var oid = ObjectID(id);
    this.collection(model).findOne({_id: oid}, function (err, data) {
        if(self.debug) {
            console.log('find.callback', model, id, err, data);
        }
        callback && callback(err, data);
    });
};

/**
 * Update if the model instance exists with the same id or create a new instance
 *
 * @param {String} model The model name
 * @param {Object} data The model instance data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.updateOrCreate = function updateOrCreate(model, data, callback) {
    var self = this;
    if(self.debug) {
        console.log('updateOrCreate', model, data);
    }

    var idValue = self.getIdValue(model, data);

    if (idValue === null || idValue === undefined) {
        return this.create(data, callback);
    }
    this.find(model, idValue, function (err, inst) {
        if (err) {
            return callback(err);
        }
        if (inst) {
            self.updateAttributes(model, idValue, data, callback);
        } else {
            self.create(model, data, function (err, id) {
                if (err) {
                    return callback(err);
                }
                if (id) {
                    self.setIdValue(model, data, id);
                    callback(null, data);
                } else{
                    callback(null, null); // wtf?
                }
            });
        }
    });
};

/**
 * Delete a model instance by id
 * @param {String} model The model name
 * @param {*} id The id value
 * @param [callback] The callback function
 */
MongoDB.prototype.destroy = function destroy(model, id, callback) {
    var self = this;
    if(self.debug) {
        console.log('delete', model, id);
    }
    id = ObjectID(id);
    this.collection(model).remove({_id: id}, function(err, result) {
        if(self.debug) {
            console.log('delete.callback', model, id, err, result);
        }
       callback && callback(err, result);
    });
};

/*!
 * Decide if id should be included
 * @param {Object} fields
 * @returns {Boolean}
 * @private
 */
function idIncluded(fields, idName) {
    if(!fields) {
        return true;
    }
    if(Array.isArray(fields)) {
        return fields.indexOf(idName) >= 0;
    }
    if(fields[idName]) {
        // Included
        return true;
    }
    if((idName in fields) && !fields[idName]) {
        // Excluded
        return false;
    }
    for(var f in fields) {
        return !fields[f]; // If the fields has exclusion
    }
    return true;
}

/**
 * Find matching model instances by the filter
 *
 * @param {String} model The model name
 * @param {Object} filter The filter
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.all = function all(model, filter, callback) {
    var self = this;
    if(self.debug) {
        console.log('all', model, filter);
    }
    if (!filter) {
        filter = {};
    }
    var idName = self.idName(model);
    var query = {};
    if (filter.where) {
        if (filter.where[idName]) {
            var id = filter.where[idName];
            delete filter.where[idName];
            id = ObjectID(id);
            filter.where._id = id;
        }
        Object.keys(filter.where).forEach(function (k) {
            var cond = filter.where[k];
            var spec = false;
            if (cond && cond.constructor.name === 'Object') {
                spec = Object.keys(cond)[0];
                cond = cond[spec];
            }
            if (spec) {
                if (spec === 'between') {
                    query[k] = { $gte: cond[0], $lte: cond[1]};
                } else if (spec === 'inq') {
                    query[k] = { $in: cond.map(function(x) {
                        if ('string' !== typeof x) return x;
                        return ObjectID(x);
                    })};
                } else {
                    query[k] = {};
                    query[k]['$' + spec] = cond;
                }
            } else {
                if (cond === null) {
                    query[k] = {$type: 10};
                } else {
                    query[k] = cond;
                }
            }
        });
    }
    var fields = filter.fields;
    var cursor = null;
    if(fields) {
        cursor = this.collection(model).find(query, fields);
    } else {
        cursor = this.collection(model).find(query);
    }

    if (filter.order) {
        var keys = filter.order;
        if (typeof keys === 'string') {
            keys = keys.split(',');
        }
        var args = {};
        for (var index in keys) {
            var m = keys[index].match(/\s+(A|DE)SC$/);
            var key = keys[index];
            key = key.replace(/\s+(A|DE)SC$/, '').trim();
            if (m && m[1] === 'DE') {
                args[key] = -1;
            } else {
                args[key] = 1;
            }
        }
        cursor.sort(args);
    }
    if (filter.limit) {
        cursor.limit(filter.limit);
    }
    if (filter.skip) {
        cursor.skip(filter.skip);
    } else if (filter.offset) {
        cursor.skip(filter.offset);
    }
    cursor.toArray(function (err, data) {
        if(self.debug) {
            console.log('all', model, filter, err, data);
        }
        if (err) {
            return callback(err);
        }
        var objs = data.map(function (o) {
            if(idIncluded(fields, self.idName(model))) {
                self.setIdValue(model, o, o._id);
            }
            // Don't pass back _id if the fields is set
            if(fields) {
                delete o._id;
            }
            return o;
        });
        if (filter && filter.include) {
            self._models[model].model.include(objs, filter.include, callback);
        } else {
            callback(null, objs);
        }
    });
};

/**
 * Delete all instances for the given model
 * @param {String} model The model name
 * @param {Object} [where] The filter for where
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.destroyAll = function destroyAll(model, where, callback) {
    var self = this;
    if(self.debug) {
        console.log('destroyAll', model, where);
    }
    if(!callback && 'function' === typeof where) {
        callback = where;
        where = undefined;
    }
    this.collection(model).remove(where || {}, function (err, result) {
        if(self.debug) {
            console.log('destroyAll.callback', model, where, err, result);
        }
        callback && callback(err, result);
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
MongoDB.prototype.count = function count(model, callback, where) {
    var self = this;
    if(self.debug) {
        console.log('count', model, where);
    }
    this.collection(model).count(where, function (err, count) {
        if(self.debug) {
            console.log('count.callback', model, err, count);
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
MongoDB.prototype.updateAttributes = function updateAttrs(model, id, data, cb) {
    var debug = this.debug;
    if(debug) {
        console.log('updateAttributes', model, id, data);
    }
    var oid = ObjectID(id);
    delete data[this.idName(model)];

    this.collection(model).findAndModify({_id: oid}, [['_id','asc']], {$set: data}, {}, function(err, object) {
        if(debug) {
            console.log('updateAttributes.callback', model, id, err, object);
        }
        if(!err && !object) {
            // No result
            err = 'No '+ model +' found for id ' + id;
        }
        cb && cb(err, object);
    });
};

/**
 * Disconnect from MongoDB
 */
MongoDB.prototype.disconnect = function () {
    if(this.debug) {
        console.log('disconnect');
    }
    if(this.db) {
        this.db.close();
    }
};

