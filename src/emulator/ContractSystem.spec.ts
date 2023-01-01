import { ContractSystem } from "./ContractSystem";
import { internal, toNano, WalletContractV4 } from 'ton';
import { testKey } from "../utils/testKey";
import { testAddress } from "../utils/testAddress";

describe('ContractSystem', () => {
    it('should send messages', async () => {

        // Create contract system and a wallet
        let system = await ContractSystem.create();
        let walletKey = testKey('wallet');
        let wallet = system.open(WalletContractV4.create({ workchain: 0, publicKey: walletKey.publicKey }));
        let seqno = await wallet.getSeqno();
        expect(seqno).toBe(0);
        let emptyTarget = testAddress(0, 'empty-target');
        system.contract(wallet.address).balance = toNano(1000000);

        // Send a message
        await wallet.sendTransfer({
            seqno,
            secretKey: walletKey.secretKey,
            messages: [internal({
                to: emptyTarget,
                value: toNano(1),
                bounce: true,
            })]
        });
        console.warn(await system.run());
    });
});