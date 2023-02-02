import { Address } from "ton-core";
import { ContractSystem } from "../emulator/ContractSystem";

export class Logger {
    readonly address: Address
    private _logs: { $seq: number, logs: string }[] = [];

    constructor(address: Address) {
        this.address = address;
    }

    collect() {
        let r = this._logs.map((v) => '===================\n' + 'TX: ' + v.$seq + '\n===================\n' + v.logs).join('\n\n');
        this._logs = [];
        return r;
    }

    reset() {
        this._logs = [];
    }

    track(seq: number, logs: string, system: ContractSystem) {
        this._logs.push({ $seq: seq, logs });
    }
}