<h1>Amazon Cognito Triggers: all you need to know about them | Part 1</h1>
You can read the blogpost here: <a href="https://depascalematteo.medium.com/all-you-need-to-know-about-amazon-cognito-triggers-part-1-57085a126ac1?source=friends_link&sk=04c5171ad4b7170c0fd949ad289b84b5">https://depascalematteo.medium.com/all-you-need-to-know-about-amazon-cognito-triggers-part-1-57085a126ac1</a>

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
