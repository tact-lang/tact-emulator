# TON Emulator

Emulation toolkit for Smart Contract testing

## Installation

```bash
yarn install ton-emulator ton-core ton-crypto
```

## Usage

```typescript
import { ContractSystem } from 'ton-emulator';

// Contract System is a virtual environment that emulates the TON blockchain
const system = await ContractSystem.create();

// Treasure is a contract that has 1bn of TONs and is a handy entry point for your smart contracts
let treasure = await system.treasure('my-treasure');

// Create a random unknown address that would be treated as unititialized contract
let unknownAddress = testAddress('some-unknown-seed'); // This seed is used to generate deterministic address

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

```

## License

MIT