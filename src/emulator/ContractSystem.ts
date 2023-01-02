import { Address, Cell, comment, ComputeError, Contract, ContractABI, ContractProvider, external, Message, openContract, toNano, Transaction } from "ton-core";
import { EmulatorBindings } from "../bindings/EmulatorBindings";
import { Treasure, TreasureContract } from "../treasure/Treasure";
import { defaultConfig } from "../utils/defaultConfig";
import { Maybe } from "../utils/maybe";
import { testKey } from "../utils/testKey";
import { ContractExecutor } from "./ContractExecutor";

/**
 * Contract system is a container for contracts that interact with each other
 */
export class ContractSystem {

    static async create(args?: { config?: Cell, now?: number }) {
        return new ContractSystem(args);
    }

    #config: Cell;
    #now: number;
    #lt: bigint;
    #bindings: EmulatorBindings;
    #contracts: Map<string, ContractExecutor>;
    #abis: Map<string, ContractABI>;
    #pending: Message[] = [];

    /**
     * Get current network config
     */
    get config() {
        return this.#config;
    }

    /**
     * Current contract system time
     */
    get now() {
        return this.#now;
    }

    /**
     * VM bindings for contract system
     */
    get bindings() {
        return this.#bindings;
    }

    /**
     * LT of a contract system
     */
    get lt() {
        return this.#lt;
    }

    private constructor(args?: { config?: Cell, now?: number, lt?: bigint }) {
        if (args && args.config) {
            this.#config = args.config;
        } else {
            this.#config = defaultConfig;
        }
        if (args && args.now) {
            this.#now = args.now;
        } else {
            this.#now = Math.floor(Date.now() / 1000);
        }
        if (args && args.lt) {
            this.#lt = args.lt;
        } else {
            this.#lt = 0n;
        }
        this.#bindings = new EmulatorBindings();
        this.#contracts = new Map();
        this.#abis = new Map();
    }

    /**
     * Open a treasure with a 1bn of TONs
     * @param seed random string that identifies a treasure
     * @param workchain optional workchain id
     * @returns treasure wallet
     */
    treasure(seed: string, workchain: number = 0) {

        // Create a treasure wallet
        let key = testKey(seed);
        let treasure = TreasureContract.create(workchain, key);
        let wallet = this.open(treasure);

        // Update wallet balance
        this.contract(treasure.address).balance = toNano(1000000000000);

        // Return sender
        return wallet.sender(treasure.address);
    }

    /**
     * Get empty Contract Executor for a contract
     * @param contract contract address
     * @returns contract executor
     */
    contract(contract: Address) {
        let key = contract.toString({ testOnly: true });
        let executor = this.#contracts.get(key);
        if (!executor) {
            executor = ContractExecutor.createEmpty(contract, this);
            this.#contracts.set(key, executor);
        }
        return executor;
    }

    /**
     * Creates a provider for contract
     * @param contract contract address
     * @returns contract provider
     */
    provider(contract: Contract) {
        return this.#provider(contract.address, contract.init && contract.init.code && contract.init.data ? contract.init : null);
    }

    /**
     * Open a contract
     * @param src contract
     * @returns opened contract
     */
    open<T extends Contract>(src: T) {

        // Register ABI
        if (src.abi) {
            this.#abis.set(src.address.toString({ testOnly: true }), src.abi);
        }

        // Open contract
        return openContract(src, (params) => this.#provider(params.address, params.init));
    }

    /**
     * Run until stop
     */
    async run() {
        let result: Transaction[] = [];
        for (let p of this.#pending) {
            if (p.info.type === 'internal' || p.info.type === 'external-in') {
                let tx = await this.contract(p.info.dest).receive(p);
                result.push(tx);
                for (let m of tx.outMessages.values()) {
                    this.#send(m);
                }
            }
        }
        return result;
    }

    /**
     * Send external message
     * @param message 
     */
    send(message: Message) {
        if (message.info.type !== 'external-in') {
            throw Error('Message is not external-in');
        }
        this.#send(message);
    }

    #send = (src: Message) => {
        if (src.info.type !== 'external-out') {
            this.#pending.push(src);
        }
    }

    #provider(address: Address, init: { code: Cell, data: Cell } | null): ContractProvider {
        let executor = this.contract(address);
        return {
            getState: async () => {
                return executor.state;
            },
            get: async (name, args) => {
                let res = await executor.get(name, args);
                if (!res.success) {
                    throw Error(res.error);
                }
                if (res.exitCode !== 0 && res.exitCode !== 1) {
                    let abi = this.#abis.get(address.toString({ testOnly: true }));
                    if (abi && abi.errors && abi.errors[res.exitCode]) {
                        throw new ComputeError(abi.errors[res.exitCode].message, res.exitCode);
                    } else {
                        throw new ComputeError('Exit code: ' + res.exitCode, res.exitCode);
                    }
                }
                return { stack: res.stack! };
            },
            internal: async (via, message) => {

                // Resolve if init needed
                let state = executor.state;
                let neededInit: { code?: Maybe<Cell>, data?: Maybe<Cell> } | undefined = undefined;
                if (state.state.type !== 'active' && init) {
                    neededInit = init;
                }

                // Resolve bounce
                let bounce = true;
                if (message.bounce !== null && message.bounce !== undefined) {
                    bounce = message.bounce;
                }

                // Resolve value
                let value: bigint;
                if (typeof message.value === 'string') {
                    value = toNano(message.value);
                } else {
                    value = message.value;
                }

                // Resolve body
                let body: Cell | null = null;
                if (typeof message.body === 'string') {
                    body = comment(message.body);
                } else if (message.body) {
                    body = message.body;
                }

                // Send internal message
                await via.send({
                    to: address,
                    value,
                    bounce,
                    sendMode: message.sendMode,
                    init: neededInit,
                    body
                });
            },
            external: async (msg) => {

                // Resolve if init needed
                let state = executor.state;
                let neededInit: { code?: Maybe<Cell>, data?: Maybe<Cell> } | undefined = undefined;
                if (state.state.type !== 'active' && init) {
                    neededInit = init;
                }

                // Send message
                this.#send(external({
                    to: address,
                    init: neededInit,
                    body: msg
                }));
            }
        }
    }
}