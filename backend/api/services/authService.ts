import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { barberService } from './barberService';
import { clientService } from './clientService';
import {
  BarberCreateRequest,
  BarberLoginRequest,
  BarberResponse,
} from '../models/barber';
import {
  ClientCreateRequest,
  ClientLoginRequest,
  ClientResponse,
} from '../models/client';

export interface AuthResponse {
  ok: boolean;
  token?: string;
  barber?: BarberResponse;
  client?: ClientResponse;
  services?: any[];
  error?: string;
}

export interface TokenPayload {
  id: string;
  username: string;
  type: 'barber' | 'client';
}

export class AuthServiceClass {
  private generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
  }

  async barberRegister(barberData: BarberCreateRequest): Promise<AuthResponse> {
    try {
      // Check if username already exists
      const existingBarber = await barberService.getBarberByUsername(
        barberData.username
      );
      if (existingBarber) {
        return {
          ok: false,
          error: 'Username already exists',
        };
      }

      // Create barber
      const barberId = await barberService.createBarber(barberData);

      // Generate JWT token
      const token = this.generateToken({
        id: barberId,
        username: barberData.username,
        type: 'barber',
      });

      logger.info('Barber registered successfully', { barberId });

      const barberWithServices =
        await barberService.getBarberWithServices(barberId);
      if (!barberWithServices) {
        return {
          ok: false,
          error: 'Registration failed',
        };
      }

      return {
        ok: true,
        token,
        barber: barberWithServices.barber,
        services: barberWithServices.services,
      };
    } catch (error) {
      logger.error('Error in barber registration:', error);
      return {
        ok: false,
        error: 'Registration failed',
      };
    }
  }

  async barberLogin(loginData: BarberLoginRequest): Promise<AuthResponse> {
    try {
      // Get barber by username
      const barber = await barberService.getBarberByUsername(
        loginData.username
      );
      if (!barber) {
        return {
          ok: false,
          error: 'Invalid credentials',
        };
      }

      // Validate password
      const isValidPassword = await barberService.validatePassword(
        loginData.password,
        barber.password!
      );
      if (!isValidPassword) {
        return {
          ok: false,
          error: 'Invalid credentials',
        };
      }

      // Get barber with services
      const barberWithServices = await barberService.getBarberWithServices(
        barber.id
      );
      if (!barberWithServices) {
        return {
          ok: false,
          error: 'Barber not found',
        };
      }

      // Generate JWT token
      const token = this.generateToken({
        id: barber.id,
        username: barber.username,
        type: 'barber',
      });

      logger.info('Barber logged in successfully', { barberId: barber.id });

      return {
        ok: true,
        token,
        barber: barberWithServices.barber,
        services: barberWithServices.services,
      };
    } catch (error) {
      logger.error('Error in barber login:', error);
      return {
        ok: false,
        error: 'Login failed',
      };
    }
  }

  async clientRegister(clientData: ClientCreateRequest): Promise<AuthResponse> {
    try {
      // Check if username already exists
      const existingClient = await clientService.getClientByUsername(
        clientData.username
      );
      if (existingClient) {
        return {
          ok: false,
          error: 'Username already exists',
        };
      }

      // Create client
      const clientId = await clientService.createClient(clientData);

      // Generate JWT token
      const token = this.generateToken({
        id: clientId,
        username: clientData.username,
        type: 'client',
      });

      logger.info('Client registered successfully', { clientId });

      return {
        ok: true,
        token,
      };
    } catch (error) {
      logger.error('Error in client registration:', error);
      return {
        ok: false,
        error: 'Registration failed',
      };
    }
  }

  async clientLogin(loginData: ClientLoginRequest): Promise<AuthResponse> {
    try {
      // Get client by username
      const client = await clientService.getClientByUsername(
        loginData.username
      );
      if (!client) {
        return {
          ok: false,
          error: 'Invalid credentials',
        };
      }

      // Validate password
      const isValidPassword = await clientService.validatePassword(
        loginData.password,
        client.password!
      );
      if (!isValidPassword) {
        return {
          ok: false,
          error: 'Invalid credentials',
        };
      }

      // Convert to client response
      const clientResponse = await clientService.toClientResponse(client);

      // Generate JWT token
      const token = this.generateToken({
        id: client.id,
        username: client.username,
        type: 'client',
      });

      logger.info('Client logged in successfully', { clientId: client.id });

      return {
        ok: true,
        token,
        client: clientResponse,
      };
    } catch (error) {
      logger.error('Error in client login:', error);
      return {
        ok: false,
        error: 'Login failed',
      };
    }
  }

  async barberUpdateCredentials(
    barberId: string,
    username: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await barberService.updateBarberCredentials(barberId, username, password);

      logger.info('Barber credentials updated successfully', { barberId });

      return { ok: true };
    } catch (error) {
      logger.error('Error updating barber credentials:', error);
      return {
        ok: false,
        error: 'Failed to update credentials',
      };
    }
  }

  async clientUpdateCredentials(
    clientId: string,
    username: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await clientService.updateClientCredentials(clientId, username, password);

      logger.info('Client credentials updated successfully', { clientId });

      return { ok: true };
    } catch (error) {
      logger.error('Error updating client credentials:', error);
      return {
        ok: false,
        error: 'Failed to update credentials',
      };
    }
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      logger.error('Error verifying token:', error);
      return null;
    }
  }
}

export const authService = new AuthServiceClass();
