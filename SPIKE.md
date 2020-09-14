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

`ObjectID` is a native MongoDB datatype, which is used as the datatype of its primary key (_id_) field; other fields can also be of `ObjectID` type.

MongoDB distinguishes between id values that are a `strin` and an `ObjectID`. A query using a `string` value does not match records having `ObjectID` value and vice versa. This is especially important for foreign keys, e.g. when `Order` property `customerId` is referencing an `id` of a `Customer`, then both properties must always hold `ObjectID` values. If one of the property (typically `customerId`) is stored as a `string`, then LB relations stop working.

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

Database-specific types like `ObjectID` and `Decimal128` should be considered as an implementation detail of a database connector.

Values of these types must not leak from the connector to Juggler and user code, code outside the connector should see a database-agnostic type like a `string`. The connector must always convert incoming values (property values, filtering queries) from database-agnostic type to database-specific type on input, and convert database-specific types back to database-agnostic type on output.

Specifically for `ObjectID`:
- Properties that should be stored as `ObjectID` in MongoDB must be defined as `{type: 'string', mongodb: {dataType: 'ObjectID'}}`.
- There will be no auto-magic coercion from `string` to `ObjectID` for other properties (those defined without `dataType: 'ObjectID'`).

Users will no longer have to deal with `ObjectID` anywhere in their experience with
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
property as an `ObjectID`. The same approach is also already used by `Decimal128` -  `mongodb: {dataType: 'decimal128'}`.

## Proof of concept

The tests in `test/new-objectid.test.js` is a demonstration of the behavior of the new `mongodb: {dataType: 'ObjectID'}` property.

## Implementation

All changes are limited to `loopback-connetor-mongodb` only, Juggler is not affected.

- Before querying database:
  - Walk through the data object and convert all properties defined as `mongodb: {dataType: 'ObjectID'}`.
- When receiving data from database
  - Walk through the data object and convert all properties defined as `mongodb: {dataType: 'ObjectID'}` to `String`
- Primary key:
  - if not specified, will be interpreted as `mongodb: {dataType: 'ObjectID'}`
  - if specified with `{id: true}`, need not add `mongodb: {dataType: 'ObjectID'}` (it will be automatically inferred)
- There are some pieces of code that can be refactored, which involves the new changes. I think we should refactor it now now, than accumulate tech debt.


## Notes

- The changes will break compatibility with LB 3.x. Which is fine, we just need to clearly document it and remove `juggler@3` from the test suite.
- Add a "Long Term Support" section to README (see [strongloop/loopback](https://github.com/strongloop/loopback#module-long-term-support-policy) for inspiration) and also explain which connector versions are compatible with which LoopBack versions.

## Follow-up Tasks

1. Implement the functionality as proposed in - [Implementation Proposal](#implementation).
