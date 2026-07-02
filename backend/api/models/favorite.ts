// A client's saved/favorited barber. Doc id is deterministic
// (`${clientId}_${barberId}`) so add is naturally idempotent — no unique
// index or duplicate check needed.
export interface Favorite {
  id: string;
  clientId: string;
  barberId: string;
  createdAt: Date;
}
