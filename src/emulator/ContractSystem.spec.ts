import { ContractSystem } from "./ContractSystem";
import { randomAddress } from "../utils/randomAddress";
import { beginCell, toNano } from "ton-core";

describe('ContractSystem', () => {
    it('should send messages', async () => {

        // Create contract system and a wallet
        let system = await ContractSystem.create();
        let treasure = system.treasure('treasure');
        let unknownAddress = randomAddress('unknown');
        system.name({ address: unknownAddress }, 'unknown');
        let tracker = system.track(treasure.address);
        let logs = system.log(treasure.address);

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
        expect(tracker.collect()).toMatchSnapshot();
        console.warn(logs.collect());
    });
});