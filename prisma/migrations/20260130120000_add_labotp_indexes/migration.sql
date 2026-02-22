-- Add indexes for OTP rate limiting
CREATE INDEX "LabOtpChallenge_email_idx" ON "LabOtpChallenge"("email");
CREATE INDEX "LabOtpChallenge_ip_idx" ON "LabOtpChallenge"("ip");
