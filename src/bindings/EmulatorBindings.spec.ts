import { beginCell, Cell } from "ton-core";
import { EmulatorBindings } from "./EmulatorBindings";

const echoCode = 'te6ccgECJAEAArEAART/APSkE/S88sgLAQIBYgIDAgLLBAUCAVggIQIBIAYHAgFIERICAdQICQIBIAsMAd87ftwIddJwh+VMCDXCx/eAtDTAwFxsMABkX+RcOIB+kAiUGZvBPhhApFb4MAAji4g10nCH44m7UTQ1AH4YoEBAdcAATEBgCDXIfAWyPhCAcwBAYEBAc8Aye1U2zHg3u1E0NQB+GKBAQHXAAExAfAXgCgALCBu8tCAgAB7I+EIBzAEBgQEBzwDJ7VQCASANDgAV9KP4DlAHA4AOUAQCASAPEAC7Qg10oh10mXIMIAIsIAsY5KA28igH8izzGrAqEFqwJRVbYIIMIAnCCqAhXXGFAzzxZAFN5ZbwJTQaHCAJnIAW8CUEShqgKOEjEzwgCZ1DDQINdKIddJknAg4uLoXwOAAjG8iAcmTIW6zlgFvIlnMyegxgAAc8AjQgAgEgExQCASAaGwIBIBUWAgEgGBkB9zIcQHKAVAH8A9wAcoCUAXPFlAD+gJwAcpoI26zJW6zsY49f/APyHDwD3DwDyRus5l/8A8E8AFQBMyVNANw8A/iJG6zmX/wDwTwAVAEzJU0A3DwD+Jw8A8Cf/APAslYzJYzMwFw8A/iIW6zmH/wDwHwAQHMlDFw8A/iyQGAXACU+EFvJBAjXwN/AnCAQlhtbfAQgAAT7AAALMgBzxbJgAC0f8gBlHAByx/ebwABb4xtb4wB8ArwCIAIBIBwdAgEgHh8AGRwAcjMAQGBAQHPAMmAARQxcMgBlHAByx/ebwABb4xtb4yLdIZWxsbywgjwCgHwCvAJgAAk8BPwEYAAJPAS8BGACASAiIwAnuDYu1E0NQB+GKBAQHXAAExAfAVgACbWrHgKQAE23ejBOC52Hq6WVz2PQnYc6yVCjbNBOE7rGpaVsj5ZkWnXlv74sRzA=';

describe('EmulatorBindings', () => {
    it('should create bindings', async () => {
        let code = Cell.fromBoc(Buffer.from(echoCode, 'base64'))[0];
        let data = beginCell()
            .storeRef(Cell.EMPTY)
            .storeInt(0, 257)
            .endCell();
        let bindings = new EmulatorBindings();
        let res = await bindings.runGetMethod(code, data, 115554, [{ type: 'slice', cell: beginCell().storeStringTail('Steve').endCell() }]);
        console.warn(res);
    });
});