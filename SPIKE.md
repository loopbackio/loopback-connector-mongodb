# Spike: Robust handling of ObjectID type for MongoDB

Ref: https://github.com/strongloop/loopback-next/issues/3456

## Table of contents

- [The problem](#the-problem)
- [Proposed solution](#proposed-solution)
- [Approaches](#approaches)
- [Developer Notes](#developer-notes)
- [Implementation Proposal](#implementation)
- [Follow-up task](#follow-up-task)

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
3. To add to the confusion, this behavior can be configured at model and property levels.

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

## Proof of concept

The tests in `test/new-objectid.test.js` is a demonstration of the behavior of the new `mongodb: {dataType: 'ObjectID'}` property.

## Implementation

All changes are limited to `loopback-connetor-mongodb` only, Juggler is not affected.

- Before querying database:
  - Convert `id` value to `ObjectID`.
  - Walk through the data object and convert all properties defined as `mongodb: {dataType: 'ObjectID'}`.
- When receiving data from database
  - Convert `id` value to `String`:
  - Walk through the data object and convert all properties defined as `mongodb: {dataType: 'ObjectID'}` to `String`
- Remove or refactor all helper functions and properties like `typeIsObjectId()`, `strictObjectIDCoercion` etc., related to previous behavior of `ObjectId`.
- There are some pieces of code that can be refactored, which involves the new changes. I think we should refactor it now now, than accumulate tech debt.

## Follow-up Tasks

1. Implement the functionality as proposed in - [Implementation Proposal](#implementation).
