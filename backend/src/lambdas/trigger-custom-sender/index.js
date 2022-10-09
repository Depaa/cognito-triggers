const { buildClient, CommitmentPolicy, KmsKeyringNode } = require('@aws-crypto/client-node');
const { toByteArray } = require('base64-js');
const fetch = require('node-fetch');

// Configure the encryption SDK client with the KMS key from the environment variables.  
const { decrypt } = buildClient(CommitmentPolicy.FORBID_ENCRYPT_ALLOW_DECRYPT);
const generatorKeyId = process.env.KEY_ALIAS_ARN;
const keyIds = [process.env.KEY_ARN];
const keyring = new KmsKeyringNode({ generatorKeyId, keyIds })

const composeEmail = (type, secret) => {
  let subject = 'AWS Blog: Hey user';
  let body = `Glad you are using custom email sender trigger, the secret you are looking for is ${secret}`;

  /* there are a lot of events you can customize with ${type}:
  * CustomEmailSender_SignUp
  * CustomEmailSender_ResendCode
  * CustomEmailSender_ForgotPassword
  * CustomEmailSender_UpdateUserAttribute
  * CustomEmailSender_VerifyUserAttribute
  * CustomEmailSender_AdminCreateUser
  * CustomEmailSender_AccountTakeOverNotification
  */

  return [subject, body];
}

const composeSMS = (type, secret) => {
  let text = `Glad you are using custom SMS sender trigger, the secret you are looking for is ${secret}`;

  /* there are a lot of events you can customize with ${type}:
  * CustomSMSSender_SignUp
  * CustomSMSSender_ResendCode
  * CustomSMSSender_ForgotPassword
  * CustomSMSSender_UpdateUserAttribute
  * CustomSMSSender_VerifyUserAttribute
  * CustomSMSSender_AdminCreateUser
  * CustomSMSSender_AccountTakeOverNotification
  */

  return text;
}

const sendSMS = async (text, to) => {
  const params = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${process.env.SMS_SENDER_ID}:${process.env.SMS_API_KEY}`).toString('base64'),
    },
    body: `Body=${text}&From=${process.env.SMS_SENDER}&To=${to}`
  };

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.SMS_SENDER_ID}/Messages.json`, params);
}

const sendEmail = async (subject, body, toAddress) => {
  const params = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      'personalizations': [
        {
          'to': [
            {
              'email': toAddress,
            }
          ]
        }
      ],
      'from': {
        'email': process.env.EMAIL_SENDER,
      },
      'subject': subject,
      'content': [
        {
          'type': 'text/plain',
          'value': body,
        }
      ]
    })
  };

  await fetch('https://api.sendgrid.com/v3/mail/send', params)
}

exports.handler = async (event) => {
  console.debug(event);
  try {
    let secret;
    if (event.request.code) {
      const decryptRes = await decrypt(keyring, toByteArray(event.request.code));
      secret = decryptRes.plaintext.toString();
    }

    if (event.triggerSource.indexOf('CustomEmail', 0) !== -1) {
      const [subject, body] = composeEmail(event.triggerSource, secret);
      console.log(subject, body);
      await sendEmail(subject, body, event.request.userAttributes.email);
      console.info(`Successfully sent email to ${event.request.userAttributes.sub}`);
    } else {
      const text = composeSMS(event.triggerSource, secret);
      console.log(text);
      await sendSMS(text, event.request.userAttributes.phone_number);
      console.info(`Successfully sent SMS to ${event.request.userAttributes.sub}`);
    }
  } catch (e) {
    console.error(e)
  }

  return event;
}