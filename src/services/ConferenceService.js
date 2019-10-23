import { ConferenceParticipant, Manager } from '@twilio/flex-ui';

class ConferenceService {
  constructor() {
    const manager = Manager.getInstance();
    this.serviceBaseUrl = manager.serviceConfiguration.runtime_domain;
  }

  // Private functions
  _getUserToken = () => {
    const manager = Manager.getInstance();
    return manager.user.token;
  }

  _toggleParticipantHold = (conference, participantSid, hold) => {
    return new Promise((resolve, reject) => {
      const token = this._getUserToken();

      return fetch(`https://${this.serviceBaseUrl}/hold-conference-participant`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: 'POST',
        body: (
          `token=${token}`
          + `&conference=${conference}`
          + `&participant=${participantSid}`
          + `&hold=${hold}`
        )
      })
        .then(() => {
          console.log(`${hold ? 'Hold' : 'Unhold'} successful for participant`, participantSid);
          resolve();
        })
        .catch(error => {
          console.error(`Error ${hold ? 'holding' : 'unholding'} participant ${participantSid}\r\n`, error);
          reject(error);
        });
    });
  }

  // Public functions
  setEndConferenceOnExit = (conference, participantSid, endConferenceOnExit) => {
    return new Promise((resolve, reject) => {
      const token = this._getUserToken();

      fetch(`https://${this.serviceBaseUrl}/update-conference-participant`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: 'POST',
        body: (
          `token=${token}`
          + `&conference=${conference}`
          + `&participant=${participantSid}`
          + `&endConferenceOnExit=${endConferenceOnExit}`
        )
      })
        .then(response => response.json())
        .then(json => {
          if (json && json.status === 200) {
            console.log(`Participant ${participantSid} updated:\r\n`, json);
            resolve();
          }
        })
        .catch(error => {
          console.error(`Error updating participant ${participantSid}\r\n`, error);
          reject(error);
        });
    });
  }

  addParticipant = (taskSid, from, to) => {
    return new Promise((resolve, reject) => {
      const token = this._getUserToken();

      fetch(`https://${this.serviceBaseUrl}/add-conference-participant`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: 'POST',
        body: `token=${token}&taskSid=${taskSid}&from=${from}&to=${to}`
      })
        .then(response => response.json())
        .then(json => {
          if (json.status === 200) {
            console.log('Participant added:\r\n  ', json);
            resolve(json && json.callSid);
          }
        })
        .catch(error => {
          console.error(`Error adding participant ${to}\r\n`, error);
          reject(error);
        });
    });
  }

  addConnectingParticipant = (conferenceName, callSid, participantType) => {
    const flexState = Manager.getInstance().store.getState().flex;
    const { dispatch } = Manager.getInstance().store;
    const conferenceStates = flexState.conferences.states;
    const conferences = new Set();

    console.log('Populating conferences set');
    conferenceStates.forEach(conference => {
      const currentConference = conference.source;
      console.log('Checking conference name:', currentConference.sid);
      if (currentConference.sid !== conferenceName) {
        console.log('Not the desired conference');
        conferences.add(currentConference);
      } else {
        const { participants } = currentConference;
        const fakeSource = {
          connecting: true,
          participant_type: participantType,
          status: 'joined'
        };
        const fakeParticipant = new ConferenceParticipant(fakeSource, callSid);
        console.log('Adding fake participant:', fakeParticipant);
        participants.push(fakeParticipant);
        conferences.add(conference.source);
      }
    });
    console.log('Updating conferences:', conferences);
    dispatch({ type: 'CONFERENCE_MULTIPLE_UPDATE', payload: { conferences } });
  }

  holdParticipant = (conference, participantSid) => {
    return this._toggleParticipantHold(conference, participantSid, true);
  }

  unholdParticipant = (conference, participantSid) => {
    return this._toggleParticipantHold(conference, participantSid, false);
  }

  removeParticipant = (conference, participantSid) => {
    return new Promise((resolve, reject) => {
      const token = this._getUserToken();

      fetch(`https://${this.serviceBaseUrl}/remove-conference-participant`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: 'POST',
        body: (
          `token=${token}`
          + `&conference=${conference}`
          + `&participant=${participantSid}`
        )
      })
        .then(() => {
          console.log(`Participant ${participantSid} removed from conference`);
          resolve();
        })
        .catch(error => {
          console.error(`Error removing participant ${participantSid} from conference\r\n`, error);
          reject(error);
        });
    });
  }
}

const conferenceService = new ConferenceService();

export default conferenceService;
