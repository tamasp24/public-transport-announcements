export type Programme = {
    Route: string;
    Station: string;
    'On Approach': string;
    'At Station': string;
    Terminating: string;
    'Transfer 1': string;
    'Transfer 2': string;
    'Transfer 3': string;
    Root: string;
};

export type Pack = {
    name: string;
    files: string[];
};