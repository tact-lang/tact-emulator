import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, DictionaryValue, internal, loadMessageRelaxed, MessageRelaxed, Sender, SendMode, storeMessageRelaxed } from "ton-core";
import { KeyPair, sign } from "ton-crypto";
import { Maybe } from "../utils/maybe";

// Highload Wallet code
const walletCode = 'te6ccgEBCAEAlwABFP8A9KQT9LzyyAsBAgEgAgMCAUgEBQC48oMI1xgg0x/TH9MfAvgju/Jj7UTQ0x/TH9P/0VEyuvKhUUS68qIE+QFUEFX5EPKj9ATR+AB/jhYhgBD0eG+lIJgC0wfUMAH7AJEy4gGz5lsBpMjLH8sfy//J7VQABNAwAgFIBgcAF7s5ztRNDTPzHXC/+AARuMl+1E0NcLH4';

const DictionaryMessageValue: DictionaryValue<{ sendMode: SendMode, message: MessageRelaxed }> = {
    serialize(src, builder) {
        builder.storeUint(src.sendMode, 8);
        builder.storeRef(beginCell().store(storeMessageRelaxed(src.message)));
    },
    parse(src) {
        let sendMode = src.loadUint(8);
        let message = loadMessageRelaxed(src.loadRef().beginParse());
        return { sendMode, message };
    },
}

export class Treasure implements Contract {
    static create(workchain: number, keypair: KeyPair) {
        return new Treasure(workchain, keypair);
    }

    readonly address: Address;
    readonly init: { code: Cell, data: Cell };
    readonly keypair: KeyPair;

    constructor(workchain: number, keypair: KeyPair) {
        let code = Cell.fromBoc(Buffer.from(walletCode, 'base64'))[0];
        let data = beginCell()
            .storeUint(0, 32) // Seqno
            .storeUint(0, 32) // Wallet Id
            .storeBuffer(keypair.publicKey)
            .endCell();
        this.address = contractAddress(workchain, { code, data });
        this.init = { code, data };
        this.keypair = keypair;
    }

    async getSeqno(provider: ContractProvider): Promise<number> {
        let state = await provider.getState();
        if (state.state.type === 'active') {
            let res = await provider.get('seqno', []);
            return res.stack.readNumber();
        } else {
            return 0;
        }
    }

    async send(provider: ContractProvider, src: MessageRelaxed[], sendMode?: SendMode) {
        let seqno = await this.getSeqno(provider);
        let transfer = this.createTransfer({
            seqno,
            sendMode: sendMode,
            messages: src
        });
        provider.external(transfer);
    }

    sender(provider: ContractProvider): Sender {
        return {
            send: async (args) => {
                let seqno = await this.getSeqno(provider);
                let transfer = this.createTransfer({
                    seqno,
                    sendMode: args.sendMode,
                    messages: [internal({
                        to: args.to,
                        value: args.value,
                        init: args.init,
                        body: args.body,
                        bounce: args.bounce
                    })]
                });
                provider.external(transfer);
            }
        };
    }

    /**
     * Create signed transfer
     */
    createTransfer(args: {
        seqno: number,
        messages: MessageRelaxed[]
        sendMode?: Maybe<SendMode>,
    }) {

        // Resolve send mode
        let sendMode = SendMode.PAY_GAS_SEPARATLY;
        if (args.sendMode !== null && args.sendMode !== undefined) {
            sendMode = args.sendMode;
        }

        // Resolve messages
        if (args.messages.length > 255) {
            throw new Error('Maximum number of messages is 255');
        }
        let messages = Dictionary.empty(Dictionary.Keys.Int(16), DictionaryMessageValue);
        let index = 0;
        for (let m of args.messages) {
            messages.set(index++, { sendMode, message: m });
        }

        // Create message
        let signingMessage = beginCell()
            .storeUint(0, 32) // Wallet Id
            .storeUint(4294967295, 32) // Timeout
            .storeUint(args.seqno, 32) // Seqno
            .storeDict(messages);

        // Sign message
        let signature = sign(signingMessage.endCell().hash(), this.keypair.secretKey);

        // Body
        const body = beginCell()
            .storeBuffer(signature)
            .storeBuilder(signingMessage)
            .endCell();

        return body;
    }
}