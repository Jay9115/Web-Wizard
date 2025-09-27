import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/config/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'No ID token provided' },
        { status: 400 }
      );
    }

    // Verify the ID token using Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // You can now use the verified user information
    // For example, fetch user data from Firestore, create custom claims, etc.
    
    return NextResponse.json({
      message: 'Token verified successfully',
      uid: uid,
      email: decodedToken.email,
    });

  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}