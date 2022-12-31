import { Address, Cell, comment, Contract, ContractProvider, external, Message, openContract, toNano } from "ton-core";
import { EmulatorBindings } from "../bindings/EmulatorBindings";
import { defaultConfig } from "../utils/defaultConfig";
import { Maybe } from "../utils/maybe";
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

    contract(contract: Address) {
        let key = contract.toString({ testOnly: true });
        let executor = this.#contracts.get(key);
        if (!executor) {
            executor = ContractExecutor.createEmpty(contract, this);
            this.#contracts.set(key, executor);
        }
        return executor;
    }

    provider(contract: Contract) {
        return this.#provider(contract.address, contract.init && contract.init.code && contract.init.data ? contract.init : null);
    }

    open<T extends Contract>(src: T) {
        return openContract(src, (params) => this.#provider(params.address, params.init));
    }

    async run() {
        for (let p of this.#pending) {
            if (p.info.type === 'internal') {
                let messages = await this.contract(p.info.dest).receive(p);
                for (let m of messages) {
                    this.#send(m);
                }
            }
        }
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