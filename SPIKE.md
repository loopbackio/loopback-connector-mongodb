# Spike: Robust handling of ObjectID type for MongoDB

Ref: https://github.com/strongloop/loopback-next/issues/3456

## Table of contents

- [The problem](#the-problem)
- [Proposed solution](#proposed-solution)
- [Approaches](#approaches)
- [Developer Notes](#developer-notes)
- [Follow-up task](#follow-up-task)
  - [MVP Scope](#mvp-scope)
  - [Post-MVP](#post-mvp)

## The Problem

`ObjectID` is a native MongoDB datatype, which is used as the datatype of its primary key (_id_) field; other fields
can also be of `ObjectID` type.

In the current version of Juggler, the interpretation of `ObjectID` field is a sub-optimal experience supported by a complex
determination process in an already complex codebase.

Examples of bad experiences: 

1. Fields need not be set to `mongodb: {dataType: 'ObjectID'}` to be interpreted as `ObjectID`.
2. Unless `strictObjectIDCoercion` is set to `true`, any string
that looks like an `ObjectID` will automatically get converted to `ObjectID` and you won't be able to find the object if you
tried searching the database by that string, because it is not a string any more.

Complexity is sometimes unavoidable, but a less complex state is always the desired state. It creates better experience for
the consumers, and makes development and maintenance a more pleasant experience for the creators.

## Proposed Solution

"Do not interpret any property not set with `mongodb: {dataType: 'ObjectID'}` as an `ObjectID`. Use string values for `ObjectID`
in public APIs and manage the coercion processes for the user."

That sums up the proposed solution. Users will no longer have to deal with `ObjectID` anywhere in their experience with
LoopBack/Juggler except only in one location - the model file.

## Approaches

### 1. Top level ObjectID

A top level `dataType: 'ObjectID'` was suggested, but it was discarded for the following reason:

1. If a top level `ObjectID` is supported for MongoDB, then database-specific types like `MULTIPOLYGON`, `VARCHAR`, `NCLOB` etc
may also be required to be supported. Considering the number of database-specific types and the number of databases we support,
we will end up with a really huge list.
2. Inflexible when switching connectors. Cannot do this:

```js
{
  type: 'number',
  jsonSchema: {
    format: 'int32',
  },
  mysql: {
    dataType: 'bit',
  },
  postgresql: {
    dataType: 'bit',
    length: 1,
  }
}
```

### 2. mongodb: {dataType: 'objectID'}

Setting a property to `mongodb: {dataType: 'ObjectID'}`, as it is already being done, is the better approach for marking the 
property as an `ObjectID`.

## Developer Notes

- The tests in `test/new-objectid.test.js` is a demonstration of the `mongodb: {dataType: 'ObjectID'}` property.
- Changes are required in `loopback-connector-mongodb/lib/mongodb.js` and `loopback-datasource-juggler/lib/dao.js`.
- Changes in `loopback-connector-mongodb/lib/mongodb.js`:
  - 
  - 
- Changes in `loopback-datasource-juggler/lib/dao.js`:
  - All helper functions and properties like `typeIsObjectId()`, `strictObjectIDCoercion` etc. related to previous behavior of `ObjectId` should be removed or refactored.
  - 
- Refactoring suggestions:
  - 
  - 
- In the time assigned for this spike I could not go deeper in the 

## Follow-up Tasks

- Refactor - points noted randomly below
- Identify all input points and perform string to ObjectID conversion after ensuring the input string is a valid ObjectID string
- Identify all result points and perform ObjectID to string conversion in the result object
- Get rid of `coerceId()` and implement a generic peoperty coercion method, all properties should use the same method
  - Two helper methods:
  - `coerceToObjectIds()` - for querying db
  - `coerceFromObjectIds()` - for sending to user
- Get rid of `typeIsObjectId()` - since ObjectID type should now be declared explicitly
- Replaced functions like `coercePropertyValue()` and `toDatabase()` with 
- all database results should be run through the same post-processing - eg: `.create()` has its down, 
- result object should be created from database result - for consistency

## Notes

- converting ObjectID to string will have performance penalty if the results contains losts of nested objected with lots of properties; and more the result items, the more penalty. Imagine a result with a million items.



