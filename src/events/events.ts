import { ComputeSkipReason } from "ton-core";
import { TrackedMessage } from "./message";

export type TrackedTransaction = {
    $seq: number,
    events: TrackedEvent[]
}

export type TrackedEvent = {
    $type: 'deploy'
} | {
    $type: 'frozen'
} | {
    $type: 'deleted'
} | {
    $type: 'received',
    message: TrackedMessage
} | {
    $type: 'received-bounced',
    message: TrackedMessage
} | {
    $type: 'failed',
    errorCode: number,
    errorMessage?: string
} | {
    $type: 'processed',
    gasUsed: bigint
} | {
    $type: 'skipped',
    reason: ComputeSkipReason
} | {
    $type: 'sent',
    messages: TrackedMessage[]
} | {
    $type: 'sent-bounced',
    message: TrackedMessage
} | {
    $type: 'sent-bounced-failed'
} | {
    $type: 'storage-charged',
    amount: string
};