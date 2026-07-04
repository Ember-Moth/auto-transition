import { type Ref } from "react";
export declare function useForkRef<T>(...refs: (Ref<T> | null | undefined)[]): (node: T | null) => void;
