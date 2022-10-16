<h1> All you need to know about Amazon Cognito Triggers | Part 1 </h1>
You can read the blogpost here:

# Cognito users pool Stack
## User pool
## App client
## Lambda role
## Lambda triggers
### PRE_AUTHENTICATION [✅] 
### POST_AUTHENTICATION [✅]
### PRE_TOKEN_GENERATION [✅]
### PRE_SIGN_UP [✅]
### POST_CONFIRMATION [✅]
### USER_MIGRATION [✅]
### CUSTOM_MESSAGE [✅]
### CUSTOM_EMAIL_SENDER [✅]
### CUSTOM_SMS_SENDER [✅]
### DEFINE_AUTH_CHALLENGE [❌]
### CREATE_AUTH_CHALLENGE [❌]
### VERIFY_AUTH_CHALLENGE_RESPONSE [❌]


# Users table Stack
## Dynamodb users table

# Signup reminders Stack
## Stepfunction steps:
1. Wait 
2. Remind user
3. Wait
4. Notify & Delete user
