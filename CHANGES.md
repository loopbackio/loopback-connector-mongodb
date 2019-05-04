2019-05-04, Version 4.2.0
=========================

 * fix: edge cases to coerce nested decimal props (biniam)

 * test: strict model update with mongo operators (biniam)

 * chore: update copyrights years (Diana Lau)

 * add check for embedded property type conversion (Dimitris)

 * Remove port when using mongodb+srv (JREEVE)

 * ci: fix previously failing tests (biniam)


2019-04-12, Version 4.1.0
=========================

 * fix: coerce deep nested decimal properties (biniam)

 * Fix missing '_id' when selected in filter.fields (#439) (Helge Willum Thingvad)


2018-11-06, Version 4.0.0
=========================

 * Use new url parser by default (#462) (Hugo Da Roit)

 * remove the infinite inspect (#480) (Janny)

 * Add case insensitive indexes support (maxim.sharai)


2018-10-23, Version 3.9.0
=========================

 * support decimal128 (#475) (Janny)

 * Added `"authSource"` in doc connection properties (Rémi AUGUSTE)

 * Convert embedded binary properties to buffer (ntsekouras)

 * Convert projection fields option to object (Dimitris)


2018-09-19, Version 3.8.0
=========================

 * fix performance issues on count #464 (Clément)

 * feat: allow methods to pass strictObjectIDCoercion (virkt25)


2018-09-14, Version 3.7.1
=========================

 * fix: map new names to old for connector hooks (virkt25)


2018-09-12, Version 3.7.0
=========================

 * update deprecated mongo driver commands (Hugo Da Roit)

 * Remove hard dependency of memwatch-next (Raymond Feng)

 * Add support for protocol to be 'monogodb+srv' (Raymond Feng)


2018-08-15, Version 3.6.0
=========================

 * docs: update with security consideration section (virkt25)

 * fix: sanitize query by default (virkt25)

 * change `count` to `countDocuments` (Rahmat Nugraha)

 * add `useNewUrlParser` on validOptionNames (Rahmat Nugraha)

 * Dedicated Model for testing disableDefaultSort (HugoPoi)

 * Add disableDefaultSort in README (HugoPoi)

 * Add settings disableDefaultSort for find method (HugoPoi)


2018-07-23, Version 3.5.0
=========================

 * chore: drop node 4 and update deps (Taranveer Virk)

 * [WebFM] cs/pl/ru translation (candytangnb)


2018-06-05, Version 3.4.4
=========================

 * Fields projection fix (#436) (John Gonyo)


2018-04-06, Version 3.4.3
=========================

 * update bson version (Diana Lau)


2018-03-23, Version 3.4.2
=========================

 * chore:update CODEOWNERS (Diana Lau)

 * Prioritize db url (Dimitris)

 * CODEOWNERS: add nitro404 (Miroslav Bajtoš)


2018-01-19, Version 3.4.1
=========================

 * fix: allow db name to be parsed from url (Raymond Feng)


2018-01-19, Version 3.4.0
=========================

 * upgrade to mongodb driver 3.x (Raymond Feng)

 * Alias find as findById (jannyHou)


2017-12-04, Version 3.3.1
=========================

 * Switch to bson.ObjectID (#401) (Kevin Delisle)

 * chore: update license (Diana Lau)


2017-10-13, Version 3.3.0
=========================

 * update strong-globalize to 3.1.0 (shimks)

 * Create Issue and PR Templates (#386) (Sakib Hasan)

 * Use stalebot on this repo (#383) (Kevin Delisle)

 * Use stalebot on this repo (Kevin Delisle)

 * Add CODEOWNER file (Diana Lau)


2017-07-10, Version 3.2.1
=========================

 * Apply feedback (ssh24)

 * Add docs on lazyConnect flag (ssh24)


2017-06-28, Version 3.2.0
=========================

 * Remove the hard-coded writeConcern (Raymond Feng)

 * Document strictObjectIDCorecion flag (Loay)

 * Allow different forms of regexp on like/nlike op (ssh24)

 * Require init on mocha args (ssh24)

 * Use buildSort function to sort (ssh24)

 * Add docker setup (#373) (Sakib Hasan)

 * test: use mongodb-3.2 on Travis (#369) (Ryan Graham)


2017-04-17, Version 3.1.0
=========================

 * Update connector version (#368) (Sakib Hasan)

 * Replicate issue_template from loopback repo (#350) (siddhipai)

 * Fix buildNearFilter to work with any key depth (#322) (Corentin H)

 * Fix Update when id not found (Loay)

 * Add additional envs for node v4/v6 (#365) (Sakib Hasan)

 * Update node version (ssh24)

 * Reconnect on execute after disconnect (#362) (phairow)

 * update the near query with minDistance test (#361) (Vincent Wen)

 * Fix lazy connect (#360) (phairow)

 * Export the additional functions (#353) (James Cooke)

 * Mongo 3.4 Support/Delete index ‘kind’ property from index options (#335) (Dylan Lundy)

 * Update README.md (Rand McKinney)


2017-02-13, Version 3.0.1
=========================

 * Remove invalid options (jannyHou)

 * Add nestedProperty to connectorCapabilities (jannyHou)

 * Update README.md (Rand McKinney)

 * add info on url override (ivy ho)

 * add link for loopback types to mongodb (ivy ho)

 * replace MySQL with MongodDB (ivy ho)

 * Update Readme with Properties (ivy ho)

 * update lB connector version (Loay)

 * Fix replaceById to report err when id not found (Loay Gewily)


2017-01-13, Version 3.0.0
=========================

 * Delete extraneous `id` for replacById (Amir Jafarian)

 * Update paid support URL (Siddhi Pai)

 * Start 3.x + drop support for Node v0.10/v0.12 (siddhipai)

 * Drop support for Node v0.10 and v0.12 (Siddhi Pai)

 * Start the development of the next major version (Siddhi Pai)

 * Update mongodb version (jannyHou)

 * Update README with correct doc links, etc (Amir Jafarian)

 * Ensure inq/nin use array cond value (Fabien Franzen)

 * More ObjectID vs. String handling improvements (Fabien Franzen)

 * Test returned info for #destroy (Fabien Franzen)

 * Test fix for #253 (Fabien Franzen)

 * Fix Copyright, use process.nextTick (Fabien Franzen)

 * Fix all sorts of issues... (Fabien Franzen)

 * Column renaming should be done before extended ops (Ian Zepp)

 * Added support for renaming columns (Ian Zepp)


2016-10-17, Version 1.17.0
==========================

 * Remove TEST prefix for env vars (#292) (Simon Ho)

 * Add connectorCapabilities global object (Nick Duffy)

 * Update translation files - round#2 (Candy)

 * Update deps to loopback 3.0.0 RC (Miroslav Bajtoš)

 * Remove conflict (jannyHou)

 * fix maxDistance not supported in geo filter. (Vincent Wen)

 * Use juggler@3 for running the tests (Miroslav Bajtoš)

 * Remove !intl (jannyHou)

 * Refactor (jannyHou)

 * Globalization (jannyHou)

 * Support patches afterwards (jannyHou)

 * Use the latest compatible mongodb (jannyHou)

 * Update URLs in CONTRIBUTING.md (#264) (Ryan Graham)


2016-05-16, Version 1.15.2
==========================

 * Update "mongodb" dependency to caret notation (Bram Borggreve)


2016-05-03, Version 1.15.1
==========================

 * insert/update copyrights (Ryan Graham)

 * relicense as MIT only (Ryan Graham)


2016-05-03, Version 1.15.0
==========================

 * Lazy connect when booting app (juehou)

 * Add support for geoNear queries (Timo Saikkonen)

 * Fix linting errors (Amir Jafarian)

 * Auto-update by eslint --fix (Amir Jafarian)

 * Add eslint infrastructure (Amir Jafarian)

 * Implementation for replace (Amir Jafarian)

 * Upgrade should to 8.0.2 (Simon Ho)

 * Check dataSource.connecting to prevent race conditions (Fabien Franzen)

 * Remove email from AUTHORS (Simon Ho)

 * Update description in README.md (Simon Ho)

 * Clean up package.json (Simon Ho)

 * Update AUTHORS (Simon Ho)

 * Add AUTHORS file (Simon Ho)

 * Use ObjectId as internal storage for id (Raymond Feng)

 * test: fix order of semver arguments (Ryan Graham)

 * use mocha for test script (Ryan Graham)

 * Add more tests for id coercion (Raymond Feng)


2015-12-13, Version 1.13.2
==========================

 * Make sure null/undefined id is not coerced (Raymond Feng)

 * Allow runtime configurable test environment (Simon Ho)

 * changed env variable fortest servers (cgole)


2015-11-23, Version 1.13.1
==========================

 * Fix the test set up (Raymond Feng)

 * Added mongo port env var (cgole)

 * Add env variable for mongodb server (cgole)

 * Refer to licenses with a link (Sam Roberts)

 * Fix repository field in package.json (Simon Ho)

 * Use strongloop conventions for licensing (Sam Roberts)

 * Enhance coercion of ids with inq/nin operators (Raymond Feng)

 * Return deleted count (Raymond Feng)


2015-08-06, Version 1.13.0
==========================

 * Added a setting to enable optimsied findOrCreate method so that connector continues to work with mongodb < 2.6 (Mike Bissett)

 * Fixed up merge conflicted dependencies in package.json (Mike Bissett)

 * Update deps (Raymond Feng)

 * implement optimized findOrCreate (Clark Wang)

 * extract sort document building to method (Clark Wang)


2015-08-04, Version 1.12.0
==========================

 * Add regexp operator support (Simon Ho)

 * Enable options.allowExtendedOperators (Fabien Franzen)

 * Enable Model.settings.mongodb.allowExtendedOperators (Fabien Franzen)

 * Update benchmarks (Simon Ho)


2015-07-02, Version 1.11.3
==========================

 * Restore data.id to avoid build breaks (Raymond Feng)


2015-06-25, Version 1.11.2
==========================

 * Revert "Add a workaround for auth with multiple mongos servers" (Raymond Feng)


2015-06-15, Version 1.11.1
==========================

 * Fix the url (Raymond Feng)

 * Replaced ensureIndex() with createIndex() (U-Zyn Chua)


2015-06-05, Version 1.11.0
==========================

 * Add a workaround for auth with multiple mongos servers (Raymond Feng)

 * Use custom collection name for migration (Raymond Feng)


2015-06-03, Version 1.10.1
==========================

 * Make sure disconnect calls back (Raymond Feng)


2015-06-01, Version 1.10.0
==========================

 * Add execute hooks (Raymond Feng)


2015-05-29, Version 1.9.2
=========================

 * Update to memwatch-next for node 0.12 compatibility (Raymond Feng)


2015-05-28, Version 1.9.1
=========================

 * Update deps (Raymond Feng)


2015-05-28, Version 1.9.0
=========================

 * Add options (Raymond Feng)

 * Update README.md (Simon Ho)

 * Add leak detection (Simon Ho)

 * Add benchmarks (Simon Ho)

 * Support `ctx.isNewInstance` (Miroslav Bajtoš)

 * Update deps (Raymond Feng)

 * Cleanup for returning count on update/delete (Simon Ho)

 * Default to `undefined` instead of `0` (Simon Ho)

 * Return info object with affected items count (Simon Ho)

 * added doc about allowExtendedOperators (Pasindu De Silva)

 * Make test instructions more meaningful (Simon Ho)


2015-02-20, Version 1.8.0
=========================

 * Update deps (Raymond Feng)

 * Re-enable the inclusion tests (Raymond Feng)


2015-02-08, Version 1.7.0
=========================

 * Check if result is null (Raymond Feng)

 * Disable extended tests if mongodb version is lower than 2.6 (Raymond Feng)

 * Include tests of persistence hooks from juggler. (Miroslav Bajtoš)

 * Update `should` to the latest version `4.6.3` (Miroslav Bajtoš)

 * Fix unit-tests on iojs 1.0 (Miroslav Bajtoš)

 * Tidy up the null check (Raymond Feng)

 * Added options to like/nlike operator to allow for regex flags (Andrew Burgess)


2015-01-23, Version 1.6.0
=========================

 * Small optimisation on the loop in parseUpdateData (Alexandru Savin)

 * Optimized the user data parser method (Alexandru Savin)

 * Fixed bug where only the first operator was kept and refactored the parsing logic to be reused (Alexandru Savin)

 * Allows array operators (Felipe Figueroa)

 * Renamed datasource config var for exended parameters (Alexandru Savin)

 * set extended operators to true for the tests where they are needed (Alexandru Savin)

 * added configuration switch extended_operators and more update operators (Alexandru Savin)

 * Added tests (Alexandru Savin)

 * Check for valid operators and disregard any other properties (Alexandru Savin)

 * allow DB specific mappings for indexes (Felipe Figueroa)

 * Changed the solution to use indexOf (Alexandru Savin)

 * Give access to all update operators (Alexandru Savin)

 * Enable additional update actions (other than $set) (Alexandru Savin)


2015-01-14, Version 1.5.0
=========================

 * Fix the test case (Raymond Feng)

 * Upgrade to mongodb node driver 2.x (Raymond Feng)

 * Fix bad CLA URL in CONTRIBUTING.md (Ryan Graham)

 * test: Use mongodb on localhost under CI (Ryan Graham)

 * test: bump loopback-datasource-juggler version (Ryan Graham)

 * fixing typo (Marc Puig)


2014-10-31, Version 1.4.5
=========================

 * Bump version (Raymond Feng)

 * fix misspelled attribute "unique" in /lib/mongodb.js (kai zhu)

 * Fix the test cases (Raymond Feng)

 * Add contribution guidelines (Ryan Graham)

 * Fix the bad usage of for-in loop against array (Raymond Feng)


2014-09-02, Version 1.4.4
=========================

 * Bump version (Raymond Feng)

 * Fix mongodb neq mapping (Raymond Feng)


2014-08-27, Version 1.4.3
=========================

 * Bump version (Raymond Feng)

 * Add a test case for ping errors (Raymond Feng)


2014-08-20, Version 1.4.2
=========================

 * Bump version (Raymond Feng)

 * Add ping() (Raymond Feng)


2014-06-27, Version 1.4.1
=========================

 * Bump versions (Raymond Feng)

 * Tidy up order processing (Raymond Feng)

 * Update link to doc (Rand McKinney)


2014-06-23, Version 1.4.0
=========================

 * Bump version (Raymond Feng)

 * Add update support (Raymond Feng)

 * Allows custom mapping from model to collection (Raymond Feng)

 * Add more tests (Raymond Feng)

 * Fix id usage in where clause (Raymond Feng)

 * Add a test case to verify update (Raymond Feng)


2014-06-05, Version 1.3.0
=========================

 * Fix the test cases (Raymond Feng)

 * Remove peer dependency on datasource-juggler (Miroslav Bajtoš)


2014-05-27, Version 1.2.6
=========================

 * Bump version (Raymond Feng)

 * Map id name to _id for ordering (Raymond Feng)

 * Set the default order using id if no order is specified (Raymond Feng)


2014-05-13, Version 1.2.5
=========================

 * Bump version (Raymond Feng)

 * Remove unused code (Raymond Feng)

 * Remove the duplicate test (Raymond Feng)

 * Improve the save method with tests (Raymond Feng)

 * Fix mongodb upsert (Raymond Feng)


2014-05-05, Version 1.2.4
=========================

 * Bump versions (Raymond Feng)

 * Make sure where object is built for count/destroyAll (Raymond Feng)


2014-05-02, Version 1.2.3
=========================

 * Bump version (Raymond Feng)

 * Add a comment for the null value query (Raymond Feng)

 * Fix the test titles (Raymond Feng)

 * Add support for logical operators (Raymond Feng)


2014-04-24, Version 1.2.2
=========================

 * Bump version (Raymond Feng)

 * Add id coercion for findById (Raymond Feng)


2014-04-08, Version 1.2.1
=========================

 * Bump version (Raymond Feng)

 * Replace old README with link to docs. (Rand McKinney)

 * Update README (Raymond Feng)

 * Fix the conversion for mongodb.Binary (Raymond Feng)


2014-03-18, Version 1.2.0
=========================

 * Set default options for background/unique (Raymond Feng)

 * Add indexes/automigrate/autoupdate/debug (Raymond Feng)


2014-02-27, Version 1.1.8
=========================

 * Bump version (Raymond Feng)

 * Simplifying the connector-mongodb PR after database-juggler fix (Aurelien Chivot)

 * Do not return MongoDB-specific _id to client API, except if specifically specified in the model definition (Aurelien Chivot)


2014-02-25, Version 1.1.7
=========================

 * Bump version (Raymond Feng)

 * Wrap the condition into RegExp for consistency (Raymond Feng)

 * Add like/nlike support for mongodb (Raymond Feng)

 * Fix error handling for create (Raymond Feng)


2014-02-19, Version 1.1.6
=========================

 * Bump version (Raymond Feng)

 * Fix for text id object insertion issue (Aurelien Chivot)

 * Update to dual MIT/StrongLoop license (Raymond Feng)

 * Fix the object id conversion to skip 12-byte strings (Raymond Feng)


2014-02-11, Version 1.1.5
=========================

 * Fix update (Raymond Feng)

 * Update getTypes (Raymond Feng)

 * Add type/defaultIdType (Raymond Feng)

 * Reformat code (Raymond Feng)


2013-12-16, Version 1.1.4
=========================

 * Bump version (Raymond Feng)

 * Rename the model (Raymond Feng)

 * Add a test case (Raymond Feng)

 * Try to convert the id to ObjectID (Raymond Feng)


2013-12-06, Version 1.1.3
=========================

 * First release!
