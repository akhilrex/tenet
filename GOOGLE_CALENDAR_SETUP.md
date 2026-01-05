# Google Calendar Setup

To enable Google Calendar integration in Tenet, you need to set up a Google Cloud Project and obtain an OAuth Access Token.

## Prerequisites

- A Google Cloud Project
- Google Calendar API enabled

## Method 1: Easy (Manual Token)

For personal use, you can get a temporary access token from Google OAuth Playground.

1. Go to [Google OAuth Playground](https://developers.google.com/oauthplayground/).
2. In the "Input your own scopes" box, enter `https://www.googleapis.com/auth/calendar.readonly` and authorize.
3. Exchange authorization code for tokens.
4. Copy the **Access Token**.
5. Add it to your `.env` file:

```bash
GOOGLE_ACCESS_TOKEN=your_token_here
```

*Note: This token expires after 1 hour. For permanent access, you need to implement the full OAuth flow or use a service account (advanced).*

## Method 2: Service Account (Advanced)

1. Create a Service Account in Google Cloud Console.
2. Download the JSON key.
3. Share your personal Google Calendar with the Service Account email address.
4. Update the code to use regular Google Auth libraries with the service account key (not implemented in MVP).

## Features

- [x] Read-only events overlay
- [x] 12h format
- [x] Distinct visual style (greyed out)
