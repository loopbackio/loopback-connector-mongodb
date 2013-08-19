## loopback-connector-mongodb

MongoDB connector for loopback-datasource-juggler.

## Usage

To use it you need `loopback-datasource-juggler@latest`.

1. Setup dependencies in `package.json`:

    ```json
    {
      ...
      "dependencies": {
        "loopback-datasource-juggler": "latest",
        "loopback-connector-mongodb": "latest"
      },
      ...
    }
    ```

2. Use:

    ```javascript
        var DataSource = require('loopback-datasource-juggler').DataSource;
        var dataSource = new DataSource('mongodb', {
            url: 'mongodb://localhost:27017/test
        });
        ...
    ```

Settings:

- url: MongoDB connection string, see http://docs.mongodb.org/manual/reference/connection-string/
- other options, see http://docs.mongodb.org/manual/reference/connection-string/#connections-connection-options
- debug: true|false

## Running tests

Make sure you have mongodb server running. Update test/init.js to set the options.

    npm test

