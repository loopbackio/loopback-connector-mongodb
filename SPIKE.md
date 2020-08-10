# Spike: Robust handling of ObjectID type for MongoDB

Ref: https://github.com/strongloop/loopback-next/issues/3456

## Table of contents

- [Introduction](#introduction)
- [The problem](#the-problem)
- [Proposed solution](#proposed-solution)
- [Follow-up tasks](#follow-up-tasks)
  - [MVP Scope](#mvp-scope)
  - [Post-MVP](#post-mvp)

## Introduction

We are dealing with two perspectives:

1. User - 
2. Database -  

## The Problem



## Proposed Solution



## Follow-up Tasks

- Identify all input points and perform string to ObjectID conversion after ensuring the input string is a valid ObjectID string
- Identify all result points and perform ObjectID to string conversion in the result object
- Get rid of `coerceId()` and implement a generic peoperty coercion method, all properties should use the same method
  - Two helper methods:
  - `coerceToObjectIds()` - for querying db
  - `coerceFromObjectIds()` - for sending to user
- Get rid of `typeIsObjectId()` - since ObjectID type should now be declared explicitly
- Replaced functions like `coercePropertyValue()` and `toDatabase()` with 

## Notes

- converting ObjectID to string will have performance penalty if the results contains losts of nested objected with lots of properties; and more the result items, the more penalty. Imagine a result with a million items.



