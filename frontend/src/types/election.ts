export type Role =
  | 'VOTER'
  | 'ADMIN'
  | 'REGIONAL_ADMIN'
  | 'DISTRICT_ADMIN'
  | 'STAFF'
  | 'OBSERVER'
  | 'NONE';

export type ElectionPhase = 'REGISTRATION' | 'VOTING' | 'CLOSED';

export interface Candidate {
  id: string;
  name: string;
  party: string;
  votes: number;
  symbol?: string;
  photoUrl?: string;
  bio?: string;
  manifesto?: string;
  platform?: string;
}

export interface RegionalResult {
  id: string;
  name: string;
  total: number;
  candidates: { id: string; name: string; votes: number }[];
}

export interface VoteResults {
  counts: Candidate[];
  total: number;
  electionDate: string;
  regional?: RegionalResult[];
}
