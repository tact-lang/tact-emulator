import { Account, Address } from "ton-core";

export function createEmptyAccount(address: Address): Account {
    return {
        addr: address,
        storageStats: {
            used: { cells: 0n, bits: 0n, publicCells: 0n },
            lastPaid: 0
        },
        storage: {
            lastTransLt: 0n,
            balance: { coins: 0n },
            state: {
                type: 'uninit'
            }
        }
    };
}