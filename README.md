## JugglingDB-MongoDB [![Build Status](https://travis-ci.org/loopback-data/mongodb-adapter.png)](https://travis-ci.org/loopback-data/mongodb-adapter)

MongoDB adapter for loopback-data.

## Usage

To use it you need `loopback-data@0.2.x`.

1. Setup dependencies in `package.json`:

    ```json
    {
      ...
      "dependencies": {
        "loopback-data": "0.2.x",
        "loopback-data-mongodb": "latest"
      },
      ...
    }
    ```

2. Use:

    ```javascript
        var Schema = require('jugglingbd').Schema;
        var schema = new Schema('mongodb');
        ...
    ```

## Running tests

Make sure you have mongodb server running on default port, username: `travis`,
password: `test`, database: `myapp`

    npm test

## MIT License

    Copyright (C) 2012 by Anatoliy Chakkaev

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.

