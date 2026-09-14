/**
 * FILE: server/services/otpService.js
 * PURPOSE: Service to handle generation, sending (via Twilio Verify, MSG91, or console stub), and verification of SMS OTPs.
 */

import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import twilio from 'twilio';

// Twilio Config
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

// MSG91 Config
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;

const OTP_EXPIRY_MINUTES = 5;

let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

function formatE164(phoneNumber) {
  let cleaned = phoneNumber.replace(/[^0-9+]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
}

export async function sendOtp(phoneNumber) {
  const formattedPhone = formatE164(phoneNumber);

  // 1. TWILIO VERIFY (if configured)
  if (twilioClient && TWILIO_VERIFY_SERVICE_SID) {
    try {
      const verification = await twilioClient.verify.v2
        .services(TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({ to: formattedPhone, channel: 'sms' });

      console.log('[OTP Service] Twilio OTP initiated to ' + formattedPhone + ', status: ' + verification.status);
      return { success: true, message: 'OTP sent successfully via Twilio' };
    } catch (err) {
      console.error('[OTP Service] Twilio Verify error:', err);
      throw new Error(err.message || 'Failed to send OTP via Twilio');
    }
  }

  // 2. MSG91 GATEWAY (if configured)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpVerification.create({
    data: {
      phoneNumber,
      hashedOtp,
      expiresAt,
    },
  });

  if (MSG91_AUTH_KEY && MSG91_TEMPLATE_ID) {
    try {
      const sanitizedPhone = formattedPhone.replace('+', '');
      const response = await fetch(
        'https://control.msg91.com/api/v5/otp?template_id=' + MSG91_TEMPLATE_ID + '&mobile=' + sanitizedPhone + '&otp=' + otp,
        {
          method: 'POST',
          headers: {
            authkey: MSG91_AUTH_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      if (result.type === 'error') {
        throw new Error(result.message || 'Failed to send OTP via MSG91');
      }
      console.log('[OTP Service] Sent OTP to ' + formattedPhone + ' via MSG91.');
      return { success: true, message: 'OTP sent successfully' };
    } catch (err) {
      console.error('[OTP Service] Error calling MSG91:', err);
      throw new Error('Failed to deliver OTP message.');
    }
  }

  // 3. DEVELOPMENT CONSOLE STUB MODE (Zero config fallback)
  console.log('\n=============================================');
  console.log('[OTP Service] STUB MODE - No SMS Gateway Configured');
  console.log('[OTP Service] Phone Number : ' + formattedPhone);
  console.log('[OTP Service] 6-Digit OTP  : ' + otp);
  console.log('=============================================\n');

  return { success: true, message: 'OTP sent successfully (Development Stub Mode)', devOtpCode: otp };
}

export async function verifyOtp(phoneNumber, code) {
  const formattedPhone = formatE164(phoneNumber);

  // 1. TWILIO CHECK (if configured)
  if (twilioClient && TWILIO_VERIFY_SERVICE_SID) {
    try {
      const check = await twilioClient.verify.v2
        .services(TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({ to: formattedPhone, code: code.trim() });

      if (check.status === 'approved') {
        return { success: true };
      } else {
        throw new Error('Invalid or expired OTP code.');
      }
    } catch (err) {
      console.error('[OTP Service] Twilio Verification failed:', err.message);
      throw new Error(err.message || 'Invalid OTP code.');
    }
  }

  // 2. LOCAL PRISMA DB VERIFICATION (Stub / MSG91)
  const hashedInput = crypto.createHash('sha256').update(code.trim()).digest('hex');

  const record = await prisma.otpVerification.findFirst({
    where: {
      phoneNumber,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    throw new Error('No valid OTP found or OTP has expired. Please request a new one.');
  }

  if (record.verified) {
    throw new Error('This OTP has already been used.');
  }

  if (record.hashedOtp !== hashedInput) {
    throw new Error('Invalid OTP code.');
  }

  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return { success: true };
}
