import { AsyncLock } from "teslabot";
import { Address, beginCell, Cell, contractAddress, crc16, serializeTuple, storeShardAccount, TupleItem } from "ton-core";

// WASM bindings
const createModule: (options: { wasmBinary: Buffer; }) => Promise<any> = require(__dirname + '/../../wasm/emulator-emscripten');
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

export class EmulatorBindings {

    #lock = new AsyncLock();
    #module: any = null;

    async runGetMethod(code: Cell, data: Cell, name: number, args: TupleItem[]) {
        let config = Cell.EMPTY;
        let stack = serializeTuple(args);
        let address = contractAddress(0, { code, data });
        const params /*: GetMethodInternalParams */ = {
            code: code.toBoc().toString('base64'),
            data: data.toBoc().toString('base64'),
            verbosity: 'INFO',
            libs: '',
            address: address.toRawString(),
            unixtime: Math.floor(Date.now() / 1000),
            balance: 0n.toString(),
            rand_seed: new Uint8Array(32),
            gas_limit: 0,
            method_id: name,
        };
        console.warn(params);

        return await this.#execute('_run_get_method', [JSON.stringify(params), stack.toBoc().toString('base64'), config.toBoc().toString('base64')]);
        // return await this.#lock.inLock(async () => {

        //     // Load module
        //     if (!this.#module) {
        //         this.#module = await createModule({ wasmBinary });
        //     }
        //     let module = this.#module;

        //     // let account = storeShardAccount({
        //     //     lastTransactionHash: 0n,
        //     //     lastTransactionLt: 0n,
        //     //     account: {
        //     //         addr: Address.parse(''),
        //     //         storageStats: {
        //     //             used: {
        //     //                 bits: 0n,
        //     //                 cells: 0n,
        //     //                 publicCells: 0n,
        //     //             },
        //     //             lastPaid: 0,
        //     //             duePayment: null,
        //     //         },
        //     //         storage: {
        //     //             lastTransLt: 0n,
        //     //             balance: {
        //     //                 coins: 0n,
        //     //                 other: null,
        //     //             },
        //     //             state: {
        //     //                 type: "active",
        //     //                 state: {
        //     //                     splitDepth: null,
        //     //                     special: null,
        //     //                     code,
        //     //                     data,
        //     //                     libraries: null,
        //     //                 }
        //     //             },
        //     //         },
        //     //     }
        //     // });
        //     // beginCell().store(account).endCell();

        //     const params /*: GetMethodInternalParams */ = {
        //         code: code.toBoc().toString(),
        //         data: data.toBoc().toString(),
        //         verbosity: extraParams.verbosity ?? EmulatorVerbosityLevel.INFO,
        //         libs: '',
        //         address: (extraParams.address ?? ZERO_ADDRESS).toString('raw'),
        //         unixtime: Math.floor(Date.now() / 1000),
        //         balance: 0n,
        //         rand_seed: new Uint8Array(32),
        //         gas_limit: 0,
        //         method_id: typeof method === 'number' ? method : (crc16xmodem(method) & 0xffff) | 0x10000,
        //     };

        //     console.warn(module);
        // });
    }

    #execute = async (name: string, args: string[]) => {
        return await this.#lock.inLock(async () => {

            // Load module
            if (!this.#module) {
                this.#module = await createModule({ wasmBinary });
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
                let mappedArgs = args.map((arg) => trackPointer(writeToCString(module, arg)));
                let res = trackPointer(module[name](...mappedArgs));
                return readFromCString(module, res);
            } finally {
                allocatedPointers.forEach((pointer) => module._free(pointer));
            }
        });
    }
}