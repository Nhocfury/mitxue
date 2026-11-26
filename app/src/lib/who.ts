/* Tên người học để Mít gọi. Chưa đặt tên thì gọi "em". */
import { S } from "./state.svelte";
export const who = (): string => S.settings.name?.trim() || "em";
