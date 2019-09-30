import * as React from 'react';
import { connect } from 'react-redux';
import { Actions, withTheme } from '@twilio/flex-ui';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import TextField from '@material-ui/core/TextField';
import ConferenceService from '../services/ConferenceService';

class ConferenceDialog extends React.Component {
  state = {
    conferenceTo: ''
  }

  handleClose = () => {
    this.closeDialog();
  }

  closeDialog = () => {
    Actions.invokeAction('SetComponentState', {
      name: 'ConferenceDialog',
      state: { isOpen: false }
    });
  }

  handleKeyPress = e => {
    const { key } = e;

    if (key === 'Enter') {
      this.addConferenceParticipant();
      this.closeDialog();
    }
  }

  handleChange = e => {
    const { value } = e.target;
    this.setState({ conferenceTo: value });
  }

  handleDialButton = () => {
    this.addConferenceParticipant();
    this.closeDialog();
  }

  addConferenceParticipant = async () => {
    const { conferenceTo } = this.state;
    const { from, task, task: { taskSid } } = this.props;
    const conference = task && (task.conference || {});
    const { sid } = conference;

    // Adding entered number to the conference
    console.log(`Adding ${conferenceTo} to conference`);
    let participantCallSid;
    try {
      participantCallSid = await ConferenceService.addParticipant(taskSid, from, conferenceTo);
      ConferenceService.addConnectingParticipant(sid, participantCallSid, 'unknown');
    } catch (error) {
      console.error('Error adding conference participant:', error);
    }
    this.setState({ conferenceTo: '' });
  }

  render() {
    const { isOpen } = this.props;
    const { conferenceTo } = this.state;
    return (
      <Dialog
        open={isOpen}
        onClose={this.handleClose}
      >
        <DialogContent>
          <DialogContentText>
            Enter phone number to add to the conference
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="conferenceNumber"
            label="Phone Number"
            fullWidth
            value={conferenceTo}
            onKeyPress={this.handleKeyPress}
            onChange={this.handleChange}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={this.handleDialButton}
            color="primary"
          >
            Dial
          </Button>
          <Button
            onClick={this.closeDialog}
            color="secondary"
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

const mapStateToProps = state => {
  const { componentViewStates } = state.flex.view;
  const conferenceDialogState = componentViewStates && componentViewStates.ConferenceDialog;
  const isOpen = conferenceDialogState && conferenceDialogState.isOpen;
  return {
    isOpen
  };
};

export default connect(mapStateToProps)(withTheme(ConferenceDialog));
