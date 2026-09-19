# Firebase Service Account Credentials

Place your Firebase Admin SDK service account key file in this directory with the exact filename:

```
firebase-service-account.json
```

### How to get this file from Firebase:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your **Prithvi Shield** project.
3. Click the gear icon (⚙️) next to **Project Overview** in the left sidebar and choose **Project settings**.
4. Navigate to the **Service accounts** tab.
5. Click **Generate new private key** and confirm by clicking **Generate key**.
6. A JSON file will be downloaded to your computer.
7. Rename that downloaded JSON file to `firebase-service-account.json` and move it into this folder (`PRITHVI_SHIELD_BACKEND/credentials/`).

> [!CAUTION]
> **NEVER commit this JSON file to GitHub or share it publicly.** It grants full administrative access to your Firebase Firestore database and Authentication services.
