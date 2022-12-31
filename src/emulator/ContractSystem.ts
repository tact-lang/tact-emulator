import { Address, Cell, Message, MessageRelaxed } from "ton-core";
import { EmulatorBindings } from "../bindings/EmulatorBindings";
import { defaultConfig } from "../utils/defaultConfig";
import { ContractExecutor } from "./ContractExecutor";

export class ContractSystem {

    static async create(args?: { config?: Cell, now?: number }) {
        return new ContractSystem(args);
    }

    #config: Cell;
    #now: number;
    #lt: bigint;
    #bindings: EmulatorBindings;
    #contracts: Map<string, ContractExecutor>;
    #pending: Message[] = [];

    get config() {
        return this.#config;
    }

    get now() {
        return this.#now;
    }

    get bindings() {
        return this.#bindings;
    }

    get lt() {
        return this.#lt;
    }

    private constructor(args?: { config?: Cell, now?: number }) {
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
        this.#lt = 0n;
        this.#bindings = new EmulatorBindings();
        this.#contracts = new Map();
    }

    async register(executor: ContractExecutor) {
        let key = executor.address.toString({ testOnly: true });
        if (this.#contracts.has(key)) {
            throw new Error(`Contract ${key} already exists`);
        }
        this.#contracts.set(key, executor);
    }

    async send(from: Address, msg: MessageRelaxed) {

        // Un-relax internal message
        if (msg.info.type === 'internal') {
            let converted: Message = {
                info: {
                    type: 'internal',
                    src: from,
                    dest: msg.info.dest,
                    value: msg.info.value,
                    bounce: msg.info.bounce,
                    bounced: false,
                    createdLt: 0n,
                    createdAt: this.#now,
                    ihrDisabled: msg.info.ihrDisabled,
                    ihrFee: msg.info.ihrFee,
                    forwardFee: msg.info.forwardFee
                },
                init: msg.init,
                body: msg.body
            }
            this.#pending.push(converted);
            return;
        }

        // Un-relax external message
        throw new Error('Not implemented');
    }

    async tick() {
        for (let p of this.#pending) {
            if (p.info.type === 'internal') {
                let key = p.info.dest.toString({ testOnly: true });
                let executor = this.#contracts.get(key);
                console.warn(`[ContractSystem] Tick: ${key} ${executor ? 'found' : 'not found'}`)
                if (executor) {
                    await executor.receive(p);
                }
            }
        }
    }
}