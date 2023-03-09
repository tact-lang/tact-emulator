# TON Emulator

Emulation toolkit for TON Smart Contracts

## Installation

```bash
yarn add @tact-lang/emulator ton-core ton-crypto
```

## Usage

```typescript
import { ContractSystem, randomAddress } from '@tact-lang/emulator';
import { WalletContractV4 } from 'ton';

// Contract System is a virtual environment that emulates the TON blockchain
const system = await ContractSystem.create();

// Treasure is a contract that has 1m of TONs and is a handy entry point for your smart contracts
let treasure = await system.treasure('my-treasure');

// Track contract transactions and events
let tracker = system.track(treasure.address);

// Logger to collect VM logs from a contract
let logger = system.log(treasure.address);

// Create a random unknown address that would be treated as unititialized contract
let unknownAddress = randomAddress('some-unknown-seed'); // This seed is used to generate deterministic address

// Send an empty message to the unknown address
await treasure.send({
    to: unknownAddress,
    bounce: true,
});

// Run a block
let transactions = await system.run();
console.warn(inspect(transactions, false, 10000));

// Open a contract
let wallet = system.open(WalletContractV4.create({ workchain: 0, publicKey: <some-test-key> }));

// Show contract logs
console.warn(logger.collect());

// Test events and transactions
expect(tracker.collect()).toMatchSnapshot();

```

## License

MIT