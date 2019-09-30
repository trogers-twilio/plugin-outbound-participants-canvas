import * as React from 'react';
import {
  Actions,
  IconButton,
  TaskHelper,
  withTheme
} from '@twilio/flex-ui';

class ConferenceButton extends React.PureComponent {
  handleClick = () => {
    Actions.invokeAction('SetComponentState', {
      name: 'ConferenceDialog',
      state: { isOpen: true }
    });
  }

  render() {
    const { task, theme } = this.props;
    const isLiveCall = TaskHelper.isLiveCall(task);

    return (
      <React.Fragment>
        <IconButton
          icon="Add"
          disabled={!isLiveCall}
          onClick={this.handleClick}
          themeOverride={theme.CallCanvas.Button}
          title="Add conference participant"
        />
      </React.Fragment>
    );
  }
}

export default withTheme(ConferenceButton);
