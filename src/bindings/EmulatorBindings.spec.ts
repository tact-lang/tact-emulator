import { beginCell, Cell, contractAddress } from "ton-core";
import { defaultConfig } from "../utils/defaultConfig";
import { EmulatorBindings } from "./EmulatorBindings";

const echoCode = 'te6ccgECIgEAAoYAART/APSkE/S88sgLAQIBYgIDAgLLBAUCAVgeHwIBIAYHAgFIFBUCASAICQIBIA0OAgFICgsAI/N5EA5MmQt1nLALeRLOZk9BjAHfO37cCHXScIflTAg1wsf3gLQ0wMBcbDAAZF/kXDiAfpAIlBmbwT4YQKRW+DAAI4uINdJwh+OJu1E0NQB+GKBAQHXAAExAYAg1yHwFMj4QgHMAQGBAQHPAMntVNsx4N7tRNDUAfhigQEB1wABMQHwFYAwACwgbvLQgIAAeyPhCAcwBAYEBAc8Aye1UALvRBrpRDrpMuQYQARYQBYxyUBt5FAP5FnmNWBUILVgSiq2wQQYQBOEFUBCuuMKBnniyAKbyy3gSmg0OEATOQAt4EoIlDVAUcJGJnhAEzqGGgQa6UQ66TJOBBxcXQvgcAgEgDxAAFVlH8BygDgcAHKAIAgEgERIB9zIcQHKAVAH8A1wAcoCUAXPFlAD+gJwAcpoI26zJW6zsY49f/ANyHDwDXDwDSRus5l/8A0E8AFQBMyVNANw8A3iJG6zmX/wDQTwAVAEzJU0A3DwDeJw8A0Cf/ANAslYzJYzMwFw8A3iIW6zmH/wDQHwAQHMlDFw8A3iyQGATACU+EFvJBAjXwN/AnCAQlhtbfAOgAAT7AAIBIBYXAgFIHB0CASAYGQIBIBobAAsyAHPFsmAALR/yAGUcAHLH95vAAFvjG1vjAHwCPAHgABkcAHIzAEBgQEBzwDJgAAUMaSAACTwEfAPgAAk8BDwD4AIBICAhACe4Ni7UTQ1AH4YoEBAdcAATEB8BOAAJtaseAlAATbd6ME4LnYerpZXPY9CdhzrJUKNs0E4TusalpWyPlmRadeW/vixHMA==';

describe('EmulatorBindings', () => {
    it('should create bindings', async () => {
        let code = Cell.fromBoc(Buffer.from(echoCode, 'base64'))[0];
        let data = beginCell()
            .storeRef(Cell.EMPTY)
            .storeInt(0, 257)
            .endCell();
        let bindings = new EmulatorBindings();
        let res = await bindings.runGetMethod({
            verbosity: 0,
            code,
            data,
            address: contractAddress(0, { code, data }),
            config: defaultConfig,
            methodId: 115554, args: [{ type: 'int', value: 1n }],
            balance: 0n,
            gasLimit: 0n,
            unixtime: 0,
            randomSeed: Buffer.alloc(32)
        });
        expect(res.output.success).toBe(true);
        if (res.output.success) {
            expect(res.output.stack).toMatchSnapshot();
        }
    });
});