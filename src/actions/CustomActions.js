import { Actions, Manager, TaskHelper } from '@twilio/flex-ui';
import ConferenceService from '../services/ConferenceService';
import { ConferenceListenerManager } from '../states/ConferencesState';
import { ReservationEvents } from '../utils/enums';

const manager = Manager.getInstance();

// START CCIS-3794: TR SDK fires duplicate events after network connection drop
const uniqueReservationEvents = {};
const hasReservationEvent = (sid, event) => {
  return uniqueReservationEvents[sid] && !!uniqueReservationEvents[sid][event];
};
const saveReservationEvent = (sid, event) => {
  if (hasReservationEvent(sid, event)) {
    console.debug('duplicate reservation event', event, sid);
    return false;
  }

  uniqueReservationEvents[sid] = uniqueReservationEvents[sid] || {};
  uniqueReservationEvents[sid][event] = true;

  return true;
};
// END CCIS-3794

const reservationListeners = new Map();

const stopReservationListeners = (reservation) => {
  const listeners = reservationListeners.get(reservation);
  if (listeners) {
    listeners.forEach(listener => {
      reservation.removeListener(listener.event, listener.callback);
    });
    reservationListeners.delete(reservation);
  }
};

const handleReservationCreated = (reservation) => {
  initReservationListeners(reservation);
  const { sid, task } = reservation;
  const { attributes } = task;
  const { conversations } = attributes;
  const originalTaskSid = conversations && conversations.conversation_id;

  if (TaskHelper.isCallTask(task)
    && task.taskChannelUniqueName === 'custom1'
    && !originalTaskSid
  ) {
    console.debug('starting custom conference listener');
    ConferenceListenerManager.startListening(task, `worker${sid}`)
  }
};

const handleReservationUpdated = (event, reservation) => {
  console.debug('Event, reservation updated', event, reservation);
  if (!saveReservationEvent(reservation.sid, event)) {
    return;
  }

  switch (event) {
    case 'completed':
    case 'rejected':
    case 'timeout':
    case 'canceled':
    case 'rescinded': {
      stopReservationListeners(reservation);
      ConferenceListenerManager.stopListening(reservation.task.sid, `worker${reservation.sid}`);
      delete uniqueReservationEvents[reservation.sid];
      break;
    }
    default:
      break;
  }
};

const initReservationListeners = (reservation) => {
  stopReservationListeners(reservation);
  const listeners = [];
  Object.values(ReservationEvents).forEach(event => {
    const callback = () => handleReservationUpdated(event, reservation);
    reservation.addListener(event, callback);
    listeners.push({ event, callback });
  });
  reservationListeners.set(reservation, listeners);
};

manager.workerClient.on('reservationCreated', (reservation) => {
  handleReservationCreated(reservation);
});

const toggleHold = (payload, original, hold) => {
  const { task, targetSid, participantType } = payload;

  if (participantType !== 'unknown' && task.taskChannelUniqueName !== 'custom1') {
    return original(payload);
  }

  const conference = task.attributes.conference.sid;
  const participantSid = targetSid;

  if (hold) {
    console.log('Holding participant', participantSid);
    return ConferenceService.holdParticipant(conference, participantSid);
  }

  console.log('Unholding participant', participantSid);
  return ConferenceService.unholdParticipant(conference, participantSid);
};

Actions.replaceAction('HoldParticipant', (payload, original) => {
  return toggleHold(payload, original, true);
});

Actions.replaceAction('UnholdParticipant', (payload, original) => {
  return toggleHold(payload, original, false);
});

Actions.replaceAction('KickParticipant', (payload, original) => {
  const { task, targetSid, participantType } = payload;

  if (participantType === 'worker') {
    return original(payload);
  }

  const conference = task.attributes.conference.sid;
  const participantSid = targetSid;

  console.log(`Removing participant ${participantSid} from conference`);
  return ConferenceService.removeParticipant(conference, participantSid);
});
