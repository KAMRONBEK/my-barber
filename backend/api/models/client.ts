export interface Client {
  id: string;
  username: string;
  password?: string; // Only used during creation/update, not returned in responses
  firstName: string;
  lastName: string;
  phone: string;
  location?: string;
  avatar?: string;
  /** Expo push token (`ExponentPushToken[...]`); omit from responses */
  deviceId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClientCreateRequest {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface ClientLoginRequest {
  username: string;
  password: string;
}

export interface ClientUpdateRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
}

export interface ClientCredentialsUpdateRequest {
  username: string;
  password: string;
}

export interface ClientDeviceUpdateRequest {
  deviceId: string;
}

export interface ClientResponse {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  location?: string;
  avatar?: string;
}
