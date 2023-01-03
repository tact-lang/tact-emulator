import { ContractSystem } from "./ContractSystem";
import { testAddress } from "../utils/testAddress";
import { inspect } from "util";
import { beginCell, toNano } from "ton-core";

describe('ContractSystem', () => {
    it('should send messages', async () => {

        // Create contract system and a wallet
        let system = await ContractSystem.create();
        let treasure = system.treasure('treasure');
        let unknownAddress = testAddress('unknown');
        let tracker = system.track(treasure.address);

        // Send a message
        await treasure.send({
            to: unknownAddress,
            bounce: true,
            value: toNano(1),
        });
        await system.run();

        // Send second time
        await treasure.send({
            to: unknownAddress,
            bounce: true,
            value: toNano(1),
            body: beginCell().storeUint(0, 32).storeStringTail('Hello world!').endCell()
        });
        await system.run();

        // Events
        expect(tracker.events()).toMatchSnapshot();
    });
});