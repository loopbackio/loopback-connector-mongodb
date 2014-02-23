## loopback-connector-mongodb

MongoDB connector for loopback-datasource-juggler.

## Usage

To use it you need `loopback-datasource-juggler@1.0.x`.

1. Setup dependencies in `package.json`:

    ```json
    {
      ...
      "dependencies": {
        "loopback-datasource-juggler": "1.0.x",
        "loopback-connector-mongodb": "1.0.x"
      },
      ...
    }
    ```

2. Use:

    ```javascript
        var DataSource = require('loopback-datasource-juggler').DataSource;
        var ds = new DataSource('mongodb');
        ...
    ```

## About MongoDB ID field

MongoDB uses a specific ID field with BSON `ObjectID` type, named `_id`

This connector does not expose this `_id` by default, to keep consistency with other connectors.

Default ID field keeps MongoDB `ObjectID` type, but field name is `id`, or any other field name specified in the loopback model's definition.

If you want to use the original MongoDB `_id` field in your loopback model, please explicitly specify the type **DataSource.ObjectID** / **MongoDB.ObjectID** type in your model's definition.

*Example :*

    var ds = app.dataSources.db;
    MyModel = ds.createModel('mymodel', {_id: ds.ObjectID});

## Customizing MongoDB configuration for tests/examples

By default, examples and tests from this module assume there is a MongoDB server
instance running on localhost at port 27017.

To customize the settings, you can drop in a `.loopbackrc` file to the root directory
of the project or the home folder.

The .loopbackrc file should be in JSON format, for example:

    {
        "dev": {
            "mongodb": {
                "host": "127.0.0.1",
                "database": "test",
                "username": "youruser",
                "password": "yourpass",
                "port": 27017
            }
        },
        "test": {
            "mongodb": {
                "host": "127.0.0.1",
                "database": "test",
                "username": "youruser",
                "password": "yourpass",
                "port": 27017
            }
        }
    }

**Note**: username/password is only required if the MongoDB server has
authentication enabled.

## Running tests

    npm test

## Release notes

  * 1.1.7 - Do not return MongoDB-specific _id to client API, except if specifically specified in the model definition
