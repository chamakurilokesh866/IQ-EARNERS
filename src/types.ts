export interface PageToken {
  id: string; // uuid or short id
  page: string; // e.g. "/leaderboard"
  token: string; // short unique string
}
