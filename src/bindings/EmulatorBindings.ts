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
        missing_library: string | null;
    }
    | {
        success: false;
        error: string;
    };
};

export type GetMethodResultInternal = {
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

export type TransactionResult = {
    output:
    | {
        success: true;
        transaction: string;
        shard_account: string;
        actions: string | null;
    }
    | {
        success: false;
        error: string;
    };
    logs: string;
}

type TransactionResultInternal = {
    output:
    | {
        success: true;
        transaction: string;
        shard_account: string;
        vm_log: string;
        actions: string | null;
    }
    | {
        success: false;
        error: string;
        vm_log: string;
    };
    logs: string;
}

export class EmulatorBindings {

    #lock = new AsyncLock();
    #instances = new Map<string, Pointer>();
    #module: any = null;
    #errLogs: string[] = [];

    async runGetMethod(args: GetMethodArgs): Promise<GetMethodResult> {

        return await this.#lock.inLock(async () => {
            try {

                // Get module
                let module = await this.getModule();

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
                let res = await this.invoke(module,
                    '_run_get_method',
                    [
                        JSON.stringify(params),
                        stack.toBoc().toString('base64'),
                        args.config.toBoc().toString('base64')
                    ]
                );
                let resStr: string;
                try {
                    resStr = readFromCString(module, res);
                } finally {
                    module._free(res);
                }

                let txres = JSON.parse(resStr) as GetMethodResultInternal;
                let logs: string = prepareLogs(this.#errLogs, txres.logs, txres.output.success ? txres.output.vm_log : '');

                if (txres.output.success) {
                    return {
                        logs,
                        output: {
                            success: true,
                            stack: txres.output.stack,
                            gas_used: txres.output.gas_used,
                            vm_exit_code: txres.output.vm_exit_code,
                            missing_library: txres.output.missing_library,
                        }
                    };
                } else {
                    return {
                        logs,
                        output: {
                            success: false,
                            error: txres.output.error,
                        }
                    };
                }
            } finally {
                this.#errLogs = [];
            }
        });
    }

    async transaction(args: TransactionArgs): Promise<TransactionResult> {
        return await this.#lock.inLock(async () => {

            try {
                // Get module
                let module = await this.getModule();
                let instance = this.getInstance(module, args.config, args.verbosity);

                // Params
                const params = {
                    utime: args.now,
                    lt: args.lt.toString(),
                    rand_seed: args.randomSeed.toString('hex'),
                    ignore_chksig: false,
                };

                // Execute
                let res = this.invoke(module, '_emulate', [
                    instance,
                    args.libs ? args.libs.toBoc().toString('base64') : 0,
                    args.shardAccount.toBoc().toString('base64'),
                    args.message.toBoc().toString('base64'),
                    JSON.stringify(params)
                ]);
                let resStr: string;
                try {
                    resStr = readFromCString(module, res);
                } finally {
                    module._free(res);
                }

                // Preprocess result
                let txres = JSON.parse(resStr) as TransactionResultInternal;
                let logs: string = prepareLogs(this.#errLogs, txres.logs, txres.output.vm_log);

                // Convert output
                if (txres.output.success) {
                    return {
                        logs,
                        output: {
                            success: true,
                            transaction: txres.output.transaction,
                            shard_account: txres.output.shard_account,
                            actions: txres.output.actions,
                        }
                    };
                } else {
                    return {
                        logs,
                        output: {
                            success: false,
                            error: txres.output.error
                        }
                    };
                }
            } finally {
                this.#errLogs = [];
            }
        });
    }

    private invoke = (module: any, name: string, args: (string | number | Pointer)[]): Pointer => {

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
            return module[name](...mappedArgs);
        } finally {
            allocatedPointers.forEach((pointer) => module._free(pointer));
        }
    }

    private async getModule() {
        if (!this.#module) {
            this.#module = await createModule({
                wasmBinary,
                printErr: (text: string) => this.#errLogs.push(text),
            });
        }
        let module = this.#module;
        return module;
    }

    private getInstance(module: any, config: Cell, verbosity: number): Pointer {

        // Check if instance already exists
        let key = config.hash().toString('hex') + ':' + verbosity;
        if (this.#instances.has(key)) {
            return this.#instances.get(key);
        }

        // Create instance
        let emulator = this.invoke(module, '_create_emulator', [config.toBoc().toString('base64'), verbosity]);
        this.#instances.set(key, emulator);
        return emulator;
    }
}

function prepareLogs(errors: string[], stdout: string, vmLogs: string) {
    let logs = '';

    let debug = errors.filter((v) => v.startsWith('#DEBUG#'));
    let nonDebug = errors.filter((v) => !v.startsWith('#DEBUG#'));

    // Debug Logs
    if (debug.length > 0) {
        logs += '=== DEBUG LOGS ===\n'
        logs += debug.map((v) => v.slice('#DEBUG#: '.length)).join('\n');
        logs += '\n'
        logs += '\n'
    }

    // NOTE: VM Logs are part of stdout in current wasm binary

    // VM log
    // if (vmLogs.length > 0) {
    //     logs += '=== VM LOGS ===\n'
    //     logs += vmLogs;
    //     logs += '\n'
    //     logs += '\n'
    // }

    // Stdout
    if (stdout.length > 0) {
        logs += '=== STDOUT ===\n'
        logs += stdout;
        logs += '\n'
        logs += '\n'
    }

    // Stderr
    if (nonDebug.length > 0) {
        logs += '=== STDERR ===\n'
        logs += nonDebug.join('\n');
        logs += '\n'
        logs += '\n'
    }

    return logs;
}