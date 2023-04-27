import { Address, Cell, comment, ComputeError, Contract, ContractABI, ContractProvider, external, Message, openContract, toNano, Transaction } from "ton-core";
import { EmulatorBindings } from "../bindings/EmulatorBindings";
import { Tracker } from "../events/tracker";
import { Logger } from '../logger/logger';
import { TreasureContract } from "../treasure/Treasure";
import { AddressSource, resolveAddress } from "../utils/addressSource";
import { defaultConfig } from "../utils/defaultConfig";
import { Maybe } from "../utils/maybe";
import { testKey } from "../utils/testKey";
import { ContractExecutor } from "./ContractExecutor";
import { Verbosity } from "./Verbosity";
import { TypeRegistry } from "ton-abi";

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
    #abiTypes: Map<string, TypeRegistry>;
    #pending: Message[] = [];
    #trackers = new Map<string, Tracker[]>();
    #loggers = new Map<string, Logger[]>();
    #verbosity: Verbosity = Verbosity.ERROR;

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

    /**
     * Returns current verbosity level
     */
    get globalVerbosity() {
        return this.#verbosity;
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
        this.#abiTypes = new Map();
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

        // Update wallet balance and name
        let executor = this.contract(treasure.address);
        executor.balance = toNano(1000000);
        executor.name = `treasure(${seed})`;

        // Return sender
        return wallet.sender(treasure.address);
    }

    /**
     * Override contract state
     * @param address 
     * @param code 
     * @param data 
     * @param balance
     */
    override(address: Address, code: Cell, data: Cell, balance: bigint) {
        this.contract(address).override(code, data, balance);
    }

    /**
     * Update system state
     */
    update(updates: { now?: Maybe<number>, lt?: Maybe<bigint>, config?: Maybe<Cell> }) {
        if (updates.now !== null && updates.now !== undefined) {
            this.#now = updates.now;
        }
        if (updates.config !== null && updates.config !== undefined) {
            this.#config = updates.config;
        }
        if (updates.lt !== null && updates.lt !== undefined) {
            this.#lt = updates.lt;
        }
    }

    /**
     * Get empty Contract Executor for a contract
     * @param contract contract address or contract instance
     * @returns contract executor
     */
    contract(contract: AddressSource) {
        let address = resolveAddress(contract);
        let key = address.toString({ testOnly: true });
        let executor = this.#contracts.get(key);
        if (!executor) {
            executor = ContractExecutor.createEmpty(address, this);
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
            let registry = new TypeRegistry();
            try {
                if (src.abi.types) {
                    for (let i of src.abi.types) {
                        try {
                            registry.register(i);
                        } catch (e) {
                            // Ignore
                        }
                    }
                }
            } catch (e) {
                // Ignore
            }
            this.#abiTypes.set(src.address.toString({ testOnly: true }), registry);
        }

        // Open contract
        return openContract(src, (params) => this.#provider(params.address, params.init));
    }

    /**
     * Run until stop
     */
    async run() {
        let result: Transaction[] = [];
        while (this.#pending.length > 0) {
            let p = this.#pending.shift()!; // TODO: Better (random?) way to select pending message

            if (p.info.type === 'internal' || p.info.type === 'external-in') {

                // Execute
                let tx = await this.contract(p.info.dest).receive(p);
                let key = p.info.dest.toString({ testOnly: true });

                // Track
                let t = this.#trackers.get(key);
                if (t) {
                    for (let tr of t) {
                        tr.track(tx.seq, tx.tx, this);
                    }
                }

                // Logs
                let l = this.#loggers.get(key);
                if (l) {
                    for (let tr of l) {
                        tr.track(tx.seq, tx.logs, this);
                    }
                }

                // Add to result
                result.push(tx.tx);

                // Add to pending
                for (let m of tx.tx.outMessages.values()) {
                    this.#send(m);
                }
            }
        }
        this.update({ now: this.now + 16 });
        return result;
    }

    /**
     * Create a tracker for a contract
     * @param address contract or it's address
     */
    track(contract: AddressSource) {
        let address = resolveAddress(contract);
        let tracker = new Tracker(address);
        let key = address.toString({ testOnly: true });
        let trackers = this.#trackers.get(key);
        if (!trackers) {
            trackers = [];
            this.#trackers.set(key, trackers);
        }
        trackers.push(tracker);
        return tracker;
    }

    /**
     * Create a logger for a contract
     * @param address contract or it's address
     */
    log(contract: AddressSource) {
        let address = resolveAddress(contract);
        let logger = new Logger(address);
        let key = address.toString({ testOnly: true });
        let loggers = this.#loggers.get(key);
        if (!loggers) {
            loggers = [];
            this.#loggers.set(key, loggers);
        }
        loggers.push(logger);
        return logger;
    }

    /**
     * Sets contract name
     * @param contract contract or it's address
     * @param name optional name
     */
    name(contract: AddressSource, name: string | null) {
        this.contract(contract).name = name;
    }

    /**
     * Verbose level for a contract
     * @param contract contract or it's address
     * @param level verbosity level
     */
    verbosity(contract: AddressSource, level: Verbosity) {
        this.contract(contract).verbosity = level;
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
                        throw new ComputeError(abi.errors[res.exitCode].message, res.exitCode, { logs: res.logs });
                    } else {
                        throw new ComputeError('Exit code: ' + res.exitCode, res.exitCode, { logs: res.logs });
                    }
                }
                return { stack: res.stack!, gasUsed: res.gasUsed, logs: res.logs };
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

    //
    // Utility
    //

    tryParseContractMessage(address: Address, src: Cell) {
        try {
            let b = this.#abiTypes.get(address.toString({ testOnly: true }));
            if (!b) {
                return undefined;
            }
            let sc = src.beginParse();
            return b.parse(sc);
        } catch (e) {
            return undefined;
        }
    }

    getContractError(address: Address, code: number) {
        let b = this.#abis.get(address.toString({ testOnly: true }));
        if (!b) {
            return null;
        }
        if (b.errors && b.errors[code]) {
            return b.errors[code].message;
        } else {
            return null;
        }
    }

    getContractName(address: Address): string | null {
        let ex = this.#contracts.get(address.toString({ testOnly: true }));
        if (!ex) {
            return null;
        }
        return ex.name;
    }
}