import { AsyncLock } from "teslabot";
import { Address, Cell, serializeTuple, TupleItem } from "ton-core";

// WASM bindings
const createModule: (options: any) => Promise<any> = require(__dirname + '/../../wasm/emulator-emscripten');
const wasmBinaryPack = require(__dirname + '/../../wasm/emulator-emscripten.wasm.js');
const wasmBinary = Buffer.from(wasmBinaryPack.wasmBinary, 'base64');

// Helper functions
type Pointer = unknown;
const writeToCString = (mod: any, data: string): Pointer => {
    const len = mod.lengthBytesUTF8(data) + 1;
    const ptr = mod._malloc(len);
    mod.stringToUTF8(data, ptr, len);
    return ptr;
};
const readFromCString = (mod: any, pointer: Pointer): string => mod.UTF8ToString(pointer);

// const defaultConfig = Cell.fromBoc(Buffer.from('"te6cckECcQEABW4AAgPNQAgBAgHOBQIBAUgDASsSY2CBqmNgiLIAAQABEAAAAAAAAADABACc0HOOgSeKR9NK7QvAShWEclTKIiT7KeN5YCq4i54HKwIneLCELpUQAAAAAAAAABUmyLDUSVB+cjV8cixVpAvtnckT5vUz9dfl85TM5VefAQFIBgErEmNgeqJjYIGqAAEAARAAAAAAAAAAwAcAnNBzjoEninFgk152x5e4P2obeffAtRXXbENLO/wHPAXk6o16jdMSEAAAAAAAAADXRh/1XRFatoIzSUoCBNvmoi70eMphk2KbS9TlOhR0JwIBIC8JAgEgHQoCASAYCwIBIBMMAQFYDQEBwA4CAWIQDwBBv2ZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZnAgFiEhEAQb6PZMavv/PdENi6Zwd5CslnDVQPN6lEiwM3uqalqSrKyAAD31ACASAWFAEBIBUAPtcBAwAAA+gAAD6AAAAAAwAAAAgAAAAEACAAAAAgAAABASAXACTCAQAAAPoAAAD6AAAVfAAAAAcCAUgbGQEBIBoAQuoAAAAAAA9CQAAAAAAD6AAAAAAAAYagAAAAAYAAVVVVVQEBIBwAQuoAAAAAAJiWgAAAAAAnEAAAAAAAD0JAAAAAAYAAVVVVVQIBICceAgEgIh8CASAgIAEBICEAUF3DAAIAAAAIAAAAEAAAwwABhqAAB6EgAA9CQMMAAAPoAAATiAAAJxACASAlIwEBICQAlNEAAAAAAAAD6AAAAAAAD0JA3gAAAAAD6AAAAAAAAAAPQkAAAAAAAA9CQAAAAAAAACcQAAAAAACYloAAAAAABfXhAAAAAAA7msoAAQEgJgCU0QAAAAAAAAPoAAAAAACYloDeAAAAACcQAAAAAAAAAA9CQAAAAAAAmJaAAAAAAAAAJxAAAAAAAJiWgAAAAAAF9eEAAAAAADuaygACASAqKAEBSCkATdBmAAAAAAAAAAAAAAAAgAAAAAAAAPoAAAAAAAAB9AAAAAAAA9CQQAIBIC0rAQEgLAAxYJGE5yoAByOG8m/BAABgkYTnKgAAADAACAEBIC4ADAPoAGQAAQIBIGMwAgEgPTECASA3MgIBIDUzAQEgNAAgAAAHCAAABdwAAAJYAAABLAEBIDYAFGtGVT8QBDuaygACASA6OAEBIDkAFRpRdIdugAEBIB9IAQEgOwEBwDwAt9BTMattNoAAkHAAQx3ZAu+VowKbp+ICJmhD5GEorXlHxC3H6wE6MfljTuTBTbWk4gs+NaYDgOTAD+ixkmRV+9aOm8QUXzkDPYIEZQAAAAAP////+AAAAAAAAAAEAgEgTD4CASBDPwEBIEACApFCQQAqNgQHBAIATEtAATEtAAAAAAIAAAPoACo2AgMCAgAPQkAAmJaAAAAAAQAAAfQBASBEAgEgR0UCCbf///BgRl8AAfwCAtlKSAIBYklTAgEgXV0CASBYSwIBzmBgAgEgYU0BASBOAgPNQFBPAAOooAIBIFhRAgEgVVICASBUUwAB1AIBSGBgAgEgV1YCASBbWwIBIFtdAgEgX1kCASBcWgIBIF1bAgEgYGACASBeXQABSAABWAIB1GBgAAEgAQEgYgAaxAAAAAEAAAAAAAAALgIBIGlkAQH0ZQEBwGYCASBoZwAVv////7y9GpSiABAAFb4AAAO8s2cNwVVQAgEgbGoBAUhrAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIBIG9tAQEgbgBAMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMBASBwAEBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVaNaat0="', 'base64'))[0];

export type GetMethodArgs = {
    verbosity: number,
    address: Address,
    code: Cell,
    data: Cell,
    balance: bigint,
    unixtime: number,
    randomSeed: Buffer,
    gasLimit: bigint,
    methodId: number,
    args: TupleItem[],
    config: Cell,
};

export type GetMethodResult = {
    logs: string;
    output:
    | {
        success: true;
        stack: string;
        gas_used: string;
        vm_exit_code: number;
        vm_log: string;
        missing_library: string | null;
    }
    | {
        success: false;
        error: string;
    };
};

export type TransactionArgs = {
    config: Cell,
    libs: Cell | null,
    verbosity: number,
    shardAccount: Cell,
    message: Cell,
    now: number;
    lt: bigint;
    randomSeed: Buffer;
};

export class EmulatorBindings {

    #lock = new AsyncLock();
    #module: any = null;

    async runGetMethod(args: GetMethodArgs) {

        // Serialize args
        let stack = serializeTuple(args.args);

        // Prepare params
        const params /*: GetMethodInternalParams */ = {
            code: args.code.toBoc().toString('base64'),
            data: args.data.toBoc().toString('base64'),
            verbosity: args.verbosity,
            libs: '',
            address: args.address.toRawString(),
            unixtime: args.unixtime,
            balance: args.balance.toString(),
            rand_seed: args.randomSeed.toString('hex'),
            gas_limit: args.gasLimit.toString(),
            method_id: args.methodId,
        };

        // Execute
        let res = await this.#execute('_run_get_method', [JSON.stringify(params), stack.toBoc().toString('base64'), args.config.toBoc().toString('base64')]);

        return JSON.parse(res) as GetMethodResult;
    }

    async transaction(args: TransactionArgs) {
        const params = {
            utime: args.now,
            lt: args.lt.toString(),
            rand_seed: args.randomSeed.toString('hex'),
            ignore_chksig: false,
        };

        return await this.#execute('_emulate', [
            args.config.toBoc().toString('base64'),
            args.libs ? args.libs.toBoc().toString('base64') : 0,
            args.verbosity,
            args.shardAccount.toBoc().toString('base64'),
            args.message.toBoc().toString('base64'),
            JSON.stringify(params)
        ]);
    }

    #execute = async (name: string, args: (string | number)[]) => {
        return await this.#lock.inLock(async () => {

            // Load module
            if (!this.#module) {
                this.#module = await createModule({
                    wasmBinary,
                    printErr: (text: string) => console.warn(text),
                });
            }
            let module = this.#module;

            // Pointer tracking
            const allocatedPointers: Pointer[] = [];
            const trackPointer = (pointer: Pointer): Pointer => {
                allocatedPointers.push(pointer);
                return pointer;
            };

            // Execute 
            try {
                let mappedArgs = args.map((arg) => {
                    if (typeof arg === 'string') {
                        return trackPointer(writeToCString(module, arg))
                    } else {
                        return arg;
                    }
                });
                let res = trackPointer(module[name](...mappedArgs));
                return readFromCString(module, res);
            } finally {
                allocatedPointers.forEach((pointer) => module._free(pointer));
            }
        });
    }
}