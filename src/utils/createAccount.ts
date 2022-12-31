import { Account, Address, Cell, contractAddress } from "ton-core";

export function createAccount(args: { code: Cell, data: Cell, workchain?: number, address?: Address, balance?: bigint }): Account {

    let workchain: number;
    if (args.workchain !== undefined && args.workchain !== null) {
        workchain = args.workchain;
    } else {
        workchain = 0;
    }

    let address: Address;
    if (args.address) {
        address = args.address;
    } else {
        address = contractAddress(workchain, { code: args.code, data: args.data });
    }

    let balance: bigint;
    if (args.balance) {
        balance = args.balance;
    } else {
        balance = 0n;
    }

    return {
        addr: address,
        storageStats: {
            used: { cells: 0n, bits: 0n, publicCells: 0n },
            lastPaid: 0
        },
        storage: {
            lastTransLt: 0n,
            balance: { coins: balance },
            state: {
                type: 'active',
                state: {
                    code: args.code,
                    data: args.data
                }
            }
        }
    };
}