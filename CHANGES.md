2015-02-21, Version 1.8.0
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
