import type { SetStateAction } from "react";

export type setPageStatesType = (setPage: SetStateAction<"desktop" | "blueprint" | "report">) => void;
