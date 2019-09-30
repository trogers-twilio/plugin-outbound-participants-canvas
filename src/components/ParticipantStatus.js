import * as React from 'react';
import { connect } from 'react-redux';
import styled from 'react-emotion';
import {
  withTheme,
  templates,
  Template
} from '@twilio/flex-ui';

const Status = styled('div')`
  font-size: 12px;
`;

const StatusListItem = styled('div')`
  font-size: 10px;
`;

class ParticipantStatus extends React.PureComponent {
  render() {
    const { listMode, participant, showKickConfirmation } = this.props;
    let statusTemplate = templates.CallParticipantStatusLive;

    if (participant.onHold) {
      statusTemplate = templates.CallParticipantStatusOnHold;
    }
    if (participant.status === 'recently_left') {
      statusTemplate = templates.CallParticipantStatusLeft;
    }
    if (participant.connecting) {
      statusTemplate = templates.CallParticipantStatusConnecting;
    }
    if (showKickConfirmation) {
      statusTemplate = templates.CallParticipantStatusKickConfirmation;
    }

    return listMode
      ? (
        <StatusListItem className="ParticipantCanvas-Status">
          <Template source={statusTemplate} />
        </StatusListItem>
      ) : (
        <Status className="ParticipantCanvas-Status">
          <Template source={statusTemplate} />
        </Status>
      );
  }
}

const mapStateToProps = (state, ownProps) => {
  const { participant } = ownProps;
  const { componentViewStates } = state.flex.view;
  const customParticipants = componentViewStates.customParticipants || {};
  const participantState = customParticipants[participant.callSid];

  return {
    showKickConfirmation: participantState && participantState.showKickConfirmation
  };
};

export default connect(mapStateToProps)(withTheme(ParticipantStatus));
