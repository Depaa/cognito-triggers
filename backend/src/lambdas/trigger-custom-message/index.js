exports.handler = async (event) => {
  console.debug(event);

  if (event.triggerSource === 'CustomMessage_SignUp') {
    event.response.emailMessage = `Welcome, use this code ${event.request.codeParameter}`;
    event.response.emailSubject = 'Welcome to my blog';
  }

  return event;
}