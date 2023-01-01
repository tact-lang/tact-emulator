import { ContractSystem } from "./ContractSystem";
import { testAddress } from "../utils/testAddress";
import { inspect } from "util";
import { toNano } from "ton-core";

describe('ContractSystem', () => {
    it('should send messages', async () => {

        // Create contract system and a wallet
        let system = await ContractSystem.create();
        let treasure = system.treasure('treasure');
        let unknownAddress = testAddress('unknown');

        // Send a message
        await treasure.send({
            to: unknownAddress,
            bounce: true,
            value: toNano(1),
        });
        console.warn(inspect(await system.run(), false, 10000));
    });
});