// firebase.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let app;

if (!admin.apps.length) {
  let serviceAccount;
  
  // Tentar ler da variável de ambiente primeiro (Vercel/produção)
  // Aceita ambos os nomes: FIREBASE_SERVICE_ACCOUNT ou CONTA_DE_SERVIÇO_FIREBASE
  if (process.env.FIREBASE_SERVICE_ACCOUNT || process.env.CONTA_DE_SERVIÇO_FIREBASE) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.CONTA_DE_SERVIÇO_FIREBASE);
  } else {
    // Se não tiver, tentar ler do arquivo local (desenvolvimento)
    const serviceAccountPath = path.join(__dirname, 'FIREBASE_SERVICE_ACCOUNT');
    if (fs.existsSync(serviceAccountPath)) {
      const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
      serviceAccount = JSON.parse(fileContent);
    } else {
      throw new Error('Firebase Service Account não encontrado. Configure FIREBASE_SERVICE_ACCOUNT ou o arquivo FIREBASE_SERVICE_ACCOUNT');
    }
  }

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  app = admin.app();
}

const dbFirebase = admin.firestore();
const authFirebase = admin.auth();

module.exports = { admin, dbFirebase, authFirebase };