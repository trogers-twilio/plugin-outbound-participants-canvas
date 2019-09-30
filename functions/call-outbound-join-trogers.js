class ConferenceParticipant {
  constructor({
    endConferenceOnExit,
    hold,
    muted,
    participantType,
    reservationSid,
    status,
    workerSid,
    connecting
  }) {
    this.end_conference_on_exit = endConferenceOnExit;
    this.hold = hold;
    this.muted = muted;
    this.participant_type = participantType;
    this.reservation_sid = reservationSid;
    this.status = status;
    this.worker_sid = workerSid;
    this.connecting = connecting;
  }

  set participantType(participantType) {
    this.participant_type = participantType;
  }

  set reservationSid(reservationSid) {
    this.reservation_sid = reservationSid;
  }

  set workerSid(workerSid) {
    this.worker_sid = workerSid;
  }
}


const ConferenceStatuses = {
  started: 'started',
  ended: 'ended'
};

const ParticipantTypes = {
  worker: 'worker',
  customer: 'customer',
  unknown: 'unknown'
};

const ParticipantStatuses = {
  joined: 'joined',
  left: 'left'
};

const updateConferenceParticipant = (event, participant, status) => {
  const {
    EndConferenceOnExit,
    Hold,
    Muted,
  } = event;

  const newParticipant = { ...participant };

  if (status) {
    newParticipant.status = status;
  }
  newParticipant.end_conference_on_exit = EndConferenceOnExit.toLowerCase() === 'true';
  newParticipant.hold = Hold.toLowerCase() === 'true';
  newParticipant.muted = Muted.toLowerCase() === 'true';

  return newParticipant;
};

const fetchTask = (client, context, taskSid) => {
  return client.taskrouter.workspaces(context.TWILIO_WORKSPACE_SID)
    .tasks(taskSid)
    .fetch();
};

const fetchReservations = (client, context, taskSid) => {
  return client.taskrouter.workspaces(context.TWILIO_WORKSPACE_SID)
    .tasks(taskSid)
    .reservations.list();
};

const updateTaskAttributes = (client, context, taskSid, attributes) => {
  return client.taskrouter.workspaces(context.TWILIO_WORKSPACE_SID)
    .tasks(taskSid)
    .update({
      attributes: JSON.stringify(attributes)
    });
};

const getSyncMapClient = (client, context, syncMapName) => {
  const syncClient = client.sync.services(context.TWILIO_SYNC_SERVICES_SID);
  const syncMapClient = syncClient.syncMaps(syncMapName);
  return syncMapClient;
};

const getSyncMap = (syncMapClient, syncMapName) => new Promise(async (resolve) => {
  try {
    console.log('Retrieving Sync Map', syncMapName);
    const syncMap = await syncMapClient.fetch();
    if (syncMap.uniqueName === syncMapName) {
      resolve(syncMap);
    } else {
      resolve(undefined);
    }
    return;
  } catch (error) {
    console.error('Failed to retrieve sync map.');
    resolve(undefined);
  }
});

const createSyncMap = (client, context, syncMapName) => {
  return new Promise(async (resolve) => {
    const syncClient = client.sync.services(context.TWILIO_SYNC_SERVICES_SID);
    console.log('Creating Sync Map', syncMapName);
    try {
      const syncMap = await syncClient.syncMaps.create({
        uniqueName: syncMapName,
        ttl: 86400
      });
      console.log('Sync Map created.');
      resolve(syncMap);
    } catch (error) {
      console.error('Error creating Sync Map.');
      resolve(undefined);
    }
  });
};

const getSyncMapItem = (syncMapClient, itemKey) => {
  return new Promise(async (resolve) => {
    console.log('Retrieving Sync Map Item', itemKey);
    try {
      const syncMapItem = await syncMapClient.syncMapItems(itemKey).fetch();
      console.log('Retrieved Sync Map Item.');
      resolve(syncMapItem);
    } catch (error) {
      console.error('Error getting Sync Map Item.');
      resolve(undefined);
    }
  });
};

const createSyncMapItem = (syncMapClient, itemKey, itemValue) => {
  return new Promise(async (resolve) => {
    console.log('Creating Sync Map Item', itemKey);
    try {
      const syncMapItem = await syncMapClient.syncMapItems.create({
        key: itemKey,
        data: itemValue
      });
      console.log('Sync Map Item created.');
      resolve(syncMapItem);
    } catch (error) {
      console.error('Error creating Sync Map Item.');
      resolve(undefined);
    }
  });
};

const updateSyncMapItem = (syncMapClient, itemKey, itemValue) => {
  return new Promise(async (resolve) => {
    console.log('Updating sync map item', itemKey);
    try {
      const syncMapItem = await syncMapClient.syncMapItems(itemKey).update({
        data: itemValue
      });
      console.log('Sync Map Item updated.');
      resolve(syncMapItem);
    } catch (error) {
      console.error('Error updating Sync Map Item.');
      resolve(undefined);
    }
  });
};

const updateConferenceMap = (client, context, conferenceName, itemKey, itemValue) => {
  return new Promise(async (resolve) => {
    const syncMapName = `${conferenceName}.CS`;
    const syncMapClient = getSyncMapClient(client, context, syncMapName);

    const isSyncMapCreated = !!await getSyncMap(syncMapClient, syncMapName);
    if (!isSyncMapCreated) {
      await createSyncMap(client, context, syncMapName);
    }
    const syncMapItem = await getSyncMapItem(syncMapClient, itemKey);
    const isSyncMapItemCreated = !!(syncMapItem && syncMapItem.data);
    if (!isSyncMapItemCreated) {
      await createSyncMapItem(syncMapClient, itemKey, itemValue);
    } else {
      await updateSyncMapItem(syncMapClient, itemKey, itemValue);
    }
    resolve();
  });
};

const addParticipantToConference = (client, context, conferenceSid, taskSid, to, from) => {
  // internal call
  if (to.substring(0, 6) === 'client') {
    return client
      .taskrouter.workspaces(context.TWILIO_WORKSPACE_SID)
      .tasks
      .create(
        {
          attributes: JSON.stringify(
            {
              to,
              direction: 'outbound',
              name: from,
              from: '+12062029455',
              targetWorker: to,
              url: context.RUNTIME_DOMAIN,
              autoAnswer: 'false',
              conferenceSid: taskSid,
              internal: 'true'
            }
          ),
          workflowSid: context.TWILIO_WORKFLOW_SID,
          taskChannel: 'custom1'
        }
      );
  }
  return client
    .conferences(conferenceSid)
    .participants.create({
      to,
      from,
      earlyMedia: true,
      endConferenceOnExit: true
    });
};

const handleConferenceStart = async (event, client, context, callback) => {
  console.log('Conference started. Updating sync map');
  const { FriendlyName } = event;
  const taskSid = FriendlyName;
  const itemKey = 'conf_status';
  const itemValue = { status: ConferenceStatuses.started };
  await updateConferenceMap(client, context, taskSid, itemKey, itemValue);
  callback(null, null);
};

const handleConferenceEnd = (event, client, context, callback) => {
  const { FriendlyName } = event;
  const taskSid = FriendlyName;
  const itemKey = 'conf_status';
  const itemValue = { status: ConferenceStatuses.ended };
  client.taskrouter
    .workspaces(context.TWILIO_WORKSPACE_SID)
    .tasks(taskSid)
    .update({
      assignmentStatus: 'wrapping',
      reason: 'conference ended'
    })
    .then(async () => {
      await updateConferenceMap(client, context, taskSid, itemKey, itemValue);
      callback(null, null);
    })
    .catch(async error => {
      await updateConferenceMap(client, context, taskSid, itemKey, itemValue);
      callback(error);
    });
};

const handleParticipantJoin = async (event, client, context, callback) => {
  const {
    CallSid,
    FriendlyName,
    ConferenceSid,
    EndConferenceOnExit,
    Hold,
    Muted,
  } = event;

  const syncMapName = `${FriendlyName}.CS`;
  const syncMapClient = getSyncMapClient(client, context, syncMapName);
  const activeTask = await getSyncMapItem(syncMapClient, 'activeTask');
  const taskSid = activeTask && activeTask.data
    ? activeTask.data.taskSid
    : FriendlyName;

  console.log(`callSid ${CallSid} joined, task is ${taskSid}, conference is ${ConferenceSid}`);

  const participant = new ConferenceParticipant({
    endConferenceOnExit: EndConferenceOnExit.toLowerCase() === 'true',
    hold: Hold.toLowerCase() === 'true',
    muted: Muted.toLowerCase() === 'true',
    status: ParticipantStatuses.joined
  });

  client.calls(event.CallSid)
    .fetch()
    .then(async call => {
      const task = await fetchTask(client, context, taskSid);
      console.log('Retrieved task with sid', task.sid);
      const attributes = JSON.parse(task.attributes);

      if (call.to.includes('client')) {
        console.log(`agent ${call.to} joined the conference`);
        const newAttributes = { ...JSON.parse(task.attributes) };

        newAttributes.conference = {
          sid: event.ConferenceSid,
          participants: {
            worker: event.CallSid
          }
        };

        // Check to see if this is a third participant added to the call, if yes,
        // don't place an outbound call. This is used by the Conference plugin.
        if (newAttributes.worker_call_sid !== newAttributes.conference.participants.worker) {
          console.log('This is a 3rd participant, nothing to do here');
          participant.participantType = ParticipantTypes.unknown;
          await updateConferenceMap(client, context, FriendlyName, CallSid, participant);
          return;
        }
        participant.participantType = ParticipantTypes.worker;

        let reservations;
        try {
          reservations = await fetchReservations(client, context, task.sid);
          console.log('Retrieved reservations');
        } catch (error) {
          console.error('Error retrieving reservations.', error);
        }
        if (reservations && reservations.length > 0) {
          const reservation = reservations[0];
          participant.reservationSid = reservation.sid;
          participant.workerSid = reservation.workerSid;
        } else {
          console.log('No reservations found for task sid', task.sid);
        }

        console.log('Final conference participant object', participant);
        await updateConferenceMap(client, context, FriendlyName, CallSid, participant);

        let { to, from } = newAttributes;
        console.log(`initiate outbound call to: ${to}`);

        if (to.length === 10) {
          to = `1${to}`;
        }

        const result = await addParticipantToConference(client, context, event.ConferenceSid, taskSid, to, from);
        if (result.assignmentStatus === 'pending') {
          return;
        }
        console.log(`call triggered, callSid ${result.callSid}`);

        const connectingParticipant = new ConferenceParticipant({
          endConferenceOnExit: true,
          hold: false,
          muted: false,
          status: ParticipantStatuses.joined,
          participantType: ParticipantTypes.customer,
          connecting: true
        });
        await updateConferenceMap(client, context, FriendlyName, result.callSid, connectingParticipant);

        newAttributes.conference.participants.customer = result.callSid;
        const updatedTask = await updateTaskAttributes(client, context, taskSid, newAttributes);
        console.log('Updated task attributes');
      } else if (CallSid === attributes.conference.participants.customer) {
        console.log('customer participant joined');
        participant.participantType = ParticipantTypes.customer;
        await updateConferenceMap(client, context, FriendlyName, CallSid, participant);
      } else {
        console.log('non-customer participant joined');
        participant.participantType = ParticipantTypes.unknown;
        await updateConferenceMap(client, context, FriendlyName, CallSid, participant);
      }
    })
    .then(() => {
      console.log('all tasks done');
      callback();
    })
    .catch(error => {
      console.log('an error occurred', error);
      callback(error);
    });
};

const handleParticipantLeave = async (event, client, context, callback) => {
  const {
    CallSid,
    FriendlyName,
    EndConferenceOnExit,
    Hold,
    Muted
  } = event;

  const syncMapName = `${FriendlyName}.CS`;
  const syncMapClient = getSyncMapClient(client, context, syncMapName);
  const syncMapItem = await getSyncMapItem(syncMapClient, CallSid);

  let participant;
  if (syncMapItem) {
    participant = updateConferenceParticipant(event, syncMapItem.data, ParticipantStatuses.left);
  } else {
    participant = new ConferenceParticipant({
      endConferenceOnExit: EndConferenceOnExit.toLowerCase() === 'true',
      hold: Hold.toLowerCase() === 'true',
      muted: Muted.toLowerCase() === 'true',
      status: ParticipantStatuses.left
    });
  }

  await updateConferenceMap(client, context, FriendlyName, CallSid, participant);

  callback(null, null);
};

const handleParticipantChange = async (event, client, context, callback) => {
  const {
    CallSid,
    FriendlyName
  } = event;

  const syncMapName = `${FriendlyName}.CS`;
  const syncMapClient = getSyncMapClient(client, context, syncMapName);
  const syncMapItem = await getSyncMapItem(syncMapClient, CallSid);

  const participant = updateConferenceParticipant(event, syncMapItem.data);
  await updateConferenceMap(client, context, FriendlyName, CallSid, participant);

  callback(null, null);
};

exports.handler = function(context, event, callback) {
  console.log('Conference status event:', event.StatusCallbackEvent);
  // Object.keys(event).forEach(key => {
  //   console.log(`${key}: ${event[key]}`);
  // });

  const client = context.getTwilioClient();

  switch (event.StatusCallbackEvent) {
    case 'conference-start': {
      return handleConferenceStart(event, client, context, callback);
    }
    case 'participant-join': {
      return handleParticipantJoin(event, client, context, callback);
    }
    case 'participant-leave': {
      return handleParticipantLeave(event, client, context, callback);
    }
    case 'participant-mute':
    case 'participant-unmute':
    case 'participant-hold':
    case 'participant-unhold': {
      return handleParticipantChange(event, client, context, callback);
    }
    case 'conference-end': {
      return handleConferenceEnd(event, client, context, callback);
    }
    default: {
      return callback();
    }
  }
};
