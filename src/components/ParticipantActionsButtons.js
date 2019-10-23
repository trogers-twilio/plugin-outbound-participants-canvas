import * as React from 'react';
import { connect } from 'react-redux';
import styled from 'react-emotion';
import {
  Actions,
  IconButton,
  TaskHelper,
  VERSION as FlexVersion,
  withTheme
} from '@twilio/flex-ui';

const ActionsContainer = styled('div')`
  margin-top: 10px;
  button {
      width: 36px;
      height: 36px;
      margin-left: 6px;
      margin-right: 6px;
  }
`;

const ActionsContainerListItem = styled('div')`
  button {
    width: 32px;
    height: 32px;
    margin-left: 6px;
    margin-right: 6px;
  }
`;

class ParticipantActionsButtons extends React.Component {
  componentWillUnmount() {
    const { participant } = this.props;
    if (participant.status === 'recently_left') {
      this.props.clearParticipantComponentState();
    }
  }

  showKickConfirmation = () => this.props.setShowKickConfirmation(true);

  hideKickConfirmation = () => this.props.setShowKickConfirmation(false);

  onHoldParticipantClick = () => {
    const { participant, task } = this.props;
    const { callSid, workerSid } = participant;
    const { participantType } = participant;
    Actions.invokeAction(participant.onHold ? 'UnholdParticipant' : 'HoldParticipant', {
      participantType,
      task,
      targetSid: participantType === 'worker' ? workerSid : callSid
    });
  };

  onKickParticipantConfirmClick = () => {
    const { participant, task } = this.props;
    const { callSid, workerSid } = participant;
    const { participantType } = participant;
    Actions.invokeAction('KickParticipant', {
      participantType,
      task,
      targetSid: participantType === 'worker' ? workerSid : callSid
    });
    this.hideKickConfirmation();
  };

  renderKickConfirmation() {
    const { theme } = this.props;
    return (
      <React.Fragment>
        <IconButton
          icon="Accept"
          className="ParticipantCanvas-AcceptAction"
          onClick={this.onKickParticipantConfirmClick}
          themeOverride={theme.ParticipantsCanvas.ParticipantCanvas.Button}
        />
        <IconButton
          icon="Close"
          className="ParticipantCanvas-DeclineAction"
          onClick={this.hideKickConfirmation}
          themeOverride={theme.ParticipantsCanvas.ParticipantCanvas.Button}
        />
      </React.Fragment>
    );
  }

  renderActions() {
    const { participant, theme, task } = this.props;

    const holdParticipantTooltip = participant.onHold
      ? 'Unhold Participant' : 'Hold Participant';
    const kickParticipantTooltip = 'Remove Participant';

    // The name of the hold icons changed in Flex 1.11.0 to HoldOff.
    // Since the minimum requirement is 1.10.0 and there is no version between
    // 1.10.0 and 1.11.0, the check is only needed for version 1.10.0.
    const holdIcon = FlexVersion === '1.10.0' ? 'HoldLarge' : 'Hold';
    const unholdIcon = FlexVersion === '1.10.0' ? 'HoldLargeBold' : 'HoldOff';

    return (
      <React.Fragment>
        <IconButton
          icon={participant.onHold ? `${unholdIcon}` : `${holdIcon}`}
          className="ParticipantCanvas-HoldButton"
          disabled={!TaskHelper.canHold(task) || participant.status !== 'joined'}
          onClick={this.onHoldParticipantClick}
          themeOverride={theme.ParticipantsCanvas.ParticipantCanvas.Button}
          title={holdParticipantTooltip}
        />
        <IconButton
          icon="Hangup"
          className="ParticipantCanvas-HangupButton"
          onClick={this.showKickConfirmation}
          themeOverride={theme.ParticipantsCanvas.ParticipantCanvas.HangUpButton}
          title={kickParticipantTooltip}
        />
      </React.Fragment>
    );
  }

  render() {
    const { listMode, showKickConfirmation } = this.props;
    return listMode
      ? (
        <ActionsContainerListItem className="ParticipantCanvas-Actions">
          {showKickConfirmation
            ? this.renderKickConfirmation()
            : this.renderActions()
          }
        </ActionsContainerListItem>
      ) : (
        <ActionsContainer className="ParticipantCanvas-Actions">
          {showKickConfirmation
            ? this.renderKickConfirmation()
            : this.renderActions()
          }
        </ActionsContainer>
      );
  }
}

const mapStateToProps = (state, ownProps) => {
  const { participant } = ownProps;
  const { componentViewStates } = state.flex.view;
  const customParticipants = componentViewStates.customParticipants || {};
  const participantState = customParticipants[participant.callSid] || {};
  const customParticipantsState = {};

  return {
    showKickConfirmation: participantState.showKickConfirmation,
    setShowKickConfirmation: value => {
      customParticipantsState[participant.callSid] = {
        ...participantState,
        showKickConfirmation: value
      };
      Actions.invokeAction('SetComponentState', {
        name: 'customParticipants',
        state: customParticipantsState
      });
    },
    clearParticipantComponentState: () => {
      customParticipantsState[participant.callSid] = undefined;
      Actions.invokeAction('SetComponentState', {
        name: 'customParticipants',
        state: customParticipantsState
      });
    }
  };
};

export default connect(mapStateToProps)(withTheme(ParticipantActionsButtons));
