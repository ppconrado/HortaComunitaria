import { io } from 'socket.io-client';
import { API_URL } from './api';

export const createRealtimeSocket = () =>
  io(API_URL, { transports: ['websocket', 'polling'] });