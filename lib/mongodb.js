/**
 * Module dependencies
 */
var mongodb = require('mongodb');

/**
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

    if (dataSource.settings.rs) {

        s.rs = dataSource.settings.rs;
        if (dataSource.settings.url) {
            var uris = dataSource.settings.url.split(',');
            s.hosts = [];
            s.ports = [];
            uris.forEach(function(uri) {
                var url = require('url').parse(uri);

                s.hosts.push(url.hostname || 'localhost');
                s.ports.push(parseInt(url.port || '27017', 10));

                if (!s.database) {
                    s.database = url.pathname.replace(/^\//, '');
                }
                if (!s.username) {
                    s.username = url.auth && url.auth.split(':')[0];
                }
                if (!s.password) {
                    s.password = url.auth && url.auth.split(':')[1];
                }
            });
        }

        s.database = s.database || 'test';

    } else {

        if (dataSource.settings.url) {
            var url = require('url').parse(dataSource.settings.url);
            s.host = url.hostname;
            s.port = url.port;
            s.database = url.pathname.replace(/^\//, '');
            s.username = url.auth && url.auth.split(':')[0];
            s.password = url.auth && url.auth.split(':')[1];
        }

        s.host = s.host || 'localhost';
        s.port = parseInt(s.port || '27017', 10);
        s.database = s.database || 'test';

    }

    s.safe = s.safe || false;

    dataSource.connector = new MongoDB(s, dataSource, callback);
    dataSource.ObjectID = mongodb.ObjectID;
};


/**
 * The constructor for MongoDB connector
 * @param {Object} settings The settings object
 * @param {DataSource} dataSource The data source instance
 * @param [callback] The callback function
 * @constructor
 */
function MongoDB(settings, dataSource, callback) {
    var i, n;
    this.name = 'mongodb';
    this._models = {};
    this.collections = {};
    this.debug = settings.debug;

    if(this.debug) {
        console.log('MongoDB', settings);
    }

    var server;
    if (settings.rs) {
        var set = [];
        for (i = 0, n = settings.hosts.length; i < n; i++) {
            set.push(new mongodb.Server(settings.hosts[i], settings.ports[i], {auto_reconnect: true}));
        }
        server = new mongodb.ReplSetServers(set, {rs_name: settings.rs});

    } else {
        server = new mongodb.Server(settings.host, settings.port, {});
    }

    new mongodb.Db(settings.database, server, { safe: settings.safe }).open(function (err, client) {
        if (err) {
            throw err;
        }
        if (settings.username && settings.password) {
            var t = this;
            client.authenticate(settings.username, settings.password, function (err, result) {
              t.client = client;
              dataSource.client = client;
              callback();
            });

        } else {
            this.client = client;
            dataSource.client = client;
            callback();
        }
    }.bind(this));
}

MongoDB.prototype.idName = function(model) {
    return this.dataSource.idName(model);
};

/**
 * Hook for defining new models
 * @param {Object} descr Model description
 */
MongoDB.prototype.define = function (descr) {
    if (!descr.settings) {
        descr.settings = {};
    }
    this._models[descr.model.modelName] = descr;
};

/**
 * Hook for defining a property
 * @param {String} model The model name
 * @param {String} prop The property name
 * @param {Object} params The parameters
 */
MongoDB.prototype.defineProperty = function (model, prop, params) {
    this._models[model].properties[prop] = params;
};

/**
 * Define a foreign key
 * @param {String} model The model name
 * @param {String} key The key name
 * @param {funciton} [cb] The callback function
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
    if (!this.collections[name]) {
        this.collections[name] = new mongodb.Collection(this.client, name);
    }
    return this.collections[name];
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
    if (data.id === null) {
        delete data.id; // Allow MongoDB to generate the id
    } else {
        data._id = data.id; // Set it to _id
        delete data.id;
    }
    this.collection(model).insert(data, {}, function (err, m) {
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
    var id = data.id;
    var oid = ObjectID(id);
    delete data.id;
    this.collection(model).update({_id: oid}, data, function (err, result) {
        if(!err) {
            data.id = id;
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
        if (data) {
            data.id = id;
        }
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

    if (!data.id) {
        return this.create(data, callback);
    }
    this.find(model, data.id, function (err, inst) {
        if (err) {
            return callback(err);
        }
        if (inst) {
            self.updateAttributes(model, data.id, data, callback);
        } else {
            // delete data.id;
            self.create(model, data, function (err, id) {
                if (err) {
                    return callback(err);
                }
                if (id) {
                    data.id = id;
                    delete data._id;
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

/**
 * Decide if id should be included
 * @param {Object} fields
 * @returns {Boolean}
 */
function idIncluded(fields) {
    if(!fields) {
        return true;
    }
    if(Array.isArray(fields)) {
        return fields.indexOf('id') >= 0;
    }
    if(fields.id) {
        // Included
        return true;
    }
    if(('id' in fields) && !fields.id) {
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
    var query = {};
    if (filter.where) {
        if (filter.where.id) {
            var id = filter.where.id;
            delete filter.where.id;
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
            if(idIncluded(fields)) {
                o.id = o._id;
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
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.destroyAll = function destroyAll(model, callback) {
    var self = this;
    if(self.debug) {
        console.log('destroyAll', model);
    }
    this.collection(model).remove({}, function (err, result) {
        if(self.debug) {
            console.log('destroyAll.callback', model, err, result);
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
    var debug = this.debug || true;
    if(debug) {
        console.log('updateAttributes', model, id, data);
    }
    var oid = ObjectID(id);
    delete data.id;

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
    this.client.close();
};

