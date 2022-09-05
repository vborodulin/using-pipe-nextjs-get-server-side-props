export type TUser = {
  id: number;
  username: string;
  age: number;
}

export type TSubscription = {
  id: number;
  userId: TUser['id'];
}

export type TAlbum = {
  id: number;
  userId: number;
  name: string;
}
