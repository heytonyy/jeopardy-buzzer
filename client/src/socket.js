import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;

let teacherSocket = null;
let participantSocket = null;

export function getTeacherSocket() {
  if (!teacherSocket) {
    teacherSocket = io(`${SERVER_URL}/teacher`, {
      withCredentials: true, // sends httpOnly cookie automatically
      autoConnect: false,
    });
  }
  return teacherSocket;
}

export function disconnectTeacherSocket() {
  if (teacherSocket) {
    teacherSocket.disconnect();
    teacherSocket = null;
  }
}

export function getParticipantSocket() {
  if (!participantSocket) {
    participantSocket = io(`${SERVER_URL}/participant`, {
      withCredentials: true,
      autoConnect: false,
    });
  }
  return participantSocket;
}

export function disconnectParticipantSocket() {
  if (participantSocket) {
    participantSocket.disconnect();
    participantSocket = null;
  }
}
