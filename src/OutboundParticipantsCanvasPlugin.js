import React from 'react';
import { VERSION } from '@twilio/flex-ui';
import { FlexPlugin } from 'flex-plugin';
import { ConferenceListenerManager } from './states/ConferencesState';
import ParticipantActionsButtons from './components/ParticipantActionsButtons';
import ParticipantName from './components/ParticipantName';
import ParticipantStatus from './components/ParticipantStatus';
import ParticipantStatusContainer from './components/ParticipantStatusContainer';
import ConferenceButton from './components/ConferenceButton';
import ConferenceDialog from './components/ConferenceDialog';
import ConferenceMonitor from './components/ConferenceMonitor';
import './actions/CustomActions';

const PLUGIN_NAME = 'OutboundParticipantsCanvasPlugin';

export default class OutboundParticipantsCanvasPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { import('@twilio/flex-ui').Manager }
   */
  init(flex, manager) {
    console.debug('Flex UI Version', VERSION);
    ConferenceListenerManager.initialize();

    const isNewOutboundTask = props => !props.conference;

    flex.CallCanvasActions.Content.replace(<div key="custom-call-canvas" />, { if: isNewOutboundTask });

    flex.CallCanvasActions.Content.add(<ConferenceButton
      key="conference"
    />, { sortOrder: 2 });

    flex.CallCanvas.Content.add(<ConferenceDialog
      key="conference-modal"
    />, { sortOrder: 100 });

    // This component doesn't render anything to the UI, it just monitors
    // conference changes and takes action as necessary
    flex.CallCanvas.Content.add(<ConferenceMonitor
      key="conference-monitor"
    />, { sortOrder: 999 });

    const isAgentDesktopActive = () => {
      const flexState = manager.store.getState().flex;
      const view = flexState && flexState.view;
      const activeView = view && view.activeView;
      console.debug('active view', activeView);
      return activeView === 'agent-desktop';
    }

    const isUnknownParticipant = props => props.participant.participantType === 'unknown';

    // This section is for the full width ParticipantCanvas
    flex.ParticipantCanvas.Content.remove('actions', { if: isAgentDesktopActive });
    flex.ParticipantCanvas.Content.add(
      <ParticipantActionsButtons
        key="custom-actions"
      />, { sortOrder: 10, if: isAgentDesktopActive }
    );
    flex.ParticipantCanvas.Content.remove('name', { if: isUnknownParticipant });
    flex.ParticipantCanvas.Content.add(
      <ParticipantName
        key="custom-name"
      />, { sortOrder: 1, if: isUnknownParticipant }
    );
    flex.ParticipantCanvas.Content.remove('status');
    flex.ParticipantCanvas.Content.add(
      <ParticipantStatus
        key="custom-status"
      />, { sortOrder: 2 }
    );

    // This section is for the narrow width ParticipantCanvas, which changes to List Mode,
    // introduced in Flex 1.11.0. ListItem did not exist on ParticipantCanvas before 1.11.0.
    if (flex.ParticipantCanvas.ListItem) {
      flex.ParticipantCanvas.ListItem.Content.remove('statusContainer');
      flex.ParticipantCanvas.ListItem.Content.add(
        <ParticipantStatusContainer
          key="custom-statusContainer"
        />, { sortOrder: 1 }
      );
      flex.ParticipantCanvas.ListItem.Content.remove('actions');
      flex.ParticipantCanvas.ListItem.Content.add(
        <ParticipantActionsButtons
          key="custom-actions"
        />, { sortOrder: 10 }
      );
    }
  }
}
