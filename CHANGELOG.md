# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.3] - 2023-03-10

## Fixed
- Fix typo in `ton-core` and require it to be `>=0.48.0` (by @dvlkv)

## [3.2.2] - 2023-03-09

## Fixed
- Fix named contract in incoming external messages
- Fix contract address handling in `contract` method

## [3.2.1] - 2023-03-09

## Fixed
- Missing WASM files in npm package

## [3.2.0] - 2023-03-09

## Added
- Named addresses for easier snapshot testing
- Now you can use contract instance as an argument instead of it's address

## [3.1.0] - 2023-03-09

## Changed
- Expose `verbosity` in `ContractSystem` and `ContractExecutor`

## [3.0.0] - 2023-03-09

## Changed
- Rename `testAddress` to `randomAddress`
- Update emulator binaries to the latest build
- Make it browser friendly

## [2.1.1] - 2023-02-02

## Changed
- Fixed `Logger.collect()` types
- Print out VM Logs in `Logger.collect()`

## [2.1.0] - 2023-02-02

## Changed
- Upgraded emulator binary to latest version
- Combine all available logs into a single variable

## [2.0.0] - 2023-02-02

## Added
- `Logger` to collect VM Logs from transactions

## Changed
- `Tracker` now collects transactions instead of plain events for easier debugging
- `events()` renamed to `collect()`
- Changed `type` field in events to `$type` for better readability of jest snapshots

## [1.6.1] - 2023-01-26

## Changed
- Repository name

## [1.6.0] - 2023-01-11

## Added
- `reset` to `Tracker` for better readability in some tests

## [1.5.0] - 2023-01-11

## Added
- `update` to `ContractSystem` to change config, current date or block lt.
- `overwrite` to `ContractSystem` and `ContractExecutor` to replace contract state by address. Useful for mocking.

## [1.4.0] - 2023-01-08

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

???? Initial release
