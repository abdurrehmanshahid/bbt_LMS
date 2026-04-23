# TESTS.md — Full Test Suite Specification
## Security Tests + Functional Tests + Load Tests + E2E Tests

---

## TESTING PHILOSOPHY

Every feature ships with tests written BEFORE or ALONGSIDE code — never after.
Coverage minimums: service layer 80%, controllers 70%, critical auth/payment paths 100%.
Tests run on every PR before any merge. No merge without green tests.

---

## PART 1 — SECURITY TESTS

These are non-negotiable. Every one must pass before any code ships.

---

### SEC-001: Authentication Bypass Tests

```typescript
// apps/api/src/auth/__tests__/auth.security.spec.ts

describe('SEC-001: Authentication Bypass', () => {

  it('should reject expired JWT tokens', async () => {
    const expiredToken = generateToken({ userId: 'u1', exp: Date.now() / 1000 - 3600 });
    const res = await request(app).get('/api/profile').set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });

  it('should reject tampered JWT payload', async () => {
    const token = generateToken({ userId: 'u1', role: 'learner' });
    const [header, payload, sig] = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: 'u1', role: 'admin' })).toString('base64url');
    const tamperedToken = `${header}.${tamperedPayload}.${sig}`;
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${tamperedToken}`);
    expect(res.status).toBe(401);
  });

  it('should reject JWT signed with wrong secret', async () => {
    const fakeToken = jwt.sign({ userId: 'u1', role: 'admin' }, 'wrong-secret');
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${fakeToken}`);
    expect(res.status).toBe(401);
  });

  it('should reject requests with no Authorization header on protected routes', async () => {
    const protectedRoutes = [
      '/api/learner/feed',
      '/api/creator/upload',
      '/api/admin/moderation',
      '/api/employer/talent',
    ];
    for (const route of protectedRoutes) {
      const res = await request(app).get(route);
      expect(res.status).toBe(401);
    }
  });

  it('should enforce role-based access control', async () => {
    const learnerToken = generateToken({ userId: 'u1', role: 'learner' });
    const adminRoutes = ['/api/admin/moderation', '/api/admin/users', '/api/admin/revenue'];
    for (const route of adminRoutes) {
      const res = await request(app).get(route).set('Authorization', `Bearer ${learnerToken}`);
      expect(res.status).toBe(403);
    }
  });

  it('should block learner accessing creator-only endpoints', async () => {
    const learnerToken = generateToken({ userId: 'u1', role: 'learner' });
    const res = await request(app).post('/api/creator/upload').set('Authorization', `Bearer ${learnerToken}`);
    expect(res.status).toBe(403);
  });

  it('should block Tier 1 creator accessing Tier 2+ endpoints', async () => {
    const tier1Token = generateToken({ userId: 'c1', role: 'creator', tier: 1 });
    const res = await request(app).post('/api/creator/live/schedule').set('Authorization', `Bearer ${tier1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('TIER_INSUFFICIENT');
  });

  it('should invalidate refresh token after use (rotation)', async () => {
    const { refreshToken } = await loginUser('test@bbt.edu.pk', 'Password123!');
    await request(app).post('/api/auth/refresh').send({ refreshToken }); // First use — OK
    const res2 = await request(app).post('/api/auth/refresh').send({ refreshToken }); // Second use — should fail
    expect(res2.status).toBe(401);
    expect(res2.body.code).toBe('REFRESH_TOKEN_REUSED');
  });

  it('should lock account after 5 consecutive failed login attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send({ email: 'victim@bbt.edu.pk', password: 'wrong' });
    }
    const res = await request(app).post('/api/auth/login').send({ email: 'victim@bbt.edu.pk', password: 'correct' });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('ACCOUNT_LOCKED');
  });

});
```

---

### SEC-002: Injection Attack Tests

```typescript
// apps/api/src/content/__tests__/injection.security.spec.ts

describe('SEC-002: Injection Attacks', () => {

  const sqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1' UNION SELECT password FROM users--",
    "' OR 1=1--",
  ];

  const xssPayloads = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
    '<svg onload=alert(1)>',
    '"><script>document.cookie</script>',
  ];

  const noSqlPayloads = [
    '{"$gt": ""}',
    '{"$where": "1==1"}',
    { $regex: '.*' },
  ];

  it.each(sqlPayloads)('should not execute SQL injection: %s', async (payload) => {
    const token = generateToken({ userId: 'u1', role: 'learner' });
    const res = await request(app)
      .get('/api/content/search')
      .query({ q: payload })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).not.toBe(500);
    expect(res.body.error).not.toContain('syntax error');
    expect(res.body.error).not.toContain('ORA-');
  });

  it.each(xssPayloads)('should sanitise XSS payload in creator bio: %s', async (payload) => {
    const token = generateToken({ userId: 'c1', role: 'creator', tier: 2 });
    const res = await request(app)
      .patch('/api/creator/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: payload });
    expect(res.status).toBe(200);
    expect(res.body.bio).not.toContain('<script>');
    expect(res.body.bio).not.toContain('onerror=');
    expect(res.body.bio).not.toContain('javascript:');
  });

  it.each(noSqlPayloads)('should not allow NoSQL injection in search', async (payload) => {
    const token = generateToken({ userId: 'u1', role: 'learner' });
    const res = await request(app)
      .post('/api/content/search')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: payload });
    expect(res.status).toBe(400); // Validation should reject
  });

  it('should reject content title with script tags', async () => {
    const token = generateToken({ userId: 'c1', role: 'creator', tier: 2 });
    const res = await request(app)
      .post('/api/content/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '<script>alert(1)</script>', trackId: 'track-05' });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe('title');
  });

});
```

---

### SEC-003: CSRF + CORS Tests

```typescript
describe('SEC-003: CSRF and CORS', () => {

  it('should reject state-mutating requests without CSRF token from browser origin', async () => {
    const res = await request(app)
      .post('/api/learner/enroll')
      .set('Origin', 'https://malicious-site.com')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('trackId=track-01');
    expect(res.status).toBe(403);
  });

  it('should enforce CORS — reject requests from unlisted origins', async () => {
    const res = await request(app)
      .get('/api/content/search')
      .set('Origin', 'https://competitor-site.com');
    expect(res.headers['access-control-allow-origin']).not.toBe('https://competitor-site.com');
  });

  it('should allow CORS from whitelisted origins', async () => {
    const allowedOrigins = ['https://bbt.edu.pk', 'https://bigbinarytech.com', 'http://localhost:3000'];
    for (const origin of allowedOrigins) {
      const res = await request(app).get('/api/tracks').set('Origin', origin);
      expect(res.headers['access-control-allow-origin']).toBe(origin);
    }
  });

  it('should include SameSite=Strict on refresh token cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'u@bbt.edu.pk', password: 'Pass123!' });
    const cookie = res.headers['set-cookie']?.[0] || '';
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
  });

});
```

---

### SEC-004: Rate Limiting Tests

```typescript
describe('SEC-004: Rate Limiting', () => {

  it('should rate limit login attempts to 10/min per IP', async () => {
    const requests = Array(11).fill(null).map(() =>
      request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'wrong' })
    );
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  it('should rate limit API to 1000 req/min per authenticated user', async () => {
    const token = generateToken({ userId: 'u1', role: 'learner' });
    // Simulate burst of 1001 requests
    const responses = await Promise.all(
      Array(1001).fill(null).map(() =>
        request(app).get('/api/learner/feed').set('Authorization', `Bearer ${token}`)
      )
    );
    expect(responses.some(r => r.status === 429)).toBe(true);
  });

  it('should rate limit content upload to 10/min per creator', async () => {
    const token = generateToken({ userId: 'c1', role: 'creator', tier: 2 });
    const responses = await Promise.all(
      Array(11).fill(null).map(() =>
        request(app).post('/api/creator/upload').set('Authorization', `Bearer ${token}`).send({})
      )
    );
    expect(responses.some(r => r.status === 429)).toBe(true);
  });

});
```

---

### SEC-005: Payment Security Tests

```typescript
describe('SEC-005: Payment Security', () => {

  it('should verify Stripe webhook signature before processing', async () => {
    const fakePayload = JSON.stringify({ type: 'payment_intent.succeeded', data: {} });
    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'fake-signature')
      .send(fakePayload);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_WEBHOOK_SIGNATURE');
  });

  it('should not allow learner to change subscription price via API manipulation', async () => {
    const token = generateToken({ userId: 'u1', role: 'learner' });
    const res = await request(app)
      .post('/api/learner/enroll')
      .set('Authorization', `Bearer ${token}`)
      .send({ trackId: 'track-01', price: 0 }); // Attempt to set price to 0
    expect(res.status).not.toBe(200);
    // Actual price must come from server-side product catalog
  });

  it('should not expose full card numbers or CVV in any API response', async () => {
    const token = generateToken({ userId: 'u1', role: 'learner' });
    const res = await request(app)
      .get('/api/learner/payment-methods')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    res.body.forEach((pm: any) => {
      expect(pm.number).toBeUndefined();
      expect(pm.cvv).toBeUndefined();
      expect(pm.last4?.length).toBe(4); // Only last 4 digits
    });
  });

  it('should prevent double-charging on duplicate enrollment requests', async () => {
    const token = generateToken({ userId: 'u1', role: 'learner' });
    const enrollPayload = { trackId: 'track-01', paymentMethodId: 'pm_test_123' };
    const [res1, res2] = await Promise.all([
      request(app).post('/api/learner/enroll').set('Authorization', `Bearer ${token}`).send(enrollPayload),
      request(app).post('/api/learner/enroll').set('Authorization', `Bearer ${token}`).send(enrollPayload),
    ]);
    // One should succeed, one should return idempotency conflict
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toContain(200);
    expect(statuses.some(s => s === 409 || s === 200)).toBe(true);
  });

});
```

---

### SEC-006: Data Exposure Tests

```typescript
describe('SEC-006: Data Exposure', () => {

  it('should not expose other learner PII in cohort endpoint', async () => {
    const token = generateToken({ userId: 'u1', role: 'learner' });
    const res = await request(app).get('/api/cohort/my-cohort').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    res.body.members.forEach((member: any) => {
      expect(member.email).toBeUndefined();
      expect(member.phone).toBeUndefined();
      expect(member.paymentDetails).toBeUndefined();
      // Only displayName, avatarUrl, progress should be present
    });
  });

  it('should not expose password hash in any user response', async () => {
    const adminToken = generateToken({ userId: 'admin1', role: 'admin' });
    const res = await request(app).get('/api/admin/users/u1').set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.password).toBeUndefined();
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('should return 403 when learner tries to access another learner portfolio in edit mode', async () => {
    const token = generateToken({ userId: 'u1', role: 'learner' });
    const res = await request(app).patch('/api/learner/portfolio').set('Authorization', `Bearer ${token}`).send({ learnerId: 'u2' });
    expect(res.status).toBe(403);
  });

  it('should not leak internal stack traces in production error responses', async () => {
    process.env.NODE_ENV = 'production';
    const res = await request(app).get('/api/nonexistent-route-that-throws');
    expect(res.body.stack).toBeUndefined();
    expect(res.body.query).toBeUndefined(); // No Prisma query leakage
    process.env.NODE_ENV = 'test';
  });

  it('should enforce row-level security — employer cannot see talent outside their package', async () => {
    const freeEmployerToken = generateToken({ userId: 'emp1', role: 'employer', subscriptionTier: 'free' });
    const res = await request(app)
      .get('/api/employer/talent/learner-u99/contact')
      .set('Authorization', `Bearer ${freeEmployerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SUBSCRIPTION_REQUIRED');
  });

});
```

---

### SEC-007: Assessment Integrity Tests

```typescript
describe('SEC-007: Assessment Integrity', () => {

  it('should reject assessment submission that is faster than minimum content length', async () => {
    const token = generateToken({ userId: 'u1', role: 'learner' });
    // Module content is 20 minutes long. Submitting after 30 seconds is suspicious.
    const res = await request(app)
      .post('/api/assessment/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        moduleId: 'mod-001',
        answers: [{ questionId: 'q1', answer: 'A' }],
        clientTimestamp: Date.now(),
        sessionStartedAt: Date.now() - 30000, // 30 seconds — impossible
      });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('SUBMISSION_TOO_FAST');
  });

  it('should flag assessment if IP changes between start and submission', async () => {
    // Implementation: assessment session stored with starting IP
    // Submission from different IP → flag for review
    const token = generateToken({ userId: 'u1', role: 'learner' });
    await request(app)
      .post('/api/assessment/start')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Forwarded-For', '192.168.1.1')
      .send({ moduleId: 'mod-001' });

    const res = await request(app)
      .post('/api/assessment/submit')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Forwarded-For', '10.0.0.5') // Different IP
      .send({ moduleId: 'mod-001', answers: [] });

    // Should either reject or flag for review
    expect([200, 422].includes(res.status)).toBe(true);
    if (res.status === 200) {
      expect(res.body.flaggedForReview).toBe(true);
    }
  });

  it('should prevent submitting assessment before completing module video', async () => {
    const token = generateToken({ userId: 'u1', role: 'learner' });
    // No video completion event recorded for this learner/module
    const res = await request(app)
      .post('/api/assessment/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ moduleId: 'mod-002', answers: [] });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('MODULE_NOT_COMPLETED');
  });

  it('should block re-attempt within 24h lockout period', async () => {
    const token = generateToken({ userId: 'u1', role: 'learner' });
    // First attempt: fail
    await request(app)
      .post('/api/assessment/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ moduleId: 'mod-001', answers: [{ questionId: 'q1', answer: 'WRONG' }] });

    // Immediate second attempt:
    const res = await request(app)
      .post('/api/assessment/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ moduleId: 'mod-001', answers: [] });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe('RETRY_LOCKED');
    expect(res.body.retryAfter).toBeGreaterThan(0);
  });

});
```

---

### SEC-008: Content Upload Security Tests

```typescript
describe('SEC-008: Content Upload Security', () => {

  it('should reject executable files disguised as videos', async () => {
    const token = generateToken({ userId: 'c1', role: 'creator', tier: 2 });
    const maliciousFile = Buffer.from('#!/bin/bash\nrm -rf /');
    const res = await request(app)
      .post('/api/creator/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', maliciousFile, { filename: 'lecture.mp4', contentType: 'video/mp4' });
    // Magic bytes check — actual MP4 starts with specific bytes
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('INVALID_FILE_TYPE');
  });

  it('should enforce maximum file size limit (3GB)', async () => {
    const token = generateToken({ userId: 'c1', role: 'creator', tier: 2 });
    const oversizedBuffer = Buffer.alloc(3.5 * 1024 * 1024 * 1024); // 3.5GB
    const res = await request(app)
      .post('/api/creator/upload')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Length', String(oversizedBuffer.length));
    expect(res.status).toBe(413);
  });

  it('should scan uploaded content metadata for injection attempts', async () => {
    const token = generateToken({ userId: 'c1', role: 'creator', tier: 2 });
    const res = await request(app)
      .post('/api/creator/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '<script>steal()</script>',
        description: "'; DROP TABLE content; --",
        trackId: 'track-01'
      });
    expect(res.status).toBe(400);
  });

  it('should verify Mux asset ownership before publishing', async () => {
    const creatorToken = generateToken({ userId: 'c1', role: 'creator', tier: 2 });
    const anotherCreatorAssetId = 'mux-asset-belonging-to-c2';
    const res = await request(app)
      .post('/api/creator/content/publish')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ muxAssetId: anotherCreatorAssetId, trackId: 'track-01' });
    expect(res.status).toBe(403);
  });

});
```

---

## PART 2 — FUNCTIONAL TESTS

---

### FUNC-001: Learner Onboarding Flow

```typescript
describe('FUNC-001: Learner Onboarding', () => {

  it('should complete signup → quiz → track selection → cohort assignment flow', async () => {
    // Step 1: Signup
    const signupRes = await request(app).post('/api/auth/signup').send({
      email: 'newlearner@test.com',
      password: 'Password123!',
      name: 'Test Learner',
    });
    expect(signupRes.status).toBe(201);
    const { accessToken } = signupRes.body;

    // Step 2: Submit onboarding quiz
    const quizRes = await request(app)
      .post('/api/learner/onboarding/quiz')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        goal: 'get_job',
        background: 'computer_science_student',
        timeAvailable: '10_hours_week',
        preferredOutcome: 'full_time_employment',
        currentLevel: 'beginner',
      });
    expect(quizRes.status).toBe(200);
    expect(quizRes.body.recommendedTrack).toBeDefined();

    // Step 3: Select track
    const trackRes = await request(app)
      .post('/api/learner/enroll/free')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ trackId: quizRes.body.recommendedTrack });
    expect(trackRes.status).toBe(200);

    // Step 4: Verify cohort assignment (within 60 seconds)
    await sleep(100); // In tests, cohort assignment is synchronous
    const cohortRes = await request(app)
      .get('/api/learner/cohort')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(cohortRes.status).toBe(200);
    expect(cohortRes.body.cohortId).toBeDefined();
    expect(cohortRes.body.memberCount).toBeGreaterThan(0);
  });

  it('should map quiz answers correctly to tracks', async () => {
    const quizMappings = [
      { answers: { goal: 'ai_developer', background: 'any' }, expectedTrack: 'track-01' },
      { answers: { goal: 'cloud_engineer', background: 'any' }, expectedTrack: 'track-02' },
      { answers: { goal: 'erp_developer', background: 'any' }, expectedTrack: 'track-03' },
      { answers: { goal: 'cybersecurity', background: 'any' }, expectedTrack: 'track-05' },
    ];
    for (const { answers, expectedTrack } of quizMappings) {
      const res = await request(app).post('/api/learner/onboarding/quiz').send(answers);
      expect(res.body.recommendedTrack).toBe(expectedTrack);
    }
  });

});
```

---

### FUNC-002: Module Progression + Assessment

```typescript
describe('FUNC-002: Module Progression', () => {

  it('should gate next module behind passing current assessment', async () => {
    const token = generateLearnerToken('u1', 'track-05');

    // Complete module video
    await recordVideoCompletion(token, 'mod-001');

    // Submit failing assessment
    const failRes = await request(app)
      .post('/api/assessment/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ moduleId: 'mod-001', answers: [{ questionId: 'q1', answer: 'WRONG' }] });
    expect(failRes.body.score).toBeLessThan(60);

    // Try to access next module
    const nextModRes = await request(app)
      .get('/api/learner/module/mod-002')
      .set('Authorization', `Bearer ${token}`);
    expect(nextModRes.status).toBe(403);
    expect(nextModRes.body.code).toBe('PREREQUISITE_NOT_MET');
  });

  it('should issue skill badge after passing assessment', async () => {
    const token = generateLearnerToken('u1', 'track-05');
    await recordVideoCompletion(token, 'mod-001');

    const res = await request(app)
      .post('/api/assessment/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        moduleId: 'mod-001',
        answers: [
          { questionId: 'q1', answer: 'A' }, // Correct
          { questionId: 'q2', answer: 'C' }, // Correct
          { questionId: 'q3', answer: 'B' }, // Correct
        ],
      });

    expect(res.body.score).toBeGreaterThanOrEqual(60);
    expect(res.body.badgeIssued).toBe(true);
    expect(res.body.badge.standard).toBe('OpenBadges3.0');
    expect(res.body.badge.conceptId).toBeDefined();
  });

  it('should enforce 24h retry lockout after failed assessment', async () => {
    const token = generateLearnerToken('u2', 'track-01');
    await recordVideoCompletion(token, 'mod-001');
    await submitFailingAssessment(token, 'mod-001');

    const retryRes = await request(app)
      .post('/api/assessment/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ moduleId: 'mod-001', answers: [] });

    expect(retryRes.status).toBe(429);
    expect(retryRes.body.retryAfterHours).toBeCloseTo(24, 0);
  });

});
```

---

### FUNC-003: Creator Upload + Moderation

```typescript
describe('FUNC-003: Creator Upload + Moderation', () => {

  it('should enter moderation queue on upload and not be publicly visible', async () => {
    const creatorToken = generateCreatorToken('c1', 2);

    const uploadRes = await request(app)
      .post('/api/creator/upload')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        title: 'Introduction to Firewalls',
        trackId: 'track-05',
        type: 'reel',
        muxAssetId: 'mux_test_asset_001',
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.status).toBe('PENDING_MODERATION');

    // Verify NOT publicly accessible yet
    const publicRes = await request(app).get(`/api/content/${uploadRes.body.id}`);
    expect(publicRes.status).toBe(404); // Hidden until approved
  });

  it('should publish content after admin approval', async () => {
    const contentId = await uploadContent('c1', 'track-05');
    const adminToken = generateAdminToken('admin1');

    await request(app)
      .post(`/api/admin/moderation/${contentId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const publicRes = await request(app).get(`/api/content/${contentId}`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.status).toBe('PUBLISHED');
  });

  it('should send structured feedback to creator on rejection', async () => {
    const contentId = await uploadContent('c2', 'track-01');
    const adminToken = generateAdminToken('admin1');

    await request(app)
      .post(`/api/admin/moderation/${contentId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'AUDIO_QUALITY',
        feedback: 'Audio level too low at timestamp 0:45. Use a condenser microphone.',
        timestampRef: '0:45',
      });

    // Creator should receive structured feedback
    const creatorToken = generateCreatorToken('c2', 2);
    const inboxRes = await request(app)
      .get('/api/creator/moderation-inbox')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(inboxRes.body[0].contentId).toBe(contentId);
    expect(inboxRes.body[0].feedback.reason).toBe('AUDIO_QUALITY');
    expect(inboxRes.body[0].feedback.timestampRef).toBe('0:45');
  });

});
```

---

### FUNC-004: Payment + Subscription

```typescript
describe('FUNC-004: Payment + Subscription', () => {

  it('should create subscription via Stripe and grant track access', async () => {
    const token = generateLearnerToken('u3', null);

    const res = await request(app)
      .post('/api/learner/enroll')
      .set('Authorization', `Bearer ${token}`)
      .send({
        trackId: 'track-05',
        plan: 'monthly',
        paymentMethodId: 'pm_card_visa', // Stripe test PM
      });

    expect(res.status).toBe(200);
    expect(res.body.subscriptionId).toBeDefined();
    expect(res.body.accessGranted).toBe(true);

    // Verify track is accessible
    const trackRes = await request(app)
      .get('/api/learner/track/track-05/modules')
      .set('Authorization', `Bearer ${token}`);
    expect(trackRes.status).toBe(200);
    expect(trackRes.body.modules.length).toBeGreaterThan(2); // Full access
  });

  it('should restrict to 2 modules on free tier', async () => {
    const token = generateLearnerToken('u4', 'track-01'); // Free enroll

    const res = await request(app)
      .get('/api/learner/track/track-01/modules')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const accessibleModules = res.body.modules.filter((m: any) => !m.locked);
    expect(accessibleModules.length).toBeLessThanOrEqual(2);
  });

  it('should handle payment failure gracefully without granting access', async () => {
    const token = generateLearnerToken('u5', null);

    const res = await request(app)
      .post('/api/learner/enroll')
      .set('Authorization', `Bearer ${token}`)
      .send({
        trackId: 'track-02',
        plan: 'monthly',
        paymentMethodId: 'pm_card_chargeDeclined', // Stripe test: always declines
      });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe('PAYMENT_FAILED');

    // Verify NO track access granted
    const trackRes = await request(app)
      .get('/api/learner/track/track-02/modules')
      .set('Authorization', `Bearer ${token}`);
    const accessibleModules = trackRes.body.modules.filter((m: any) => !m.locked);
    expect(accessibleModules.length).toBeLessThanOrEqual(2); // Still free tier
  });

});
```

---

### FUNC-005: Cohort + Social Features

```typescript
describe('FUNC-005: Cohort and Social', () => {

  it('should broadcast cohort activity to members via WebSocket', (done) => {
    const socket1 = io(testServerUrl, { auth: { token: learnerToken1 } });
    const socket2 = io(testServerUrl, { auth: { token: learnerToken2 } });

    socket1.on('cohort:memberProgress', (data: any) => {
      expect(data.memberId).toBeDefined();
      expect(data.event).toBe('MODULE_COMPLETED');
      done();
    });

    socket1.on('connect', () => {
      socket1.emit('cohort:join', { cohortId: 'cohort-test-001' });
      socket2.emit('cohort:join', { cohortId: 'cohort-test-001' });
      // Learner 2 completes a module → triggers broadcast to learner 1
      triggerModuleCompletion(learnerToken2, 'mod-003');
    });
  });

  it('should auto-create new cohort when none available within 48h', async () => {
    // Enroll learner when all existing cohorts are full
    const token = generateLearnerToken('u_isolated', 'track-06');

    await request(app).post('/api/cohort/fill-all-for-test').send({ trackId: 'track-06' }); // Test helper

    const res = await request(app)
      .post('/api/cohort/auto-assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ trackId: 'track-06' });

    expect(res.status).toBe(200);
    expect(res.body.newCohortCreated).toBe(true);
    expect(res.body.cohortId).toBeDefined();
  });

});
```

---

## PART 3 — E2E TESTS (Playwright)

```typescript
// apps/e2e/tests/learner-journey.spec.ts

import { test, expect } from '@playwright/test';

test.describe('E2E: Complete Learner Journey', () => {

  test('signup → quiz → enroll → watch video → pass assessment → badge issued', async ({ page }) => {
    // Signup
    await page.goto('/auth/signup');
    await page.fill('[name="name"]', 'E2E Test Learner');
    await page.fill('[name="email"]', `e2e-${Date.now()}@test.com`);
    await page.fill('[name="password"]', 'Password123!');
    await page.click('[data-testid="signup-submit"]');
    await expect(page).toHaveURL('/onboarding/quiz');

    // Complete quiz
    await page.click('[data-value="get_job"]');
    await page.click('[data-value="computer_science_student"]');
    await page.click('[data-value="cybersecurity_interest"]');
    await page.click('[data-testid="quiz-submit"]');
    await expect(page.locator('[data-testid="recommended-track"]')).toBeVisible();

    // Enroll free
    await page.click('[data-testid="enroll-free-btn"]');
    await expect(page).toHaveURL(/\/track\/track-05/);

    // Watch video (mock completion)
    await page.click('[data-testid="module-01"]');
    await expect(page.locator('video')).toBeVisible();
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('videoCompleted', { detail: { moduleId: 'mod-001' } }));
    });

    // Take assessment
    await page.click('[data-testid="take-assessment-btn"]');
    await page.click('[data-testid="answer-A"]'); // Correct answer
    await page.click('[data-testid="submit-assessment"]');

    // Verify badge issued
    await expect(page.locator('[data-testid="badge-issued-toast"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="badge-issued-toast"]')).toContainText('Skill Badge Earned');
  });

  test('public concept page is discoverable and loads with SSR', async ({ page }) => {
    const response = await page.goto('/concepts/what-is-a-firewall');
    expect(response?.status()).toBe(200);

    // Check SSR meta tags for discovery
    const title = await page.title();
    expect(title).toContain('firewall');

    const description = await page.$eval('meta[name="description"]', el => el.getAttribute('content'));
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(50);

    // Content is rendered on page (not blank SSR)
    await expect(page.locator('[data-testid="concept-transcript"]')).toBeVisible();
    await expect(page.locator('[data-testid="enroll-cta"]')).toBeVisible();
  });

  test('creator upload → moderation → publish → visible in learner feed', async ({ browser }) => {
    const creatorContext = await browser.newContext({ storageState: 'creator-auth.json' });
    const creatorPage = await creatorContext.newPage();
    const learnerContext = await browser.newContext({ storageState: 'learner-auth.json' });
    const learnerPage = await learnerContext.newPage();

    // Creator uploads content
    await creatorPage.goto('/creator/upload');
    await creatorPage.fill('[name="title"]', 'E2E Test Reel');
    await creatorPage.selectOption('[name="trackId"]', 'track-05');
    await creatorPage.click('[data-testid="upload-submit"]');
    await expect(creatorPage.locator('[data-testid="upload-status"]')).toContainText('Pending Review');

    // Admin approves (API shortcut in test env)
    await approveLatestContent();

    // Learner sees it in feed
    await learnerPage.goto('/');
    await expect(learnerPage.locator('[data-testid="feed-item"]').filter({ hasText: 'E2E Test Reel' })).toBeVisible({ timeout: 15000 });
  });

});
```

---

## PART 4 — LOAD TESTS (k6)

```javascript
// apps/load-tests/feed-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp to 100 concurrent users
    { duration: '5m', target: 500 },   // Ramp to 500 concurrent users
    { duration: '2m', target: 1000 },  // Peak: 1000 concurrent users
    { duration: '3m', target: 1000 },  // Sustain peak
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],     // Less than 1% error rate
    errors: ['rate<0.05'],             // Custom error rate under 5%
  },
};

export default function () {
  const token = __ENV.TEST_LEARNER_TOKEN;

  // Test learner feed endpoint
  const feedRes = http.get(`${__ENV.API_URL}/api/learner/feed?limit=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(feedRes, {
    'feed status 200': (r) => r.status === 200,
    'feed response time < 500ms': (r) => r.timings.duration < 500,
    'feed returns items': (r) => JSON.parse(r.body).items?.length > 0,
  });
  errorRate.add(feedRes.status !== 200);

  sleep(1);

  // Test concept page (public, CDN-cached)
  const conceptRes = http.get(`${__ENV.WEB_URL}/concepts/what-is-a-firewall`);
  check(conceptRes, {
    'concept page 200': (r) => r.status === 200,
    'concept page < 200ms (cached)': (r) => r.timings.duration < 200,
  });

  sleep(0.5);
}
```

---

## PART 5 — HOW TO RUN ALL TESTS

```bash
# Unit + Integration tests
pnpm test                           # All tests
pnpm test:unit                      # Unit tests only
pnpm test:integration               # Integration tests (needs DB)
pnpm test:coverage                  # Coverage report (must be >80%)

# Security-specific
pnpm test --testPathPattern=security  # All security test files
pnpm test --testNamePattern="SEC-"    # All SEC-xxx tests

# E2E tests (Playwright)
pnpm e2e                            # All E2E tests (needs running server)
pnpm e2e:headed                     # E2E with browser visible
pnpm e2e:debug                      # Debug mode with Playwright inspector

# Load tests (k6)
k6 run apps/load-tests/feed-load.js \
  -e API_URL=https://staging.bbt.edu.pk \
  -e WEB_URL=https://staging.bbt.edu.pk \
  -e TEST_LEARNER_TOKEN=$TOKEN

# Run all (CI mode)
pnpm test:ci                        # Unit + Integration + Security
# E2E and load tests run separately in CI pipeline

# CI/CD pipeline order:
# 1. pnpm lint (ESLint + Prettier)
# 2. pnpm type-check (tsc --noEmit strict)
# 3. pnpm test:ci (unit + integration + security)
# 4. pnpm build (Next.js + NestJS)
# 5. pnpm e2e (Playwright against staging)
# 6. Manual approval gate → production deploy
```

