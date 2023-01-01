import { beginCell, Cell, toNano } from "ton-core";
import { testAddress } from "../utils/testAddress";
import { ContractExecutor } from "./ContractExecutor";
import { ContractSystem } from "./ContractSystem";

describe('ContractExecutor', () => {
    it('should execute simple get methods', async () => {
        const echoCode = 'te6ccgECIgEAAoYAART/APSkE/S88sgLAQIBYgIDAgLLBAUCAVgeHwIBIAYHAgFIFBUCASAICQIBIA0OAgFICgsAI/N5EA5MmQt1nLALeRLOZk9BjAHfO37cCHXScIflTAg1wsf3gLQ0wMBcbDAAZF/kXDiAfpAIlBmbwT4YQKRW+DAAI4uINdJwh+OJu1E0NQB+GKBAQHXAAExAYAg1yHwFMj4QgHMAQGBAQHPAMntVNsx4N7tRNDUAfhigQEB1wABMQHwFYAwACwgbvLQgIAAeyPhCAcwBAYEBAc8Aye1UALvRBrpRDrpMuQYQARYQBYxyUBt5FAP5FnmNWBUILVgSiq2wQQYQBOEFUBCuuMKBnniyAKbyy3gSmg0OEATOQAt4EoIlDVAUcJGJnhAEzqGGgQa6UQ66TJOBBxcXQvgcAgEgDxAAFVlH8BygDgcAHKAIAgEgERIB9zIcQHKAVAH8A1wAcoCUAXPFlAD+gJwAcpoI26zJW6zsY49f/ANyHDwDXDwDSRus5l/8A0E8AFQBMyVNANw8A3iJG6zmX/wDQTwAVAEzJU0A3DwDeJw8A0Cf/ANAslYzJYzMwFw8A3iIW6zmH/wDQHwAQHMlDFw8A3iyQGATACU+EFvJBAjXwN/AnCAQlhtbfAOgAAT7AAIBIBYXAgFIHB0CASAYGQIBIBobAAsyAHPFsmAALR/yAGUcAHLH95vAAFvjG1vjAHwCPAHgABkcAHIzAEBgQEBzwDJgAAUMaSAACTwEfAPgAAk8BDwD4AIBICAhACe4Ni7UTQ1AH4YoEBAdcAATEB8BOAAJtaseAlAATbd6ME4LnYerpZXPY9CdhzrJUKNs0E4TusalpWyPlmRadeW/vixHMA==';
        let system = await ContractSystem.create();
        let contract = await ContractExecutor.create({
            code: Cell.fromBoc(Buffer.from(echoCode, 'base64'))[0],
            data: beginCell()
                .storeRef(Cell.EMPTY)
                .storeInt(0, 257)
                .endCell()
        }, system);

        // Get method
        let res = await contract.get('hello', [{ type: 'int', value: 12312312n }]);
        if (res.success !== true) {
            throw new Error('get failed');
        }
        expect(res.stack.readNumber()).toBe(12312313);

        // Receive method
        let tx = await contract.receive({
            info: {
                type: 'internal',
                src: testAddress(0, 'address-1'),
                dest: contract.address,
                value: { coins: toNano(1) },
                bounce: false,
                ihrDisabled: true,
                createdLt: 0n,
                createdAt: 0,
                bounced: false,
                ihrFee: 0n,
                forwardFee: 0n,
            },
            body: beginCell()
                .endCell()
        });
        console.warn(tx);
    });
});