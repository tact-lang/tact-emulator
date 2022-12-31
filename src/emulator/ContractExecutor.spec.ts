import { Address, beginCell, Cell, comment, internal, toNano } from "ton-core";
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
        let res = await contract.get('hello', [{ type: 'int', value: 12312312n }]);
        expect(res!.stack?.readNumber()).toBe(12312313);

        system.send(new Address(0, Buffer.alloc(32)), internal({
            to: contract.address,
            value: toNano(1),
            body: comment('Hello')
        }));

        await system.run();
    });
});