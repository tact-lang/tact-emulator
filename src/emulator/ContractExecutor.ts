import { AsyncLock } from "teslabot";
import { Account, Address, beginCell, Cell, loadShardAccount, loadTransaction, Message, parseTuple, storeMessage, storeShardAccount, TupleItem, TupleReader } from "ton-core";
import { createAccount } from "../utils/createAccount";
import { createEmptyAccount } from "../utils/createEmptyAccount";
import { getMethodId } from "../utils/getMethodId";
import { ContractSystem } from "./ContractSystem";

export class ContractExecutor {

    static async createEmpty(address: Address, system: ContractSystem) {
        return new ContractExecutor(createEmptyAccount(address), system);
    }

    static async create(args: { code: Cell, data: Cell, address?: Address, balance?: bigint }, system: ContractSystem) {
        return new ContractExecutor(createAccount(args), system);
    }

    readonly system: ContractSystem;
    readonly address: Address;
    #state: Account;
    #balance: bigint;
    #last: { lt: bigint, hash: bigint } = { lt: 0n, hash: 0n };
    #lock = new AsyncLock();

    constructor(state: Account, system: ContractSystem) {
        this.system = system;
        this.address = state.addr;
        this.#state = state;
        this.#balance = this.#state.storage.balance.coins;
        this.system.register(this);
    }

    get = async (method: string | number, stack?: TupleItem[]) => {
        return await this.#lock.inLock(async () => {

            // Check contract state
            if (this.#state.storage.state.type !== 'active') {
                throw new Error('Contract is not active');
            }
            if (!this.#state.storage.state.state.code) {
                throw new Error('Contract has no code');
            }
            if (!this.#state.storage.state.state.data) {
                throw new Error('Contract has no data');
            }

            // Resolve method id
            let methodId: number;
            if (typeof method === 'string') {
                methodId = getMethodId(method);
            } else {
                methodId = method;
            }

            let result = await this.system.bindings.runGetMethod({
                verbosity: 0,
                address: this.address,
                code: this.#state.storage.state.state.code,
                data: this.#state.storage.state.state.data,
                balance: this.#balance,
                unixtime: this.system.now,
                randomSeed: Buffer.alloc(32),
                gasLimit: 1000000000n,
                methodId: methodId,
                args: stack || [],
                config: this.system.config
            });

            // Check result
            if (!result.output.success) {
                return {
                    success: false,
                    error: result.output.error
                };
            }

            // Parse result
            let resultStack = parseTuple(Cell.fromBoc(Buffer.from(result.output.stack, 'base64'))[0]);
            return {
                gasUsed: BigInt(result.output.gas_used),
                stack: new TupleReader(resultStack)
            };
        });
    }

    async receive(msg: Message) {
        return await this.#lock.inLock(async () => {
            if (msg.info.type !== 'internal' && msg.info.type !== 'external-in') {
                throw new Error(`Unsupported message type: ${msg.info.type}`);
            }

            // Execute transaction
            let res = await this.system.bindings.transaction({
                config: this.system.config,
                libs: null,
                verbosity: 3,
                shardAccount: beginCell().store(storeShardAccount({ account: this.#state, lastTransactionHash: this.#last.hash, lastTransactionLt: this.#last.lt })).endCell(),
                message: beginCell().store(storeMessage(msg)).endCell(),
                now: this.system.now,
                lt: this.system.lt,
                randomSeed: Buffer.alloc(32),
            });

            // Apply changes
            if (res.output.success) {
                let shard = loadShardAccount(Cell.fromBoc(Buffer.from(res.output.shard_account, 'base64'))[0].beginParse());
                this.#state = shard.account!;
                this.#last = { lt: shard.lastTransactionLt, hash: shard.lastTransactionHash };

                // Load transaction
                let tx = loadTransaction(Cell.fromBoc(Buffer.from(res.output.transaction, 'base64'))[0].beginParse());
                for (let message of tx.outMessages.values()) {
                    this.system.sendInternal(message);
                }
            }
        });
    }
}