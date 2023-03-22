export type TrackedBody = {
    type: 'empty'
} | {
    type: 'cell',
    cell: string
} | {
    type: 'text',
    text: string
} | {
    type: 'known',
    value: any
}

export type TrackedMessage = {
    type: 'external-in',
    to: string,
    body: TrackedBody
} | {
    type: 'external-out',
    to: string | null,
    body: TrackedBody
} | {
    type: 'internal',
    from: string,
    to: string,
    value: bigint,
    bounce: boolean,
    body: TrackedBody
};