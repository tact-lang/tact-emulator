import { Address, Cell, Message, Transaction, fromNano } from "ton-core";
import { ContractSystem } from "../emulator/ContractSystem";
import { TrackedEvent, TrackedTransaction } from "./events";
import { TrackedBody, TrackedMessage } from './message';

export class Tracker {
    readonly address: Address;
    private _transactions: TrackedTransaction[] = [];

    constructor(address: Address) {
        this.address = address;
    }

    collect() {
        if (this._transactions.length > 0) {
            let r = this._transactions;
            this._transactions = [];
            return r;
        } else {
            return [];
        }
    }

    reset() {
        this._transactions = [];
    }

    track(seq: number, tx: Transaction, system: ContractSystem) {

        // Some sanity checks
        if (!tx.inMessage) {
            throw Error('Tick-tock transaction is not supported');
        }
        if (tx.description.type !== 'generic') {
            throw Error('Non-generic transaction is not supported');
        }

        let events: TrackedEvent[] = [];

        // Check if deployed
        if ((tx.oldStatus === 'non-existing' || tx.oldStatus === 'uninitialized') && tx.endStatus === 'active') {
            events.push({ $type: 'deploy' });
        }

        if (tx.description.storagePhase) {
            if (tx.description.storagePhase.storageFeesCollected > 0n) {
                events.push({ $type: 'storage-charged', amount: fromNano(tx.description.storagePhase.storageFeesCollected) });
            }
            if (tx.description.storagePhase.statusChange === 'frozen') {
                events.push({ $type: 'frozen' });
            }
            if (tx.description.storagePhase.statusChange === 'deleted') {
                events.push({ $type: 'deleted' });
            }
        }

        // Incoming message
        let msg = convertMessage(tx.inMessage, system);
        if (tx.inMessage.info.type === 'internal' && tx.inMessage.info.bounced) {
            events.push({ $type: 'received-bounced', message: msg });
        } else {
            events.push({ $type: 'received', message: msg });
        }

        // Processing
        if (tx.description.computePhase.type === 'vm') {
            if (tx.description.computePhase.success) {
                events.push({ $type: 'processed', gasUsed: tx.description.computePhase.gasUsed });
            } else {
                let error = system.getContractError(this.address, tx.description.computePhase.exitCode);
                events.push({ $type: 'failed', errorCode: tx.description.computePhase.exitCode, ...(error ? { errorMessage: error } : {}) });
            }
        } else {
            events.push({ $type: 'skipped', reason: tx.description.computePhase.reason });
        }

        // Outgoing messages
        for (let outgoingMessage of tx.outMessages.values()) {
            let msg = convertMessage(outgoingMessage, system);
            if (outgoingMessage.info.type === 'internal' && outgoingMessage.info.bounced) {
                events.push({ $type: 'sent-bounced', message: msg });
            } else {
                events.push({ $type: 'sent', messages: [msg] });
            }
        }

        // Persist events
        this._transactions.push({ $seq: seq, events });
    }
}

function convertMessage(src: Message, system: ContractSystem): TrackedMessage {

    // Internal message
    if (src.info.type === 'internal') {

        let fromRaw = src.info.src.toString({ testOnly: true });
        let knownFrom = system.getContractName(src.info.src);
        let toRaw = src.info.dest.toString({ testOnly: true });
        let knownTo = system.getContractName(src.info.dest);
        let to = knownTo ? '@' + knownTo : toRaw;
        let from = knownFrom ? '@' + knownFrom : fromRaw;

        return {
            type: 'internal',
            from,
            to,
            value: fromNano(src.info.value.coins),
            bounce: src.info.bounce,
            body: convertBody(src.body)
        }
    }

    // External in
    if (src.info.type === 'external-in') {
        let toRaw = src.info.dest.toString({ testOnly: true });
        let knownTo = system.getContractName(src.info.dest);
        let to = knownTo ? '@' + knownTo : toRaw;
        return {
            type: 'external-in',
            to: to,
            body: convertBody(src.body)
        };
    }

    // External out
    if (src.info.type === 'external-out') {
        return {
            type: 'external-out',
            to: src.info.dest ? src.info.dest.toString() : null,
            body: convertBody(src.body)
        };
    }

    throw Error('Invalid message object');
}

function convertBody(src: Cell): TrackedBody {
    let sc = src.beginParse();

    // Empty case
    if (sc.remainingBits === 0 && sc.remainingRefs === 0) {
        return { type: 'empty' };
    }

    // Too short for op
    if (sc.remainingBits <= 32) {
        return { type: 'cell', cell: src.toString() };
    }

    // If text
    let op = sc.loadUint(32);
    if (op === 0) {
        return { type: 'text', text: sc.loadStringTail() };
    }

    // Fallback
    return { type: 'cell', cell: src.toString() };
}