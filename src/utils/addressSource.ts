import { Address, Contract } from "ton-core";

export type AddressSource = Address | Contract;

export function resolveAddress(source: AddressSource): Address {
    if (Address.isAddress(source)) {
        return source;
    }
    if (Address.isAddress(source.address)) {
        return source.address;
    }

    throw new Error("Invalid address source");
}