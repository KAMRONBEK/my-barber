import jwt from 'jsonwebtoken';
import { config } from '../../config/config';

export function signBarberToken(id: string, username = `b_${id}`): string {
  return jwt.sign({ id, username, type: 'barber' }, config.jwtSecret, {
    expiresIn: '2h',
  });
}

export function signClientToken(id: string, username = `c_${id}`): string {
  return jwt.sign({ id, username, type: 'client' }, config.jwtSecret, {
    expiresIn: '2h',
  });
}
