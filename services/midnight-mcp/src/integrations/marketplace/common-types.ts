import type { ImpureCircuitId, MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';

// Use any types for now to get building
export type MarketplaceRegistryPrivateState = any;
export type MarketplaceRegistryCircuits = ImpureCircuitId<any>;

export const MarketplaceRegistryPrivateStateId = 'marketplaceRegistryPrivateState';

export type MarketplaceRegistryProviders = MidnightProviders<MarketplaceRegistryCircuits, typeof MarketplaceRegistryPrivateStateId, MarketplaceRegistryPrivateState>;

export type MarketplaceRegistryContract = any;

export type DeployedMarketplaceRegistryContract = DeployedContract<MarketplaceRegistryContract> | FoundContract<MarketplaceRegistryContract>;

// New types for the registry functionality
export interface RegistryEntry {
  publicKey: Uint8Array;
  text: string;
}

export interface RegistryState {
  registry: {
    isEmpty(): boolean;
    size(): bigint;
    member(_key: Uint8Array): boolean;
    lookup(_key: Uint8Array): string;
    [Symbol.iterator](): Iterator<[Uint8Array, string]>;
  };
}
