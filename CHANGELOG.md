# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## Added
- Resolving error messages from error codes

## [1.3.0] - 2023-01-04

## Added
- Expose vm logs in get method exceptions

## [1.2.0] - 2023-01-03

## Added
- `Tracker` for tracking contract transactions

## Fixed
- Allow sending multiple treasure messages in a single block

## [1.1.1] - 2023-01-03

## Fixed
- Treasure balance is now `1m` instead of `1bn` to avoid overflow
- Double message delivery
- Case where multiple messages were sent to non-existent contract

## [1.1.0] - 2023-01-02

## Changed
- Better typings for `Treasure` to include address

## [1.0.1]

🚀 Initial release
