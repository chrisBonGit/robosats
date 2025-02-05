export interface Coordinator {
  alias: string;
  description: string | undefined;
  coverLetter: string | undefined;
  logo: string;
  color: string;
  contact: {
    email: string | undefined;
    telegram: string | undefined;
    matrix: string | undefined;
    twitter: string | undefined;
    website: string | undefined;
  };
  mainnetOnion: string | undefined;
  mainnetClearnet: string | undefined;
  testnetOnion: string | undefined;
  testnetClearnet: string | undefined;
  mainnetNodesPubkeys: string[];
  testnetNodesPubkeys: string[];
}

export default Coordinator;
